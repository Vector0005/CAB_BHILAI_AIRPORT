export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const json = (data, status = 200, extraHeaders) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...(extraHeaders || {}) } });
      if (url.pathname === '/assets/logo.svg') {
        const direct = (env.LOGO_PUBLIC_URL || '').trim();
        if (direct) {
          try {
            const r0 = await fetch(direct, { method: 'HEAD' });
            if (r0 && r0.ok) return Response.redirect(direct, 302);
          } catch (_) {}
          try {
            const r0g = await fetch(direct, { method: 'GET' });
            if (r0g && r0g.ok) return Response.redirect(direct, 302);
          } catch (_) {}
        }
        const sbBase = (env.SUPABASE_URL || '').trim();
        if (sbBase) {
          const base = sbBase.replace(/\/$/, '');
          const svg = base + '/storage/v1/object/public/branding/logo.svg';
          const png = base + '/storage/v1/object/public/branding/logo.png';
          try {
            const r = await fetch(svg, { method: 'HEAD' });
            if (r && r.ok) return Response.redirect(svg, 302);
          } catch (_) {}
          try {
            const rg = await fetch(svg, { method: 'GET' });
            if (rg && rg.ok) return Response.redirect(svg, 302);
          } catch (_) {}
          try {
            const r2 = await fetch(png, { method: 'HEAD' });
            if (r2 && r2.ok) return Response.redirect(png, 302);
          } catch (_) {}
          try {
            const r2g = await fetch(png, { method: 'GET' });
            if (r2g && r2g.ok) return Response.redirect(png, 302);
          } catch (_) {}
        }
        return new Response('Logo not found', { status: 404 });
      }
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
        if (pathname === '/api/logo.js' && method === 'GET') {
          const override = String(url.searchParams.get('u')||'').trim();
          const direct = override || String(env.LOGO_PUBLIC_URL||'');
          const js = 'window.APP_LOGO_URL=' + JSON.stringify(direct) + ';try{localStorage.setItem("logoPublicUrl", String(window.APP_LOGO_URL||""));}catch(_){}';
          return new Response(js, { status: 200, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store, max-age=0' } });
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
      const mh = (document.getElementById('manualHour')?.value||'').trim();
      const mm = (document.getElementById('manualMinute')?.value||'').trim();
      const ap = (document.getElementById('manualAmPm')?.value||'').trim().toUpperCase();
      let exactTime = '';
      if (mh && mm && (ap==='AM' || ap==='PM')) {
        const h = Math.max(1, Math.min(12, Number(mh)));
        const m = Math.max(0, Math.min(59, Number(mm)));
        exactTime = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ' ' + ap;
      }
      const tripRaw = (document.querySelector('input[name="tripType"]:checked')?.value || '');
      const tripType = tripRaw.toUpperCase().replace(/-/g,'_').replace(/\s+/g,'_');
      const locInput = (document.getElementById('location')?.value || '').trim();
      const isLatLng = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(locInput);
      const isMapUrl = /^https?:\/\//i.test(locInput) && /google\.com\/maps|maps\.app\.goo\.gl/i.test(locInput);
      if (!isLatLng && !isMapUrl) {
        setNotice('Paste a Google Maps link or click Detect Location to use coordinates', false);
        return;
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
        price: finalRate,
        notes: (exactTime ? ('Exact Pickup Time: ' + exactTime) : '')
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
    const ampmDropdown = document.getElementById('ampmDropdown');
    const ampmMenu = document.getElementById('ampmMenu');
    const ampmHidden = document.getElementById('manualAmPm');
    if (ampmDropdown && ampmMenu && ampmHidden) {
      ampmHidden.value = ampmHidden.value || 'AM';
      ampmDropdown.textContent = ampmHidden.value;
      ampmDropdown.addEventListener('click', () => {
        const isOpen = ampmDropdown.getAttribute('aria-expanded')==='true';
        ampmDropdown.setAttribute('aria-expanded', String(!isOpen));
        ampmMenu.classList.toggle('hidden');
      });
      ampmMenu.querySelectorAll('.dropdown-item').forEach(it => it.addEventListener('click', () => {
        const val = (it.getAttribute('data-value')||'AM').toUpperCase();
        ampmHidden.value = val;
        ampmDropdown.textContent = val;
        ampmMenu.classList.add('hidden');
        ampmDropdown.setAttribute('aria-expanded','false');
      }));
      document.addEventListener('click', (ev) => {
        const t = ev.target;
        if (!ampmDropdown.contains(t) && !ampmMenu.contains(t)) {
          ampmMenu.classList.add('hidden');
          ampmDropdown.setAttribute('aria-expanded','false');
        }
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { initCalendar(); initVehicles(); initBookingForm(); });
  } else {
    initCalendar(); initVehicles(); initBookingForm();
  }
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
          const payload = { id, booking_number: bn, user_id: userId, name, phone, email, pickup_location: body?.pickupLocation || '', dropoff_location: body?.dropoffLocation || '', pickup_date: toISO(body?.pickupDate), pickup_time: body?.pickupTime || body?.timeSlot || '', trip_type: body?.tripType || '', status: 'PENDING', price: body?.price || 0, vehicle_id: body?.vehicleId || null, vehicle_name: body?.vehicleName || null, vehicle_rate: body?.vehicleRate || null };
          const r = await supabase('/bookings', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) }, true);
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