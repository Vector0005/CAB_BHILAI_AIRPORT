import fs from 'fs';
import path from 'path';

function extractFrontendJs(workerSource) {
  const re = /if \(pathname === '\/api\/frontend\.js' && method === 'GET'\)[\s\S]*?const js = `([\s\S]*?)`;\s*return new Response/;
  const m = workerSource.match(re);
  if (!m) throw new Error('Unable to locate frontend.js code in worker.js');
  return m[1];
}

describe('AM/PM dropdown and exact time', () => {
  let html, js;
  beforeAll(() => {
    const root = process.cwd();
    const nestedDir = path.join(root, '..');
    const topDir = path.join(nestedDir, '..');
    const workerPath = path.join(topDir, 'worker.js');
    const indexPath = path.join(nestedDir, 'index.html');
    const workerSrc = fs.readFileSync(workerPath, 'utf-8');
    js = extractFrontendJs(workerSrc);
    html = fs.readFileSync(indexPath, 'utf-8');
  });

  beforeEach(() => {
    document.body.innerHTML = html;
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/bookings')) {
        global.__lastBookingOptions = options;
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => [], text: async () => '[]', headers: { forEach() {} } };
    });
    delete window.location;
    window.location = new URL('https://example.test/');
    eval(js);
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('opens menu on button click and selects PM', () => {
    const btn = document.getElementById('ampmDropdown');
    const menu = document.getElementById('ampmMenu');
    const hidden = document.getElementById('manualAmPm');
    expect(btn).toBeTruthy();
    expect(menu).toBeTruthy();
    expect(hidden).toBeTruthy();
    expect(menu.classList.contains('hidden')).toBe(true);
    btn.click();
    expect(menu.classList.contains('hidden')).toBe(false);
    menu.querySelector(".dropdown-item[data-value='PM']").click();
    expect(btn.textContent).toBe('PM');
    expect(hidden.value).toBe('PM');
  });

  test('submits booking with exact time in notes', async () => {
    document.getElementById('manualHour').value = '8';
    document.getElementById('manualMinute').value = '30';
    document.getElementById('manualAmPm').value = 'AM';
    document.getElementById('name').value = 'Test User';
    document.getElementById('phone').value = '9999999999';
    document.getElementById('location').value = 'https://maps.google.com/?q=21.1,81.3';
    window.selectedVehicle = { id: 'car-1', name: 'Sedan', rate: 900 };
    window.selectedPickupDate = new Date().toISOString();
    const form = document.getElementById('bookingForm');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const opts = global.__lastBookingOptions;
    expect(opts).toBeTruthy();
    const payload = JSON.parse(opts.body);
    expect(payload.notes).toMatch(/Exact Pickup Time: 08:30 AM/);
    expect(payload.pickupTime === 'morning' || payload.pickupTime === 'evening').toBe(true);
  });
});