import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'
import { jest } from '@jest/globals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadModule() {
  const scriptPath = path.resolve(__dirname, '../frontend.js')
  const scriptContent = fs.readFileSync(scriptPath, 'utf8') + '\n;window.AirportBookingSystem = AirportBookingSystem;'
  const ctx = { window, document, console, navigator: { geolocation: {}, permissions: { query: () => Promise.resolve({ state: 'granted' }) } }, alert: jest.fn(), fetch: jest.fn(async () => ({ ok: true, json: async () => ({ booking: {} }) })) }
  ctx.window.__AirportBookingSystemInit = true
  vm.createContext(ctx)
  vm.runInContext(scriptContent, ctx)
  return ctx
}

function makeApp(ctx) {
  const app = Object.create(ctx.window.AirportBookingSystem.prototype)
  app.bookingData = { customerName: 'John', phoneNumber: '9999999999', date: '2025-01-01', timeSlot: 'morning', tripType: 'home-to-airport', pickupLocation: '', flightNumber: '' }
  app.API_BASE_URL = 'http://localhost/api'
  app.availabilityData = {}
  app.selectedDate = new Date('2025-01-01')
  app.showNotice = jest.fn()
  app.calculateAmount = () => 500
  app.handleSuccessfulBooking = jest.fn()
  app.formatDateLocal = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return app
}

describe('Location field', () => {
  test('optional in validateForm', () => {
    const ctx = loadModule()
    const app = makeApp(ctx)
    const errors = app.validateForm()
    expect(errors).toEqual([])
  })

  test('accepts plain address', async () => {
    const ctx = loadModule()
    const app = makeApp(ctx)
    app.bookingData.pickupLocation = 'Near City Center Mall'
    await app.handleBooking()
    expect(app.showNotice).not.toHaveBeenCalledWith('error', expect.stringContaining('Enter address'))
    expect(ctx.fetch).toHaveBeenCalled()
  })

  test('rejects invalid short address', async () => {
    const ctx = loadModule()
    const app = makeApp(ctx)
    app.bookingData.pickupLocation = 'abc'
    await app.handleBooking()
    expect(app.showNotice).toHaveBeenCalledWith('error', expect.stringContaining('Enter address'))
    expect(ctx.fetch).not.toHaveBeenCalled()
  })

  test('accepts lat,lng', async () => {
    const ctx = loadModule()
    const app = makeApp(ctx)
    app.bookingData.pickupLocation = '21.2345, 82.3456'
    await app.handleBooking()
    expect(app.showNotice).not.toHaveBeenCalledWith('error', expect.any(String))
    expect(ctx.fetch).toHaveBeenCalled()
  })

  test('accepts Google Maps link', async () => {
    const ctx = loadModule()
    const app = makeApp(ctx)
    app.bookingData.pickupLocation = 'https://maps.app.goo.gl/abcdef'
    await app.handleBooking()
    expect(app.showNotice).not.toHaveBeenCalledWith('error', expect.any(String))
    expect(ctx.fetch).toHaveBeenCalled()
  })
})