// Booking site client helper (no external loader)
(function(){
  var ready=function(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } };
  ready(function(){
    var dl=document.getElementById('detectLocation');
    var form=document.getElementById('bookingForm');
    var notice=document.getElementById('notice');
    var setNotice=function(t, ok){ if(!notice) return; notice.textContent=t; notice.classList.remove('hidden'); notice.style.background=ok?'#d4edda':'#f8d7da'; };
    try{
      window.onerror = function(message, source, lineno, colno, error){
        try{
          var txt = 'JS Error: ' + String(message || 'Unknown') + ' at ' + String(source||'') + ':' + String(lineno||0) + ':' + String(colno||0);
          if (typeof setNotice === 'function') setNotice(txt, false);
          console.error(txt);
        }catch(_){ }
        return false;
      };
      window.addEventListener('error', function(ev){ try{ var msg=(ev && ev.message) ? String(ev.message) : 'Unexpected error'; var src=(ev && ev.filename) ? ev.filename : ''; var ln=(ev && ev.lineno) ? ev.lineno : 0; var cn=(ev && ev.colno) ? ev.colno : 0; var txt='JS Error: '+msg+' at '+src+':'+ln+':'+cn; if (typeof setNotice === 'function') setNotice(txt, false); console.error(txt); }catch(_){ } });
      window.addEventListener('unhandledrejection', function(ev){ try{ var msg='Promise rejection: '+String((ev && ev.reason && ev.reason.message) ? ev.reason.message : ev.reason || 'Unknown'); if (typeof setNotice === 'function') setNotice(msg, false); console.error(msg); }catch(_){ } });
    }catch(_){ }
    var overlay=document.getElementById('mapOverlay');
    var mapObj=null, marker=null;
    function openMap(lat, lng){ if(!overlay) return; overlay.classList.remove('hidden'); overlay.style.display='flex'; setTimeout(function(){ if(window.L){ if(mapObj){ try{ mapObj.remove(); }catch(_){ } mapObj=null; } mapObj=L.map('mapCanvas'); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapObj); var c=[lat||0,lng||0]; try{ mapObj.setView(c[0]===0 && c[1]===0 ? [20.5937,78.9629] : c, 17); }catch(_){ } marker=L.marker(mapObj.getCenter(), { draggable:true }).addTo(mapObj); } }, 50); }
    window.openMapCalibrate = openMap;
    function closeMap(){ if(!overlay) return; overlay.style.display='none'; overlay.classList.add('hidden'); }
    var closeBtn=document.getElementById('closeMap'); if(closeBtn){ closeBtn.addEventListener('click', closeMap); }
    var useBtn=document.getElementById('useCoords'); if(useBtn){ useBtn.addEventListener('click', function(){ var el=document.getElementById('location'); if(el && marker){ var p=marker.getLatLng(); el.value=Number(p.lat).toFixed(6)+','+Number(p.lng).toFixed(6); setNotice('Coordinates selected', true); } closeMap(); }); }
    if(dl){ dl.addEventListener('click', function(){ var el=document.getElementById('location'); if(el) el.value=''; if(!navigator.geolocation){ setNotice('Geolocation not available', false); return; } var best=null; var watchId=null; var finish=function(){ if(watchId!=null){ try{ navigator.geolocation.clearWatch(watchId); }catch(_){ } } if(best && el){ var lat=Number(best.latitude), lng=Number(best.longitude); el.value=lat.toFixed(6)+','+lng.toFixed(6); setNotice('Location detected', true); } else { setNotice('Unable to detect location', false); } }; var onPos=function(pos){ var c=pos&&pos.coords; if(!c) return; if(!best || (typeof c.accuracy==='number' && c.accuracy < best.accuracy)){ best={ latitude:c.latitude, longitude:c.longitude, accuracy:c.accuracy||9999 }; if(best.accuracy<=10){ finish(); } } }; var onErr=function(){ finish(); }; try{ watchId=navigator.geolocation.watchPosition(onPos,onErr,{ enableHighAccuracy:true, maximumAge:0 }); setTimeout(finish, 20000); }catch(_){ onErr(); } }); }
    // Fallback time-tab toggle if main frontend is not loaded
    try{ document.querySelectorAll('.time-tab').forEach(function(btn){ btn.addEventListener('click', function(){ document.querySelectorAll('.time-tab').forEach(function(b){ b.classList.remove('active'); }); btn.classList.add('active'); }); }); }catch(_){}

    // Calendar builder
    (function(){
      var grid=document.getElementById('calendarGrid');
      var monthLabel=document.getElementById('monthYear');
      var prevBtn=document.getElementById('prevMonth');
      var nextBtn=document.getElementById('nextMonth');
      var selDisplay=document.getElementById('selectedDateDisplay');
      if(!grid || !monthLabel) return;
      var current=new Date(); current.setDate(1); current.setHours(0,0,0,0);
      function pad(n){ n=String(n); return n.length<2?('0'+n):n; }
      function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
      function clearGrid(){ try{ while(grid.firstChild){ grid.removeChild(grid.firstChild);} }catch(_){}
        var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; for(var i=0;i<7;i++){ var w=document.createElement('div'); w.className='weekday'; w.textContent=days[i]; grid.appendChild(w); }
      }
      function statusMap(rows){ var map={}; if(Array.isArray(rows)){ for(var i=0;i<rows.length;i++){ var r=rows[i]; var iso=(r && r.date) ? String(r.date) : null; if(!iso) continue; var day=iso.split('T')[0]; var mA=(r.morning_available!==undefined)?!!r.morning_available:!!r.morningAvailable; var eA=(r.evening_available!==undefined)?!!r.evening_available:!!r.eveningAvailable; var st='available'; if(mA && eA){ st='available'; } else if(mA || eA){ st='partial'; } else { st='booked'; } map[day]=st; } } return map; }
      function render(){ clearGrid(); var year=current.getFullYear(); var month=current.getMonth(); var firstDow=(new Date(year, month, 1)).getDay(); var daysInMonth=(new Date(year, month+1, 0)).getDate(); var lastMonthDays=(new Date(year, month, 0)).getDate();
        var startDate=new Date(year, month, 1); var endDate=new Date(year, month, daysInMonth); var startStr=fmt(startDate); var endStr=fmt(endDate);
        monthLabel.textContent = startDate.toLocaleString('en-US', { month:'long'})+' '+year;
        var placeholders=firstDow;
        for(var p=0;p<placeholders;p++){ var ph=document.createElement('div'); ph.className='day placeholder'; ph.setAttribute('aria-hidden','true'); grid.appendChild(ph); }
        fetch('/api/availability?startDate='+encodeURIComponent(startStr)+'&endDate='+encodeURIComponent(endStr))
          .then(function(r){ return r.json(); }).then(function(rows){ var map=statusMap(rows);
            for(var d=1; d<=daysInMonth; d++){
              var cell=document.createElement('div'); cell.className='dp-day'; cell.textContent=String(d);
              var dateObj=new Date(year, month, d); dateObj.setHours(0,0,0,0); var dayStr=fmt(dateObj);
              var st=map[dayStr]||'available'; if(st==='available'){ cell.className+=' available'; } else if(st==='partial'){ cell.className+=' partial'; } else { cell.className+=' booked'; }
              (function(ds){ cell.addEventListener('click', function(){ window.selectedPickupDate=ds; if(selDisplay){ try{ selDisplay.innerHTML=''; }catch(_){ } var span=document.createElement('span'); span.textContent=ds; selDisplay.appendChild(span); } }); })(dayStr);
              grid.appendChild(cell);
            }
          }).catch(function(){
            for(var d=1; d<=daysInMonth; d++){
              var cell=document.createElement('div'); cell.className='dp-day available'; cell.textContent=String(d);
              var dateObj=new Date(year, month, d); var dayStr=fmt(dateObj);
              (function(ds){ cell.addEventListener('click', function(){ window.selectedPickupDate=ds; if(selDisplay){ try{ selDisplay.innerHTML=''; }catch(_){ } var span=document.createElement('span'); span.textContent=ds; selDisplay.appendChild(span); } }); })(dayStr);
              grid.appendChild(cell);
            }
          });
      }
      if(prevBtn){ prevBtn.addEventListener('click', function(){ current.setMonth(current.getMonth()-1); render(); }); }
      if(nextBtn){ nextBtn.addEventListener('click', function(){ current.setMonth(current.getMonth()+1); render(); }); }
      render();
    })();

    // Local submit handler to support localhost testing without /api/frontend.js
    if(form){ form.addEventListener('submit', function(e){ e.preventDefault();
      var nameEl=document.getElementById('name'); var name=(nameEl && nameEl.value) ? nameEl.value : '';
      var phoneEl=document.getElementById('phone'); var phone=(phoneEl && phoneEl.value) ? phoneEl.value : '';
      var tripNode=document.querySelector('input[name="tripType"]:checked'); var tripRaw=(tripNode && tripNode.value) ? tripNode.value : '';
      var tripType=tripRaw.toUpperCase().replace(/-/g,'_').replace(/\s+/g,'_');
      var timeNode=document.querySelector('.time-tab.active'); var pickupTime=(timeNode && timeNode.getAttribute('data-time')) ? timeNode.getAttribute('data-time') : '';
      var locEl=document.getElementById('location'); var loc=((locEl && locEl.value) ? locEl.value : '').trim();
      if(loc.length<3){ setNotice('Enter pickup location (at least 3 characters)', false); return; }
      var today=new Date(); today.setHours(0,0,0,0);
      var y=today.getFullYear(), m=('0'+(today.getMonth()+1)).slice(-2), d=('0'+today.getDate()).slice(-2);
      var dateSel = (window.selectedPickupDate && String(window.selectedPickupDate).length>=8) ? window.selectedPickupDate : (y+'-'+m+'-'+d');
      var payload={
        name:name,
        phone:phone,
        pickupLocation:(tripType==='HOME_TO_AIRPORT'?loc:'Airport'),
        dropoffLocation:(tripType==='AIRPORT_TO_HOME'?loc:'Airport'),
        pickupDate:dateSel,
        pickupTime:pickupTime||'morning',
        tripType:tripType||'HOME_TO_AIRPORT',
        vehicleId:null,
        vehicleName:null,
        vehicleRate:0,
        price:0
      };
      try{
        var req = fetch('/api/bookings', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
        req.then(function(r){
          if(!r.ok){
            r.json().then(function(j){
              if(j && j.errors && Array.isArray(j.errors)){
                var msg=j.errors.map(function(e){ return e.msg; }).join('; ');
                setNotice(msg||('HTTP '+r.status), false);
              } else if(j && j.error){
                setNotice(String(j.error), false);
              } else {
                setNotice('Failed to submit booking. Please try again.', false);
              }
            }).catch(function(){ setNotice('Failed to submit booking. Please try again.', false); });
            return;
          }
          setNotice('Booking submitted successfully', true);
          form.reset();
        }).catch(function(){ setNotice('Failed to submit booking. Please try again.', false); });
      }catch(err){ setNotice('Failed to submit booking. Please try again.', false); }
    }); }
  });
})();