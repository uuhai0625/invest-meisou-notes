/* 信託報酬の差を計算する(toushin-cost-keisan)
 * 入力は端末内だけで計算し、送信・保存しません。
 * GA4へ送るのは、「計算する」ボタンを押した回数(cost_calculate)だけで、パラメータは付けず、金額・年数・利回り・コスト率は送りません。
 * 計算: 月末に積み立て、年利は「1年あたり何%ずつ増えるか(年複利)」として扱う。
 *       月利 = (1 + 年利 − 年間コスト)^(1/12) − 1。購入時手数料・信託財産留保額・為替・分配金・税は評価額に含めない。
 * 最初の1年のコスト額の目安 = 1年間の平均保有額 × コスト率。平均保有額 = 最初の金額 + 毎月の積立額 × 5.5
 *   (月末に積み立てるため、1〜12か月目の保有積立回数は0〜11回で、平均5.5回。値動きは考えない)。
 */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function track(name) {
    try {
      if (typeof window.gtag === "function") { window.gtag("event", name); }
    } catch (e) { /* 計測できなくても動く */ }
  }

  // ---- 入力 ----
  // 戻り値: 数字 / 空欄はNaN / 不正な文字列(badInput)もNaN
  function readNum(id) {
    var el = $(id);
    if (!el) return NaN;
    if (el.validity && el.validity.badInput) return NaN;
    var v = String(el.value).replace(/[,\s]/g, "");
    if (v === "") return NaN;
    return Number(v);
  }
  // 任意欄: 空欄は0、不正な文字列はNaN
  function readOpt(id) {
    var el = $(id);
    if (!el) return 0;
    if (el.validity && el.validity.badInput) return NaN;
    var v = String(el.value).replace(/[,\s]/g, "");
    return v === "" ? 0 : Number(v);
  }

  function comma(n) {
    var s = String(Math.round(n));
    var neg = s.charAt(0) === "-";
    if (neg) s = s.slice(1);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + s;
  }

  function trimNum(x, d) { return String(Number(x.toFixed(d))); }

  // 小数を含む数の整数部に桁区切りを入れる(例: 1234.5 → 1,234.5)
  function commaDec(x, d) {
    var s = trimNum(x, d), p = s.split(".");
    return comma(Number(p[0])) + (p[1] ? "." + p[1] : "");
  }

  // 「約960万円」「約1.25億円」「約1,234億円」「約1兆2,345億円」「5,000円」
  // 丸めは最初の1回だけ(14,999円→約1万円、99,999,999.6円→約1億円)
  function man(n) {
    var a = Math.abs(n), sign = n < 0 ? "-" : "";
    var r = Math.round(a);
    if (r < 10000) return sign + comma(r) + "円";
    var mn = Math.round(a / 10000);
    if (mn < 10000) return "約" + sign + comma(mn) + "万円";
    var ok = Math.round(a / 1000000) / 100;
    if (ok < 10000) return "約" + sign + commaDec(ok, 2) + "億円";
    var oku = Math.round(a / 100000000), cho = Math.floor(oku / 10000), rest = oku % 10000;
    return "約" + sign + comma(cho) + "兆" + (rest ? comma(rest) + "億" : "") + "円";
  }

  // 入力欄の下の換算表示(桁の取り違え防止)。ちょうど割り切れるときは「約」を付けない
  function convText(v) {
    if (!isFinite(v) || v <= 0) return "";
    if (v >= 10000 && v < 100000000 && v % 10000 === 0) return "= " + comma(v / 10000) + "万円";
    if (v >= 100000000 && v < 1000000000000 && v % 100000000 === 0) return "= " + comma(v / 100000000) + "億円";
    return "= " + man(v);
  }

  function setMoney(id, n) {
    var el = $(id);
    if (!el) return;
    var full = comma(n) + "円";
    var m = man(n);
    el.innerHTML = (m === full ? "" : '<span class="fs-v-main">' + m + "</span>") + '<span class="fs-v-sub">' + full + "</span>";
  }

  function limitText(v, unit) {
    if (unit === "円" && Math.abs(v) >= 100000000) return commaDec(v / 100000000, 2) + "億円";
    if (unit === "円" && Math.abs(v) >= 10000) return comma(v / 10000) + "万円";
    return comma(v) + unit;
  }

  // 検証。問題があれば {id, msg} を返す
  function check(list) {
    var i, it, v;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      v = it.opt ? readOpt(it.id) : readNum(it.id);
      if (!isFinite(v)) return { id: it.id, msg: it.label + "を数字で入力してください。" };
      if (it.int && Math.floor(v) !== v) return { id: it.id, msg: it.label + "は整数(1年単位)で入力してください。" };
      if (v < it.min || v > it.max) return { id: it.id, msg: it.label + "は" + limitText(it.min, it.unit) + "〜" + limitText(it.max, it.unit) + "の範囲で入力してください。" };
      it.value = v;
    }
    return null;
  }

  // エラー表示。focus が true のときだけ、不正な欄へフォーカスを移す(自動再計算では奪わない)。
  // aria-describedby は元の値(ヒントなど)を退避し、エラー時は「元の値 + エラー欄」、解除時は元の値に戻す。
  function showError(boxId, err, focus) {
    var box = $(boxId), k, inp, base;
    if (!box) return;
    var inputs = box.parentNode.querySelectorAll("input");
    for (k = 0; k < inputs.length; k++) {
      inp = inputs[k];
      if (!inp.hasAttribute("data-desc")) { inp.setAttribute("data-desc", inp.getAttribute("aria-describedby") || ""); }
      base = inp.getAttribute("data-desc");
      inp.removeAttribute("aria-invalid");
      if (base) { inp.setAttribute("aria-describedby", base); } else { inp.removeAttribute("aria-describedby"); }
    }
    if (err) {
      box.textContent = err.msg;
      box.hidden = false;
      var el = $(err.id);
      if (el) {
        el.setAttribute("aria-invalid", "true");
        base = el.getAttribute("data-desc") || "";
        el.setAttribute("aria-describedby", (base ? base + " " : "") + boxId);
        if (focus) { el.focus(); }
      }
    } else {
      box.textContent = "";
      box.hidden = true;
    }
  }

  // 読み上げ領域の更新。同じ文字列でも読み上げられるよう、一度空にしてから短い遅延で入れ直す
  function announce(id, text) {
    var el = $(id);
    if (!el) return;
    el.textContent = "";
    setTimeout(function () { el.textContent = text; }, 60);
  }

  // ---- 計算 ----
  function monthlyRate(annualPct, costPct) {
    var net = (annualPct - costPct) / 100;
    if (net <= -0.999) net = -0.999;
    return Math.pow(1 + net, 1 / 12) - 1;
  }

  function futureValue(init, pay, m, n) {
    if (Math.abs(m) < 1e-12) return init + pay * n;
    var g = Math.pow(1 + m, n);
    return init * g + pay * (g - 1) / m;
  }

  // 最初の1年のコスト額の目安(値動きは考えない)
  function firstYearCost(init, pay, costPct) {
    return (init + pay * 5.5) * costPct / 100;
  }

  // 2つのコストの比較。series は 0年〜years年。
  function compare(init, pay, years, rate, costA, costB) {
    var n = years * 12, mA = monthlyRate(rate, costA), mB = monthlyRate(rate, costB), y;
    var principal = init + pay * n;
    var a = futureValue(init, pay, mA, n), b = futureValue(init, pay, mB, n);
    var series = [];
    for (y = 0; y <= years; y++) {
      series.push({ year: y, a: futureValue(init, pay, mA, y * 12), b: futureValue(init, pay, mB, y * 12) });
    }
    return {
      principal: principal, a: a, b: b, diff: a - b,
      diffPct: principal > 0 ? Math.abs(a - b) / principal * 100 : 0,
      costA1: firstYearCost(init, pay, costA), costB1: firstYearCost(init, pay, costB),
      avgHold1: init + pay * 5.5,
      series: series
    };
  }

  // ---- グラフ(SVG) ----
  function niceStep(raw) {
    if (raw <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function axisLabel(v, step) {
    if (step >= 1000000000000) return trimNum(v / 1000000000000, 2) + "兆";
    if (step >= 100000000) return trimNum(v / 100000000, 2) + "億";
    if (step >= 10000) return trimNum(v / 10000, 1) + "万";
    return comma(v);
  }

  function drawChart(series, years) {
    var W = 640, H = 320, L = 112, R = 18, T = 18, B = 50, i, t;
    var maxV = 0;
    for (i = 0; i < series.length; i++) {
      maxV = Math.max(maxV, series[i].a, series[i].b);
    }
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
    var last = series[series.length - 1];
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="tc-chart-title tc-chart-desc" focusable="false">';
    svg += '<title id="tc-chart-title">ファンドAとBの評価額の年ごとの推移</title>';
    svg += '<desc id="tc-chart-desc">' + years + "年後の評価額は、ファンドAが" + comma(last.a) + "円、ファンドBが" + comma(last.b) + "円です。年ごとの数字は下の表にあります。</desc>";
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
    svg += '<path class="fs-line-b" d="' + path("b") + '" fill="none"/>';
    svg += '<path class="fs-line-a" d="' + path("a") + '" fill="none"/>';
    svg += "</svg>";
    return svg;
  }

  // ---- 試算の表示 ----
  var specs = function () {
    return [
      { id: "tc-pay", label: "毎月の積立額", min: 0, max: 1000000, unit: "円" },
      { id: "tc-years", label: "積立年数", min: 1, max: 60, unit: "年", int: true },
      { id: "tc-rate", label: "仮の年利", min: -10, max: 30, unit: "%" },
      { id: "tc-ca", label: "ファンドAの年間コスト", min: 0, max: 5, unit: "%" },
      { id: "tc-cb", label: "ファンドBの年間コスト", min: 0, max: 5, unit: "%" },
      { id: "tc-init", label: "最初に入れる金額", min: 0, max: 1000000000, unit: "円", opt: true }
    ];
  };

  // show が true: 「計算する」ボタンを押したとき(フォーカス移動・読み上げあり)。false: 入力中の自動再計算。
  function render(show) {
    var sp = specs();
    var err = check(sp);
    var pay = sp[0].value, yrs = sp[1].value, rate = sp[2].value, ca = sp[3].value, cb = sp[4].value, init = sp[5].value;
    if (!err && pay === 0 && init === 0) err = { id: "tc-pay", msg: "毎月の積立額か、最初に入れる金額のどちらかは0より大きくしてください。" };
    if (err) {
      // 不正な入力のときは、古い結果を残さず隠し、日本語のエラーを出す
      $("tc-result").classList.remove("is-shown");
      showError("tc-error", err, show);
      return false;
    }
    showError("tc-error", null, false);

    var r = compare(init, pay, yrs, rate, ca, cb);
    var dirText;
    if (Math.round(r.diff) === 0) dirText = "ファンドAとBの評価額は同じです(コストが同じ、または差が1円未満です)。";
    else dirText = "ファンドAの評価額は、ファンドBより" + comma(Math.abs(r.diff)) + "円(" + man(Math.abs(r.diff)) + ")" + (r.diff > 0 ? "多い" : "少ない") + "計算です。";

    $("tc-summary").textContent = yrs + "年後の評価額は、Aが" + man(r.a) + "、Bが" + man(r.b) + "で、差は" + man(Math.abs(r.diff)) + "です(元本は" + man(r.principal) + ")。仮の年利" + trimNum(rate, 2) + "%を同じに置いた計算で、将来を約束する数字ではありません。";
    if (show) { announce("tc-sr", $("tc-summary").textContent); }
    setMoney("tc-out-a", r.a);
    setMoney("tc-out-b", r.b);
    setMoney("tc-out-diff", Math.abs(r.diff));
    $("tc-out-pct").innerHTML = '<span class="fs-v-main">' + trimNum(r.diffPct, 1) + '%</span><span class="fs-v-sub">元本' + comma(r.principal) + "円に対して</span>";
    setMoney("tc-out-cost-a", r.costA1);
    setMoney("tc-out-cost-b", r.costB1);
    $("tc-cost-a-label").textContent = trimNum(ca, 2) + "%";
    $("tc-cost-b-label").textContent = trimNum(cb, 2) + "%";
    $("tc-avg-hold").textContent = comma(r.avgHold1) + "円";

    var warn = [];
    if (rate - ca < 0) warn.push("ファンドAは、コストが仮の年利を上回るため、運用による増減がマイナスの計算で、評価額は元本を下回ります。");
    if (rate - cb < 0) warn.push("ファンドBは、コストが仮の年利を上回るため、運用による増減がマイナスの計算で、評価額は元本を下回ります。");
    $("tc-out-compare").textContent = dirText + (warn.length ? " " + warn.join("") : "");

    var rows = "", y;
    for (y = 1; y <= yrs; y++) {
      var s = r.series[y];
      rows += '<tr><th scope="row">' + y + "年後</th><td>" + comma(s.a) + "円</td><td>" + comma(s.b) + "円</td><td>" + comma(s.a - s.b) + "円</td></tr>";
    }
    $("tc-chart").innerHTML = drawChart(r.series, yrs);
    $("tc-year-body").innerHTML = rows;

    $("tc-result").classList.add("is-shown");
    return true;
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // 金額欄の下の換算表示を更新
  function updateConv() {
    var ids = ["tc-pay", "tc-init"], k, el, v;
    for (k = 0; k < ids.length; k++) {
      el = $(ids[k] + "-conv");
      if (!el) continue;
      v = readOpt(ids[k]);
      el.textContent = convText(v);
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      var f = $("tc-form");
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!f) return;
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (render(true)) {
          track("cost_calculate");
          try { $("tc-summary").scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); } catch (e) { /* 古いブラウザ */ }
        }
      });
      var auto = debounce(function () { render(false); }, 400);
      f.addEventListener("input", function () { updateConv(); auto(); });
      updateConv();
      render(false);
    });
  }

  // テスト用(ブラウザでは使われない)
  if (typeof module === "object" && module && module.exports) {
    module.exports = { monthlyRate: monthlyRate, futureValue: futureValue, firstYearCost: firstYearCost, compare: compare, man: man, convText: convText, limitText: limitText };
  }
})();
