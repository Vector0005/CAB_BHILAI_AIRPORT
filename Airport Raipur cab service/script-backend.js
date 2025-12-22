// Booking site client loader
(function(){
  try {
    var s = document.createElement('script');
    s.src = '/api/frontend.js';
    s.async = true;
    document.head.appendChild(s);
  } catch (_) {}
  var ready=function(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } };
  ready(function(){
    var dl=document.getElementById('detectLocation');
    var form=document.getElementById('bookingForm');
    var notice=document.getElementById('notice');
    var setNotice=function(t, ok){ if(!notice) return; notice.textContent=t; notice.classList.remove('hidden'); notice.style.background=ok?'#d4edda':'#f8d7da'; };
    if(dl){ dl.addEventListener('click', function(){ var el=document.getElementById('location'); if(!navigator.geolocation){ setNotice('Geolocation not available', false); return; } var best=null; var watchId=null; var finish=function(){ if(watchId!=null){ try{ navigator.geolocation.clearWatch(watchId); }catch(_){ } } if(best && el){ el.value=Number(best.latitude).toFixed(6)+','+Number(best.longitude).toFixed(6); setNotice('Location detected', true); } else { setNotice('Unable to detect location', false); } }; var onPos=function(pos){ var c=pos&&pos.coords; if(!c) return; if(!best || (typeof c.accuracy==='number' && c.accuracy < best.accuracy)){ best={ latitude:c.latitude, longitude:c.longitude, accuracy:c.accuracy||9999 }; if(best.accuracy<=30){ finish(); } } }; var onErr=function(){ finish(); }; try{ navigator.geolocation.getCurrentPosition(function(p){ onPos(p); try{ watchId=navigator.geolocation.watchPosition(onPos,onErr,{ enableHighAccuracy:true, timeout:20000, maximumAge:0 }); setTimeout(finish, 7000); }catch(_){ finish(); } }, onErr, { enableHighAccuracy:true, timeout:10000, maximumAge:0 }); }catch(_){ onErr(); } }); }
    if(form){ form.addEventListener('submit', function(e){ var loc=(document.getElementById('location')?.value||'').trim(); var isLL=/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(loc); var isUrl=/^https?:\/\//i.test(loc) && /google\.com\/maps|maps\.app\.goo\.gl/i.test(loc); if(!isLL && !isUrl){ e.preventDefault(); setNotice('Paste a Google Maps link or click Detect Location to use coordinates', false); } }); }
  });
})();