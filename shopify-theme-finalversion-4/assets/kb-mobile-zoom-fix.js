/* KB Mobile Zoom Fix: zoom-dialog auf Mobile schliessen */
(function() {
  if (window.innerWidth > 749) return;
  function closeZoomDialogs() {
    document.querySelectorAll('zoom-dialog dialog[open]').forEach(function(d) {
      try { d.close(); } catch(e) {}
      d.removeAttribute('open');
    });
    document.querySelectorAll('zoom-dialog').forEach(function(z) {
      z.style.display = 'none';
    });
  }
  var observer = new MutationObserver(closeZoomDialogs);
  document.addEventListener('DOMContentLoaded', function() {
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    closeZoomDialogs();
  });
  document.addEventListener('click', function() {
    setTimeout(closeZoomDialogs, 50);
  }, true);
  window.addEventListener('load', closeZoomDialogs);
})();
