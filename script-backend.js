// Booking site client loader
(function(){
  try {
    var s = document.createElement('script');
    s.src = '/api/frontend.js';
    s.async = true;
    document.head.appendChild(s);
  } catch (_) {}
})();