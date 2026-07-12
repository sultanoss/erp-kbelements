// KB Filter Bar Positioning
document.addEventListener('DOMContentLoaded', function() {
  var filterBar = document.getElementById('kb-filter-bar');
  if (!filterBar) return;
  // Einfügen vor results-list (übergeordnetes Section-Element)
  var resultsList = document.querySelector('results-list.product-grid-container');
  if (resultsList && resultsList.parentNode) {
    resultsList.parentNode.insertBefore(filterBar, resultsList);
  }
});