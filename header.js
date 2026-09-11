(function () {
  var toggle = document.querySelector('.site-header-search-toggle');
  var panel = document.querySelector('.site-header-search-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', function () {
      var willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) {
        var input = panel.querySelector('input');
        if (input) input.focus();
      }
    });
  }
})();
