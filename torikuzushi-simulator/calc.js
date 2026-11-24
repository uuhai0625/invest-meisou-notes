/* 資産の取り崩しシミュレーター(torikuzushi-simulator)
 * 入力は端末内だけで計算し、送信・保存しません。
 * GA4へ送るのは、「計算する」ボタンを押した回数(withdraw_calculate)だけで、パラメータは付けず、金額・年数・利回りは送りません。
 * 計算(毎月、この順に処理する):
 *   1) 月利 = (1 + 年利 − 年間コスト)^(1/12) − 1 を、月初の残高に乗じて運用する
 *   2) 月末に、売却額(税引前)を取り崩す。残高が売却額以下なら、残高の全額を売却して終了する
 *   定額: 毎月の売却額は一定。物価上昇率を入れた場合は、経過12か月ごと(13・25か月目…)に、その率だけ増やす
 *   定率: 経過12か月ごと(1・13・25か月目…)に、年初の残高 × 年の率 ÷ 12 を月額として決め、その年の間は固定する
 * 税: 課税口座のとき、売却額 × 利益にあたる割合 × 20.315% を税として、手取りから引く(残高は税の影響を受けない)。
 *     20.315%は、所得税15%・住民税5%に、所得税額の2.1%分の付加税を加えた率。
 *     付加税は令和8年までは復興特別所得税、令和9年以後は復興特別所得税1.1%+防衛特別所得税1%で、合計は同じ。国税庁No.1463ほか
 */
