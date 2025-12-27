// Booking site client helper (no external loader)
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
    // Fallback time-tab toggle if main frontend is not loaded
    try{ document.querySelectorAll('.time-tab').forEach(function(btn){ btn.addEventListener('click', function(){ document.querySelectorAll('.time-tab').forEach(function(b){ b.classList.remove('active'); }); btn.classList.add('active'); }); }); }catch(_){}

    // Local submit handler to support localhost testing without /api/frontend.js
    if(form){ form.addEventListener('submit', async function(e){ e.preventDefault();
      var name=document.getElementById('name')?.value||'';
      var phone=document.getElementById('phone')?.value||'';
      var tripRaw=(document.querySelector('input[name="tripType"]:checked')?.value||'');
      var tripType=tripRaw.toUpperCase().replace(/-/g,'_').replace(/\s+/g,'_');
      var pickupTime=document.querySelector('.time-tab.active')?.getAttribute('data-time')||'';
      var loc=(document.getElementById('location')?.value||'').trim();
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
        var r=await fetch('/api/bookings', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
        if(!r.ok){
          try{ var j=await r.json(); if(j && j.errors && Array.isArray(j.errors)){ var msg=j.errors.map(function(e){ return e.msg; }).join('; '); setNotice(msg||('HTTP '+r.status), false); } else if(j && j.error){ setNotice(String(j.error), false); } else { setNotice('Failed to submit booking. Please try again.', false); } }catch(_){ setNotice('Failed to submit booking. Please try again.', false); }
          return;
        }
        setNotice('Booking submitted successfully', true);
        form.reset();
      }catch(err){ setNotice('Failed to submit booking. Please try again.', false); }
    }); }
  });
})();