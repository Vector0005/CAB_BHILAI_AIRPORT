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
          try {
            const m = String((init && init.method) || 'GET').toUpperCase();
            if (/^\/bookings(\?.*)?$/i.test(String(path||'')) && m === 'POST' && init && init.body) {
              const obj = JSON.parse(init.body);
              if (!obj.notes) {
                const ext = obj.exact_pickup_time || obj.exactPickupTime || '';
                obj.notes = ext ? ('Exact Pickup Time: ' + ext) : '';
                init.body = JSON.stringify(obj);
              }
            }
          } catch (_) {}
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
        const b64u = (str) => btoa(str).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
        const b64uAB = (ab) => {
          const bytes = new Uint8Array(ab);
          let bin = '';
          for (let i=0;i<bytes.length;i++){ bin += String.fromCharCode(bytes[i]); }
          return b64u(bin);
        };
        const signJWT = async (payload, secret) => {
          const header = { alg: 'HS256', typ: 'JWT' };
          const now = Math.floor(Date.now()/1000);
          const body = Object.assign({}, payload, { iat: now, exp: now + 7*24*60*60 });
          const h = b64u(JSON.stringify(header));
          const p = b64u(JSON.stringify(body));
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey('raw', enc.encode(secret||''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const sig = await crypto.subtle.sign('HMAC', key, enc.encode(h + '.' + p));
          const s = b64uAB(sig);
          return h + '.' + p + '.' + s;
        };
        const verifyJWT = async (token, secret) => {
          const parts = String(token||'').split('.');
          if (parts.length !== 3) return null;
          const [h,p,s] = parts;
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey('raw', enc.encode(secret||''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const sig = await crypto.subtle.sign('HMAC', key, enc.encode(h + '.' + p));
          const expected = b64uAB(sig);
          if (expected !== s) return null;
          try { const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))); if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return null; return payload; } catch (_) { return null; }
        };
        if (pathname === '/api/diagnostics/env' && method === 'GET') {
          return json({ supabaseUrlPresent: !!sbBase, anonKeyPresent: !!anonKey, serviceKeyPresent: !!serviceKey, apiBaseUrl: proxyBase, adminEmailPresent: !!env.ADMIN_EMAIL, adminPasswordPresent: !!(env.ADMIN_PASSWORD||env.ADMIN_NEW_PASSWORD), jwtSecretPresent: !!env.JWT_SECRET });
        }
        if (pathname === '/api/diagnostics/schema' && method === 'GET') {
          const r = await supabase('/bookings?select=exact_pickup_time&limit=1', { method: 'GET' }, true);
          if (r.status === 200) return json({ exactPickupTimeColumn: true });
          try {
            const t = await r.text();
            const missing = /exact_pickup_time/i.test(t) && /column/i.test(t);
            return json({ exactPickupTimeColumn: !missing });
          } catch (_) {
            return json({ exactPickupTimeColumn: false });
          }
        }
        if (pathname === '/api/users/login' && method === 'POST') {
          const body = await readBody();
          const email = String(body?.email||'').trim().toLowerCase();
          const pass = String(body?.password||'');
          const adminEmail = String(env.ADMIN_EMAIL||'').trim().toLowerCase();
          const adminPass = String((env.ADMIN_PASSWORD||env.ADMIN_NEW_PASSWORD)||'');
          if (!adminEmail || !adminPass) return json({ error: 'Admin credentials not configured' }, 500);
          if (email === adminEmail && pass === adminPass) {
            const token = await signJWT({ userId: 'ADMIN', email: adminEmail, role: 'ADMIN' }, env.JWT_SECRET||'');
            return json({ message: 'Login successful', user: { id: 'ADMIN', name: 'Admin', email: adminEmail, role: 'ADMIN' }, token });
          }
          return json({ error: 'Invalid credentials' }, 401);
        }
        if (pathname === '/api/users/profile' && method === 'GET') {
          const auth = request.headers.get('authorization') || '';
          if (!auth.startsWith('Bearer ')) return json({ error: 'No token provided' }, 401);
          const token = auth.substring(7);
          const payload = await verifyJWT(token, env.JWT_SECRET||'');
          if (!payload) return json({ error: 'Invalid token' }, 401);
          return json({ user: { id: payload.userId, email: payload.email, role: payload.role } });
        }
        if (pathname === '/api/admin/logo/upload' && method === 'POST') {
          const auth = request.headers.get('authorization') || '';
          if (!auth.startsWith('Bearer ')) return json({ error: 'No token provided' }, 401);
          const token = auth.substring(7);
          const payload = await verifyJWT(token, env.JWT_SECRET||'');
          if (!payload || String(payload.role||'').toUpperCase() !== 'ADMIN') return json({ error: 'Invalid token' }, 401);
          const body = await readBody();
          const sourceUrl = String(body?.logoPublicUrl || body?.url || '').trim();
          const dataUri = String(body?.data || '').trim();
          const sbBase2 = (env.SUPABASE_URL || '').trim();
          const serviceKey2 = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
          if (!sbBase2 || !serviceKey2) return json({ error: 'Supabase not configured' }, 500);
          let contentType = 'image/svg+xml';
          let bytes = null;
          let name = 'logo.svg';
          if (sourceUrl) {
            const r = await fetch(sourceUrl);
            if (!r.ok) return json({ error: 'Failed to fetch logo source' }, 400);
            const ct = r.headers.get('content-type') || '';
            contentType = ct || contentType;
            const ab = await r.arrayBuffer();
            bytes = new Uint8Array(ab);
            name = /svg/i.test(contentType) ? 'logo.svg' : (/png/i.test(contentType) ? 'logo.png' : 'logo.bin');
          } else if (dataUri) {
            const i = dataUri.indexOf(',');
            const head = i >= 0 ? dataUri.slice(0, i) : '';
            let payloadStr = i >= 0 ? dataUri.slice(i + 1) : dataUri;
            const m = head.match(/^data:([^;]+)(;base64)?/i);
            if (m) {
              contentType = m[1] || contentType;
              const isB64 = !!m[2];
              if (isB64) {
                const bin = atob(payloadStr);
                const arr = new Uint8Array(bin.length);
                for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
                bytes = arr;
              } else {
                payloadStr = decodeURIComponent(payloadStr);
                bytes = new TextEncoder().encode(payloadStr);
              }
            } else {
              bytes = new TextEncoder().encode(payloadStr);
            }
            name = /svg/i.test(contentType) ? 'logo.svg' : (/png/i.test(contentType) ? 'logo.png' : 'logo.bin');
          } else {
            return json({ error: 'No source provided' }, 400);
          }
          const base = sbBase2.replace(/\/$/, '');
          const storageUrl = base + '/storage/v1/object/branding/' + name + '?upsert=true';
          const headers = new Headers();
          headers.set('apikey', serviceKey2);
          headers.set('Authorization', 'Bearer ' + serviceKey2);
          headers.set('content-type', contentType);
          const resp = await fetch(storageUrl, { method: 'POST', headers, body: bytes });
          const text = await resp.text();
          if (!resp.ok) return new Response(text || 'Upload failed', { status: resp.status });
          const publicUrl = base + '/storage/v1/object/public/branding/' + name;
          return json({ message: 'Uploaded', name, contentType, publicUrl });
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
    Promise.all([
      fetch(api('/api/vehicles')).then(r=>r.ok?r.json():{vehicles:[]}),
      fetch(api('/api/promos')).then(r=>r.ok?r.json():{promos:[]})
    ]).then(([d, p]) => {
      const rows = Array.isArray(d) ? d : (d.vehicles || []);
      const promos = Array.isArray(p) ? p : (p.promos || []);
      const promoMap = new Map();
      (promos||[]).forEach(pr => { if (/^VEH_/i.test(String(pr.code||''))) promoMap.set(String(pr.code), pr); });
      menu.innerHTML = '';
      rows.forEach(v => {
        const opt = document.createElement('div');
        opt.className = 'dropdown-item';
        const rate = Number(v.rate || v.vehicle_rate || 0);
        const builtInDisc = v.discounted_rate != null ? Number(v.discounted_rate) : null;
        const promo = promoMap.get('VEH_' + (v.id || v.vehicle_id || ''));
        const discounted = builtInDisc != null ? builtInDisc : (promo && promo.active ? Math.max(0, rate - Number(promo.discount_flat||0)) : null);
        opt.innerHTML = (v.name || v.vehicle_name || 'Vehicle') + ' — ' + (discounted ? ('<span class="rate-original">'+fmtINR(rate)+'</span> <span class="rate-discount">'+fmtINR(discounted)+'</span>') : fmtINR(rate));
        opt.setAttribute('role','option');
        opt.addEventListener('click', () => {
          dropdown.textContent = v.name || v.vehicle_name || 'Vehicle';
          const rate = Number(v.rate || v.vehicle_rate || 0);
          const builtInDisc = v.discounted_rate != null ? Number(v.discounted_rate) : null;
          const promo = promoMap.get('VEH_' + (v.id || v.vehicle_id || ''));
          const discounted = builtInDisc != null ? builtInDisc : (promo && promo.active ? Math.max(0, rate - Number(promo.discount_flat||0)) : null);
          const finalRate = (discounted && discounted>0 && discounted<rate) ? discounted : rate;
          if (rateDisp) rateDisp.innerHTML = (discounted ? ('<span class="rate-original">'+fmtINR(rate)+'</span> <span class="rate-discount">'+fmtINR(finalRate)+'</span>') : fmtINR(rate));
          window.selectedVehicle = { id: v.id || v.vehicle_id || null, name: v.name || v.vehicle_name || '', rate, discounted: discounted };
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
    const dl = document.getElementById('detectLocation');
    if (dl) {
      dl.addEventListener('click', () => {
        const el = document.getElementById('location');
        if (el) el.value = '';
        if (!navigator.geolocation) { setNotice('Geolocation not available', false); return; }
        let best = null; let watchId = null;
        const finish = () => { if (watchId!=null) { try{ navigator.geolocation.clearWatch(watchId); }catch(_){} } if (best && el) { el.value = Number(best.latitude).toFixed(6)+','+Number(best.longitude).toFixed(6); setNotice('Location detected', true); } else { setNotice('Unable to detect location', false); } };
        const onPos = (pos) => { const c = pos && pos.coords ? pos.coords : null; if (!c) return; if (!best || (typeof c.accuracy==='number' && c.accuracy < best.accuracy)) { best = { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy||9999 }; if (best.accuracy<=10) { finish(); } } };
        const onErr = () => { finish(); };
        try {
          watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 0 });
          setTimeout(finish, 20000);
        } catch(_) { onErr(); }
      });
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name')?.value || '';
      const phone = document.getElementById('phone')?.value || '';
      const pickupTime = document.querySelector('.time-tab.active')?.getAttribute('data-time') || '';
      const tripRaw = (document.querySelector('input[name="tripType"]:checked')?.value || '');
      const tripType = tripRaw.toUpperCase().replace(/-/g,'_').replace(/\s+/g,'_');
      const locInput = (document.getElementById('location')?.value || '').trim();
      if (locInput.length > 0) {
        const isLatLng = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(locInput);
        const isMapUrl = /^https?:\/\//i.test(locInput) && /google\.com\/maps|maps\.app\.goo\.gl/i.test(locInput);
        const isPlain = locInput.length >= 5;
        if (!(isLatLng || isMapUrl || isPlain)) {
          setNotice('Enter address (min 5 chars), Google Maps link, or coordinates', false);
          return;
        }
      }
      const sel = window.selectedVehicle || {};
      const baseRate = Number(sel.rate || 0);
      const discRate = Number(sel.discounted || 0);
      const finalRate = discRate>0 && discRate<baseRate ? discRate : baseRate;
      const payload = { 
        name, 
        phone, 
        pickupLocation: (tripType==='HOME_TO_AIRPORT' ? locInput : 'Airport'), 
        dropoffLocation: (tripType==='AIRPORT_TO_HOME' ? locInput : 'Airport'), 
        pickupDate: window.selectedPickupDate, 
        pickupTime, 
        tripType, 
        vehicleId: sel.id || null, 
        vehicleName: sel.name || null, 
        vehicleRate: baseRate, 
        price: finalRate 
      };
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
          return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store, max-age=0' } });
        }
        if (pathname === '/api/admin.js' && method === 'GET') {
          const js = `(() => {
  class AdminPanel {
    constructor(){ this.bookings=[]; this.currentPage='dashboard'; this.API_BASE_URL='/api'; this.currentUser=null; }
    navigateToPage(p){ this.currentPage=p; try{ document.getElementById('pageTitle').textContent = 'Admin ' + p.charAt(0).toUpperCase()+p.slice(1); document.getElementById('breadcrumbText').textContent = 'Home / ' + (p.charAt(0).toUpperCase()+p.slice(1)); }catch(_){} }
    showAdminContent(){ try{ document.getElementById('loginSection').style.display='none'; }catch(_){} }
    showLogin(){ try{ document.getElementById('loginSection').style.display='block'; }catch(_){} }
    authFetch(url, options={}){ const t=localStorage.getItem('adminToken'); const h=Object.assign({}, options.headers||{}, t?{ Authorization:'Bearer '+t }:{}); return fetch(url, Object.assign({}, options, { headers:h })); }
    checkAuth(){ const t=localStorage.getItem('adminToken'); if(!t){ this.showLogin(); return; } fetch(this.API_BASE_URL+'/users/profile', { headers:{ Authorization:'Bearer '+t } }).then(r=>r.ok?r.json():Promise.reject()).then(d=>{ if(d&&d.user&&String(d.user.role||'').toUpperCase()==='ADMIN'){ this.currentUser=d.user; this.showAdminContent(); } else { this.showLogin(); } }).catch(()=>{ this.showLogin(); }); }
    async handleLogin(){
      if (window.__loginGate === true) return;
      window.__loginGate = true;
      const email=document.getElementById('email')?.value||'';
      const password=document.getElementById('password')?.value||'';
      try{
        const r=await fetch(this.API_BASE_URL+'/users/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
        const d=await r.json();
        if(r.ok && String(d?.user?.role||'').toUpperCase()==='ADMIN'){
          localStorage.setItem('adminToken', d.token);
          this.currentUser=d.user;
          this.showAdminContent();
          this.navigateToPage('dashboard');
        } else {
          console.warn('Login failed: invalid credentials or insufficient permissions');
        }
      }catch(_){
        console.warn('Login failed: network or server error');
      } finally {
        window.__loginGate = false;
      }
    }
    bindEvents(){
      const lb0=document.getElementById('loginButton');
      if(lb0){
        const lb=lb0.cloneNode(true);
        lb.id='loginButton';
        lb.handleLogin = function(){ if(window.adminPanel && typeof window.adminPanel.handleLogin==='function'){ window.adminPanel.handleLogin(); } };
        try{ lb.removeAttribute('onclick'); }catch(_){}
        if(lb0.parentNode){ lb0.parentNode.replaceChild(lb, lb0); }
        lb.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); lb.handleLogin(); });
      }
      const lo=document.getElementById('logoutBtn');
      if(lo){ lo.addEventListener('click', (e)=>{ e.preventDefault(); localStorage.removeItem('adminToken'); this.showLogin(); }); }
    }
    async loadDashboardData(){ try{ const r=await this.authFetch(this.API_BASE_URL+'/admin/dashboard'); if(r.ok){ const data=await r.json(); /* optionally update UI */ } }catch(_){ }
  }
  window.AdminPanel = AdminPanel;
  window.handleLogin = function(){ if(window.adminPanel && typeof window.adminPanel.handleLogin==='function'){ window.adminPanel.handleLogin(); } };
  document.addEventListener('DOMContentLoaded', function(){ if(!window.adminPanel || !(window.adminPanel instanceof AdminPanel)){ window.adminPanel = new AdminPanel(); } try{ window.adminPanel.bindEvents(); }catch(_){} try{ window.adminPanel.checkAuth(); }catch(_){} });
  document.addEventListener('click', function(e){ if(e && e.target && e.target.id==='loginButton'){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); window.handleLogin(); } }, true);
})();`;
          return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store, max-age=0' } });
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
          const r = await supabase('/availability?' + params.toString(), { method: 'GET' }, true);
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
        if (pathname === '/api/availability/bulk-update' && method === 'POST') {
          const body = await readBody();
          const s = body && body.startDate ? body.startDate : '';
          const e = body && body.endDate ? body.endDate : '';
          const sDate = new Date(s || 0);
          const eDate = new Date(e || 0);
          if (!s || !e || isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || eDate.getTime() < sDate.getTime()) {
            return json({ error: 'Invalid date range' }, 400);
          }
          sDate.setHours(0,0,0,0);
          eDate.setHours(0,0,0,0);
          const morningAvailable = body && body.morningAvailable;
          const eveningAvailable = body && body.eveningAvailable;
          const maxBookings = body && body.maxBookings;
          let updatedCount = 0;
          let insertedCount = 0;
          const dates = [];
          for (let d = new Date(sDate); d.getTime() <= eDate.getTime(); d.setDate(d.getDate() + 1)) {
            const x = new Date(d);
            x.setHours(0,0,0,0);
            dates.push(x);
          }
          for (const date of dates) {
            const iso = date.toISOString();
            const next = new Date(date);
            next.setDate(next.getDate() + 1);
            const params = new URLSearchParams({ select: 'id,date' });
            params.append('date', 'gte.' + iso);
            params.append('date', 'lt.' + next.toISOString());
            const existingResp = await supabase('/availability?' + params.toString(), { method: 'GET' }, true);
            const rows = existingResp.status === 200 ? await existingResp.json().catch(() => []) : [];
            if (Array.isArray(rows) && rows.length) {
              const update = {};
              if (morningAvailable !== undefined) update.morning_available = morningAvailable;
              if (eveningAvailable !== undefined) update.evening_available = eveningAvailable;
              if (maxBookings !== undefined) update.max_bookings = maxBookings;
              if (Object.keys(update).length === 0) {
                continue;
              }
              const ur = await supabase('/availability?date=eq.' + encodeURIComponent(iso), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }, true);
              if (ur.status === 200) updatedCount++;
            } else {
              const payload = {
                id: (crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : String(Date.now()),
                date: iso,
                morning_available: morningAvailable !== undefined ? morningAvailable : true,
                evening_available: eveningAvailable !== undefined ? eveningAvailable : true,
                max_bookings: maxBookings != null ? Number(maxBookings) : 10,
                current_bookings: 0
              };
              const ir = await supabase('/availability', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
              if (ir.status === 201 || ir.status === 200) insertedCount++;
            }
          }
          return json({ updatedDates: updatedCount, insertedDates: insertedCount });
        }
        if (pathname === '/api/vehicles' && method === 'GET') {
          const r = await supabase('/vehicles?select=*', { method: 'GET' }, true);
          const data = r.status === 200 ? await r.json().catch(() => []) : [];
          return json({ vehicles: Array.isArray(data) ? data : [] });
        }
        if (pathname === '/api/promos' && method === 'GET') {
          const params = new URLSearchParams({ select: '*' });
          if (sp.get('code')) params.append('code', 'eq.' + sp.get('code'));
          if (sp.get('active')) params.append('active', 'eq.' + sp.get('active'));
          const r = await supabase('/promos?' + params.toString(), { method: 'GET' }, true);
          const data = r.status === 200 ? await r.json().catch(() => []) : [];
          return json({ promos: Array.isArray(data) ? data : [] });
        }
        if (pathname === '/api/promos' && method === 'POST') {
          const body = await readBody();
          const payload = { id: (crypto && typeof crypto.randomUUID==='function') ? crypto.randomUUID() : String(Date.now()), code: String(body?.code||'').toUpperCase(), discount_percent: Number(body?.discount_percent||0), discount_flat: Number(body?.discount_flat||0), max_uses: Number(body?.max_uses||0), used_count: 0, active: (body?.active??true), valid_from: body?.valid_from || new Date().toISOString(), valid_to: body?.valid_to || new Date('2099-12-31').toISOString() };
          const r = await supabase('/promos', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
          return r;
        }
        if (pathname.startsWith('/api/promos/') && method === 'PATCH') {
          const id = pathname.split('/')[3];
          const body = await readBody();
          const r = await supabase('/promos?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body||{}) }, true);
          return r;
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
          const id = (crypto && typeof crypto.randomUUID==='function') ? crypto.randomUUID() : String(Date.now());
          const bn = 'BN-' + Date.now();
          const name = body?.name || '';
          const email = body?.email || 'customer@noemail.com';
          const phone = body?.phone || '';
          let userId = String(body?.userId || '').trim();
          if (!userId) {
            let found = '';
            if (email) {
              const r1 = await supabase('/users?select=id&email=eq.' + encodeURIComponent(email), { method: 'GET' }, true);
              const rows1 = r1.status === 200 ? await r1.json().catch(() => []) : [];
              if (Array.isArray(rows1) && rows1[0] && rows1[0].id) found = rows1[0].id;
            }
            if (!found && phone) {
              const r2 = await supabase('/users?select=id&phone=eq.' + encodeURIComponent(phone), { method: 'GET' }, true);
              const rows2 = r2.status === 200 ? await r2.json().catch(() => []) : [];
              if (Array.isArray(rows2) && rows2[0] && rows2[0].id) found = rows2[0].id;
            }
            userId = found;
            if (!userId) {
              const newUserId = (crypto && typeof crypto.randomUUID==='function') ? crypto.randomUUID() : String(Date.now());
              const uPayload = { id: newUserId, email, password: 'TEMP', name: name || 'Customer', phone, role: 'CUSTOMER' };
              const ru = await supabase('/users', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(uPayload) }, true);
              if (ru.status === 201 || ru.status === 200) {
                const j = await ru.json().catch(() => []);
                userId = Array.isArray(j) && j[0] && j[0].id ? j[0].id : newUserId;
              } else {
                return ru;
              }
            }
          }
          const payload = { id, booking_number: bn, user_id: userId, name, phone, email, pickup_location: body?.pickupLocation || '', dropoff_location: body?.dropoffLocation || '', pickup_date: toISO(body?.pickupDate), pickup_time: body?.pickupTime || body?.timeSlot || '', trip_type: body?.tripType || '', status: 'PENDING', price: body?.price || 0, vehicle_id: body?.vehicleId || null, vehicle_name: body?.vehicleName || null, vehicle_rate: body?.vehicleRate || null, notes: (body?.notes || (body?.exactPickupTime ? ('Exact Pickup Time: ' + body.exactPickupTime) : '')) };
          if (body?.notes) { payload.notes = String(body.notes); }
          if (body?.exactPickupTime || body?.exact_pickup_time) { payload.exact_pickup_time = body.exactPickupTime || body.exact_pickup_time; }
          if (body?.notes) { payload.notes = String(body.notes); }
          if (body?.exactPickupTime || body?.exact_pickup_time) { payload.exact_pickup_time = body.exactPickupTime || body.exact_pickup_time; }
          const r = await supabase('/bookings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
          try {
            const update = {};
            if (body && body.notes) update.notes = String(body.notes);
            const exact = body && (body.exactPickupTime || body.exact_pickup_time) ? (body.exactPickupTime || body.exact_pickup_time) : '';
            if (exact) update.exact_pickup_time = exact;
            if (Object.keys(update).length) {
              let ur = await supabase('/bookings?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }, true);
              if (ur.status !== 200) {
                try {
                  const t = await ur.text();
                  if (/exact_pickup_time/i.test(t) && /column/i.test(t)) {
                    delete update.exact_pickup_time;
                    await supabase('/bookings?id=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }, true);
                  }
                } catch(_) {}
              }
            }
          } catch(_) {}
          // Update availability slot for the booking date
          try {
            const dt = new Date(payload.pickup_date);
            dt.setHours(0,0,0,0);
            const isoDate = dt.toISOString();
            const slot = String(payload.pickup_time || '').toLowerCase();
            const bookMorning = /morning/.test(slot);
            const bookEvening = /evening/.test(slot);
            if (bookMorning || bookEvening) {
              // Fetch existing availability row
              const aR = await supabase('/availability?select=*&date=eq.' + encodeURIComponent(isoDate), { method: 'GET' }, true);
              const rows = aR.status === 200 ? await aR.json().catch(() => []) : [];
              if (!Array.isArray(rows) || rows.length === 0) {
                // Create availability row with other slot available
                const aid = (crypto && typeof crypto.randomUUID==='function') ? crypto.randomUUID() : String(Date.now());
                const aPayload = { id: aid, date: isoDate, morning_available: !bookMorning, evening_available: !bookEvening };
                await supabase('/availability', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(aPayload) }, true);
              } else {
                const update = {};
                if (bookMorning) update.morning_available = false;
                if (bookEvening) update.evening_available = false;
                await supabase('/availability?date=eq.' + encodeURIComponent(isoDate), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(update) }, true);
              }
            }
          } catch (_) {}
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
      if (url.pathname === '/' || url.pathname === '/index' || url.pathname === '/index.html') {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raipur Airport ↔ Bhilai Travel Service</title>
  <link rel="stylesheet" href="/styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);min-height:100vh;color:#1e293b;line-height:1.6}
    .container{max-width:1400px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border-radius:20px;padding:30px;margin-bottom:30px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
    .logo{display:flex;align-items:center;gap:20px}
    .logo-icon{width:60px;height:40px}
    .title{font-size:28px;font-weight:700;background:linear-gradient(135deg,#0ea5e9 0%,#1e40af 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .main-content{display:grid;gap:30px}
    .booking-section{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
    .calendar-container,.booking-form-container{background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border-radius:20px;padding:30px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
    .calendar-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:25px}
    .nav-btn{background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);color:#fff;border:none;width:40px;height:40px;border-radius:12px;font-size:18px;cursor:pointer}
    .month-year{font-size:24px;font-weight:600;color:#1e293b}
    .calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:25px}
    .weekday{text-align:center;font-weight:600;color:#64748b;font-size:14px;padding:4px;border-radius:12px}
    .calendar-day{aspect-ratio:1;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:500;cursor:pointer;transition:all .3s ease;position:relative;border:2px solid transparent;text-align:center;padding:4px;overflow:hidden}
    .calendar-day-number{font-size:18px;font-weight:700;line-height:1}
    .calendar-day-status{font-size:11px;line-height:1.05;font-weight:600;margin-top:2px}
    .calendar-day.available{background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:#fff}
    .calendar-day.partial{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff}
    .calendar-day.booked{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff}
    .selected-date-display{background:linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%);border:2px solid #e5e7eb;border-radius:12px;padding:16px;font-weight:500;color:#374151;text-align:center;min-height:52px;display:flex;align-items:center;justify-content:center}
    .form-title{font-size:24px;font-weight:600;color:#1e293b;margin-bottom:25px;text-align:center}
    .booking-form{display:flex;flex-direction:column;gap:20px}
    .form-group{display:flex;flex-direction:column;gap:8px}
    .form-group input,.form-group select{padding:12px 16px;border:2px solid #e5e7eb;border-radius:12px;font-size:16px;background:#fff}
    .time-tabs{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .time-tab{padding:12px 16px;border:2px solid #e5e7eb;border-radius:12px;background:#fff;cursor:pointer;text-align:center;font-weight:500}
    .time-tab.active{background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);color:#fff;border-color:#0ea5e9}
    .trip-type-buttons{display:flex;gap:15px}
    .radio-button{display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:12px;background:#fff;border:2px solid #e5e7eb;flex:1}
    .radio-button.selected{background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);border-color:#0ea5e9;color:#fff}
    .radio-label{font-weight:500;color:#374151}
    .location-help{font-size:13px;color:#64748b;margin-top:6px;font-style:italic}
    .location-detect-btn{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;border:none;padding:12px 16px;border-radius:12px;font-size:14px;font-weight:500;cursor:pointer;transition:all .3s ease;display:inline-flex;align-items:center;gap:8px}
    .location-detect-btn:hover{transform:translateY(-2px);box-shadow:0 5px 15px rgba(16,185,129,.4)}
    .vehicle-select{position:relative}
    .dropdown-button{width:100%;height:44px;padding:10px 40px 10px 12px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;color:#1f2937;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.04);text-align:left;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:14px}
    .dropdown-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:2px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.08);max-height:240px;overflow-y:auto;z-index:50}
    .dropdown-option{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:pointer;font-weight:600;color:#374151}
    .dropdown-option:hover{background:#f3f4f6}
    .opt-rate{color:#111827;font-weight:700}
    .hidden{display:none}
    .time-tab.disabled{opacity:.6;cursor:not-allowed;background:#f3f4f6;color:#9ca3af;border-color:#e5e7eb}
    .book-ride-btn{background:linear-gradient(135deg,#0ea5e9 0%,#1e40af 100%);color:#fff;border:none;padding:16px 32px;border-radius:12px;font-size:18px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px}
    .footer-actions{display:flex;gap:12px;justify-content:center}
    @media(max-width:1024px){.booking-section{grid-template-columns:1fr}}
    @media(max-width:768px){.logo{flex-direction:column;text-align:center;gap:15px}.calendar-container,.booking-form-container{padding:20px}.time-tabs{grid-template-columns:1fr}.trip-type-buttons{flex-direction:column;gap:10px}.footer-actions{flex-direction:column}}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 60 40" fill="none">
          <path d="M10 20 L20 10 L30 15 L35 10 L40 15 L35 20 L40 25 L35 30 L30 25 L20 30 Z" fill="#0EA5E9"/>
          <circle cx="15" cy="20" r="3" fill="#1E40AF"/>
          <rect x="45" y="15" width="12" height="10" rx="2" fill="#1E40AF"/>
          <circle cx="51" cy="20" r="2" fill="#0EA5E9"/>
        </svg>
        <h1 class="title">Raipur Airport ↔ Bhilai Travel Service</h1>
      </div>
    </header>
    <main class="main-content">
      <div class="booking-section">
        <div class="calendar-container">
          <div class="calendar-header">
            <button class="nav-btn" id="prevMonth">&lt;</button>
            <h2 class="month-year" id="monthYear">November 2024</h2>
            <button class="nav-btn" id="nextMonth">&gt;</button>
          </div>
          <div class="calendar-grid" id="calendarGrid" role="grid" aria-label="Choose a pickup date">
            <div class="weekday">Sun</div>
            <div class="weekday">Mon</div>
            <div class="weekday">Tue</div>
            <div class="weekday">Wed</div>
            <div class="weekday">Thu</div>
            <div class="weekday">Fri</div>
            <div class="weekday">Sat</div>
          </div>
          <div class="availability-legend">
            <div class="legend-item"><div class="legend-color available"></div><span>Both slots available</span></div>
            <div class="legend-item"><div class="legend-color partial"></div><span>One slot booked</span></div>
            <div class="legend-item"><div class="legend-color booked"></div><span>Fully booked</span></div>
          </div>
        </div>
        <div class="booking-form-container">
          <h3 class="form-title">Book Your Rides</h3>
          <div id="notice" class="notice hidden" role="status" aria-live="polite"></div>
          <form class="booking-form" id="bookingForm">
            <div class="form-group">
              <label>Selected Date</label>
              <div class="selected-date-display" id="selectedDateDisplay"><span class="no-date-selected">Please select a date from the calendar</span></div>
            </div>
            <div class="form-group"><label for="name">Name</label><input type="text" id="name" name="name" required></div>
            <div class="form-group"><label for="phone">Phone Number</label><input type="tel" id="phone" name="phone" required></div>
            <div class="form-group">
              <label>Pickup Time</label>
              <div class="time-tabs">
                <button type="button" class="time-tab active" data-time="morning">Morning<span class="time-range">6 am to 6 pm</span></button>
                <button type="button" class="time-tab" data-time="evening">Evening<span class="time-range">6 pm to 12 pm</span></button>
              </div>
            </div>
            <div class="form-group">
              <label>Trip Direction</label>
              <div class="trip-type-buttons">
                <label class="radio-button"><input type="radio" name="tripType" value="home-to-airport" checked><span class="radio-label">Home to Airport</span></label>
                <label class="radio-button"><input type="radio" name="tripType" value="airport-to-home"><span class="radio-label">Airport to Home</span></label>
              </div>
            </div>
            <div class="form-group">
              <label>Select Vehicle</label>
              <div class="vehicle-select" id="vehicleSelectControl">
                <button type="button" id="vehicleDropdown" class="dropdown-button" aria-haspopup="listbox" aria-expanded="false">Select vehicle</button>
                <div id="vehicleMenu" class="dropdown-menu hidden" role="listbox" aria-labelledby="vehicleDropdown"></div>
              </div>
              <select id="vehicleSelect" class="native-select" style="display:none;"></select>
            </div>
            <div class="form-group"><label>Rate</label><div id="vehicleRateDisplay">₹0</div></div>
            <div class="form-group">
              <label for="location">Pickup/Drop Location</label>
              <div class="location-input-container">
                <input type="text" id="location" name="location" placeholder="Paste Google Maps link or use Detect Location (coords)">
                <button type="button" class="location-detect-btn" id="detectLocation">Detect Location</button>
              </div>
              <div class="location-help">💡 Tip: Paste a Google Maps link or click Detect Location to fill coordinates</div>
            </div>
            <button type="submit" class="book-ride-btn">Book Ride</button>
            <div class="footer-actions">
              <a href="/about.html" class="btn-link" aria-label="About our service">About Us</a>
              <a href="/faq.html" class="btn-link btn-secondary" aria-label="Frequently Asked Questions">FAQs</a>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
  <style>.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:3000}.modal{background:#fff;border-radius:10px;max-width:720px;width:92vw;box-shadow:0 10px 30px rgba(0,0,0,.25)}.modal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600}.modal-body{padding:0}.modal-footer{padding:12px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e5e7eb}#mapCanvas{width:720px;max-width:92vw;height:380px}.hidden{display:none}.modal-btn{padding:8px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#0ea5e9;color:#fff}.modal-btn-secondary{background:#fff;color:#334155}</style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" crossorigin="anonymous" defer></script>
  <div id="mapOverlay" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><span>Calibrate Location</span><button id="closeMap" class="modal-btn modal-btn-secondary">Close</button></div><div class="modal-body"><div id="mapCanvas"></div></div><div class="modal-footer"><button id="useCoords" class="modal-btn">Use These Coordinates</button></div></div></div>
  <div id="confirmationOverlay" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><span>Booking Confirmed</span><button id="closeConfirm" class="modal-btn modal-btn-secondary">Close</button></div><div class="modal-body"><div style="padding:12px 16px" id="confirmationBody"><div id="confirmNumber"></div><div id="confirmDate"></div><div id="confirmTime"></div><div id="confirmTrip"></div><div id="confirmPickup"></div><div id="confirmDropoff"></div><div id="confirmPrice"></div></div></div><div class="modal-footer"><button id="okConfirm" class="modal-btn">OK</button></div></div></div>
  <div id="adminAccess" class="admin-access-hidden" style="position: fixed; top: 0; left: 0; width: 10px; height: 10px; cursor: pointer; z-index: 9999;" title="Admin Access (Triple-click or Ctrl+Shift+A)"></div>
          <script src="/script-backend.js?v=es5" defer></script>
          <script>
            (function(){
              var ready=function(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } };
              ready(function(){
                try{
                  var radios=document.querySelectorAll('.radio-button input[type="radio"]');
                  for(var i=0;i<radios.length;i++){
                    radios[i].addEventListener('change', function(ev){
                      try{ var labels=document.querySelectorAll('.radio-button'); for(var j=0;j<labels.length;j++){ labels[j].classList.remove('selected'); } }catch(_){ }
                      var el=ev.target; var wrap=el && el.closest ? el.closest('.radio-button') : null; if(wrap){ wrap.classList.add('selected'); }
                    });
                  }
                  var initSel=document.querySelector('.radio-button input[type="radio"]:checked'); if(initSel && initSel.closest){ var w=initSel.closest('.radio-button'); if(w){ w.classList.add('selected'); } }
                }catch(_){ }
                // Removed duplicate fallback calendar/menu; unified to script-backend.js logic below
              });
            })();
  </script>
  <script>
    (function(){
      var grid=document.getElementById('calendarGrid');
      var monthLabel=document.getElementById('monthYear');
      function pad(n){ n=String(n); return n.length<2?('0'+n):n; }
      function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
      function clearGrid(){ if(!grid) return; try{ while(grid.firstChild){ grid.removeChild(grid.firstChild);} }catch(_){}
        var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; for(var i=0;i<7;i++){ var w=document.createElement('div'); w.className='weekday'; w.textContent=days[i]; grid.appendChild(w); }
      }
      function buildCells(year, month, map){ if(!grid) return; var firstDow=(new Date(year, month, 1)).getDay(); var daysInMonth=(new Date(year, month+1, 0)).getDate();
        for(var p=0;p<firstDow;p++){ var ph=document.createElement('div'); ph.className='calendar-day other-month unavailable'; ph.setAttribute('aria-hidden','true'); grid.appendChild(ph); }
        var today=new Date(); today.setHours(0,0,0,0);
        for(var d=1; d<=daysInMonth; d++){
          var dateObj=new Date(year, month, d); dateObj.setHours(0,0,0,0);
          var dayStr=fmt(dateObj);
          var av=(map && map[dayStr])?map[dayStr]:{ m:true, e:true };
          var st=(av.m && av.e)?'available':((av.m || av.e)?'partial':'booked');
          var cell=document.createElement('div'); cell.className='calendar-day'; cell.setAttribute('data-date', dayStr);
          if(st==='available'){ cell.className+=' available'; } else if(st==='partial'){ cell.className+=' partial'; } else { cell.className+=' booked'; }
          var isPast=dateObj.getTime()<today.getTime(); if(isPast){ cell.className+=' past-date'; }
          var num=document.createElement('div'); num.className='calendar-day-number'; num.textContent=String(d);
          cell.appendChild(num);
          if(!isPast && st!=='available'){ var lab=document.createElement('div'); lab.className='calendar-day-status'; lab.textContent=(st==='partial' ? (av.m?'Morning available':'Evening available') : 'Fully booked'); cell.appendChild(lab); }
          (function(cellEl, ds, isPast){ cellEl.addEventListener('click', function(){ if(isPast) return; window.selectedPickupDate=ds; var selDisplay=document.getElementById('selectedDateDisplay'); if(selDisplay){ selDisplay.classList.add('has-date'); selDisplay.textContent=(new Date(ds)).toDateString(); }
            var prevSel=grid.querySelector('.calendar-day.selected'); if(prevSel){ prevSel.className=prevSel.className.replace(' selected',''); }
            cellEl.className+=' selected';
            try{ if(window.updateTimeTabsForDate){ window.updateTimeTabsForDate(ds); } }catch(_){}
          }); })(cell, dayStr, isPast);
          grid.appendChild(cell);
        }
      }
      function statusMap(rows){ var map={}; if(rows && typeof rows.length==='number'){ for(var i=0;i<rows.length;i++){ var r=rows[i]||{}; var iso=r.date?String(r.date):null; if(!iso) continue; var dt=new Date(iso); dt.setHours(0,0,0,0); var day=fmt(dt); var mA=(r.morning_available!==undefined)?!!r.morning_available:!!r.morningAvailable; var eA=(r.evening_available!==undefined)?!!r.evening_available:!!r.eveningAvailable; map[day]={ m:mA, e:eA }; } } return map; }
      function render(){ if(!grid || !monthLabel) return; clearGrid(); var today=new Date(); var year=today.getFullYear(); var month=today.getMonth();
        if(monthLabel){ monthLabel.textContent=(new Date(year,month,1)).toLocaleString('en-US',{ month:'long', year:'numeric'}); }
        if(typeof window.fetch==='function'){
          window.fetch('/api/availability?startDate='+encodeURIComponent(fmt(new Date(year,month,1)))+'&endDate='+encodeURIComponent(fmt(new Date(year,month+1,0))))
            .then(function(r){ return r.json(); })
            .then(function(rows){ var map=statusMap(rows); buildCells(year, month, map); })
            .catch(function(){ buildCells(year, month, null); });
        } else { buildCells(year, month, null); }
      }
      window.refreshCalendar = render; render();
      window.updateDayStatus = function(ds){ if(typeof window.fetch!=='function') return; window.fetch('/api/availability/'+encodeURIComponent(ds)).then(function(r){ return r.json(); }).then(function(row){ var mA=(row.morning_available!==undefined)?!!row.morning_available:!!row.morningAvailable; var eA=(row.evening_available!==undefined)?!!row.evening_available:!!row.eveningAvailable; var st=(mA && eA)?'available':((mA || eA)?'partial':'booked'); var cell=grid.querySelector('[data-date="'+ds+'"]'); if(!cell) return; cell.className='calendar-day '+st; var lab=cell.querySelector('.calendar-day-status'); if(!lab){ lab=document.createElement('div'); lab.className='calendar-day-status'; cell.appendChild(lab); } lab.textContent=(st==='partial' ? (mA?'Morning available':'Evening available') : (st==='booked'?'Fully booked':'')); }).catch(function(){}); };
      window.updateTimeTabsForDate = function(ds){ if(typeof window.fetch!=='function') return; var morningTab=document.querySelector('[data-time="morning"]'); var eveningTab=document.querySelector('[data-time="evening"]'); window.fetch('/api/availability/'+encodeURIComponent(ds)).then(function(r){ return r.json(); }).then(function(row){ var mA=(row.morning_available!==undefined)?!!row.morning_available:!!row.morningAvailable; var eA=(row.evening_available!==undefined)?!!row.evening_available:!!row.eveningAvailable; if(morningTab){ if(!mA){ morningTab.classList.add('disabled'); morningTab.style.pointerEvents='none'; } else { morningTab.classList.remove('disabled'); morningTab.style.pointerEvents='auto'; } } if(eveningTab){ if(!eA){ eveningTab.classList.add('disabled'); eveningTab.style.pointerEvents='none'; } else { eveningTab.classList.remove('disabled'); eveningTab.style.pointerEvents='auto'; } } var active=document.querySelector('.time-tab.active'); if(active && active.className.indexOf('disabled')!==-1){ try{ active.classList.remove('active'); }catch(_){ } if(mA && morningTab){ morningTab.classList.add('active'); } else if(eA && eveningTab){ eveningTab.classList.add('active'); } } }).catch(function(){}); };
      // Vehicle menu population fallback
      (function(){ var dropdown=document.getElementById('vehicleDropdown'); var menu=document.getElementById('vehicleMenu'); var rateDisplay=document.getElementById('vehicleRateDisplay'); function renderRate(v){ if(!rateDisplay) return; var r=(v && v.discounted_rate!=null)?Number(v.discounted_rate):Number(v && v.rate || 0); var orig=(v && v.discounted_rate!=null)?Number(v.rate):null; if(orig!=null && isFinite(orig) && orig>r){ rateDisplay.innerHTML='<span class="rate-original">₹'+orig+'</span><span class="rate-discount">₹'+r+'</span>'; } else { rateDisplay.textContent='₹'+r; } } function setSelectedVehicle(v){ if(dropdown){ dropdown.textContent=(v && v.name)?String(v.name):'Select vehicle'; } renderRate(v); if(menu){ menu.classList.add('hidden'); if(dropdown){ dropdown.setAttribute('aria-expanded','false'); } } } function populateVehicles(list){ if(!menu) return; try{ while(menu.firstChild){ menu.removeChild(menu.firstChild);} }catch(_){} for(var i=0;i<list.length;i++){ var v=list[i]||{}; if(v.active===false) continue; var row=document.createElement('div'); row.className='dropdown-option'; var name=document.createElement('span'); name.textContent=String(v.name||''); var rate=document.createElement('span'); rate.className='opt-rate'; var shownRate=(v.discounted_rate!=null && isFinite(v.discounted_rate))?Number(v.discounted_rate):Number(v.rate||0); rate.textContent='₹'+String(shownRate); row.appendChild(name); row.appendChild(rate); (function(vh){ row.addEventListener('click', function(){ setSelectedVehicle(vh); }); })(v); menu.appendChild(row);} } if(typeof window.fetch==='function'){ window.fetch('/api/vehicles').then(function(r){ return r.json(); }).then(function(j){ populateVehicles((j && j.vehicles)||[]); }).catch(function(){ populateVehicles([{ id:'sedan', name:'Sedan', rate:700 }, { id:'suv', name:'SUV', rate:900 }, { id:'van', name:'Van', rate:1100 }]); }); } else { populateVehicles([{ id:'sedan', name:'Sedan', rate:700 }, { id:'suv', name:'SUV', rate:900 }, { id:'van', name:'Van', rate:1100 }]); } })();
    })();
  </script>
  <script>try{ setTimeout(function(){ if(!window.L){ var n=document.getElementById('notice'); if(n){ n.textContent='Map library failed to load. Detect Location still works.'; n.classList.remove('hidden'); n.style.background='#fff3cd'; } } }, 300); }catch(_){ }</script>
  <script>let adminClickCount = 0; let adminClickTimer; document.getElementById('adminAccess').addEventListener('click', function(){ adminClickCount++; clearTimeout(adminClickTimer); if (adminClickCount >= 3) { window.open('/admin.html', '_blank'); adminClickCount = 0; } adminClickTimer = setTimeout(() => { adminClickCount = 0; }, 1000); }); document.addEventListener('keydown', function(e){ if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); window.open('/admin.html', '_blank'); } }); let konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']; let konamiIndex = 0; document.addEventListener('keydown', function(e){ if (e.key === konamiCode[konamiIndex]) { konamiIndex++; if (konamiIndex === konamiCode.length) { window.open('/admin.html', '_blank'); konamiIndex = 0; } } else { konamiIndex = 0; } });</script>
</body>
</html>`;
          return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' } });
        }
      if (url.pathname === '/styles.css') {
        const css = `* {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n}\n\nbody {\n    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);\n    min-height: 100vh;\n    color: #1e293b;\n    line-height: 1.6;\n}\n\n.container {\n    max-width: 1400px;\n    margin: 0 auto;\n    padding: 20px;\n}\n\n/* Header Styles */\n.header {\n    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);\n    border-radius: 20px;\n    padding: 30px;\n    margin-bottom: 30px;\n    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n    backdrop-filter: blur(10px);\n}\n\n.logo {\n    display: flex;\n    align-items: center;\n    gap: 20px;\n}\n\n.logo-icon {\n    width: 60px;\n    height: 40px;\n    flex-shrink: 0;\n}\n\n.title {\n    font-size: 28px;\n    font-weight: 700;\n    background: linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%);\n    -webkit-background-clip: text;\n    -webkit-text-fill-color: transparent;\n    background-clip: text;\n}\n\n/* Main Content */\n.main-content {\n    display: grid;\n    gap: 30px;\n}\n\n.booking-section {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n    gap: 40px;\n    align-items: start;\n}\n\n/* Calendar Styles */\n.calendar-container {\n    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);\n    border-radius: 20px;\n    padding: 30px;\n    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n    backdrop-filter: blur(10px);\n}\n\n.calendar-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    margin-bottom: 25px;\n}\n\n.nav-btn {\n    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);\n    color: white;\n    border: none;\n    width: 40px;\n    height: 40px;\n    border-radius: 12px;\n    font-size: 18px;\n    cursor: pointer;\n    transition: all 0.3s ease;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.nav-btn:hover {\n    transform: translateY(-2px);\n    box-shadow: 0 5px 15px rgba(14, 165, 233, 0.4);\n}\n\n.month-year {\n    font-size: 24px;\n    font-weight: 600;\n    color: #1e293b;\n}\n\n.calendar-grid {\n    display: grid;\n    grid-template-columns: repeat(7, 1fr);\n    gap: 8px;\n    margin-bottom: 25px;\n}\n\n.weekday {\n    text-align: center;\n    font-weight: 600;\n    color: #64748b;\n    font-size: 14px;\n    padding: 4px;\n    border-radius: 12px;\n    border: 2px solid transparent;\n}\n\n.calendar-day {\n    aspect-ratio: 1;\n    border-radius: 12px;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    font-weight: 500;\n    cursor: pointer;\n    transition: all 0.3s ease;\n    position: relative;\n    border: 2px solid transparent;\n    text-align: center;\n    padding: 4px;\n    overflow: hidden;\n}\n\n.calendar-day:hover {\n    transform: translateY(-2px);\n    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);\n}\n\n.calendar-day-number {\n    font-size: 18px;\n    font-weight: 700;\n    line-height: 1;\n}\n\n.calendar-day-status {\n    font-size: 11px;\n    line-height: 1.05;\n    opacity: 0.95;\n    font-weight: 600;\n    margin-top: 2px;\n    white-space: normal;\n    text-align: center;\n}\n\n.calendar-day.available {\n    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);\n    color: white;\n}\n\n.calendar-day.partial {\n    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);\n    color: white;\n}\n\n.calendar-day.partial .calendar-day-number {\n    font-size: 16px;\n}\n.calendar-day.partial .calendar-day-status {\n    font-size: 11px;\n}\n\n.calendar-day.booked {\n    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);\n    color: white;\n}\n\n.calendar-day.booked .calendar-day-number {\n    font-size: 18px;\n}\n\n.calendar-day.booked .calendar-day-status {\n    font-size: 10px;\n}\n\n.calendar-day.unavailable {\n    background: #f1f5f9;\n    color: #94a3b8;\n    opacity: 0.65;\n    border: 1px solid #e2e8f0;\n    cursor: not-allowed;\n    pointer-events: none;\n}\n.calendar-day.unavailable .calendar-day-number { font-size: 18px; }\n.calendar-day.unavailable .calendar-day-status { font-size: 10px; }\n\n.calendar-day.other-month {\n    color: #cbd5e1;\n    background: #f1f5f9;\n}\n\n.calendar-day.selected {\n    border-color: #0ea5e9;\n    border-width: 2px;\n    transform: scale(0.95);\n    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);\n}\n\n.calendar-day.selected:hover {\n    transform: scale(0.95) translateY(-1px);\n    box-shadow: 0 3px 12px rgba(14, 165, 233, 0.4);\n}\n\n.calendar-day.past-date {\n    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;\n    color: #64748b !important;\n    cursor: not-allowed !important;\n    opacity: 0.6 !important;\n    border: 1px solid #bbf7d0 !important;\n    pointer-events: none !important;\n    background-image: none !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n}\n\n/* Override availability colors for past dates */\n.calendar-day.past-date.available,\n.calendar-day.past-date.partial,\n.calendar-day.past-date.booked {\n    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;\n    background-image: none !important;\n    color: #64748b !important;\n    border: 1px solid #bbf7d0 !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n}\n\n.calendar-day.past-date:hover {\n    transform: none !important;\n    box-shadow: none !important;\n    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;\n    color: #64748b !important;\n    display: flex !important;\n    align-items: center !important;\n    justify-content: center !important;\n}\n\n.availability-legend {\n    display: flex;\n    justify-content: space-around;\n    margin-top: 20px;\n    padding-top: 20px;\n    border-top: 1px solid #e2e8f0;\n}\n\n.legend-item {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    font-size: 14px;\n    color: #64748b;\n}\n\n.legend-color {\n    width: 16px;\n    height: 16px;\n    border-radius: 4px;\n}\n\n.legend-color.available {\n    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);\n}\n\n.legend-color.partial {\n    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);\n}\n\n.legend-color.booked {\n    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);\n}\n\n/* Booking Form Styles */\n.booking-form-container {\n    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);\n    border-radius: 20px;\n    padding: 30px;\n    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n    backdrop-filter: blur(10px);\n}\n.booking-form-container #vehicleRateDisplay { font-weight: 700; font-size: 18px; }\n.rate-original { color: #6b7280; text-decoration: line-through; margin-right: 6px; }\n.rate-discount { color: #065f46; font-weight: 700; }\n/* Promo code UI */\n.promo-input-row { display: flex; gap: 10px; align-items: stretch; }\n.apply-promo-btn { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; border: none; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .3s ease; }\n.apply-promo-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(59,130,246,.4); }\n.discount-display { margin-top: 6px; font-size: 14px; color: #065f46; }\n.hidden { display: none; }\n\n/* Promo code UI */\n.hidden { display: none; }\n\n/* Vehicle select styling */\n#vehicleSelect {\n    width: 100%;\n    height: 44px;\n    padding: 10px 40px 10px 12px;\n    border: 2px solid #e5e7eb;\n    border-radius: 10px;\n    background-color: #fff;\n    color: #1f2937;\n    font-weight: 600;\n    box-shadow: 0 2px 10px rgba(0,0,0,0.04);\n    transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;\n    appearance: none;\n    -webkit-appearance: none;\n    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");\n    background-repeat: no-repeat;\n    background-position: right 12px center;\n    background-size: 14px 14px;\n}\n\n#vehicleSelect:hover {\n    border-color: #cbd5e1;\n}\n\n#vehicleSelect:focus {\n    outline: none;\n    border-color: #3b82f6;\n    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);\n}\n\n@media (max-width: 768px) {\n    #vehicleSelect { height: 42px; padding-right: 36px; }\n}\n\n/* Custom dropdown menu for vehicles */\n.vehicle-select { position: relative; }\n.dropdown-button {\n    width: 100%; height: 44px;\n    padding: 10px 40px 10px 12px;\n    border: 2px solid #e5e7eb; border-radius: 10px;\n    background-color: #fff; color: #1f2937; font-weight: 700;\n    box-shadow: 0 2px 10px rgba(0,0,0,0.04);\n    transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;\n    text-align: left; cursor: pointer;\n    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");\n    background-repeat: no-repeat; background-position: right 12px center; background-size: 14px 14px;\n}\n.dropdown-button:hover { border-color: #cbd5e1; }\n.dropdown-button:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }\n\n.dropdown-menu {\n    position: absolute; left: 0; right: 0; top: calc(100% + 6px);\n    background: #fff; border: 2px solid #e5e7eb; border-radius: 12px;\n    box-shadow: 0 10px 24px rgba(0,0,0,0.08);\n    max-height: 240px; overflow-y: auto; z-index: 50;\n}\n.dropdown-menu.hidden { display: none; }\n.dropdown-option {\n    display: flex; align-items: center; justify-content: space-between;\n    padding: 10px 12px; cursor: pointer; font-weight: 600; color: #374151;\n}\n.dropdown-option:hover, .dropdown-option[aria-selected='true'] {\n    background: #f3f4f6;\n}\n.dropdown-option .opt-rate { color: #111827; font-weight: 700; }\n\n@media (max-width: 768px) {\n    .dropdown-button { height: 42px; }\n    .dropdown-menu { max-height: 200px; }\n}\n\n.notice {\n    margin-bottom: 15px;\n    padding: 12px 16px;\n    border-radius: 10px;\n    font-weight: 500;\n    display: none;\n}\n.notice.show { display: block; }\n.notice.success { background: #ecfdf5; color: #065f46; border: 2px solid #10b981; }\n.notice.error { background: #fef2f2; color: #7f1d1d; border: 2px solid #ef4444; }\n\n.form-title {\n    font-size: 24px;\n    font-weight: 600;\n    color: #1e293b;\n    margin-bottom: 25px;\n    text-align: center;\n}`;
        return new Response(css, { status: 200, headers: { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store, max-age=0' } });
      }
      if (url.pathname.startsWith('/script-backend.js')) {
        const js = `// Booking site client (no external loader)\n(function(){\n  var ready=function(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } };\n  ready(function(){\n    var dl=document.getElementById('detectLocation');\n    var form=document.getElementById('bookingForm');\n    var notice=document.getElementById('notice');\n    var setNotice=function(t, ok){ if(!notice) return; notice.textContent=t; notice.classList.remove('hidden'); notice.style.background=ok?'#d4edda':'#f8d7da'; };\n    var overlay=document.getElementById('mapOverlay');\n    var mapObj=null, marker=null;\n    function openMap(lat, lng){ if(!overlay) return; overlay.classList.remove('hidden'); overlay.style.display='flex'; setTimeout(function(){ if(window.L){ if(mapObj){ try{ mapObj.remove(); }catch(_){ } mapObj=null; } mapObj=L.map('mapCanvas'); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapObj); var c=[lat||0,lng||0]; try{ mapObj.setView(c[0]===0 && c[1]===0 ? [20.5937,78.9629] : c, 17); }catch(_){ } marker=L.marker(mapObj.getCenter(), { draggable:true }).addTo(mapObj); } }, 50); }\n    window.openMapCalibrate = openMap;\n    function closeMap(){ if(!overlay) return; overlay.style.display='none'; overlay.classList.add('hidden'); }\n    var closeBtn=document.getElementById('closeMap'); if(closeBtn){ closeBtn.addEventListener('click', closeMap); }\n    var useBtn=document.getElementById('useCoords'); if(useBtn){ useBtn.addEventListener('click', function(){ var el=document.getElementById('location'); if(el && marker){ var p=marker.getLatLng(); el.value=Number(p.lat).toFixed(6)+','+Number(p.lng).toFixed(6); setNotice('Coordinates selected', true); } closeMap(); }); }\n    if(dl){ dl.addEventListener('click', function(){ var el=document.getElementById('location'); if(el) el.value=''; if(!navigator.geolocation){ setNotice('Geolocation not available', false); return; } var best=null; var watchId=null; var finish=function(){ if(watchId!=null){ try{ navigator.geolocation.clearWatch(watchId); }catch(_){ } } if(best && el){ var lat=Number(best.latitude), lng=Number(best.longitude); el.value=lat.toFixed(6)+','+lng.toFixed(6); setNotice('Location detected', true); } else { setNotice('Unable to detect location', false); } }; var onPos=function(pos){ var c=pos&&pos.coords; if(!c) return; if(!best || (typeof c.accuracy==='number' && c.accuracy < best.accuracy)){ best={ latitude:c.latitude, longitude:c.longitude, accuracy:c.accuracy||9999 }; if(best.accuracy<=10){ finish(); } } }; var onErr=function(){ finish(); }; try{ watchId=navigator.geolocation.watchPosition(onPos,onErr,{ enableHighAccuracy:true, maximumAge:0 }); setTimeout(finish, 20000); }catch(_){ onErr(); } }); }\n    var conf=document.getElementById('confirmationOverlay');\n    var closeConfirm=document.getElementById('closeConfirm');\n    var okConfirm=document.getElementById('okConfirm');\n    function showConfirmation(b){ if(!conf) return; conf.classList.remove('hidden'); conf.style.display='flex'; try{\n        var n=document.getElementById('confirmNumber'); var dt=document.getElementById('confirmDate'); var tm=document.getElementById('confirmTime'); var tr=document.getElementById('confirmTrip'); var pu=document.getElementById('confirmPickup'); var dr=document.getElementById('confirmDropoff'); var pr=document.getElementById('confirmPrice');\n        var dateIso=b && (b.pickup_date||b.pickupDate); var dtObj=dateIso?new Date(dateIso):null; var dateStr=dtObj?dtObj.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }):'';\n        if(n) n.textContent='Booking #: '+String(b.booking_number||b.bookingNumber||'')\n        if(dt) dt.textContent='Date: '+dateStr\n        if(tm) tm.textContent='Time: '+String(b.pickup_time||b.pickupTime||'')\n        if(tr) tr.textContent='Trip: '+String(b.trip_type||b.tripType||'')\n        if(pu) pu.textContent='Pickup: '+String(b.pickup_location||b.pickupLocation||'')\n        if(dr) dr.textContent='Dropoff: '+String(b.dropoff_location||b.dropoffLocation||'')\n        if(pr) pr.textContent='Price: ₹'+String(b.price||0)\n      }catch(_){ }\n    }\n    function hideConfirmation(){ if(!conf) return; conf.style.display='none'; conf.classList.add('hidden'); }\n    if(closeConfirm){ closeConfirm.addEventListener('click', hideConfirmation); }\n    if(okConfirm){ okConfirm.addEventListener('click', hideConfirmation); }\n    (function(){ var tabs=document.querySelectorAll('.time-tab'); if(!tabs || !tabs.length) return; for(var i=0;i<tabs.length;i++){ (function(tb){ tb.addEventListener('click', function(){ try{ for(var j=0;j<tabs.length;j++){ tabs[j].classList.remove('active'); } }catch(_){ } tb.classList.add('active'); }); })(tabs[i]); } })();\n    if(form){ form.addEventListener('submit', function(e){ e.preventDefault();\n      var nameEl=document.getElementById('name'); var name=(nameEl && nameEl.value)?nameEl.value:'';\n      var phoneEl=document.getElementById('phone'); var phone=(phoneEl && phoneEl.value)?phoneEl.value:'';\n      var tripNode=document.querySelector('input[name="tripType"]:checked'); var tripRaw=(tripNode && tripNode.value)?tripNode.value:'';\n      var tripType=String(tripRaw).toUpperCase().replace(/-/g,'_').replace(/\s+/g,'_');\n      var timeNode=document.querySelector('.time-tab.active'); var pickupTime=(timeNode && timeNode.getAttribute('data-time'))?timeNode.getAttribute('data-time'):''; if(timeNode && timeNode.className.indexOf('disabled')!==-1){ setNotice('Selected slot not available', false); return; }\n      var locEl=document.getElementById('location'); var loc=((locEl && locEl.value)?locEl.value:'').trim();\n      if(loc && loc.length<5){ setNotice('Location too short (min 5) or leave empty', false); return; }\n      var today=new Date(); today.setHours(0,0,0,0);\n      var y=today.getFullYear(), m=('0'+(today.getMonth()+1)).slice(-2), d=('0'+today.getDate()).slice(-2);\n      var dateSel=(window.selectedPickupDate && String(window.selectedPickupDate).length>=8)?window.selectedPickupDate:(y+'-'+m+'-'+d);\n      var pickupLocation=(tripType==='HOME_TO_AIRPORT')?loc:'Airport';\n      var dropoffLocation=(tripType==='AIRPORT_TO_HOME')?loc:'Airport';\n      var payload={ name:name, phone:phone, pickupLocation:pickupLocation, dropoffLocation:dropoffLocation, pickupDate:dateSel, pickupTime:pickupTime||'morning', tripType:tripType||'HOME_TO_AIRPORT', price:0 };\n      try{\n        if(typeof window.fetch!=='function'){ setNotice('Booking failed: network unsupported', false); return; }\n        window.fetch('/api/bookings', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })\n          .then(function(r){ if(!r.ok){ return r.json().then(function(j){ throw j; }); } return r.json(); })\n          .then(function(j){ setNotice('Booking submitted successfully', true); try{ form.reset(); }catch(_){ } try{ if(window.refreshCalendar){ window.refreshCalendar(); } }catch(_){ } try{ var ds=dateSel; if(window.updateDayStatus){ window.updateDayStatus(ds); } }catch(_){ } try{ if(j && j.booking){ showConfirmation(j.booking); } }catch(_){ } })\n          .catch(function(err){ var msg='Failed to submit booking'; if(err && err.errors && Array.isArray(err.errors)){ msg=err.errors.map(function(e){ return e.msg; }).join('; '); } else if(err && err.error){ msg=String(err.error); } setNotice(msg, false); });\n      }catch(_){ setNotice('Failed to submit booking', false); }\n    }); }\n    var vehBtn=document.getElementById('vehicleDropdown');\n    var vehMenu=document.getElementById('vehicleMenu');\n    var vehSelect=document.getElementById('vehicleSelect');\n    var rateDisplay=document.getElementById('vehicleRateDisplay');\n    var selectedVehicle=null;\n    function renderRate(v){ if(!rateDisplay) return; var r=(v && v.discounted_rate!==undefined)?Number(v.discounted_rate):Number(v && v.rate || 0); var orig=(v && v.discounted_rate!==undefined)?Number(v.rate):null; if(orig!==null && isFinite(orig) && orig>r){ rateDisplay.innerHTML='<span class="rate-original">₹'+orig+'</span><span class="rate-discount">₹'+r+'</span>'; } else { rateDisplay.textContent='₹'+r; } }\n    function closeVehMenu(){ if(vehMenu){ vehMenu.classList.add('hidden'); } if(vehBtn){ vehBtn.setAttribute('aria-expanded','false'); } }\n    function openVehMenu(){ if(vehMenu){ vehMenu.classList.remove('hidden'); } if(vehBtn){ vehBtn.setAttribute('aria-expanded','true'); } }\n    function setSelectedVehicle(v){ selectedVehicle=v; if(vehBtn){ vehBtn.textContent=(v && v.name)?String(v.name):'Select vehicle'; } renderRate(v); if(vehSelect){ try{ while(vehSelect.firstChild){ vehSelect.removeChild(vehSelect.firstChild);} }catch(_){ } var opt=document.createElement('option'); opt.value=(v and v.id)?String(v.id):''; opt.text=(v and v.name)?String(v.name):''; vehSelect.appendChild(opt); }\n      closeVehMenu(); }\n    function populateVehicles(list){ if(!vehMenu) return; try{ while(vehMenu.firstChild){ vehMenu.removeChild(vehMenu.firstChild);} }catch(_){ } for(var i=0;i<list.length;i++){ var v=list[i]||{}; if(v.active===false) continue; var row=document.createElement('div'); row.className='dropdown-option'; row.setAttribute('role','option'); var name=document.createElement('span'); name.textContent=String(v.name||''); var rate=document.createElement('span'); rate.className='opt-rate'; var shownRate=(v.discounted_rate!=null and isFinite(v.discounted_rate))?Number(v.discounted_rate):Number(v.rate||0); rate.textContent='₹'+String(shownRate); row.appendChild(name); row.appendChild(rate); (function(vh){ row.addEventListener('click', function(){ setSelectedVehicle(vh); }); })(v); vehMenu.appendChild(row); } }\n    if(vehBtn){ vehBtn.addEventListener('click', function(){ if(!vehMenu) return; if(vehMenu.className.indexOf('hidden')!==-1){ openVehMenu(); } else { closeVehMenu(); } }); }\n    document.addEventListener('click', function(e){ var t=e.target; if(!vehMenu || !vehBtn) return; if(vehMenu.contains(t) || vehBtn.contains(t)) return; closeVehMenu(); });\n    if(typeof window.fetch==='function'){ try{ window.fetch('/api/vehicles').then(function(r){ return r.json(); }).then(function(j){ var list=(j && j.vehicles)?j.vehicles:[]; populateVehicles(list||[]); }).catch(function(){ populateVehicles([{ id:'sedan', name:'Sedan', rate:700 }, { id:'suv', name:'SUV', rate:900 }, { id:'van', name:'Van', rate:1100 }]); }); }catch(_){ populateVehicles([{ id:'sedan', name:'Sedan', rate:700 }, { id:'suv', name:'SUV', rate:900 }, { id:'van', name:'Van', rate:1100 }]); } }\n    (function(){\n      var grid=document.getElementById('calendarGrid');\n      var monthLabel=document.getElementById('monthYear');\n      var prevBtn=document.getElementById('prevMonth');\n      var nextBtn=document.getElementById('nextMonth');\n      var selDisplay=document.getElementById('selectedDateDisplay');\n      if(!grid or !monthLabel){ return; }\n      var current=new Date(); current.setDate(1); current.setHours(0,0,0,0);\n      function pad(n){ n=String(n); return n.length<2?('0'+n):n; }\n      function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }\n      function clearGrid(){ try{ while(grid.firstChild){ grid.removeChild(grid.firstChild);} }catch(_){ }\n        var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; for(var i=0;i<7;i++){ var w=document.createElement('div'); w.className='weekday'; w.textContent=days[i]; grid.appendChild(w); }\n      }\n      function statusMap(rows){ var map={}; if(rows and typeof rows.length==='number'){ for(var i=0;i<rows.length;i++){ var r=rows[i]||{}; var iso=r.date?String(r.date):null; if(!iso){ continue; } var dt=new Date(iso); dt.setHours(0,0,0,0); var day=fmt(dt); var mA=(r.morning_available!==undefined)?!!r.morning_available:!!r.morningAvailable; var eA=(r.evening_available!==undefined)?!!r.evening_available:!!r.eveningAvailable; map[day]={ m:mA, e:eA }; } } return map; }\n      function render(){ clearGrid(); var year=current.getFullYear(); var month=current.getMonth(); var firstDow=(new Date(year, month, 1)).getDay(); var daysInMonth=(new Date(year, month+1, 0)).getDate();\n        var startDate=new Date(year, month, 1); var endDate=new Date(year, month, daysInMonth);\n        monthLabel.textContent = startDate.toLocaleString('en-US', { month:'long'})+' '+year;\n        for(var p=0;p<firstDow;p++){ var ph=document.createElement('div'); ph.className='calendar-day other-month unavailable'; ph.setAttribute('aria-hidden','true'); grid.appendChild(ph); }\n        var today=new Date(); today.setHours(0,0,0,0);\n        var buildCells=function(map){ for(var d=1; d<=daysInMonth; d++){\n            var dateObj=new Date(year, month, d); dateObj.setHours(0,0,0,0); var dayStr=fmt(dateObj);\n            var av=(map and map[dayStr])?map[dayStr]:{ m:true, e:true };\n            var st=(av.m and av.e)?'available':((av.m or av.e)?'partial':'booked');\n            var cell=document.createElement('div'); cell.className='calendar-day';\n            cell.setAttribute('data-date', dayStr);\n            if(st==='available'){ cell.className+=' available'; } else if(st==='partial'){ cell.className+=' partial'; } else { cell.className+=' booked'; }\n            var isPast=dateObj.getTime()<today.getTime(); if(isPast){ cell.className+=' past-date'; }\n            var num=document.createElement('div'); num.className='calendar-day-number'; num.textContent=String(d);\n            cell.appendChild(num);\n            if(!isPast and st!=='available'){ var lab=document.createElement('div'); lab.className='calendar-day-status'; if(st==='partial'){ lab.textContent= av.m ? 'Morning available' : 'Evening available'; } else { lab.textContent='Fully booked'; } cell.appendChild(lab); }\n            (function(cellEl, ds, isPast){ cellEl.addEventListener('click', function(){ if(isPast){ return; } window.selectedPickupDate=ds; if(selDisplay){ try{ selDisplay.innerHTML=''; }catch(_){ } var wrap=document.createElement('div'); wrap.className='selected-date-info'; var dayEl=document.createElement('div'); dayEl.className='selected-date-day'; dayEl.textContent=ds.split('-')[2]; var my=document.createElement('div'); my.className='selected-date-month-year'; my.textContent=startDate.toLocaleString('en-US',{ month:'long'})+' '+year; var wk=document.createElement('div'); wk.className='selected-date-weekday'; wk.textContent=(new Date(ds)).toLocaleString('en-US',{ weekday:'long'}); wrap.appendChild(dayEl); wrap.appendChild(my); wrap.appendChild(wk); selDisplay.appendChild(wrap); }\n              try{ var prevSel=grid.querySelector('.calendar-day.selected'); if(prevSel){ prevSel.className=prevSel.className.replace(' selected',''); } }catch(_){ }\n              cellEl.className+=' selected';\n              try{ if(window.updateTimeTabsForDate){ window.updateTimeTabsForDate(ds); } }catch(_){ }\n            }); })(cell, dayStr, isPast);\n            grid.appendChild(cell);\n          } };\n        if(typeof window.fetch==='function'){\n          try{\n            window.fetch('/api/availability?startDate='+encodeURIComponent(fmt(startDate))+'&endDate='+encodeURIComponent(fmt(endDate)))\n              .then(function(r){ return r.json(); }).then(function(rows){ var map=statusMap(rows); buildCells(map); })\n              .catch(function(){ buildCells(null); });\n          }catch(_){ buildCells(null); }\n        } else { buildCells(null); }\n      }\n      if(prevBtn){ prevBtn.addEventListener('click', function(){ current.setMonth(current.getMonth()-1); render(); }); }\n      if(nextBtn){ nextBtn.addEventListener('click', function(){ current.setMonth(current.getMonth()+1); render(); }); }\n      try{ window.updateDayStatus=function(ds){ if(!ds) return; if(typeof window.fetch!=='function') return; window.fetch('/api/availability/'+encodeURIComponent(ds)).then(function(r){ return r.json(); }).then(function(row){ var mA=(row.morning_available!==undefined)?!!row.morning_available:!!row.morningAvailable; var eA=(row.evening_available!==undefined)?!!row.evening_available:!!row.eveningAvailable; var st=(mA and eA)?'available':((mA or eA)?'partial':'booked'); var cell=grid.querySelector('[data-date="'+ds+'"]'); if(!cell) return; cell.className='calendar-day'; if(st==='available'){ cell.className+=' available'; } else if(st==='partial'){ cell.className+=' partial'; } else { cell.className+=' booked'; } var today=new Date(); today.setHours(0,0,0,0); var parts=ds.split('-'); var dObj=new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2])); dObj.setHours(0,0,0,0); var isPast=dObj.getTime()<today.getTime(); var lab=cell.querySelector('.calendar-day-status'); if(!lab){ lab=document.createElement('div'); lab.className='calendar-day-status'; cell.appendChild(lab); } if(!isPast and st!=='available'){ lab.textContent= mA ? 'Morning available' : 'Evening available'; } else { lab.textContent=''; } }).catch(function(){}); }; }catch(_){ }\n      render();\n      try{ window.refreshCalendar=function(){ render(); }; }catch(_){ }\n      try{ window.updateTimeTabsForDate=function(ds){ if(!ds) return; if(typeof window.fetch!=='function') return; var morningTab=document.querySelector('[data-time="morning"]'); var eveningTab=document.querySelector('[data-time="evening"]'); window.fetch('/api/availability/'+encodeURIComponent(ds)).then(function(r){ return r.json(); }).then(function(row){ var mA=(row.morning_available!==undefined)?!!row.morning_available:!!row.morningAvailable; var eA=(row.evening_available!==undefined)?!!row.evening_available:!!row.eveningAvailable; if(morningTab){ if(!mA){ morningTab.classList.add('disabled'); morningTab.style.pointerEvents='none'; } else { morningTab.classList.remove('disabled'); morningTab.style.pointerEvents='auto'; } } if(eveningTab){ if(!eA){ eveningTab.classList.add('disabled'); eveningTab.style.pointerEvents='none'; } else { eveningTab.classList.remove('disabled'); eveningTab.style.pointerEvents='auto'; } } var active=document.querySelector('.time-tab.active'); if(active and active.className.indexOf('disabled')!==-1){ try{ active.classList.remove('active'); }catch(_){ } if(mA){ if(morningTab){ morningTab.classList.add('active'); } } else if(eA){ if(eveningTab){ eveningTab.classList.add('active'); } } } }).catch(function(){}); }; }catch(_){ }\n      try{ setTimeout(function(){ var totalDays=(new Date(current.getFullYear(), current.getMonth()+1, 0)).getDate(); var cells=grid.querySelectorAll('.calendar-day').length; if(cells>=totalDays){ if(notice){ notice.textContent='Calendar ready: '+cells+' cells'; notice.classList.remove('hidden'); notice.style.background='#d4edda'; } } else { if(notice){ notice.textContent='Calendar error: expected '+totalDays+' cells, got '+cells; notice.classList.remove('hidden'); notice.style.background='#f8d7da'; } } }, 80); }catch(_){ }\n    })();\n  });\n})();`;
        return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store, max-age=0' } });
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
      if (!env.ASSETS && (url.pathname === '/' || url.pathname === '/index' || url.pathname === '/index.html')) {
        return Response.redirect(url.origin + '/', 302);
      }
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Worker exception', message: String(e && e.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  }
};