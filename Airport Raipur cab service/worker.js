export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const json = (data, status = 200, extraHeaders) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...(extraHeaders || {}) } });
      if (url.pathname.startsWith('/api/')) {
        const proxyBase = (env.API_BASE_URL || '').trim();
        const sbBase = (env.SUPABASE_URL || '').trim();
        const anonKey = (env.SUPABASE_ANON_KEY || '').trim();
        const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
        const useProxy = !!proxyBase;
        const supabase = async (path, init = {}, useService = false) => {
          if (!sbBase || (!anonKey && !serviceKey)) return json({ error: 'Supabase not configured' }, 500);
          const key = useService ? serviceKey : anonKey;
          if (!key) return json({ error: 'Supabase key missing' }, 500);
          const u = sbBase.replace(/\/$/, '') + '/rest/v1' + path;
          const headers = new Headers(init.headers || {});
          headers.set('apikey', key);
          headers.set('Authorization', 'Bearer ' + key);
          if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
          const resp = await fetch(u, { ...init, headers });
          const body = await resp.text();
          const h = {};
          resp.headers.forEach((v, k) => { h[k] = v; });
          return new Response(body, { status: resp.status, headers: h });
        };
        const pathname = url.pathname;
        const method = request.method.toUpperCase();
        const sp = url.searchParams;
        const readBody = async () => { try { return await request.json(); } catch (_) { return null; } };
        const toISO = (v) => { try { const d = new Date(v); return d.toISOString(); } catch (_) { return String(v || ''); } };
        if (pathname === '/api/diagnostics/env' && method === 'GET') {
          return json({ supabaseUrlPresent: !!sbBase, anonKeyPresent: !!anonKey, serviceKeyPresent: !!serviceKey, apiBaseUrl: proxyBase });
        }
        if (pathname === '/api/frontend.js' && method === 'GET') {
          const js = `(() => {
  const api = (p) => (window.location.origin + p);
  const fmtINR = (n) => '₹' + Number(n||0);
  function renderMonth(year, month) {
    const grid = document.getElementById('calendarGrid');
    const header = document.getElementById('monthYear');
    if (!grid || !header) return;
    grid.innerHTML = '';
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startIso = new Date(year, month, 1); startIso.setHours(0,0,0,0);
    const endIso = new Date(year, month + 1, 0); endIso.setHours(23,59,59,999);
    fetch(api('/api/availability?startDate=' + startIso.toISOString() + '&endDate=' + endIso.toISOString()))
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        const map = new Map();
        (rows||[]).forEach(a => {
          const d = new Date(a.date || a.date_time || a.dt || a.pickup_date);
          const key = d.getFullYear()+ '-' + (d.getMonth()+1) + '-' + d.getDate();
          map.set(key, a);
        });
        const offset = first.getDay();
        for (let i=0;i<offset;i++) {
          const ph = document.createElement('div'); ph.className='day-cell placeholder'; grid.appendChild(ph);
        }
        for (let day=1; day<=last.getDate(); day++) {
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'day-cell';
          const d = new Date(year, month, day); d.setHours(0,0,0,0);
          const key = d.getFullYear()+ '-' + (d.getMonth()+1) + '-' + d.getDate();
          const info = map.get(key);
          const morning = info ? (info.morning_available ?? info.morningAvailable ?? true) : true;
          const evening = info ? (info.evening_available ?? info.eveningAvailable ?? true) : true;
          const statusClass = (morning && evening) ? 'available' : ((morning || evening) ? 'partial' : 'booked');
          cell.classList.add(statusClass);
          cell.textContent = String(day);
          cell.setAttribute('data-date', d.toISOString());
          cell.addEventListener('click', () => {
            const disp = document.getElementById('selectedDateDisplay');
            if (disp) { disp.innerHTML = '<span>' + d.toDateString() + '</span>'; }
            window.selectedPickupDate = d.toISOString();
          });
          grid.appendChild(cell);
        }
        const monthName = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
        header.textContent = monthName;
      }).catch(() => {});
  }
  function initCalendar() {
    const today = new Date();
    let y = today.getFullYear();
    let m = today.getMonth();
    const prev = document.getElementById('prevMonth');
    const next = document.getElementById('nextMonth');
    const rerender = () => renderMonth(y, m);
    if (prev) prev.addEventListener('click', () => { m--; if (m<0){m=11;y--;} rerender(); });
    if (next) next.addEventListener('click', () => { m++; if (m>11){m=0;y++;} rerender(); });
    rerender();
  }
  function initVehicles() {
    const menu = document.getElementById('vehicleMenu');
    const dropdown = document.getElementById('vehicleDropdown');
    const rateDisp = document.getElementById('vehicleRateDisplay');
    fetch(api('/api/vehicles')).then(r=>r.ok?r.json():[]).then(d => {
      const rows = Array.isArray(d) ? d : (d.vehicles || []);
      menu.innerHTML = '';
      rows.forEach(v => {
        const opt = document.createElement('div');
        opt.className = 'dropdown-item';
        opt.textContent = (v.name || v.vehicle_name || 'Vehicle') + ' — ' + fmtINR(v.rate || v.vehicle_rate || 0);
        opt.setAttribute('role','option');
        opt.addEventListener('click', () => {
          dropdown.textContent = v.name || v.vehicle_name || 'Vehicle';
          if (rateDisp) rateDisp.textContent = fmtINR(v.rate || v.vehicle_rate || 0);
          window.selectedVehicle = { id: v.id || v.vehicle_id || null, name: v.name || v.vehicle_name || '', rate: Number(v.rate || v.vehicle_rate || 0) };
          menu.classList.add('hidden'); dropdown.setAttribute('aria-expanded','false');
        });
        menu.appendChild(opt);
      });
      dropdown.addEventListener('click', () => { const isOpen = dropdown.getAttribute('aria-expanded')==='true'; dropdown.setAttribute('aria-expanded', String(!isOpen)); menu.classList.toggle('hidden'); });
    }).catch(()=>{});
  }
  function initBookingForm() {
    const form = document.getElementById('bookingForm');
    const notice = document.getElementById('notice');
    function setNotice(t, ok) { if (!notice) return; notice.textContent = t; notice.classList.remove('hidden'); notice.style.background = ok ? '#d4edda' : '#f8d7da'; }
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name')?.value || '';
      const phone = document.getElementById('phone')?.value || '';
      const pickupTime = document.querySelector('.time-tab.active')?.getAttribute('data-time') || '';
      const tripType = (document.querySelector('input[name="tripType"]:checked')?.value || '').replace(/\s+/g,'_');
      const pickupLocation = document.getElementById('location')?.value || '';
      const sel = window.selectedVehicle || {};
      const payload = { name, phone, pickupLocation, dropoffLocation: '', pickupDate: window.selectedPickupDate, pickupTime, tripType, vehicleId: sel.id || null, vehicleName: sel.name || null, vehicleRate: sel.rate || 0, price: sel.rate || 0 };
      try {
        const r = await fetch(api('/api/bookings'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error('HTTP '+r.status);
        setNotice('Booking submitted successfully', true);
        form.reset();
      } catch (err) {
        setNotice('Failed to submit booking. Please try again.', false);
      }
    });
    document.querySelectorAll('.time-tab').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.time-tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }));
  }
  document.addEventListener('DOMContentLoaded', function() { initCalendar(); initVehicles(); initBookingForm(); });
})();`;
          return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8' } });
        }
        if (pathname === '/api/admin.js' && method === 'GET') {
          const js = `(() => {
  class AdminPanel {
    constructor(){ this.bookings=[]; this.currentPage='dashboard'; }
    navigateToPage(p){ this.currentPage=p; try{ document.getElementById('pageTitle').textContent = 'Admin ' + p.charAt(0).toUpperCase()+p.slice(1); document.getElementById('breadcrumbText').textContent = 'Home / ' + (p.charAt(0).toUpperCase()+p.slice(1)); }catch(_){} }
    updateDashboard(){}
    renderBookingsTable(){}
    async loadDashboardData(){}
  }
  window.AdminPanel = AdminPanel;
})();`;
          return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8' } });
        }
        if (useProxy) {
          const base = proxyBase.replace(/\/$/, '');
          const hasApi = /\/api(?:\/|$)/.test(base);
          const forwardPath = hasApi ? pathname.replace(/^\/api/, '') : pathname;
          const upstreamUrl = new URL(base + forwardPath + url.search);
          const init = { method: request.method, headers: new Headers(request.headers), body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer() };
          init.headers.delete('host');
          const resp = await fetch(upstreamUrl, init);
          return new Response(resp.body, { status: resp.status, headers: resp.headers });
        }
        if (pathname === '/api/availability' && method === 'GET') {
          const params = new URLSearchParams({ select: '*', order: 'date.asc' });
          if (sp.get('date')) {
            const d = toISO(sp.get('date'));
            params.append('date', `gte.${d}`);
            const next = new Date(sp.get('date')); next.setDate(next.getDate() + 1);
            params.append('date', `lt.${next.toISOString()}`);
          } else {
            if (sp.get('startDate')) params.append('date', `gte.${toISO(sp.get('startDate'))}`);
            if (sp.get('endDate')) params.append('date', `lte.${toISO(sp.get('endDate'))}`);
          }
          const r = await supabase('/availability?' + params.toString(), { method: 'GET' }, false);
          return r;
        }
        if (pathname.startsWith('/api/availability/') && method === 'PATCH') {
          const iso = decodeURIComponent(pathname.split('/').slice(3).join('/') || pathname.split('/')[3] || '').trim();
          const body = await readBody();
          const update = {};
          if (body && body.morningAvailable !== undefined) update.morning_available = body.morningAvailable;
          if (body && body.eveningAvailable !== undefined) update.evening_available = body.eveningAvailable;
          if (body && body.maxBookings !== undefined) update.max_bookings = body.maxBookings;
          if (body && body.currentBookings !== undefined) update.current_bookings = body.currentBookings;
          const r = await supabase('/availability?date=eq.' + encodeURIComponent(toISO(iso)), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }, true);
          return r;
        }
        if (pathname === '/api/vehicles' && method === 'GET') {
          const r = await supabase('/vehicles?select=*', { method: 'GET' }, true);
          const data = r.status === 200 ? await r.json().catch(() => []) : [];
          return json({ vehicles: Array.isArray(data) ? data : [] });
        }
        if (pathname === '/api/vehicles' && method === 'POST') {
          const body = await readBody();
          const payload = { id: (crypto && typeof crypto.randomUUID==='function') ? crypto.randomUUID() : String(Date.now()), name: String(body?.name || ''), rate: Number(body?.rate || 0), active: (body?.active ?? true) };
          const r = await supabase('/vehicles', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
          return r;
        }
        if (pathname.startsWith('/api/vehicles/') && method === 'PATCH') {
          const id = pathname.split('/')[3];
          const body = await readBody();
          const r = await supabase('/vehicles?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body || {}) }, true);
          return r;
        }
        if (pathname.startsWith('/api/vehicles/') && method === 'DELETE') {
          const id = pathname.split('/')[3];
          const r = await supabase('/vehicles?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }, true);
          return r;
        }
        if (pathname === '/api/drivers' && method === 'GET') {
          let r = await supabase('/drivers?select=*', { method: 'GET' }, false);
          if (r.status !== 200) {
            r = await supabase('/drivers?select=*', { method: 'GET' }, true);
          }
          if (r.status !== 200) return r;
          const data = await r.json().catch(() => []);
          return json({ drivers: Array.isArray(data) ? data : [] });
        }
        if (pathname === '/api/drivers' && method === 'POST') {
          const body = await readBody();
          const r = await supabase('/drivers', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body || {}) }, true);
          return r;
        }
        if (pathname.startsWith('/api/drivers/') && method === 'PATCH') {
          const parts = pathname.split('/');
          const id = parts[3];
          const isStatus = parts[4] === 'status';
          const body = await readBody();
          const payload = isStatus ? {} : (body || {});
          const r = await supabase('/drivers?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
          return r;
        }
        if (pathname.startsWith('/api/drivers/') && method === 'DELETE') {
          const id = pathname.split('/')[3];
          const r = await supabase('/drivers?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }, true);
          return r;
        }
        if (pathname === '/api/admin/bookings' && method === 'GET') {
          const limit = Number(sp.get('limit') || '200');
          const params = new URLSearchParams({ select: '*', order: 'pickup_date.desc', limit: String(limit) });
          const r = await supabase('/bookings?' + params.toString(), { method: 'GET' }, true);
          return r;
        }
        if (pathname.startsWith('/api/admin/bookings/') && pathname.endsWith('/status') && method === 'PATCH') {
          const id = pathname.split('/')[4];
          const body = await readBody();
          const status = body && body.status ? String(body.status).toUpperCase() : '';
          const update = { status };
          if (status === 'CANCELLED') update.payment_status = 'REFUNDED';
          const r = await supabase('/bookings?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }, true);
          return r;
        }
        if (pathname === '/api/bookings' && method === 'POST') {
          const body = await readBody();
          const payload = { name: body?.name || '', phone: body?.phone || '', email: body?.email || 'customer@noemail.com', pickup_location: body?.pickupLocation || '', dropoff_location: body?.dropoffLocation || '', pickup_date: toISO(body?.pickupDate), pickup_time: body?.pickupTime || body?.timeSlot || '', trip_type: body?.tripType || '', price: body?.price || 0, status: 'PENDING', vehicle_id: body?.vehicleId || null, vehicle_name: body?.vehicleName || null, vehicle_rate: body?.vehicleRate || null };
          const r = await supabase('/bookings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
          return r;
        }
        if (pathname === '/api/admin/dashboard' && method === 'GET') {
          const recentR = await supabase('/bookings?select=*&order=created_at.desc&limit=10', { method: 'GET' }, true);
          if (recentR.status !== 200) return recentR;
          const recent = await recentR.json();
          const allR = await supabase('/bookings?select=*', { method: 'GET' }, true);
          const all = allR.status === 200 ? await allR.json() : [];
          const driversR = await supabase('/drivers?select=*', { method: 'GET' }, true);
          const drivers = driversR.status === 200 ? await driversR.json() : [];
          const today = new Date(); today.setHours(0,0,0,0);
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
          const todayR = await supabase('/bookings?select=price,pickup_date,status&pickup_date=gte.' + today.toISOString() + '&pickup_date=lt.' + tomorrow.toISOString(), { method: 'GET' }, true);
          const todayRows = todayR.status === 200 ? await todayR.json() : [];
          const revenue = todayRows.filter(x => ['CONFIRMED','COMPLETED'].includes(String(x.status).toUpperCase())).reduce((s, x) => s + Number(x.price || 0), 0);
          const stats = { totalBookings: Array.isArray(all) ? all.length : 0, pendingBookings: Array.isArray(all) ? all.filter(x => String(x.status || '').toLowerCase() === 'pending').length : 0, todayRevenue: revenue, totalDrivers: Array.isArray(drivers) ? drivers.length : 0 };
          return json({ statistics: stats, recentBookings: recent || [] });
        }
        return json({ error: 'Route not found' }, 404);
      }
      if (env.ASSETS) {
        const assetResp = await env.ASSETS.fetch(request);
        if (assetResp.status !== 404) return assetResp;
        if (url.pathname === '/' || url.pathname === '/index') {
          const indexResp = await env.ASSETS.fetch(new Request(url.origin + '/index.html'));
          if (indexResp.status !== 404) return indexResp;
        }
        if (url.pathname === '/admin' || url.pathname === '/admin/') {
          const adminResp = await env.ASSETS.fetch(new Request(url.origin + '/admin.html'));
          if (adminResp.status !== 404) return adminResp;
        }
      }
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Worker exception', message: String(e && e.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  }
};