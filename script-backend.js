// Booking site client (no external loader)
(function(){
  var ready=function(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } };
  ready(function(){
    var dl=document.getElementById('detectLocation');
    var form=document.getElementById('bookingForm');
    var notice=document.getElementById('notice');
    var setNotice=function(t, ok){ if(!notice) return; notice.textContent=t; notice.classList.remove('hidden'); notice.style.background=ok?'#d4edda':'#f8d7da'; };
    var overlay=document.getElementById('mapOverlay');
    var mapObj=null, marker=null;
    function openMap(lat, lng){ if(!overlay) return; overlay.classList.remove('hidden'); overlay.style.display='flex'; setTimeout(function(){ if(window.L){ if(mapObj){ try{ mapObj.remove(); }catch(_){ } mapObj=null; } mapObj=L.map('mapCanvas'); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapObj); var c=[lat||0,lng||0]; try{ mapObj.setView(c[0]===0 && c[1]===0 ? [20.5937,78.9629] : c, 17); }catch(_){ } marker=L.marker(mapObj.getCenter(), { draggable:true }).addTo(mapObj); } }, 50); }
    window.openMapCalibrate = openMap;
    function closeMap(){ if(!overlay) return; overlay.style.display='none'; overlay.classList.add('hidden'); }
    var closeBtn=document.getElementById('closeMap'); if(closeBtn){ closeBtn.addEventListener('click', closeMap); }
    var useBtn=document.getElementById('useCoords'); if(useBtn){ useBtn.addEventListener('click', function(){ var el=document.getElementById('location'); if(el && marker){ var p=marker.getLatLng(); el.value=Number(p.lat).toFixed(6)+','+Number(p.lng).toFixed(6); setNotice('Coordinates selected', true); } closeMap(); }); }
    if(dl){ dl.addEventListener('click', function(){ var el=document.getElementById('location'); if(el) el.value=''; if(!navigator.geolocation){ setNotice('Geolocation not available', false); return; } var best=null; var watchId=null; var finish=function(){ if(watchId!=null){ try{ navigator.geolocation.clearWatch(watchId); }catch(_){ } } if(best && el){ var lat=Number(best.latitude), lng=Number(best.longitude); el.value=lat.toFixed(6)+','+lng.toFixed(6); setNotice('Location detected', true); } else { setNotice('Unable to detect location', false); } }; var onPos=function(pos){ var c=pos&&pos.coords; if(!c) return; if(!best || (typeof c.accuracy==='number' && c.accuracy < best.accuracy)){ best={ latitude:c.latitude, longitude:c.longitude, accuracy:c.accuracy||9999 }; if(best.accuracy<=10){ finish(); } } }; var onErr=function(){ finish(); }; try{ watchId=navigator.geolocation.watchPosition(onPos,onErr,{ enableHighAccuracy:true, maximumAge:0 }); setTimeout(finish, 20000); }catch(_){ onErr(); } }); }
    // Confirmation modal helpers
    var conf=document.getElementById('confirmationOverlay');
    var closeConfirm=document.getElementById('closeConfirm');
    var okConfirm=document.getElementById('okConfirm');
    function showConfirmation(b){ if(!conf) return; conf.classList.remove('hidden'); conf.style.display='flex'; try{
        var n=document.getElementById('confirmNumber'); var dt=document.getElementById('confirmDate'); var tm=document.getElementById('confirmTime'); var tr=document.getElementById('confirmTrip'); var pu=document.getElementById('confirmPickup'); var dr=document.getElementById('confirmDropoff'); var pr=document.getElementById('confirmPrice');
        var dateIso=b && (b.pickup_date||b.pickupDate); var dtObj=dateIso?new Date(dateIso):null; var dateStr=dtObj?dtObj.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }):'';
        if(n) n.textContent='Booking #: '+String(b.booking_number||b.bookingNumber||'')
        if(dt) dt.textContent='Date: '+dateStr
        if(tm) tm.textContent='Time: '+String(b.pickup_time||b.pickupTime||'')
        if(tr) tr.textContent='Trip: '+String(b.trip_type||b.tripType||'')
        if(pu) pu.textContent='Pickup: '+String(b.pickup_location||b.pickupLocation||'')
        if(dr) dr.textContent='Dropoff: '+String(b.dropoff_location||b.dropoffLocation||'')
        if(pr) pr.textContent='Price: ₹'+String(b.price||0)
      }catch(_){ }
    }
    function hideConfirmation(){ if(!conf) return; conf.style.display='none'; conf.classList.add('hidden'); }
    if(closeConfirm){ closeConfirm.addEventListener('click', hideConfirmation); }
    if(okConfirm){ okConfirm.addEventListener('click', hideConfirmation); }

    (function(){ var tabs=document.querySelectorAll('.time-tab'); if(!tabs || !tabs.length) return; for(var i=0;i<tabs.length;i++){ (function(tb){ tb.addEventListener('click', function(){ try{ for(var j=0;j<tabs.length;j++){ tabs[j].classList.remove('active'); } }catch(_){ } tb.classList.add('active'); }); })(tabs[i]); } })();

    if(form){ form.addEventListener('submit', function(e){ e.preventDefault();
      var nameEl=document.getElementById('name'); var name=(nameEl && nameEl.value)?nameEl.value:'';
      var phoneEl=document.getElementById('phone'); var phone=(phoneEl && phoneEl.value)?phoneEl.value:'';
      var tripNode=document.querySelector('input[name="tripType"]:checked'); var tripRaw=(tripNode && tripNode.value)?tripNode.value:'';
      var tripType=String(tripRaw).toUpperCase().replace(/-/g,'_').replace(/\s+/g,'_');
      var timeNode=document.querySelector('.time-tab.active'); var pickupTime=(timeNode && timeNode.getAttribute('data-time'))?timeNode.getAttribute('data-time'):''; if(timeNode && timeNode.className.indexOf('disabled')!==-1){ setNotice('Selected slot not available', false); return; }
      var locEl=document.getElementById('location'); var loc=((locEl && locEl.value)?locEl.value:'').trim();
      if(loc && loc.length<5){ setNotice('Location too short (min 5) or leave empty', false); return; }
      var today=new Date(); today.setHours(0,0,0,0);
      var y=today.getFullYear(), m=('0'+(today.getMonth()+1)).slice(-2), d=('0'+today.getDate()).slice(-2);
      var dateSel=(window.selectedPickupDate && String(window.selectedPickupDate).length>=8)?window.selectedPickupDate:(y+'-'+m+'-'+d);
      var pickupLocation=(tripType==='HOME_TO_AIRPORT')?loc:'Airport';
      var dropoffLocation=(tripType==='AIRPORT_TO_HOME')?loc:'Airport';
      var payload={ name:name, phone:phone, pickupLocation:pickupLocation, dropoffLocation:dropoffLocation, pickupDate:dateSel, pickupTime:pickupTime||'morning', tripType:tripType||'HOME_TO_AIRPORT', price:0 };
      try{
        if(typeof window.fetch!=='function'){ setNotice('Booking failed: network unsupported', false); return; }
        window.fetch('/api/bookings', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
          .then(function(r){ if(!r.ok){ return r.json().then(function(j){ throw j; }); } return r.json(); })
          .then(function(j){ setNotice('Booking submitted successfully', true); try{ form.reset(); }catch(_){ } try{ if(window.refreshCalendar){ window.refreshCalendar(); } }catch(_){ } try{ var ds=dateSel; if(window.updateDayStatus){ window.updateDayStatus(ds); } }catch(_){ } try{ if(j && j.booking){ showConfirmation(j.booking); } }catch(_){ } })
          .catch(function(err){ var msg='Failed to submit booking'; if(err && err.errors && Array.isArray(err.errors)){ msg=err.errors.map(function(e){ return e.msg; }).join('; '); } else if(err && err.error){ msg=String(err.error); } setNotice(msg, false); });
      }catch(_){ setNotice('Failed to submit booking', false); }
    }); }

    // Vehicle dropdown
    var vehBtn=document.getElementById('vehicleDropdown');
    var vehMenu=document.getElementById('vehicleMenu');
    var vehSelect=document.getElementById('vehicleSelect');
    var rateDisplay=document.getElementById('vehicleRateDisplay');
    var selectedVehicle=null;
    function renderRate(v){ if(!rateDisplay) return; var r=(v && v.discounted_rate!==undefined)?Number(v.discounted_rate):Number(v && v.rate || 0); var orig=(v && v.discounted_rate!==undefined)?Number(v.rate):null; if(orig!==null && isFinite(orig) && orig>r){ rateDisplay.innerHTML='<span class="rate-original">₹'+orig+'</span><span class="rate-discount">₹'+r+'</span>'; } else { rateDisplay.textContent='₹'+r; } }
    function closeVehMenu(){ if(vehMenu){ vehMenu.classList.add('hidden'); } if(vehBtn){ vehBtn.setAttribute('aria-expanded','false'); } }
    function openVehMenu(){ if(vehMenu){ vehMenu.classList.remove('hidden'); } if(vehBtn){ vehBtn.setAttribute('aria-expanded','true'); } }
    function setSelectedVehicle(v){ selectedVehicle=v; if(vehBtn){ vehBtn.textContent=(v && v.name)?String(v.name):'Select vehicle'; } renderRate(v); if(vehSelect){ try{ while(vehSelect.firstChild){ vehSelect.removeChild(vehSelect.firstChild);} }catch(_){ } var opt=document.createElement('option'); opt.value=(v && v.id)?String(v.id):''; opt.text=(v && v.name)?String(v.name):''; vehSelect.appendChild(opt); }
      closeVehMenu(); }
    function populateVehicles(list){ if(!vehMenu) return; try{ while(vehMenu.firstChild){ vehMenu.removeChild(vehMenu.firstChild);} }catch(_){ } for(var i=0;i<list.length;i++){ var v=list[i]||{}; if(v.active===false) continue; var row=document.createElement('div'); row.className='dropdown-option'; row.setAttribute('role','option'); var name=document.createElement('span'); name.textContent=String(v.name||''); var rate=document.createElement('span'); rate.className='opt-rate'; var shownRate=(v.discounted_rate!=null && isFinite(v.discounted_rate))?Number(v.discounted_rate):Number(v.rate||0); rate.textContent='₹'+String(shownRate); row.appendChild(name); row.appendChild(rate); (function(vh){ row.addEventListener('click', function(){ setSelectedVehicle(vh); }); })(v); vehMenu.appendChild(row); } }
    if(vehBtn){ vehBtn.addEventListener('click', function(){ if(!vehMenu) return; if(vehMenu.className.indexOf('hidden')!==-1){ openVehMenu(); } else { closeVehMenu(); } }); }
    document.addEventListener('click', function(e){ var t=e.target; if(!vehMenu || !vehBtn) return; if(vehMenu.contains(t) || vehBtn.contains(t)) return; closeVehMenu(); });
    if(typeof window.fetch==='function'){ try{ window.fetch('/api/vehicles').then(function(r){ return r.json(); }).then(function(j){ var list=(j && j.vehicles)?j.vehicles:[]; populateVehicles(list||[]); }).catch(function(){ populateVehicles([{ id:'sedan', name:'Sedan', rate:700 }, { id:'suv', name:'SUV', rate:900 }, { id:'van', name:'Van', rate:1100 }]); }); }catch(_){ populateVehicles([{ id:'sedan', name:'Sedan', rate:700 }, { id:'suv', name:'SUV', rate:900 }, { id:'van', name:'Van', rate:1100 }]); } }

    (function(){
      var grid=document.getElementById('calendarGrid');
      var monthLabel=document.getElementById('monthYear');
      var prevBtn=document.getElementById('prevMonth');
      var nextBtn=document.getElementById('nextMonth');
      var selDisplay=document.getElementById('selectedDateDisplay');
      if(!grid || !monthLabel){ return; }
      var current=new Date(); current.setDate(1); current.setHours(0,0,0,0);
      function pad(n){ n=String(n); return n.length<2?('0'+n):n; }
      function fmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
      function clearGrid(){ try{ while(grid.firstChild){ grid.removeChild(grid.firstChild);} }catch(_){}
        var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; for(var i=0;i<7;i++){ var w=document.createElement('div'); w.className='weekday'; w.textContent=days[i]; grid.appendChild(w); }
      }
      function statusMap(rows){ var map={}; if(rows && typeof rows.length==='number'){ for(var i=0;i<rows.length;i++){ var r=rows[i]||{}; var iso=r.date?String(r.date):null; if(!iso){ continue; } var dt=new Date(iso); dt.setHours(0,0,0,0); var day=fmt(dt); var mA=(r.morning_available!==undefined)?!!r.morning_available:!!r.morningAvailable; var eA=(r.evening_available!==undefined)?!!r.evening_available:!!r.eveningAvailable; map[day]={ m:mA, e:eA }; } } return map; }
      function render(){ clearGrid(); var year=current.getFullYear(); var month=current.getMonth(); var firstDow=(new Date(year, month, 1)).getDay(); var daysInMonth=(new Date(year, month+1, 0)).getDate();
        var startDate=new Date(year, month, 1); var endDate=new Date(year, month, daysInMonth);
        monthLabel.textContent = startDate.toLocaleString('en-US', { month:'long'})+' '+year;
        for(var p=0;p<firstDow;p++){ var ph=document.createElement('div'); ph.className='calendar-day other-month unavailable'; ph.setAttribute('aria-hidden','true'); grid.appendChild(ph); }
        var today=new Date(); today.setHours(0,0,0,0);
        var buildCells=function(map){ for(var d=1; d<=daysInMonth; d++){
            var dateObj=new Date(year, month, d); dateObj.setHours(0,0,0,0); var dayStr=fmt(dateObj);
            var av=(map && map[dayStr])?map[dayStr]:{ m:true, e:true };
            var st=(av.m && av.e)?'available':((av.m || av.e)?'partial':'booked');
            var cell=document.createElement('div'); cell.className='calendar-day';
            cell.setAttribute('data-date', dayStr);
            if(st==='available'){ cell.className+=' available'; } else if(st==='partial'){ cell.className+=' partial'; } else { cell.className+=' booked'; }
            var isPast=dateObj.getTime()<today.getTime(); if(isPast){ cell.className+=' past-date'; }
            var num=document.createElement('div'); num.className='calendar-day-number'; num.textContent=String(d);
            cell.appendChild(num);
            if(!isPast && st!=='available'){ var lab=document.createElement('div'); lab.className='calendar-day-status'; if(st==='partial'){ lab.textContent= av.m ? 'Morning available' : 'Evening available'; } else { lab.textContent='Fully booked'; } cell.appendChild(lab); }
            (function(cellEl, ds, isPast){ cellEl.addEventListener('click', function(){ if(isPast){ return; } window.selectedPickupDate=ds; if(selDisplay){ try{ selDisplay.innerHTML=''; }catch(_){ } var wrap=document.createElement('div'); wrap.className='selected-date-info'; var dayEl=document.createElement('div'); dayEl.className='selected-date-day'; dayEl.textContent=ds.split('-')[2]; var my=document.createElement('div'); my.className='selected-date-month-year'; my.textContent=startDate.toLocaleString('en-US',{ month:'long'})+' '+year; var wk=document.createElement('div'); wk.className='selected-date-weekday'; wk.textContent=(new Date(ds)).toLocaleString('en-US',{ weekday:'long'}); wrap.appendChild(dayEl); wrap.appendChild(my); wrap.appendChild(wk); selDisplay.appendChild(wrap); }
              try{ var prevSel=grid.querySelector('.calendar-day.selected'); if(prevSel){ prevSel.className=prevSel.className.replace(' selected',''); } }catch(_){ }
              cellEl.className+=' selected';
              try{ if(window.updateTimeTabsForDate){ window.updateTimeTabsForDate(ds); } }catch(_){ }
            }); })(cell, dayStr, isPast);
            grid.appendChild(cell);
          } };
        if(typeof window.fetch==='function'){
          try{
            window.fetch('/api/availability?startDate='+encodeURIComponent(fmt(startDate))+'&endDate='+encodeURIComponent(fmt(endDate)))
              .then(function(r){ return r.json(); }).then(function(rows){ var map=statusMap(rows); buildCells(map); })
              .catch(function(){ buildCells(null); });
          }catch(_){ buildCells(null); }
        } else { buildCells(null); }
      }
      if(prevBtn){ prevBtn.addEventListener('click', function(){ current.setMonth(current.getMonth()-1); render(); }); }
      if(nextBtn){ nextBtn.addEventListener('click', function(){ current.setMonth(current.getMonth()+1); render(); }); }
      try{ window.updateDayStatus=function(ds){ if(!ds) return; if(typeof window.fetch!=='function') return; window.fetch('/api/availability/'+encodeURIComponent(ds)).then(function(r){ return r.json(); }).then(function(row){ var mA=(row.morning_available!==undefined)?!!row.morning_available:!!row.morningAvailable; var eA=(row.evening_available!==undefined)?!!row.evening_available:!!row.eveningAvailable; var st=(mA && eA)?'available':((mA || eA)?'partial':'booked'); var cell=grid.querySelector('[data-date="'+ds+'"]'); if(!cell) return; cell.className='calendar-day'; if(st==='available'){ cell.className+=' available'; } else if(st==='partial'){ cell.className+=' partial'; } else { cell.className+=' booked'; } var today=new Date(); today.setHours(0,0,0,0); var parts=ds.split('-'); var dObj=new Date(Number(parts[0]), Number(parts[1])-1, Number(parts[2])); dObj.setHours(0,0,0,0); var isPast=dObj.getTime()<today.getTime(); var lab=cell.querySelector('.calendar-day-status'); if(!lab){ lab=document.createElement('div'); lab.className='calendar-day-status'; cell.appendChild(lab); } if(!isPast && st!=='available'){ lab.textContent= mA ? 'Morning available' : 'Evening available'; } else { lab.textContent=''; } }).catch(function(){}); }; }catch(_){ }
      render();
      try{ window.refreshCalendar=function(){ render(); }; }catch(_){ }
      try{ window.updateTimeTabsForDate=function(ds){ if(!ds) return; if(typeof window.fetch!=='function') return; var morningTab=document.querySelector('[data-time="morning"]'); var eveningTab=document.querySelector('[data-time="evening"]'); window.fetch('/api/availability/'+encodeURIComponent(ds)).then(function(r){ return r.json(); }).then(function(row){ var mA=(row.morning_available!==undefined)?!!row.morning_available:!!row.morningAvailable; var eA=(row.evening_available!==undefined)?!!row.evening_available:!!row.eveningAvailable; if(morningTab){ if(!mA){ morningTab.classList.add('disabled'); morningTab.style.pointerEvents='none'; } else { morningTab.classList.remove('disabled'); morningTab.style.pointerEvents='auto'; } } if(eveningTab){ if(!eA){ eveningTab.classList.add('disabled'); eveningTab.style.pointerEvents='none'; } else { eveningTab.classList.remove('disabled'); eveningTab.style.pointerEvents='auto'; } } var active=document.querySelector('.time-tab.active'); if(active && active.className.indexOf('disabled')!==-1){ try{ active.classList.remove('active'); }catch(_){ } if(mA){ if(morningTab){ morningTab.classList.add('active'); } } else if(eA){ if(eveningTab){ eveningTab.classList.add('active'); } } } }).catch(function(){}); }; }catch(_){ }
      try{ setTimeout(function(){ var totalDays=(new Date(current.getFullYear(), current.getMonth()+1, 0)).getDate(); var cells=grid.querySelectorAll('.calendar-day').length; if(cells>=totalDays){ if(notice){ notice.textContent='Calendar ready: '+cells+' cells'; notice.classList.remove('hidden'); notice.style.background='#d4edda'; } } else { if(notice){ notice.textContent='Calendar error: expected '+totalDays+' cells, got '+cells; notice.classList.remove('hidden'); notice.style.background='#f8d7da'; } } }, 80); }catch(_){ }
    })();
  });
})();