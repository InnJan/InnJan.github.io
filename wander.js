(function () {
  "use strict";

  var sites = Array.isArray(window.WANDER_SITES) ? window.WANDER_SITES : [];
  var categories = Array.isArray(window.WANDER_CATEGORIES) ? window.WANDER_CATEGORIES : [];
  var visitKey = "innjan-wander-visits-v1";
  var activeFilter = "all";
  var query = "";
  var selectedSite = null;
  var lastRandomId = "";
  var drawCount = 0;
  var titleClicks = 0;
  var drawTimer = null;
  var tickerTimer = null;

  var sectionsRoot = document.getElementById("sections");
  var countLabel = document.getElementById("result-count");
  var emptyState = document.getElementById("empty-state");
  var visitCount = document.getElementById("visit-count");
  var search = document.getElementById("search");
  var filters = document.getElementById("filters");
  var departure = document.getElementById("departure");
  var ticker = document.getElementById("ticker");
  var randomButton = document.getElementById("random-button");
  var randomResult = document.getElementById("random-result");
  var resultName = document.getElementById("result-name");
  var resultDesc = document.getElementById("result-desc");
  var goRandom = document.getElementById("go-random");
  var wanderComment = document.getElementById("wander-comment");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getVisits() {
    try {
      var parsed = JSON.parse(localStorage.getItem(visitKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter(function (id) { return typeof id === "string"; }) : [];
    } catch (error) {
      return [];
    }
  }

  function saveVisits(visits) {
    try { localStorage.setItem(visitKey, JSON.stringify(visits)); } catch (error) { /* private mode */ }
  }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (error) { return url; }
  }

  function categoryOf(id) {
    return categories.find(function (item) { return item.id === id; });
  }

  function markVisited(id) {
    var visits = getVisits();
    if (visits.indexOf(id) === -1) {
      visits.push(id);
      saveVisits(visits);
    }
    updateVisits();
  }

  function updateVisits() {
    var visits = getVisits();
    var valid = visits.filter(function (id) { return sites.some(function (site) { return site.id === id; }); });
    if (valid.length !== visits.length) saveVisits(valid);
    visitCount.textContent = "已经去过 " + valid.length + " / " + sites.length + " 个角落";
    document.querySelectorAll(".site-card").forEach(function (card) {
      card.classList.toggle("is-visited", valid.indexOf(card.dataset.id) !== -1);
    });
  }

  function makeText(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function buildCover(type) {
    var cover = document.createElement("div");
    cover.className = "card-cover cover-" + type;
    cover.setAttribute("aria-hidden", "true");
    var templates = {
      neal: "<span class=\"neal-tile data\"><b>DATA</b><i></i><i></i><i></i></span><span class=\"neal-tile space\"><b>SPACE</b><i></i></span><span class=\"neal-tile play\"><b>PLAY</b><i>↗</i></span>",
      mockup: "<span class=\"mock-window\"><i></i><i></i><i></i><b>YOUR SCREEN</b></span><span class=\"mock-phone\"><b></b></span><span class=\"mock-shadow\"></span>",
      inbox: "<span class=\"mail-address\"><b>random@10min.mail</b><i>COPY</i></span><span class=\"mail-row\"><i></i><b>Verification code</b><small>now</small></span><span class=\"mail-row faint\"><i></i><b>Welcome</b><small>1m</small></span>",
      resume: "<span class=\"resume-sheet one\"><i></i><b></b><em></em><em></em><em></em></span><span class=\"resume-sheet two\"><i></i><b></b><em></em><em></em><em></em></span><span class=\"resume-sheet three\"><i></i><b></b><em></em><em></em><em></em></span>",
      photos: "<span class=\"photo-tile photo-a\"></span><span class=\"photo-tile photo-b\"></span><span class=\"photo-tile photo-c\"></span><span class=\"photo-caption\">SEARCH / LIGHT / PLACE</span>",
      pdf: "<span class=\"pdf-page\">PDF</span><span class=\"pdf-route\">→</span><span class=\"pdf-tools\"><i>MERGE</i><i>COMPRESS</i><i>OCR</i><i>EDIT</i></span>",
      translate: "<span class=\"translation source\"><small>ZH</small><b>语言不是逐字搬运。</b><i></i><i></i></span><span class=\"translate-arrow\">⇄</span><span class=\"translation target\"><small>EN</small><b>Meaning travels, too.</b><i></i><i></i></span>",
      handwriting: "<span class=\"typed-paper\"><small>BEFORE</small><b>标准电子文字</b><i></i><i></i></span><span class=\"hand-arrow\">→</span><span class=\"hand-paper\"><small>AFTER</small><b>手写的温度</b><i></i><i></i></span>"
    };
    cover.innerHTML = templates[type] || "";
    return cover;
  }

  function buildCard(site, index) {
    var card = document.createElement("article");
    card.className = "site-card " + (site.size || "standard") + " accent-" + (site.accent || "paper");
    card.dataset.id = site.id;
    card.dataset.category = site.category;
    card.dataset.filters = (site.filters || []).join(" ");
    card.dataset.search = [site.name, site.description, domainOf(site.url)].concat(site.tags || []).join(" ").toLocaleLowerCase("zh-CN");

    var link = document.createElement("a");
    link.className = "site-link";
    link.href = site.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "打开 " + site.name + "（新标签页）");
    link.addEventListener("click", function () { markVisited(site.id); });

    var top = document.createElement("div");
    top.className = "card-top";
    top.appendChild(makeText("span", "card-index", String(index + 1).padStart(2, "0") + " / " + String(sites.length).padStart(2, "0")));
    top.appendChild(makeText("span", "stamp", "去过"));

    var visual = site.cover ? buildCover(site.cover) : makeText("div", "card-symbol", site.symbol || "↗");
    visual.setAttribute("aria-hidden", "true");

    var bottom = document.createElement("div");
    bottom.className = "card-bottom";
    var category = categoryOf(site.category);
    bottom.appendChild(makeText("span", "card-category", (category ? category.title : site.category) + " · " + (site.tags || []).slice(0, 2).join(" / ")));
    bottom.appendChild(makeText("h3", "card-title", site.name));
    bottom.appendChild(makeText("p", "card-desc", site.description));
    var meta = document.createElement("div");
    meta.className = "card-meta";
    meta.appendChild(makeText("span", "card-domain", domainOf(site.url)));
    meta.appendChild(makeText("span", "card-arrow", "↗"));
    bottom.appendChild(meta);

    link.appendChild(top);
    link.appendChild(visual);
    link.appendChild(bottom);
    card.appendChild(link);

    card.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", event.clientX - rect.left + "px");
      card.style.setProperty("--my", event.clientY - rect.top + "px");
    });
    return card;
  }

  function buildSections() {
    var fragment = document.createDocumentFragment();
    categories.forEach(function (category, categoryIndex) {
      var section = document.createElement("section");
      section.className = "section";
      section.dataset.category = category.id;
      section.setAttribute("aria-labelledby", "category-" + category.id);

      var head = document.createElement("div");
      head.className = "section-head";
      head.appendChild(makeText("span", "section-number", "0" + (categoryIndex + 1) + " " + category.glyph));
      var title = makeText("h2", "section-title", category.title);
      title.id = "category-" + category.id;
      head.appendChild(title);
      head.appendChild(makeText("span", "section-note", category.note));

      var grid = document.createElement("div");
      grid.className = "site-grid";
      sites.forEach(function (site, siteIndex) {
        if (site.category === category.id) grid.appendChild(buildCard(site, siteIndex));
      });
      section.appendChild(head);
      section.appendChild(grid);
      fragment.appendChild(section);
    });
    sectionsRoot.appendChild(fragment);
    updateVisits();
  }

  function matches(card) {
    var filterMatches = activeFilter === "all" || card.dataset.filters.split(" ").indexOf(activeFilter) !== -1;
    var queryMatches = !query || card.dataset.search.indexOf(query) !== -1;
    return filterMatches && queryMatches;
  }

  function applyFilters() {
    var visibleTotal = 0;
    document.querySelectorAll(".section").forEach(function (section) {
      var sectionVisible = 0;
      section.querySelectorAll(".site-card").forEach(function (card) {
        var visible = matches(card);
        card.hidden = !visible;
        if (visible) sectionVisible += 1;
      });
      section.hidden = sectionVisible === 0;
      visibleTotal += sectionVisible;
    });
    countLabel.textContent = visibleTotal + " 个入口";
    emptyState.classList.toggle("is-visible", visibleTotal === 0);
  }

  function randomFrom(pool) {
    if (!pool.length) return null;
    var options = pool.filter(function (site) { return site.id !== lastRandomId; });
    if (!options.length) options = pool;
    return options[Math.floor(Math.random() * options.length)];
  }

  function visibleSites() {
    var visibleIds = Array.from(document.querySelectorAll(".site-card:not([hidden])")).map(function (card) { return card.dataset.id; });
    var pool = sites.filter(function (site) { return visibleIds.indexOf(site.id) !== -1; });
    return pool.length ? pool : sites;
  }

  function finishDraw(pool) {
    selectedSite = randomFrom(pool);
    if (!selectedSite) return;
    lastRandomId = selectedSite.id;
    departure.classList.remove("is-drawing");
    randomButton.disabled = false;
    ticker.textContent = "一条路线已经出现。";
    resultName.textContent = selectedSite.name;
    resultDesc.textContent = selectedSite.description;
    goRandom.href = selectedSite.url;
    randomResult.classList.add("is-visible");
    if (drawCount >= 6) wanderComment.classList.add("show");
    resultName.focus && resultName.focus();
  }

  function drawRandom(options) {
    var settings = options || {};
    window.clearTimeout(drawTimer);
    window.clearInterval(tickerTimer);
    drawCount += 1;
    var pool = settings.pool || visibleSites();
    randomResult.classList.remove("is-visible");
    wanderComment.classList.remove("show");
    departure.classList.add("is-drawing");
    randomButton.disabled = true;
    var cursor = 0;
    ticker.textContent = pool[0] ? pool[0].name : "互联网";
    if (!reduceMotion) {
      tickerTimer = window.setInterval(function () {
        ticker.textContent = pool[cursor % pool.length].name;
        cursor += 1;
      }, 72);
    }
    drawTimer = window.setTimeout(function () {
      window.clearInterval(tickerTimer);
      finishDraw(pool);
    }, reduceMotion ? 80 : 1080);
  }

  buildSections();
  applyFilters();

  filters.addEventListener("click", function (event) {
    var button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    filters.querySelectorAll(".filter").forEach(function (item) {
      item.classList.toggle("is-active", item === button);
    });
    applyFilters();
  });

  search.addEventListener("input", function () {
    query = search.value.trim().toLocaleLowerCase("zh-CN");
    applyFilters();
  });

  randomButton.addEventListener("click", function () { drawRandom(); });
  document.getElementById("draw-again").addEventListener("click", function () { drawRandom(); });
  document.getElementById("empty-random").addEventListener("click", function () { drawRandom({ pool: sites }); });
  document.getElementById("footer-random").addEventListener("click", function () {
    departure.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    window.setTimeout(function () { drawRandom({ pool: sites }); }, reduceMotion ? 0 : 420);
  });

  goRandom.addEventListener("click", function () {
    if (selectedSite) markVisited(selectedSite.id);
  });

  document.getElementById("clear-visits").addEventListener("click", function () {
    saveVisits([]);
    updateVisits();
  });

  document.getElementById("page-title").addEventListener("click", function () {
    titleClicks += 1;
    if (titleClicks < 5) return;
    titleClicks = 0;
    document.body.classList.add("glitching");
    window.setTimeout(function () { document.body.classList.remove("glitching"); }, 1050);
  });

  document.getElementById("secret-link").addEventListener("click", function () {
    window.open("https://checkboxrace.com/", "_blank", "noopener,noreferrer");
  });

  window.addEventListener("storage", function (event) {
    if (event.key === visitKey) updateVisits();
  });
}());