(function () {
  "use strict";

  var TAX_RATE = 0.20315;
  var RATE_ROWS = [-1, 0, 1, 2, 3, 5];

  // ---- 計算(DOMに依存しない) ----
  function monthlyRate(annualPct, costPct) {
    var net = (annualPct - costPct) / 100;
    if (net <= -0.999) net = -0.999;
    return Math.pow(1 + net, 1 / 12) - 1;
  }

  // p: { init, method: "fixed"|"rate", pay, pct, rate, cost, years, infl, taxable, share(0〜1) }
  function simulate(p) {
    var m = monthlyRate(p.rate, p.cost), N = p.years * 12;
    var bal = p.init, sold = 0, tax = 0, dep = 0, w = 0, ySold = 0, k, take;
    var rows = [], ends = [p.init];
    for (k = 1; k <= N; k++) {
      if ((k - 1) % 12 === 0) {
        ySold = 0;
        w = p.method === "fixed"
          ? p.pay * Math.pow(1 + p.infl / 100, (k - 1) / 12)
          : bal * p.pct / 100 / 12;
      }
      bal = bal * (1 + m);
      take = w;
      // 0.001円以下の残りは、計算の誤差とみなして、残高の全額を売却して終了する(定率100%で、年の最後の月に尽きるように)
      if (bal <= take + 0.001) { take = bal; bal = 0; dep = k; } else { bal = bal - take; }
      sold += take;
      if (p.taxable) tax += take * p.share * TAX_RATE;
      ySold += take;
      if (k % 12 === 0 || dep) {
        rows.push({ year: Math.ceil(k / 12), end: bal, sold: ySold });
        ends.push(bal);
        if (dep) break;
      }
    }
    while (ends.length < p.years + 1) ends.push(0);
    return { depMonth: dep, end: bal, sold: sold, tax: tax, net: sold - tax, rows: rows, ends: ends, lastTake: take, monthRate: m };
  }

  function noWithdraw(init, m, years) {
    return init * Math.pow(1 + m, years * 12);
  }

  // ---- 表記(DOMに依存しない) ----
  function comma(n) {
    var s = String(Math.round(n));
    var neg = s.charAt(0) === "-";
    if (neg) s = s.slice(1);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + s;
  }

  function trimNum(x, d) { return String(Number(x.toFixed(d))); }

  // 小数を最大2桁まで、整数部に桁区切りを付ける(例: 1234.5 → "1,234.5")
  function commaDec(x) {
    var parts = String(Number(x.toFixed(2))).split(".");
    return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
  }

  // 「約960万円」「約1.25億円」「約1,234億円」「約1兆2,345億円」「5,000円」(丸めは1回だけ)
  function man(n) {
    var a = Math.abs(n), s = n < 0 ? "-" : "";
    if (a < 10000) return s + comma(a) + "円";
    var m = Math.round(a / 10000);
    if (m < 10000) return "約" + s + comma(m) + "万円";
    var o = Math.round(a / 1000000) / 100;
    if (o < 10000) return "約" + s + commaDec(o) + "億円";
    var oo = Math.round(a / 100000000), ch = Math.floor(oo / 10000), r = oo % 10000;
    return "約" + s + comma(ch) + "兆" + (r ? comma(r) + "億" : "") + "円";
  }

  // 切りのよい金額は「2,000万円」「1.5億円」のように正確に、それ以外は man() で約表記にする
  function amt(n) {
    var a = Math.abs(n);
    if (a < 10000) return comma(n) + "円";
    if (a % 100000000 === 0) {
      var oku = n / 100000000;
      if (a >= 1000000000000) return (oku < 0 ? "-" : "") + comma(Math.floor(a / 1000000000000)) + "兆" + (oku % 10000 ? comma(Math.abs(oku) % 10000) + "億" : "") + "円";
      return comma(oku) + "億円";
    }
    if (a < 100000000 && a % 10000 === 0) return comma(n / 10000) + "万円";
    return man(n);
  }

  // 入力欄の下に出す万円・億円換算(1万円未満は出さない)
  function convText(n) {
    if (!isFinite(n) || Math.abs(n) < 10000) return "";
    return "= " + amt(n);
  }

  // 「2年6か月」「8か月」「30年」
  function durText(k) {
    var y = Math.floor(k / 12), r = k % 12;
    return (y > 0 ? y + "年" : "") + (r > 0 ? r + "か月" : "");
  }

  function limitText(v, unit) {
    if (unit === "円") {
      if (Math.abs(v) >= 100000000 && v % 100000000 === 0) return comma(v / 100000000) + "億円";
      if (Math.abs(v) >= 10000 && v % 10000 === 0) return comma(v / 10000) + "万円";
    }
    return comma(v) + unit;
  }

  var api = {
    monthlyRate: monthlyRate, simulate: simulate, noWithdraw: noWithdraw, TAX_RATE: TAX_RATE,
    man: man, amt: amt, convText: convText, limitText: limitText, durText: durText, comma: comma
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  if (typeof document === "undefined") { return; }

  // ---- 画面 ----
  function $(id) { return document.getElementById(id); }

  function track(name) {
    try {
      if (typeof window.gtag === "function") { window.gtag("event", name); }
    } catch (e) { /* 計測できなくても動く */ }
  }

  // 読み上げは「計算する」を押したときだけ。同じ文でも読み上げ直すため、いったん空にして入れ直す
  function announce(id, text) {
    var el = $(id);
    if (!el) return;
    el.textContent = "";
    setTimeout(function () { el.textContent = text; }, 60);
  }

  // 戻り値: 数字 / 空欄はNaN / 不正な文字列(badInput)もNaN
  function readNum(id) {
    var el = $(id);
    if (!el) return NaN;
    if (el.validity && el.validity.badInput) return NaN;
    var v = String(el.value).replace(/[,\s]/g, "");
    if (v === "") return NaN;
    return Number(v);
  }

  function setMoney(id, n) {
    var el = $(id);
    if (!el) return;
    var full = comma(n) + "円";
    var mm = man(n);
    el.innerHTML = (mm === full ? "" : '<span class="fs-v-main">' + mm + "</span>") + '<span class="fs-v-sub">' + full + "</span>";
  }

  // 検証。問題があれば {id, msg} を返す
  function check(list) {
    var i, it, v;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      v = readNum(it.id);
      if (!isFinite(v)) return { id: it.id, msg: it.label + "を数字で入力してください。" };
      if (it.int && Math.floor(v) !== v) return { id: it.id, msg: it.label + "は整数(1年単位)で入力してください。" };
      if (v < it.min || v > it.max) return { id: it.id, msg: it.label + "は" + limitText(it.min, it.unit) + "〜" + limitText(it.max, it.unit) + "の範囲で入力してください。" };
      it.value = v;
    }
    return null;
  }

  // focus: 「計算する」を押したときだけ、問題の欄へフォーカスを移す(自動更新では動かさない)
  function showError(boxId, err, focus) {
    var box = $(boxId), k;
    if (!box) return;
    var inputs = box.parentNode.querySelectorAll("input, select");
    for (k = 0; k < inputs.length; k++) { inputs[k].removeAttribute("aria-invalid"); }
    if (err) {
      if (box.textContent !== err.msg) { box.textContent = err.msg; }
      box.hidden = false;
      var el = $(err.id);
      if (el) { el.setAttribute("aria-invalid", "true"); if (focus) { el.focus(); } }
    } else {
      box.textContent = "";
      box.hidden = true;
    }
  }

  // ---- グラフ(SVG) ----
  function niceStep(raw) {
    if (raw <= 0) return 1;
    var pw = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / pw;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pw;
  }

  function axisLabel(v, step) {
    if (step >= 100000000) return trimNum(v / 100000000, 2) + "億";
    if (step >= 10000) return trimNum(v / 10000, 1) + "万";
    return comma(v);
  }

  // 縦軸は残高の線(value)に合わせる。取り崩さなかった場合の線(keep)は、上にはみ出す部分を切る
  function drawChart(series, years, descText) {
    var W = 640, H = 320, L = 112, R = 18, T = 18, B = 50, i, t;
    var maxV = 0;
    for (i = 0; i < series.length; i++) { maxV = Math.max(maxV, series[i].value); }
    if (maxV <= 0) maxV = 1;
    var step = niceStep(maxV / 4);
    var top = Math.ceil(maxV / step) * step;
    function X(y) { return L + (W - L - R) * (y / years); }
    function Y(v) { return T + (H - T - B) * (1 - Math.max(v, 0) / top); }
    function path(key) {
      var d = "";
      for (i = 0; i < series.length; i++) { d += (i ? "L" : "M") + X(series[i].year).toFixed(1) + " " + Y(series[i][key]).toFixed(1) + " "; }
      return d;
    }
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="wd-chart-title wd-chart-desc" focusable="false">';
    svg += '<title id="wd-chart-title">資産の残高の年ごとの推移</title>';
    svg += '<desc id="wd-chart-desc">' + descText + "年ごとの数字は下の表にあります。</desc>";
    svg += '<defs><clipPath id="wd-clip"><rect x="' + L + '" y="' + (T - 4) + '" width="' + (W - L - R) + '" height="' + (H - B - T + 4) + '"/></clipPath></defs>';
    for (t = 0; t * step <= top + 1e-9; t++) {
      var v = t * step, yy = Y(v);
      svg += '<line class="fs-grid" x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + yy.toFixed(1) + '"/>';
      svg += '<text class="fs-axis" x="' + (L - 8) + '" y="' + (yy + 7).toFixed(1) + '" text-anchor="end">' + axisLabel(v, step) + "</text>";
    }
    var xs = years <= 10 ? 1 : (years <= 20 ? 5 : 10), xt = [0];
    for (t = xs; t < years; t += xs) { xt.push(t); }
    if (xt.length > 1 && years - xt[xt.length - 1] < xs / 2) { xt.pop(); }
    xt.push(years);
    for (i = 0; i < xt.length; i++) {
      svg += '<text class="fs-axis" x="' + X(xt[i]).toFixed(1) + '" y="' + (H - 16) + '" text-anchor="middle">' + xt[i] + "年</text>";
    }
    svg += '<g clip-path="url(#wd-clip)"><path class="fs-line-zero" d="' + path("keep") + '" fill="none"/></g>';
    svg += '<path class="fs-line-value" d="' + path("value") + '" fill="none"/>';
    svg += "</svg>";
    return svg;
  }

  // ---- 入力の読み取り ----
  function specs(method, taxable) {
    var list = [
      { id: "wd-init", label: "取り崩し開始時の資産額", min: 10000, max: 10000000000, unit: "円" }
    ];
    if (method === "fixed") list.push({ id: "wd-pay", label: "毎月の取り崩し額(売却額)", min: 1, max: 100000000, unit: "円" });
    else list.push({ id: "wd-pct", label: "年の取り崩し率", min: 0.1, max: 100, unit: "%" });
    list.push({ id: "wd-rate", label: "仮の年利", min: -10, max: 30, unit: "%" });
    list.push({ id: "wd-cost", label: "年間のコスト", min: 0, max: 5, unit: "%" });
    list.push({ id: "wd-years", label: "何年先までの様子を見る年数", min: 1, max: 60, unit: "年", int: true });
    if (method === "fixed") list.push({ id: "wd-infl", label: "取り崩し額を毎年増やす率", min: 0, max: 10, unit: "%" });
    if (taxable) list.push({ id: "wd-share", label: "売却額のうち、利益にあたる割合", min: 0, max: 100, unit: "%" });
    return list;
  }

  var METHOD_HINT = {
    fixed: "毎月、同じ金額を売って取り崩します。",
    rate: "毎年の最初に、その時点の資産の◯%を決め、12等分して毎月取り崩します。残高が減ると、取り崩し額も減ります。"
  };

  function syncFields() {
    var fixed = $("wd-method").value !== "rate";
    var taxable = $("wd-acct").value === "taxable";
    $("wd-pay-field").hidden = !fixed;
    $("wd-infl-field").hidden = !fixed;
    $("wd-pct-field").hidden = fixed;
    $("wd-share-field").hidden = !taxable;
    $("wd-method-hint").textContent = fixed ? METHOD_HINT.fixed : METHOD_HINT.rate;
  }

  // 入力のたびに(待たずに)更新する、万円換算と「最初の1年の取り崩し額」の事実表示
  function updateHints() {
    var init = readNum("wd-init"), fixed = $("wd-method").value !== "rate";
    $("wd-init-conv").textContent = convText(init);
    var pay = readNum("wd-pay");
    $("wd-pay-conv").textContent = fixed ? convText(pay) : "";
    var annual = NaN;
    if (fixed) annual = pay * 12;
    else { var pct = readNum("wd-pct"); annual = init * pct / 100; }
    var fact = "";
    if (isFinite(annual) && isFinite(init) && init > 0 && annual > 0) {
      fact = "最初の1年の取り崩し額は、年" + amt(annual) + "で、開始時の資産の" + trimNum(annual / init * 100, 2) + "%にあたります(物価の上昇による増額は含みません)。";
    }
    $("wd-fact").textContent = fact;
  }

  function render(show) {
    var method = $("wd-method").value === "rate" ? "rate" : "fixed";
    var taxable = $("wd-acct").value === "taxable";
    var list = specs(method, taxable);
    var err = check(list);
    if (err) {
      // 入力が不正なときは、古い結果を残さずに隠し、理由を出す
      $("wd-result").classList.remove("is-shown");
      showError("wd-error", err, show);
      return false;
    }
    showError("wd-error", null, false);
    var val = {}, i;
    for (i = 0; i < list.length; i++) { val[list[i].id] = list[i].value; }
    var p = {
      init: val["wd-init"], method: method, pay: val["wd-pay"] || 0, pct: val["wd-pct"] || 0,
      rate: val["wd-rate"], cost: val["wd-cost"], years: val["wd-years"],
      infl: val["wd-infl"] || 0, taxable: taxable, share: taxable ? val["wd-share"] / 100 : 0
    };
    var r = simulate(p);
    var nearZero = !r.depMonth && Math.round(r.end) === 0;
    var out;

    if (r.depMonth) {
      out = "開始から" + durText(r.depMonth) + "後(" + r.depMonth + "か月目の売却)に、資産が尽きる計算です。";
    } else if (nearZero) {
      out = p.years + "年後には、" + (method === "rate" ? "残高がほぼ0円になる計算です(定率のため、残高は厳密には0になりません)。" : "残高が1円未満になる計算です。");
    } else {
      out = p.years + "年後も、資産が" + man(r.end) + "残る計算です。";
    }
    out += "仮の年利" + trimNum(p.rate, 2) + "%・コスト" + trimNum(p.cost, 2) + "%の場合の試算で、予想ではありません。";
    $("wd-summary").textContent = out;
    if (show) { announce("wd-sr", out); }

    if (r.depMonth) {
      $("wd-out-dep").innerHTML = '<span class="fs-v-main">' + durText(r.depMonth) + '後</span><span class="fs-v-sub">' + r.depMonth + "か月目に残高が0円</span>";
    } else if (nearZero) {
      $("wd-out-dep").innerHTML = '<span class="fs-v-main">ほぼ0円に近づく</span><span class="fs-v-sub">' + p.years + "年後の残高は1円未満</span>";
    } else {
      $("wd-out-dep").innerHTML = '<span class="fs-v-main">' + p.years + '年後も尽きない</span><span class="fs-v-sub">この年数の間は残高あり</span>';
    }
    $("wd-limit-years").textContent = p.years + "年";
    setMoney("wd-out-end", r.end);
    setMoney("wd-out-sold", r.sold);
    if (taxable) {
      setMoney("wd-out-tax", r.tax);
      $("wd-out-tax-label").textContent = "税額の合計(課税口座の目安)";
    } else {
      $("wd-out-tax").innerHTML = '<span class="fs-v-main">0円</span><span class="fs-v-sub">非課税口座(NISAなど)の想定</span>';
      $("wd-out-tax-label").textContent = "税額の合計";
    }
    setMoney("wd-out-net", r.net);
    $("wd-out-last").textContent = r.depMonth
      ? "最後の" + r.depMonth + "か月目は、残高が毎月の売却額に満たないため、残高の全額(" + comma(r.lastTake) + "円)を売却して終了する計算です。"
      : "";

    // 年ごとの表
    var rows = "", j, q;
    for (j = 0; j < r.rows.length; j++) {
      q = r.rows[j];
      rows += '<tr><th scope="row">' + q.year + "年目</th><td>" + comma(q.end) + "円</td><td>" + comma(q.sold) + "円</td></tr>";
    }
    $("wd-year-body").innerHTML = rows;

    // グラフ
    var series = [], y;
    for (y = 0; y <= p.years; y++) {
      series.push({ year: y, value: r.ends[y], keep: noWithdraw(p.init, r.monthRate, y) });
    }
    var desc = "開始時の資産は" + comma(p.init) + "円。" + (r.depMonth ? durText(r.depMonth) + "後に残高が0円になります。" : p.years + "年後の残高は" + comma(r.end) + "円です。");
    $("wd-chart").innerHTML = drawChart(series, p.years, desc);

    // 年利違い(入力した年利が、表の行と小数2桁の表示で同じなら、その行を入力した値の行にする)
    var rates = RATE_ROWS.slice(), mineAt = -1;
    for (j = 0; j < rates.length; j++) {
      if (trimNum(rates[j], 2) === trimNum(p.rate, 2)) { mineAt = j; rates[j] = p.rate; }
    }
    if (mineAt === -1) { rates.push(p.rate); rates.sort(function (a, b) { return a - b; }); }
    var rr = "";
    rates.forEach(function (rt) {
      var q2 = JSON.parse(JSON.stringify(p));
      q2.rate = rt;
      var s = simulate(q2);
      var mine = rt === p.rate;
      var z = !s.depMonth && Math.round(s.end) === 0;
      rr += "<tr" + (mine ? ' class="fs-mine"' : "") + '><th scope="row">年' + trimNum(rt, 2) + "%" + (mine ? "(入力した値)" : "") + "</th><td>" +
        (s.depMonth ? durText(s.depMonth) + "後に尽きる" : (z ? "ほぼ0円に近づく" : "尽きない")) + "</td><td>" + comma(s.end) + "円</td></tr>";
    });
    $("wd-rate-body").innerHTML = rr;
    $("wd-rate-cost").textContent = trimNum(p.cost, 2) + "%";
    $("wd-rate-years").textContent = p.years + "年";

    $("wd-result").classList.add("is-shown");
    return true;
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var f = $("wd-form");
    if (!f) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    syncFields();
    updateHints();
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (render(true)) {
        track("withdraw_calculate");
        try { $("wd-summary").scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); } catch (e) { /* 古いブラウザ */ }
      }
    });
    var later = debounce(function () { render(false); }, 400);
    f.addEventListener("input", function () { updateHints(); later(); });
    f.addEventListener("change", function () { syncFields(); updateHints(); render(false); });
    render(false);
  });
})();
