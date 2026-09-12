// articles-data.jsの後に読み込むこと。
// 現在のページのslugをURLから判定し、タグ/国/業種/シリーズ隣接度でスコアリングして
// 関連記事(最大2件)と関連ツール(最大1件)を種類別に分けて、id="related-articles"のコンテナに描画する。
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
    .map(function (a) {
      var score = 0;
      var sharedTags = current.tags.filter(function (t) { return a.tags.indexOf(t) !== -1; });
      sharedTags.forEach(function (t) { score += (t === 'ippan') ? 2 : 10; });

      var aIsKigyou = a.tags.indexOf('kigyou') !== -1;
      if (!currentIsKigyou && !aIsKigyou) score += 3;

      if (currentIsKigyou && aIsKigyou) {
        if (current.country && current.country === a.country) score += 6;
        if (current.industry && current.industry === a.industry) score += 5;
        var aNum = seriesNumber(a.slug);
        if (currentNum != null && aNum != null && Math.abs(currentNum - aNum) === 1) score += 8;
      }
      return { article: a, score: score };
    })
    .sort(function (x, y) {
      if (y.score !== x.score) return y.score - x.score;
      return (seriesNumber(y.article.slug) || 0) - (seriesNumber(x.article.slug) || 0);
    });

  var articleItems = scored.filter(function (item) { return item.article.type !== 'tool'; }).slice(0, 2);
  var toolItems = scored.filter(function (item) { return item.article.type === 'tool'; }).slice(0, 1);

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
