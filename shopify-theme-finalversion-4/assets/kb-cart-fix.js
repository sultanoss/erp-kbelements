/**
 * KB ELEMENTS Cart Fix
 * Fix 1: Quick-Add (Collection) aktualisiert Cart Drawer
 * Fix 2: Letzter Artikel gelöscht → Drawer schließen
 */
(function () {
  'use strict';

  // Warten bis das Theme geladen ist
  function init() {

    // ─── FIX 1: Quick-Add Drawer Refresh ───────────────────────────────────
    //
    // Problem: Wenn ein Produkt per Quick-Add (Collection) in den Warenkorb
    // gelegt wird, schickt product-form.js die sectionIds der aktuell im DOM
    // sichtbaren cart-items-components mit. Im Quick-Add Modal ist eine
    // eigene cart-items-component mit einer anderen sectionId — die des
    // Cart Drawers fehlt. Deshalb bekommt der Drawer kein neues HTML.
    //
    // Lösung: Wir patchen fetch() so dass wir bei cart/add.js Requests
    // die sectionId des Drawers zur sections-Liste hinzufügen.

    var originalFetch = window.fetch;

    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));

      // Nur cart/add.js Requests patchen
      if (url && url.indexOf('cart/add.js') !== -1 && init && init.body instanceof FormData) {
        var formData = init.body;

        // SectionId des Cart Drawers finden
        var drawerCartItems = document.querySelector('cart-drawer-component cart-items-component');
        var drawerSectionId = drawerCartItems ? drawerCartItems.dataset.sectionId : null;

        if (drawerSectionId) {
          var existingSections = formData.get('sections') || '';
          var sectionsArray = existingSections ? existingSections.split(',') : [];

          // Drawer sectionId hinzufügen wenn noch nicht vorhanden
          if (sectionsArray.indexOf(drawerSectionId) === -1) {
            sectionsArray.push(drawerSectionId);
            formData.set('sections', sectionsArray.join(','));
          }
        }
      }

      return originalFetch.apply(this, arguments);
    };

    // ─── FIX 2: Letzter Artikel gelöscht → Drawer schließen ───────────────
    //
    // Lauscht auf cart:update mit itemCount === 0 und schließt den Drawer
    // nach der Remove-Animation (400ms Delay).

    document.addEventListener('cart:update', function (e) {
      var detail = e && e.detail;
      var data = detail && detail.data;
      if (!data) return;

      var itemCount = data.itemCount;
      if (itemCount !== 0) return;

      var drawer = document.querySelector('cart-drawer-component');
      if (!drawer) return;

      setTimeout(function () {
        if (typeof drawer.close === 'function') {
          drawer.close();
        } else if (typeof drawer.closeDialog === 'function') {
          drawer.closeDialog();
        }
      }, 400);
    });

  }

  // So früh wie möglich initialisieren
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
