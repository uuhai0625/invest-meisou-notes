(function () {
  var headings = document.querySelectorAll(".article-body h2");
  if (headings.length < 2) {
    var grid = document.querySelector(".article-grid");
    if (grid) grid.classList.add("no-toc");
    var page = document.querySelector(".article-page");
    if (page) page.classList.remove("has-toc");
    var navWrap = document.querySelector(".mini-nav .wrap");
    if (navWrap) navWrap.classList.remove("has-toc");
    return;
  }

  var items = [];
  headings.forEach(function (h, i) {
    if (!h.id) h.id = "toc-sec-" + (i + 1);
    items.push({ id: h.id, text: h.textContent });
  });

  function buildList() {
    var ul = document.createElement("ul");
    items.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + item.id;
      a.textContent = item.text;
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  }

  var desktopLinks = [];

  var desktopContainer = document.querySelector(".article-toc-desktop");
  if (desktopContainer) {
    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "目次");
    nav.appendChild(buildList());
    desktopContainer.appendChild(nav);
    desktopLinks = Array.prototype.slice.call(nav.querySelectorAll("a"));
  }

  var mobileContainer = document.querySelector(".article-toc-mobile");
  if (mobileContainer) {
    var toggle = document.createElement("button");
    toggle.className = "toc-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "目次";

    var mobileNav = document.createElement("nav");
    mobileNav.setAttribute("aria-label", "目次");
    mobileNav.hidden = true;
    mobileNav.appendChild(buildList());

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      mobileNav.hidden = expanded;
    });

    mobileContainer.appendChild(toggle);
    mobileContainer.appendChild(mobileNav);
  }

  if (desktopLinks.length && "IntersectionObserver" in window) {
    var linkById = {};
    desktopLinks.forEach(function (a) {
      linkById[a.getAttribute("href").slice(1)] = a;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var active = linkById[entry.target.id];
          if (!active) return;
          desktopLinks.forEach(function (l) { l.classList.remove("active"); });
          active.classList.add("active");
        });
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    headings.forEach(function (h) { observer.observe(h); });
  }
})();
