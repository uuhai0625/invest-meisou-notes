/* NISAの残り枠と、売却後に戻る枠(nisa-waku-nokori)
 * 入力は端末内だけで計算し、送信・保存しません。
 * GA4へ送るのは、「計算する」ボタンを押した回数(イベント名 nisa_waku_calculate)だけで、パラメータ(金額など)は送りません。
 *
 * 入力は「いま」の簿価が基準(証券会社の画面に出る数字に近い)。内部で、制度の数え方に合わせて年初の簿価に直す:
 *   年初の簿価 = いまの簿価 − 今年買った分 + 今年売った分(成長投資枠の分も同じ式)
 *
 * 数え方(2026年11月時点。金融庁NISA特設サイト・国税庁No.1535・日本証券業協会「2024年以降のNISAに関するQ&A」2026年9月版):
 *  - 年間投資枠は暦年で、つみたて投資枠120万円・成長投資枠240万円。使い残しは翌年に繰り越せず、売っても同じ年には増えない。
 *  - 非課税保有限度額は1,800万円(うち成長投資枠は1,200万円。成長の1,200万円は1,800万円の内数)。買ったときの金額(簿価)で数える。
 *  - ある年の非課税保有額 = 前年末の保有簿価 + その年に買った金額。売却による減少は翌年に反映される(売った年は枠が戻らない)。
 *  - 減る額は売ったときの時価ではなく簿価で計算する。購入手数料は含めない。
 */
