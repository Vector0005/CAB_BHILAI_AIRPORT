import vm from 'vm'
import { jest } from '@jest/globals'
import https from 'node:https'
import http from 'node:http'

const REMOTE_BASE = 'https://feature-optional-address-location-tests-cab-airport-raipur.viraj-nagpure.workers.dev'

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const h = url.startsWith('https') ? https : http
    h.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error('Failed with status ' + res.statusCode))
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

async function loadRemoteScript() {
  const cb = Date.now()
  const js = await fetchText(REMOTE_BASE + '/script-backend.js?v=es5&cb=' + cb)
  return js
}

test('Remote script includes updated notice text', async () => {
  const js = await loadRemoteScript()
  expect(js).toEqual(expect.stringContaining('Enter address (min 5 chars), Google Maps link, or coordinates'))
})

function setupDom() {
  document.body.innerHTML = `
    <div id="notice" class="notice hidden"></div>
    <form id="bookingForm">
      <input id="location" />
      <button type="submit">Submit</button>
    </form>
    <button id="detectLocation"></button>
    <div id="mapOverlay" class="hidden"></div>
    <div id="mapCanvas"></div>
    <button id="closeMap"></button>
    <button id="useCoords"></button>
  `
}

async function runScript(js) {
  setupDom()
  const ctx = { window, document, navigator: { geolocation: { watchPosition: jest.fn(), clearWatch: jest.fn() } } }
  // prevent loading /api/frontend.js
  const origAppend = document.head.appendChild
  document.head.appendChild = jest.fn(() => {})
  vm.createContext(ctx)
  vm.runInContext(js, ctx)
  // Fire DOMContentLoaded for ready() wrapper
  document.dispatchEvent(new Event('DOMContentLoaded'))
  // Restore head append
  document.head.appendChild = origAppend
}

describe('Remote Worker Location Validation', () => {
  let js
  beforeAll(async () => {
    js = await loadRemoteScript()
  })

  test('Location optional: empty address should not block submission', async () => {
    await runScript(js)
    const form = document.getElementById('bookingForm')
    const loc = document.getElementById('location')
    loc.value = ''
    const ev = new Event('submit', { cancelable: true })
    form.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  test('Plain address accepted', async () => {
    await runScript(js)
    const form = document.getElementById('bookingForm')
    const loc = document.getElementById('location')
    loc.value = 'Near City Center Mall'
    const ev = new Event('submit', { cancelable: true })
    form.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  test('Google Maps link accepted', async () => {
    await runScript(js)
    const form = document.getElementById('bookingForm')
    const loc = document.getElementById('location')
    loc.value = 'https://maps.app.goo.gl/abcdef'
    const ev = new Event('submit', { cancelable: true })
    form.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  test('Coordinates accepted', async () => {
    await runScript(js)
    const form = document.getElementById('bookingForm')
    const loc = document.getElementById('location')
    loc.value = '21.2345, 82.3456'
    const ev = new Event('submit', { cancelable: true })
    form.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })
})