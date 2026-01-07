import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

function extractFrontendJs(workerSource) {
  const re = /if \(pathname === '\/api\/frontend\.js' && method === 'GET'\)[\s\S]*?const js = `([\s\S]*?)`;\s*return new Response/;
  const m = workerSource.match(re);
  if (!m) throw new Error('Unable to locate frontend.js code in worker.js');
  return m[1];
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }

async function main() {
  const root = process.cwd();
  const nestedDir = path.join(root, '..');
  const topDir = path.join(nestedDir, '..');
  const workerPath = path.join(topDir, 'worker.js');
  const indexPath = path.join(nestedDir, 'index.html');
  const workerSrc = fs.readFileSync(workerPath, 'utf-8');
  const js = extractFrontendJs(workerSrc);
  const html = fs.readFileSync(indexPath, 'utf-8');

  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://example.test/'
  });
  const { window } = dom;
  const { document } = window;
  document.body.innerHTML = html;

  const fetchStub = async (url, options = {}) => {
    if (String(url).includes('/api/bookings')) {
      window.__lastBookingOptions = options;
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => [], text: async () => '[]', headers: { forEach() {} } };
  };
  window.fetch = fetchStub;
  global.fetch = fetchStub;

  const sandboxEval = new Function('window', 'document', js + '\n;return true;');
  sandboxEval(window, document);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const btn = document.getElementById('ampmDropdown');
  const menu = document.getElementById('ampmMenu');
  const hidden = document.getElementById('manualAmPm');
  assert(btn && menu && hidden, 'Dropdown elements missing');
  assert(menu.classList.contains('hidden'), 'Menu should be hidden initially');
  btn.click();
  assert(!menu.classList.contains('hidden'), 'Menu should open on click');
  menu.querySelector(".dropdown-item[data-value='PM']").dispatchEvent(new window.Event('click', { bubbles: true }));
  assert(btn.textContent === 'PM', 'Button text should update to PM');
  assert(hidden.value === 'PM', 'Hidden select value should update to PM');

  document.getElementById('manualHour').value = '9';
  document.getElementById('manualMinute').value = '15';
  document.getElementById('manualAmPm').value = 'AM';
  document.getElementById('name').value = 'Unit Test';
  document.getElementById('phone').value = '9999999999';
  document.getElementById('location').value = 'https://www.google.com/maps/place/21.1,81.3';
  window.selectedVehicle = { id: 'car-1', name: 'Sedan', rate: 900 };
  window.selectedPickupDate = new Date().toISOString();
  document.getElementById('bookingForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r=>setTimeout(r, 20));
  const opts = window.__lastBookingOptions;
  if (!opts) {
    const notice = document.getElementById('notice');
    console.error('Notice:', notice ? notice.textContent : '(none)');
  }
  assert(!!opts, 'Booking request not captured');
  const payload = JSON.parse(opts.body);
  assert(/Exact Pickup Time: 09:15 AM/.test(payload.notes||''), 'Exact time not present in notes');
  console.log('All unit checks passed.');
}

main().catch(err => { console.error(err.stack||String(err)); process.exit(1); });