(function (root) {
  "use strict";

  // ---- 制度の数字(制度が変わったら、ここだけ直す) ----
  var YEAR_LIMIT_TSUMITATE = 1200000;  // つみたて投資枠の年間投資枠(円)。金融庁・国税庁No.1535
  var YEAR_LIMIT_GROWTH = 2400000;     // 成長投資枠の年間投資枠(円)。同上
  var LIFETIME_LIMIT = 18000000;       // 非課税保有限度額(簿価、円)。同上
  var LIFETIME_LIMIT_GROWTH = 12000000; // うち成長投資枠の非課税保有限度額(簿価、円)。1,800万円の内数
  var INPUT_MAX = 1000000000;          // 入力欄の上限(10億円)。誤入力を止めるための値で、制度の数字ではない

  function min(a, b) { return a < b ? a : b; }
  function max(a, b) { return a > b ? a : b; }

  // ---- 入力の換算 ----
  // いまの入力 n = { bt, bg, c: いまの簿価の合計, cg: そのうち成長, s: 今年売った簿価の合計, sg: うち成長 }
  // → 内部の入力 { bt, bg, b0: 年初の簿価の合計, g0: 年初の成長の簿価, s, sg }
  function toInternal(n) {
    return { bt: n.bt, bg: n.bg, b0: n.c - n.bt - n.bg + n.s, g0: n.cg - n.bg + n.sg, s: n.s, sg: n.sg };
  }

  // ---- 計算(純粋関数。DOMに触らない) ----
  // i = toInternal の結果
  function calcWaku(i) {
    var holdNow = i.b0 + i.bt + i.bg;     // 今年の非課税保有額(年初の簿価+今年買った分。売却は来年に反映)
    var growthNow = i.g0 + i.bg;          // うち成長投資枠
    var roomTotal = max(0, LIFETIME_LIMIT - holdNow);
    var roomGrowth = max(0, LIFETIME_LIMIT_GROWTH - growthNow);
    var leftT = max(0, YEAR_LIMIT_TSUMITATE - i.bt);
    var leftG = max(0, YEAR_LIMIT_GROWTH - i.bg);
    var allowG = min(leftG, roomGrowth);  // 成長の年間枠の残りと、成長1,200万円の空きの小さいほう

    var holdNext = holdNow - i.s;         // 来年の年初の非課税保有額
    var growthNext = growthNow - i.sg;
    var roomNext = max(0, LIFETIME_LIMIT - holdNext);
    var roomGrowthNext = max(0, LIFETIME_LIMIT_GROWTH - growthNext);
    var allowGNext = min(YEAR_LIMIT_GROWTH, roomGrowthNext);

    return {
      b0: i.b0, g0: i.g0,
      holdNow: holdNow, growthNow: growthNow,
      roomTotal: roomTotal, roomGrowth: roomGrowth,
      leftT: leftT, leftG: leftG, allowG: allowG,
      maxT: min(leftT, roomTotal),
      maxG: min(allowG, roomTotal),
      maxBoth: min(leftT + allowG, roomTotal),
      returned: i.s,
      holdNext: holdNext, growthNext: growthNext,
      roomNext: roomNext, roomGrowthNext: roomGrowthNext,
      nextT: min(YEAR_LIMIT_TSUMITATE, roomNext),
      nextG: min(allowGNext, roomNext),
      nextBoth: min(YEAR_LIMIT_TSUMITATE + allowGNext, roomNext)
    };
  }

  // 入力どうしの矛盾(いま基準の入力)。問題があれば {id, msg}、なければnull
  function crossCheck(n) {
    var i = toInternal(n);
    if (n.cg > n.c) return { id: "nw-cg", msg: "成長投資枠の簿価が、簿価の合計を超えています。成長投資枠の分は合計の一部なので、合計以下にしてください。" };
    if (n.sg > n.s) return { id: "nw-sg", msg: "売却した成長投資枠の簿価が、売却した簿価の合計を超えています。合計以下にしてください。" };
    if (i.b0 < 0) return { id: "nw-c", msg: "いまの簿価の合計と今年売った簿価の合計が、今年買った金額の合計に届きません。今年買った分は、いまの簿価に含まれるはずなので、確かめてください。" };
    if (i.g0 < 0) return { id: "nw-cg", msg: "成長投資枠の簿価と、今年売った成長投資枠の簿価の合計が、今年成長投資枠で買った金額に届きません。今年買った分は、いまの簿価に含まれるはずなので、確かめてください。" };
    if (i.b0 - i.g0 < 0) return { id: "nw-c", msg: "つみたて投資枠の簿価(合計から成長投資枠の分を引いた額)と、今年売ったつみたて投資枠の簿価の合計が、今年つみたて投資枠で買った金額に届きません。確かめてください。" };
    return null;
  }

  // 上限を超えた入力への注意文(計算は止めない)。i = toInternal の結果
  function notices(i) {
    var n = [];
    if (i.bt > YEAR_LIMIT_TSUMITATE) n.push("今年つみたて投資枠で買った金額が、年間投資枠の上限(120万円)を超えています。入力を確かめてください。計算では、つみたて投資枠の残りを0円として扱います。");
    if (i.bg > YEAR_LIMIT_GROWTH) n.push("今年成長投資枠で買った金額が、年間投資枠の上限(240万円)を超えています。入力を確かめてください。計算では、成長投資枠の残りを0円として扱います。");
    if (i.b0 > LIFETIME_LIMIT) n.push("年初の簿価の合計(いまの簿価から逆算した額)が、非課税保有限度額(1,800万円)を超えています。入力を確かめてください。計算では、空きを0円として扱います。");
    if (i.g0 > LIFETIME_LIMIT_GROWTH) n.push("年初の成長投資枠の簿価(いまの簿価から逆算した額)が、成長投資枠の上限(1,200万円)を超えています。入力を確かめてください。計算では、成長投資枠の空きを0円として扱います。");
    if (i.b0 <= LIFETIME_LIMIT && i.g0 <= LIFETIME_LIMIT_GROWTH) {
      if (i.b0 + i.bt + i.bg > LIFETIME_LIMIT) n.push("年初の簿価と今年買った金額の合計が、非課税保有限度額(1,800万円)を超えています。入力を確かめてください。");
      else if (i.g0 + i.bg > LIFETIME_LIMIT_GROWTH) n.push("年初と今年の成長投資枠の簿価の合計が、成長投資枠の上限(1,200万円)を超えています。入力を確かめてください。");
    }
    return n;
  }

  // ---- 表示用の文字 ----
  function comma(n) {
    var s = String(Math.round(n));
    var neg = s.charAt(0) === "-";
    if (neg) s = s.slice(1);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + s;
  }
  function yen(n) { return comma(n) + "円"; }
  // 小数を、末尾の0を除いて桁区切り付きで書く(d=小数の桁数)
  function dec(x, d) {
    var s = x.toFixed(d), p = s.split("."), frac = p[1] ? p[1].replace(/0+$/, "") : "";
    return comma(Number(p[0])) + (frac ? "." + frac : "");
  }
  // 「600万円」(万円で割り切れるとき)、「約612.3万円」、「約1.5億円」、「約1兆2,345億円」、「5,000円」
  function man(n) {
    var a = Math.abs(n), sign = n < 0 ? "-" : "", okuR, cho;
    if (a < 10000) return sign + comma(a) + "円";
    if (a < 100000000 && Math.round(a / 1000) / 10 < 10000) {
      if (a % 10000 === 0) return sign + comma(a / 10000) + "万円";
      return "約" + sign + dec(Math.round(a / 1000) / 10, 1) + "万円";
    }
    if (a < 1000000000000) {
      if (a % 100000000 === 0) return sign + comma(a / 100000000) + "億円";
      okuR = Math.round(a / 1000000) / 100;
      if (okuR < 10000) return "約" + sign + dec(okuR, 2) + "億円";
    }
    okuR = Math.round(a / 100000000);  // 億円に丸めた値
    cho = Math.floor(okuR / 10000);
    return (a % 100000000 === 0 ? "" : "約") + sign + comma(cho) + "兆" + (okuR % 10000 ? comma(okuR % 10000) + "億" : "") + "円";
  }

  // 結論(1行目)。どの上限が効いているかを括弧で添える
  function summaryText(r) {
    var annualSum = r.leftT + r.allowG, cause;
    if (r.roomTotal === 0) cause = "非課税保有限度額が埋まっています";
    else if (r.leftT === 0 && r.allowG === 0 && r.leftG === 0) cause = "今年の年間投資枠を使い切っています";
    else if (r.leftT === 0 && r.allowG === 0) cause = "つみたて投資枠の年間投資枠は使い切り、成長投資枠は簿価の上限に達しています";
    else if (r.roomTotal < annualSum) cause = "非課税保有限度額の空きが上限になっています";
    else cause = "年間投資枠の残りが上限になっています";
    return "今年あと買えるのは、合計" + man(r.maxBoth) + "までの計算です(" + cause + ")。";
  }

  // 理由(1〜2文)
  function reasonText(r) {
    var parts = [];
    var annualSum = r.leftT + r.allowG;
    if (r.roomTotal === 0) {
      parts.push("非課税保有限度額(1,800万円)が埋まっているため、今年はこれ以上、NISA口座で買えません。");
    } else if (r.leftT === 0 && r.allowG === 0 && r.leftG === 0) {
      parts.push("今年の年間投資枠(つみたて投資枠120万円・成長投資枠240万円)は、すでに使い切っています。");
    } else if (r.leftT === 0 && r.allowG === 0) {
      parts.push("つみたて投資枠の年間投資枠(120万円)は使い切っていて、成長投資枠は簿価の上限(1,200万円)に達しているため、今年はこれ以上買えません。");
      return parts.join("");
    } else if (r.roomTotal < annualSum) {
      parts.push("非課税保有限度額の空き(" + man(r.roomTotal) + ")が、年間投資枠の残り(合計" + man(annualSum) + ")より小さいため、今年買えるのは合計で" + man(r.maxBoth) + "までです。");
    } else {
      parts.push("年間投資枠の残り(つみたて投資枠" + man(r.leftT) + "・成長投資枠" + man(r.allowG) + ")が上限です。非課税保有限度額の空き(" + man(r.roomTotal) + ")は足りています。");
    }
    if (r.roomTotal > 0 && r.roomGrowth < r.leftG) {
      parts.push("成長投資枠は、成長投資枠の簿価の上限(1,200万円)が効いていて、空きは" + man(r.roomGrowth) + "です。");
    }
    return parts.join("");
  }

  var api = {
    toInternal: toInternal, calcWaku: calcWaku, crossCheck: crossCheck, notices: notices,
    summaryText: summaryText, reasonText: reasonText, man: man,
    constants: { YEAR_LIMIT_TSUMITATE: YEAR_LIMIT_TSUMITATE, YEAR_LIMIT_GROWTH: YEAR_LIMIT_GROWTH, LIFETIME_LIMIT: LIFETIME_LIMIT, LIFETIME_LIMIT_GROWTH: LIFETIME_LIMIT_GROWTH }
  };
  if (typeof module === "object" && module && module.exports) { module.exports = api; }
  if (typeof document === "undefined") { return; }
  root.NisaWakuCalc = api;

  // ---- 画面 ----
  function $(id) { return document.getElementById(id); }

  function track(name) {
    try {
      if (typeof window.gtag === "function") { window.gtag("event", name); }
    } catch (e) { /* 計測できなくても動く */ }
  }

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
    var full = yen(n), m = man(n);
    el.innerHTML = (m === full ? "" : '<span class="fs-v-main">' + m + "</span>") + '<span class="fs-v-sub">' + full + "</span>";
  }

  var SPECS = [
    { id: "nw-bt", key: "bt", label: "今年つみたて投資枠で買った金額" },
    { id: "nw-bg", key: "bg", label: "今年成長投資枠で買った金額" },
    { id: "nw-c", key: "c", label: "いまの簿価の合計" },
    { id: "nw-cg", key: "cg", label: "いまの成長投資枠の簿価" },
    { id: "nw-s", key: "s", label: "今年売却した簿価の合計" },
    { id: "nw-sg", key: "sg", label: "売却した簿価のうち成長投資枠の分" }
  ];

  // 入力を読んで検証する。戻り値 {err, input}
  function readInput() {
    var n = {}, k, it, v;
    for (k = 0; k < SPECS.length; k++) {
      it = SPECS[k];
      v = readNum(it.id);
      if (!isFinite(v)) return { err: { id: it.id, msg: it.label + "を数字で入力してください。ない場合は0と入れてください。" } };
      if (Math.floor(v) !== v) return { err: { id: it.id, msg: it.label + "は、円単位の整数で入力してください(小数点は使えません)。" } };
      if (v < 0 || v > INPUT_MAX) return { err: { id: it.id, msg: it.label + "は0円〜10億円の範囲で入力してください。" } };
      n[it.key] = v;
    }
    var c = crossCheck(n);
    return c ? { err: c } : { input: n };
  }

  // 入力欄の下の「= 600万円」
  function updateMan() {
    var k, v, el;
    for (k = 0; k < SPECS.length; k++) {
      el = $(SPECS[k].id + "-man");
      if (!el) continue;
      v = readNum(SPECS[k].id);
      el.textContent = (isFinite(v) && v >= 0) ? "= " + man(v) : "";
    }
  }

  // focus=true のときだけ、誤りのある欄へフォーカスを移す(自動再計算では奪わない)
  function showError(err, focus) {
    var box = $("nw-error"), inputs, k, el;
    if (!box) return;
    inputs = box.parentNode.querySelectorAll("input");
    for (k = 0; k < inputs.length; k++) { inputs[k].removeAttribute("aria-invalid"); }
    if (err) {
      box.textContent = err.msg;
      box.hidden = false;
      el = $(err.id);
      if (el) { el.setAttribute("aria-invalid", "true"); if (focus) { el.focus(); } }
    } else {
      box.textContent = "";
      box.hidden = true;
    }
  }

  // 「計算する」を押したときだけ読み上げる。同じ文でも読み上げ直されるよう、いったん空にする
  function announce(text) {
    var el = $("nw-sr");
    if (!el) return;
    el.textContent = "";
    setTimeout(function () { el.textContent = text; }, 50);
  }

  function render(show) {
    var read = readInput();
    var stale = $("nw-stale");
    if (read.err) {
      // 不正な入力のときは、古い結果を残さない
      $("nw-result").classList.remove("is-shown");
      if (stale) { stale.hidden = false; }
      showError(read.err, show);
      return false;
    }
    showError(null, false);
    if (stale) { stale.hidden = true; }
    var n = read.input, i = toInternal(n), r = calcWaku(i);

    var summary = summaryText(r), reason = reasonText(r);
    $("nw-summary").textContent = summary;
    $("nw-reason").textContent = reason;
    $("nw-conv").textContent = "入力から逆算した年初の簿価は" + yen(r.b0) + "(うち成長投資枠" + yen(r.g0) + ")です。いまの簿価から今年買った分を引き、今年売った分を足した額です。";
    if (show) {
      announce(summary + reason + "来年の年初に使える枠の目安は、合計で" + yen(r.nextBoth) + "です。");
    }

    setMoney("nw-out-maxT", r.maxT);
    setMoney("nw-out-maxG", r.maxG);
    setMoney("nw-out-maxBoth", r.maxBoth);
    setMoney("nw-out-hold", r.holdNow);
    setMoney("nw-out-room", r.roomTotal);
    setMoney("nw-out-growth", r.growthNow);
    setMoney("nw-out-roomG", r.roomGrowth);
    setMoney("nw-out-returned", r.returned);
    setMoney("nw-out-holdNext", r.holdNext);
    setMoney("nw-out-roomNext", r.roomNext);
    setMoney("nw-out-nextT", r.nextT);
    setMoney("nw-out-nextG", r.nextG);
    setMoney("nw-out-nextBoth", r.nextBoth);

    var ns = notices(i);
    var box = $("nw-notices");
    box.innerHTML = ns.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    box.hidden = ns.length === 0;

    $("nw-result").classList.add("is-shown");
    return true;
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var f = $("nw-form");
    if (!f) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var auto = debounce(function () { render(false); }, 400);
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (render(true)) {
        track("nisa_waku_calculate");
        try { $("nw-summary").scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); } catch (e) { /* 古いブラウザ */ }
      }
    });
    f.addEventListener("input", function () { updateMan(); auto(); });
    updateMan();
    render(false);
  });
})(typeof window !== "undefined" ? window : this);
