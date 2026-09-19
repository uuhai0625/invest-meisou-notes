// articles-data.jsの後に読み込むこと。
// 現在のページのslugをURLから判定し、タグ/国/業種/シリーズ隣接度でスコアリングして
// 関連記事(最大2件、articles-data.jsのrelated指定があれば優先)と関連ツール(最大1件、tool指定または用語集)を
// 種類別に分けて、id="related-articles"のコンテナに描画する。
(function () {
  var container = document.getElementById('related-articles');
  if (!container || typeof ARTICLES_DATA === 'undefined') return;

  var pathParts = location.pathname.split('/').filter(function (p) { return p && p !== 'index.html'; });
  var currentSlug = pathParts[pathParts.length - 1];
  var current = ARTICLES_DATA.find(function (a) { return a.slug === currentSlug; });
  if (!current) return;

  function seriesNumber(slug) {
    var m = slug.match(/case(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }

  var currentIsKigyou = current.tags.indexOf('kigyou') !== -1;
  var currentNum = seriesNumber(current.slug);

  var scored = ARTICLES_DATA
    .filter(function (a) { return a.slug !== current.slug; })
    .map(function (a, idx) {
      var score = 0;
      var sharedTags = current.tags.filter(function (t) { return a.tags.indexOf(t) !== -1; });
      sharedTags.forEach(function (t) { score += (t === 'ippan') ? 2 : 10; });
      if (sharedTags.length && sharedTags.length === a.tags.length && sharedTags.length === current.tags.length) score += 1;

      var aIsKigyou = a.tags.indexOf('kigyou') !== -1;
      if (!currentIsKigyou && !aIsKigyou) score += 3;

      if (currentIsKigyou && aIsKigyou) {
        if (current.country && current.country === a.country) score += 6;
        if (current.industry && current.industry === a.industry) score += 5;
        var aNum = seriesNumber(a.slug);
        if (currentNum != null && aNum != null && Math.abs(currentNum - aNum) === 1) score += 8;
      }
      return { article: a, score: score, order: idx };
    })
    .sort(function (x, y) {
      if (y.score !== x.score) return y.score - x.score;
      var seriesDiff = (seriesNumber(y.article.slug) || 0) - (seriesNumber(x.article.slug) || 0);
      if (seriesDiff !== 0) return seriesDiff;
      return y.order - x.order;
    });

  function bySlug(slug) {
    var a = ARTICLES_DATA.find(function (x) { return x.slug === slug; });
    return a ? { article: a } : null;
  }

  // 手動指定(related)があれば優先し、なければスコアリング上位2件
  var articleItems = current.related
    ? current.related.map(bySlug).filter(Boolean).slice(0, 2)
    : scored.filter(function (item) { return item.article.type !== 'tool'; }).slice(0, 2);

  // 関連ツールは「合うものだけ」出す。指定(tool)があればそれ、なければ企業分析・暗号資産シリーズに用語集
  var toolSlug = current.tool || ((currentIsKigyou || current.tags.indexOf('kasoutsuka') !== -1) ? 'toushi-yougo-shu' : null);
  var toolItems = toolSlug && toolSlug !== current.slug ? [bySlug(toolSlug)].filter(Boolean) : [];

  if (!articleItems.length && !toolItems.length) return;

  function renderGrid(items) {
    var html = '<div class="related-grid">';
    items.forEach(function (item) {
      var a = item.article;
      html += '<a class="related-card" href="../' + a.slug + '/">' +
        '<span class="related-card-thumb"><img src="../images/eyecatch/' + a.slug + '.jpg" alt="" loading="lazy" width="400" height="225"></span>' +
        '<span class="related-card-title">' + a.title + '</span>' +
        '</a>';
    });
    html += '</div>';
    return html;
  }

  var html = '';
  if (articleItems.length) {
    html += '<p class="related-heading">関連記事</p>' + renderGrid(articleItems);
  }
  if (toolItems.length) {
    html += '<p class="related-heading related-heading-tool">関連ツール</p>' + renderGrid(toolItems);
  }
  container.innerHTML = html;
})();
