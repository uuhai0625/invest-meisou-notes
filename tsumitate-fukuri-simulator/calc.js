/* 積立シミュレーター(tsumitate-fukuri-simulator)
 * 入力は端末内だけで計算し、送信・保存しません。
 * GA4へ送るのは、「計算する」ボタンを押した回数と計算の種類(simulate / goal)だけで、金額・年数・利回りは送りません。
 * 計算: 月末に積み立て、年利は「1年あたりの実質の増加率(年複利)」として扱う。
 *       月利 = (1 + 年利 − 年間コスト)^(1/12) − 1。購入時手数料・為替・分配金・税は評価額に含めない。
 * 税: 売却益の全額に20.315%(所得税15%・住民税5%に、所得税額の2.1%分の付加税を加えた率。
 *     付加税は令和8年までは復興特別所得税、令和9年以後は復興特別所得税1.1%+防衛特別所得税1%で、合計は同じ。国税庁No.1463ほか)。
 */
(function () {
  "use strict";

  var TAX_RATE = 0.20315;
  var NISA_YEAR_TSUMITATE = 1200000; // つみたて投資枠 年間(金融庁)
  var NISA_YEAR_TOTAL = 3600000;     // 年間投資枠の合計(つみたて120万+成長240万)
  var NISA_LIFETIME = 18000000;      // 非課税保有限度額(簿価)
  var RATE_ROWS = [-2, 0, 1, 2, 3, 5];

  function $(id) { return document.getElementById(id); }

  function track(name, extra) {
    try {
      if (typeof window.gtag === "function") {
        var p = { page_path: location.pathname };
        if (extra) { Object.keys(extra).forEach(function (k) { p[k] = extra[k]; }); }
        window.gtag("event", name, p);
      }
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

  // 「約960万円」「約1.25億円」「5,000円」
  function man(n) {
    var a = Math.abs(n), sign = n < 0 ? "-" : "";
    if (a >= 100000000) return "約" + sign + trimNum(a / 100000000, 2) + "億円";
    if (a >= 10000) return "約" + sign + comma(a / 10000) + "万円";
    return sign + comma(a) + "円";
  }

  function setMoney(id, n) {
    var el = $(id);
    if (!el) return;
    var full = comma(n) + "円";
    var m = man(n);
    el.innerHTML = (m === full ? "" : '<span class="fs-v-main">' + m + "</span>") + '<span class="fs-v-sub">' + full + "</span>";
  }

  function limitText(v, unit) {
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

  function showError(boxId, err) {
    var box = $(boxId), k;
    if (!box) return;
    var inputs = box.parentNode.querySelectorAll("input");
    for (k = 0; k < inputs.length; k++) { inputs[k].removeAttribute("aria-invalid"); }
    if (err) {
      box.textContent = err.msg;
      box.hidden = false;
      var el = $(err.id);
      if (el) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", boxId); el.focus(); }
    } else {
      box.textContent = "";
      box.hidden = true;
    }
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

  function requiredPay(target, init, m, n) {
    var rest = target - init * (Math.abs(m) < 1e-12 ? 1 : Math.pow(1 + m, n));
    if (rest <= 0) return 0;
    if (Math.abs(m) < 1e-12) return rest / n;
    var g = Math.pow(1 + m, n);
    return rest * m / (g - 1);
  }

  // ---- グラフ(SVG) ----
  function niceStep(raw) {
    if (raw <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  function axisLabel(v, step) {
    if (step >= 100000000) return trimNum(v / 100000000, 2) + "億";
    if (step >= 10000) return trimNum(v / 10000, 1) + "万";
    return comma(v);
  }

  function drawChart(series, years) {
    var W = 640, H = 320, L = 112, R = 18, T = 18, B = 50, i, t;
    var maxV = 0;
    for (i = 0; i < series.length; i++) {
      maxV = Math.max(maxV, series[i].value, series[i].principal, series[i].zero);
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
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="fs-chart-title fs-chart-desc" focusable="false">';
    svg += '<title id="fs-chart-title">元本と評価額の年ごとの推移</title>';
    svg += '<desc id="fs-chart-desc">' + years + "年後の元本は" + comma(last.principal) + "円、評価額(仮の年利)は" + comma(last.value) + "円、年利0%の場合は" + comma(last.zero) + "円です。年ごとの数字は下の表にあります。</desc>";
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
    svg += '<path class="fs-line-zero" d="' + path("zero") + '" fill="none"/>';
    svg += '<path class="fs-line-principal" d="' + path("principal") + '" fill="none"/>';
    svg += '<path class="fs-line-value" d="' + path("value") + '" fill="none"/>';
    svg += "</svg>";
    return svg;
  }

  // ---- 積立の試算 ----
  var simSpecs = function () {
    return [
      { id: "fs-pay", label: "毎月の積立額", min: 0, max: 1000000, unit: "円" },
      { id: "fs-years", label: "積立年数", min: 1, max: 60, unit: "年", int: true },
      { id: "fs-rate", label: "仮の年利", min: -10, max: 30, unit: "%" },
      { id: "fs-cost", label: "年間のコスト", min: 0, max: 5, unit: "%" },
      { id: "fs-infl", label: "物価の上昇率", min: 0, max: 10, unit: "%" },
      { id: "fs-init", label: "最初に入れる金額", min: 0, max: 1000000000, unit: "円", opt: true }
    ];
  };

  function renderSim(show) {
    var specs = simSpecs();
    var err = check(specs);
    var pay = specs[0].value, yrs = specs[1].value, rate = specs[2].value, cost = specs[3].value, infl = specs[4].value, init = specs[5].value;
    if (!err && pay === 0 && init === 0) err = { id: "fs-pay", msg: "毎月の積立額か、最初に入れる金額のどちらかは0より大きくしてください。" };
    var res = $("fs-result");
    if (err) {
      if (show) { showError("fs-error", err); }
      return false;
    }
    showError("fs-error", null);

    var m = monthlyRate(rate, cost), n = yrs * 12;
    var principal = init + pay * n;
    var fv = futureValue(init, pay, m, n);
    var gain = fv - principal;
    var tax = gain > 0 ? gain * TAX_RATE : 0;
    var real = fv / Math.pow(1 + infl / 100, yrs);

    $("fs-summary").textContent = yrs + "年後、元本" + man(principal) + "が、仮の年利" + trimNum(rate, 2) + "%・コスト" + trimNum(cost, 2) + "%の場合に" + man(fv) + "になる計算です(実現する保証はありません)。";
    $("fs-sr").textContent = $("fs-summary").textContent;
    setMoney("fs-out-principal", principal);
    setMoney("fs-out-value", fv);
    setMoney("fs-out-gain", gain);
    setMoney("fs-out-real", real);
    setMoney("fs-out-after-tax", fv - tax);
    $("fs-real-infl").textContent = trimNum(infl, 2) + "%";
    $("fs-out-compare").textContent = gain > 0
      ? "NISA口座で積み立てて売った場合は、売却益に税金がかからず、評価額のままです。課税口座(特定口座・一般口座)で売った場合の税額の目安は" + comma(tax) + "円(" + man(tax) + ")で、差は" + man(tax) + "です。"
      : "運用益がマイナスか0のため、この仮定では、NISA口座と課税口座で売却時の税額の差は出ません(税額は0円)。";

    var series = [], rows = "", y;
    var mz = monthlyRate(0, cost);
    for (y = 0; y <= yrs; y++) {
      var pr = init + pay * y * 12, va = futureValue(init, pay, m, y * 12);
      series.push({ year: y, principal: pr, value: va, zero: futureValue(init, pay, mz, y * 12) });
      if (y > 0) rows += '<tr><th scope="row">' + y + "年後</th><td>" + comma(pr) + "円</td><td>" + comma(va) + "円</td><td>" + comma(va - pr) + "円</td></tr>";
    }
    $("fs-chart").innerHTML = drawChart(series, yrs);
    $("fs-year-body").innerHTML = rows;

    var list = RATE_ROWS.slice();
    if (list.indexOf(rate) === -1) { list.push(rate); list.sort(function (a, b) { return a - b; }); }
    var rr = "";
    list.forEach(function (r) {
      var f = futureValue(init, pay, monthlyRate(r, cost), n);
      var mine = r === rate;
      rr += "<tr" + (mine ? ' class="fs-mine"' : "") + '><th scope="row">年' + trimNum(r, 2) + "%" + (mine ? "(入力した値)" : "") + "</th><td>" + comma(f) + "円</td><td>" + comma(f - principal) + "円</td></tr>";
    });
    $("fs-rate-body").innerHTML = rr;
    $("fs-rate-cost").textContent = trimNum(cost, 2) + "%";
    $("fs-rate-years").textContent = yrs + "年";

    // NISAの枠との関係
    var msgs = [], annual = pay * 12;
    if (pay > 0) {
      if (annual <= NISA_YEAR_TSUMITATE) {
        msgs.push("毎月の積立額(年間" + comma(annual) + "円)は、つみたて投資枠の年間上限(120万円=月10万円)以内です。");
      } else if (annual <= NISA_YEAR_TOTAL) {
        msgs.push("年間の積立額(" + comma(annual) + "円)は、つみたて投資枠の年間上限(120万円)を超えています。超える分を成長投資枠で買う場合は、両方の枠を合わせて年間360万円までです。");
      } else {
        msgs.push("年間の積立額(" + comma(annual) + "円)は、つみたて投資枠と成長投資枠を合わせた年間上限(360万円)を超えます。超えた分はNISAの枠に入りません。");
      }
    }
    if (init > 0 && init + annual > NISA_YEAR_TOTAL) {
      msgs.push("最初に入れる金額を1年目に加えると" + comma(init + annual) + "円で、年間上限(合計360万円)を超えます。");
    }
    if (principal <= NISA_LIFETIME) {
      msgs.push("元本の合計(" + comma(principal) + "円)は、非課税保有限度額(1,800万円)以内です。売らずに続けるなら、元本は全額、NISAの非課税の枠に収まります。");
    } else {
      var monthsToCap = pay > 0 ? Math.ceil((NISA_LIFETIME - init) / pay) : 0;
      var head = "元本の合計(" + comma(principal) + "円)は、非課税保有限度額(1,800万円)を超えます。";
      if (init >= NISA_LIFETIME) head += "最初に入れる金額だけで、1,800万円に達します。";
      else if (pay > 0) head += "積立だけで1,800万円に達するのは、約" + Math.floor(monthsToCap / 12) + "年" + (monthsToCap % 12 ? (monthsToCap % 12) + "か月" : "") + "後です。";
      msgs.push(head + "超えた分はNISAの枠に入らないため、課税口座で買うことになり、その分の運用益には税がかかります。上の「NISAなら」の数字より、実際の手取りは低くなります。");
    }
    $("fs-nisa-list").innerHTML = msgs.map(function (t) { return "<li>" + t + "</li>"; }).join("");

    res.classList.add("is-shown");
    return true;
  }

  // ---- 目標額からの逆算 ----
  function renderGoal(show) {
    var specs = [
      { id: "fg-target", label: "目標額", min: 10000, max: 10000000000, unit: "円" },
      { id: "fg-years", label: "積立年数", min: 1, max: 60, unit: "年", int: true },
      { id: "fg-rate", label: "仮の年利", min: -10, max: 30, unit: "%" },
      { id: "fg-cost", label: "年間のコスト", min: 0, max: 5, unit: "%" },
      { id: "fg-init", label: "最初に入れる金額", min: 0, max: 1000000000, unit: "円", opt: true }
    ];
    var err = check(specs);
    var res = $("fg-result");
    if (err) {
      if (show) { showError("fg-error", err); }
      return false;
    }
    showError("fg-error", null);
    var target = specs[0].value, yrs = specs[1].value, rate = specs[2].value, cost = specs[3].value, init = specs[4].value;
    var m = monthlyRate(rate, cost), n = yrs * 12;
    var payC = Math.ceil(requiredPay(target, init, m, n));
    var principal = init + payC * n;
    var fv = futureValue(init, payC, m, n);
    var pay0 = Math.ceil(requiredPay(target, init, 0, n));

    if (payC > 0) setMoney("fg-out-pay", payC);
    else $("fg-out-pay").innerHTML = '<span class="fs-v-main">0円</span><span class="fs-v-sub">最初の金額だけで届く計算です</span>';
    setMoney("fg-out-principal", principal);
    setMoney("fg-out-gain", fv - principal);
    setMoney("fg-out-zero", pay0);
    var annual = payC * 12, note = "";
    if (annual > NISA_YEAR_TOTAL) note = "この金額の年間合計(" + comma(annual) + "円)は、NISAの年間上限(合計360万円)を超えます。";
    else if (annual > NISA_YEAR_TSUMITATE) note = "この金額の年間合計(" + comma(annual) + "円)は、つみたて投資枠の年間上限(120万円)を超えます。";
    $("fg-out-note").textContent = note;
    $("fg-sr").textContent = payC > 0
      ? yrs + "年で" + man(target) + "に届く計算になる毎月の額は、仮の年利" + trimNum(rate, 2) + "%・コスト" + trimNum(cost, 2) + "%の場合に" + comma(payC) + "円です。"
      : "最初に入れる金額だけで、目標額に届く計算です。";
    res.classList.add("is-shown");
    return true;
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var f1 = $("fs-form"), f2 = $("fg-form");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function bring(el) {
      try { el.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); } catch (e) { /* 古いブラウザ */ }
    }
    if (f1) {
      f1.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (renderSim(true)) { track("sim_calculate", { mode: "simulate" }); bring($("fs-summary")); }
      });
      f1.addEventListener("input", debounce(function () { renderSim(false); }, 400));
      renderSim(false);
    }
    if (f2) {
      f2.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (renderGoal(true)) { track("sim_calculate", { mode: "goal" }); bring($("fg-out-pay")); }
      });
      f2.addEventListener("input", debounce(function () { renderGoal(false); }, 400));
      renderGoal(false);
    }
  });
})();
