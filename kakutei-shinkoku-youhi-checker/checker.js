(function () {
  "use strict";

  // 確定申告の要否チェッカー。選択式のみ。回答は端末内で処理し、保存も送信もしない。
  // 結果の文は、国税庁タックスアンサー(令和8年4月1日現在法令等)と当ブログの記事の整理だけを使った固定文。
  // 「国税庁は〜と説明しています」は原文にある内容だけに使い、原文から導いた整理は「と整理できます」と分ける。
  var NTA = "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/";
  var SRC = {
    n1463: { label: "国税庁 No.1463 株式等を譲渡したときの課税(申告分離課税)", url: NTA + "1463.htm" },
    n1476: { label: "国税庁 No.1476 特定口座制度", url: NTA + "1476.htm" },
    n1535: { label: "国税庁 No.1535 NISA制度", url: NTA + "1535.htm" },
    n1474: { label: "国税庁 No.1474 上場株式等に係る譲渡損失の損益通算及び繰越控除", url: NTA + "1474.htm" },
    n1900: { label: "国税庁 No.1900 給与所得者で確定申告が必要な人", url: NTA + "1900.htm" },
    n1900qa: { label: "国税庁 No.1900 質疑応答(確定申告を要しない場合の意義)", url: NTA + "1900_qa.htm" },
    n1330: { label: "国税庁 No.1330 配当金を受け取ったとき(配当所得)", url: NTA + "1330.htm" },
    n1240: { label: "国税庁 No.1240 外国税額控除", url: NTA + "1240.htm" },
    n1155: { label: "国税庁 No.1155 ふるさと納税(寄附金控除)", url: NTA + "1155.htm" },
    kakutei: { label: "国税庁 所得税の確定申告(令和8年分の確定申告書(案))", url: "https://www.nta.go.jp/taxes/shiraberu/shinkoku/kakutei.htm" }
  };
  var ART = {
    koza: { slug: "tokutei-koza-nenkan-torihiki", label: "特定口座の「源泉徴収あり・なし」と年間取引報告書" },
    kakutei: { slug: "toushi-kakutei-shinkoku", label: "投資の利益、確定申告は必要か" },
    kurikoshi: { slug: "jouto-sonshitsu-kurikoshi-kojo", label: "売却損の繰越控除の申告手順" },
    haito: { slug: "haito-shinkoku-fuyou-juminzei", label: "配当の「確定申告不要」と住民税" },
    nisaHaito: { slug: "nisa-haito-uketori-houshiki", label: "NISAの配当金と受取方式(株式数比例配分方式)" },
    gaikoku: { slug: "gaikoku-zeigaku-koujo", label: "外国で引かれた税と外国税額控除" },
    furusato: { slug: "furusato-onestop-kabu-shinkoku", label: "ふるさと納税のワンストップ特例と株の申告" },
    juminzei: { slug: "kabu-shinkoku-juminzei-chousyu", label: "住民税の徴収方法と勤務先に届く通知書" },
    calendar: { slug: "toushi-nenmatsu-calendar", label: "投資の年末カレンダー" },
    etax: { slug: "kabu-shinkoku-etax-junbi", label: "e-Taxで出す前の事前準備" }
  };

  function taxable(a) { return a.q2 === "gensen" || a.q2 === "nashi" || a.q2 === "unknown"; }
  function hasGain(a) { return a.q3 === "gain" || a.q3 === "both"; }
  function hasLoss(a) { return a.q3 === "loss" || a.q3 === "both"; }

  var QUESTIONS = [
    {
      id: "q1", type: "single",
      text: "給与の受け取り方は、次のどちらに近いですか?",
      hint: "「全額が源泉徴収される」は、勤務先で給与から所得税が天引きされている場合です。",
      options: [
        { v: "kyuyo1", label: "会社員など、給与を1か所から受け取り、全額が源泉徴収されている(給与の年間収入は2,000万円以下)" },
        { v: "other", label: "それ以外(自営業・年金受給者・給与を2か所以上から受け取る人・給与の年間収入が2,000万円を超える人など)" }
      ]
    },
    {
      id: "q2", type: "single",
      text: "証券口座(株・ETF・投資信託)は、どの種類ですか?",
      hint: "証券会社の口座画面や、年間取引報告書に「特定口座(源泉徴収あり)」などと書かれています。分からなければ一番下を選べます。",
      options: [
        { v: "gensen", label: "NISA以外は、特定口座(源泉徴収あり)だけ(NISA口座も持っていてよい)" },
        { v: "nashi", label: "NISA以外に、特定口座(源泉徴収なし)か一般口座もある" },
        { v: "nisa", label: "NISA口座だけ(NISA以外の口座は持っていない)" },
        { v: "none", label: "まだ口座がない(または、今年は売却も配当もなかった)" },
        { v: "unknown", label: "口座の種類が分からない" }
      ]
    },
    {
      id: "q3", type: "single", show: taxable,
      text: "今年の、NISA以外の口座での売却は?",
      options: [
        { v: "gain", label: "売却して、利益が出た(または出そう)" },
        { v: "loss", label: "売却して、損が出た" },
        { v: "both", label: "利益が出た売却も、損が出た売却もある" },
        { v: "none", label: "売却していない" }
      ]
    },
    {
      id: "q4", type: "single", show: taxable,
      text: "NISA以外の口座で、配当(投資信託の分配金を含む)を受け取りましたか?",
      options: [
        { v: "yes", label: "受け取った(投資信託の分配金を含む)" },
        { v: "no", label: "受け取っていない" }
      ]
    },
    {
      id: "q5", type: "single",
      text: "前の年から、売却損を確定申告で繰り越していますか?",
      hint: "過去に「損失を翌年以降に持ち越す」申告をして、その損がいまも残っている場合です。",
      options: [
        { v: "yes", label: "繰り越している(損がいまも残っている)" },
        { v: "no", label: "繰り越していない、またはしたことがない" }
      ]
    },
    {
      id: "q6", type: "single",
      text: "医療費控除・住宅ローン控除(1年目)など、別の理由で確定申告をする予定はありますか?",
      options: [
        { v: "yes", label: "ある" },
        { v: "no", label: "ない" },
        { v: "unknown", label: "まだ分からない" }
      ]
    },
    {
      id: "q7", type: "multi",
      text: "次のうち、当てはまるものはありますか?(複数選べます。なければそのまま進めます)",
      options: [
        { v: "foreign", label: "外国株・米国株の配当で、外国の税が引かれている" },
        { v: "furusato", label: "ふるさと納税で、ワンストップ特例を使う予定(または使った)" }
      ]
    }
  ];

  // ---------- 結果の組み立て ----------
  function buildResult(a) {
    var related = [], notneeded = [], check = [];
    var has = function (arr, v) { return arr && arr.indexOf(v) !== -1; };
    var gain = taxable(a) && hasGain(a);
    var loss = taxable(a) && hasLoss(a);

    if (a.q2 === "gensen") {
      notneeded.push({
        title: "特定口座(源泉徴収あり)の売却益",
        body: "国税庁は、源泉徴収ありの特定口座の所得は、口座ごとに、確定申告をするか、申告不要とするかを選べると説明しています。他の口座の損益との通算や、損失の繰越控除を使いたいときは、申告をします。",
        src: [SRC.n1476], art: [ART.koza]
      });
    }
    if (a.q2 === "nisa") {
      check.push({
        title: "NISA口座の売却益・配当(非課税とされる部分)",
        body: "国税庁は、NISA口座の配当等と売却益は、一定の条件のもとで非課税と説明しています(申告の要否そのものは、そのページには書かれていません)。NISA口座で出た損失は、税金の計算上「ないもの」とみなされ、他の口座との損益通算や繰越控除はできません。",
        src: [SRC.n1535], art: [ART.kakutei]
      });
    }
    if (gain && a.q2 === "nashi") {
      related.push({
        title: "源泉徴収なしの特定口座・一般口座の売却益",
        body: "国税庁は、上場株式等の売却益を申告分離課税としています(No.1463)。また、源泉徴収ありの特定口座の所得は、申告不要を選べると説明しています(No.1476)。これらから、源泉徴収なしの口座の売却益は、原則として確定申告で税額を確定する対象になる、と整理できます。",
        src: [SRC.n1463, SRC.n1476], art: [ART.koza, ART.kakutei]
      });
    }
    if (gain && a.q2 === "unknown") {
      related.push({
        title: "売却益(口座の種類しだいで扱いが分かれます)",
        body: "国税庁は、源泉徴収ありの特定口座の所得は、申告しないことを選べると説明しています(No.1476)。源泉徴収なしの特定口座や一般口座の売却益は、申告分離課税の対象として、確定申告で税額を確定する対象になる、と整理できます(No.1463)。どちらの口座かで扱いが変わるため、口座の種類を先に確かめてください。",
        src: [SRC.n1463, SRC.n1476], art: [ART.koza, ART.kakutei]
      });
    }
    if (gain && (a.q2 === "nashi" || a.q2 === "unknown")) {
      if (a.q1 === "kyuyo1") {
        related.push({
          title: "給与を1か所から受け取る人の「20万円ルール」",
          body: "国税庁は、給与を1か所から受け、その給与の全部が源泉徴収されている人(給与の年間収入は2,000万円以下)は、給与所得と退職所得以外の所得の合計が20万円以下なら、原則として所得税の確定申告は要らないと説明しています。この合計には、株の売却益のほか、副業・暗号資産・不動産・一時所得など、給与と退職以外の各種の所得が入ると整理できます。源泉徴収ありの特定口座で申告不要を選んだ所得は、含めません。同族会社の役員などには、これに当たらない例外があります。売却損の繰越控除を使う場合は、20万円以下でも申告が必要です。これは所得税の説明です。所得税の確定申告が要らない場合でも、住民税の申告が必要な場合があるため、お住まいの市区町村に確かめてください。",
          src: [SRC.n1900, SRC.n1900qa], art: [ART.kakutei, ART.juminzei]
        });
        if (a.q6 === "yes") {
          related.push({
            title: "医療費控除などで申告するとき",
            body: "国税庁は、給与所得者が確定申告を要しない場合でも、たとえば医療費控除の還付申告をするときは、給与所得だけでなく、20万円以下の所得も併せて申告をする必要があると説明しています。",
            src: [SRC.n1900qa], art: [ART.kakutei]
          });
        }
      } else {
        related.push({
          title: "給与を1か所から受け取る人以外の場合",
          body: "国税庁のNo.1900は、給与の年間収入が2,000万円を超える人は申告が必要とし、給与を2か所以上から受ける人には別の20万円の基準を置いています。年金受給者や自営業の基準は別のページで扱われるため、それぞれのタックスアンサーや税務署で確かめてください。",
          src: [SRC.n1900], art: []
        });
      }
    }
    if (loss || a.q5 === "yes") {
      related.push({
        title: "売却損の損益通算と繰越控除",
        body: "国税庁は、上場株式等の売却損の損益通算と繰越控除は、確定申告をして使う仕組みと説明しています。繰越控除は翌年以後3年間で、損失を繰り越している間は、売却のない年も毎年の申告が必要です。NISA口座の損失は、どちらも使えません。",
        src: [SRC.n1474], art: [ART.kurikoshi]
      });
    }
    if (taxable(a) && a.q4 === "yes") {
      notneeded.push({
        title: "配当(分配金)の申告方法",
        body: "国税庁は、上場株式等の配当(大口株主等を除く)について、確定申告をしない(申告不要)、総合課税、申告分離課税から選べると説明しています。どれを選ぶかで、住民税などへの影響が変わることがあり、その整理は記事にあります。上場株式等以外の配当は、扱いが異なります。",
        src: [SRC.n1330], art: [ART.haito]
      });
    }
    if (has(a.q7, "foreign")) {
      if (a.q2 === "nisa") {
        check.push({
          title: "外国で税が引かれた配当(NISA口座の場合)",
          body: "NISA口座の配当に引かれた外国の税は、外国税額控除の対象になりません。くわしくは記事で整理しています。",
          src: [], art: [ART.gaikoku]
        });
      } else {
        related.push({
          title: "外国で税が引かれた配当",
          body: "外国で課された税の扱い(外国税額控除)は、口座の種類と課税方式で変わります。確定申告で使う仕組みで、詳しい整理は記事に譲ります。",
          src: [SRC.n1240], art: [ART.gaikoku]
        });
      }
    }
    if (has(a.q7, "furusato")) {
      if (a.q1 === "other") {
        related.push({
          title: "ふるさと納税(給与を1か所から受け取る人以外の場合)",
          body: "国税庁は、ワンストップ特例を使えるのは、確定申告が不要な給与所得者等で、寄附先が5団体以内の場合に限ると説明しています。自営業や、給与を2か所以上から受け取る人などで確定申告をする場合は、寄附金控除を申告書に載せます。確定申告をすると、ワンストップ特例の申請は無効になります。",
          src: [SRC.n1155], art: [ART.furusato]
        });
      } else if (related.length > 0 || a.q6 === "yes") {
        related.push({
          title: "ふるさと納税のワンストップ特例",
          body: "国税庁は、確定申告を行う人は、ワンストップ特例の申請が無効になるため、申請した分も含めて寄附金控除を申告書に載せる必要があると説明しています。確定申告をしない場合は、寄附先が5団体以内の給与所得者等に限り、ワンストップ特例を使えます。",
          src: [SRC.n1155], art: [ART.furusato]
        });
      } else {
        notneeded.push({
          title: "ふるさと納税のワンストップ特例",
          body: "国税庁は、確定申告が不要な給与所得者等が、寄附先が5団体以内の場合に、ワンストップ特例で寄附金控除を受けられると説明しています。あとで確定申告をすることになると、申請は無効になり、寄附金控除を申告書に載せる必要があります。",
          src: [SRC.n1155], art: [ART.furusato]
        });
      }
    }

    if (a.q2 === "unknown") {
      check.push({
        title: "口座の種類",
        body: "口座の種類によって、申告の扱いが変わります。口座の種類は、証券会社の年間取引報告書や口座の画面で確かめられます。",
        src: [], art: [ART.koza]
      });
    }
    if (a.q2 === "nisa" || taxable(a)) {
      check.push({
        title: a.q2 === "nisa" ? "NISA口座の配当の受取方式" : "NISA口座もお持ちの場合",
        body: "国税庁は、NISA口座で非課税とされる配当等は、金融商品取引業者等を経由して交付されるもの(株式数比例配分方式を選んだもの)に限られ、上場株式等の発行者から直接交付されるものは課税扱いになると説明しています。受取方式は、証券会社の画面などで確かめられます。NISA口座の損失は、他の口座との損益通算も繰越控除もできません。",
        src: [SRC.n1535], art: [ART.nisaHaito]
      });
    }
    if (related.length > 0 || (taxable(a) && a.q4 === "yes")) {
      check.push({
        title: "住民税・国民健康保険料・扶養への影響",
        body: "申告するかどうかで、住民税の納め方や勤務先に届く通知書、国民健康保険料・扶養の判定が変わることがあります。資料の整理は記事にあります。",
        src: [], art: [ART.juminzei, ART.haito]
      });
    }
    check.push({
      title: "令和8年分(2026年分)の様式・手引き",
      body: "令和8年分の確定申告書は、国税庁が「案」として公開しています(令和9年1月以降に使用でき、変更される場合があります)。手引き・確定申告特集・作成コーナーは、2026年11月24日時点で、令和8年分を確認できていません。年末までの日付とe-Taxの準備は、記事で整理しています。",
      src: [SRC.kakutei], art: [ART.calendar, ART.etax]
    });

    return { related: related, notneeded: notneeded, check: check };
  }

  // ---------- 画面 ----------
  var intro = document.getElementById("checker-intro");
  var qCard = document.getElementById("checker-question");
  var rCard = document.getElementById("checker-result");
  var startBtn = document.getElementById("checker-start-btn");
  var backBtn = document.getElementById("checker-back-btn");
  var nextBtn = document.getElementById("checker-next-btn");
  var retryBtn = document.getElementById("checker-retry-btn");
  var progressLabel = document.getElementById("checker-progress-label");
  var progressBar = document.getElementById("checker-progress-bar");
  var qText = document.getElementById("checker-question-text");
  var qHint = document.getElementById("checker-hint");
  var optList = document.getElementById("checker-options");
  var resultRoot = document.getElementById("checker-result-body");
  var live = document.getElementById("checker-live");

  var answers = {};
  var cur = 0;
  var shownAt = 0; // 画面を作り直した時刻(ダブルタップで次の画面を押してしまうのを防ぐ)

  function track(name, extra) {
    try {
      if (typeof window.gtag === "function") {
        var p = { page_path: location.pathname };
        if (extra) { Object.keys(extra).forEach(function (k) { p[k] = extra[k]; }); }
        window.gtag("event", name, p);
      }
    } catch (e) { /* 計測できなくても動く */ }
  }
  function visible() {
    return QUESTIONS.filter(function (q) { return !q.show || q.show(answers) || answers.q2 === undefined; });
  }
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function show(node, on) { node.style.display = on ? "" : "none"; }

  function renderQuestion() {
    var list = visible();
    var q = list[cur];
    show(intro, false); show(rCard, false); show(qCard, true);
    progressLabel.textContent = (cur + 1) + " / " + list.length;
    progressBar.style.width = ((cur) / list.length * 100) + "%";
    qText.textContent = q.text;
    qHint.textContent = q.hint || "";
    show(qHint, !!q.hint);
    optList.innerHTML = "";
    var selected = answers[q.id];
    q.options.forEach(function (opt) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = opt.label;
      var on = q.type === "multi" ? (selected && selected.indexOf(opt.v) !== -1) : selected === opt.v;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.addEventListener("click", function () { onPick(q, opt.v, btn); });
      li.appendChild(btn);
      optList.appendChild(li);
    });
    show(backBtn, true);
    if (q.type === "multi") nextBtn.classList.add("is-shown"); else nextBtn.classList.remove("is-shown");
    qText.focus();
    shownAt = Date.now();
  }

  function onPick(q, v, btn) {
    if (Date.now() - shownAt < 350) return;
    if (q.type === "multi") {
      var arr = answers[q.id] || [];
      var i = arr.indexOf(v);
      if (i === -1) arr.push(v); else arr.splice(i, 1);
      answers[q.id] = arr;
      btn.setAttribute("aria-pressed", i === -1 ? "true" : "false");
      return;
    }
    answers[q.id] = v;
    goNext();
  }

  function goNext() {
    if (Date.now() - shownAt < 350) return;
    var list = visible();
    if (cur >= list.length - 1) { showResult(); return; }
    cur += 1;
    renderQuestion();
  }

  function showResult() {
    // 表示されない質問の回答は結果に使わない
    var vis = {};
    visible().forEach(function (q) { vis[q.id] = true; });
    var a = {};
    Object.keys(answers).forEach(function (k) { if (vis[k]) a[k] = answers[k]; });
    var r = buildResult(a);
    show(intro, false); show(qCard, false); show(rCard, true);
    resultRoot.innerHTML = "";

    var type = r.related.length > 0 ? "A" : (r.notneeded.length > 0 ? "B" : "C");
    var summary = el("div", "", "plain-summary");
    var head = el("h2", "回答にもとづく整理(判定ではありません)", "checker-result-head");
    head.setAttribute("tabindex", "-1");
    summary.appendChild(head);
    if (type === "A") {
      summary.appendChild(el("p", "国税庁の説明で、確定申告の手続が出てくる項目が " + r.related.length + " 件ありました(下の最初のグループ)。"));
    } else if (type === "B") {
      summary.appendChild(el("p", "この回答で国税庁の説明が当たるのは、申告をしなくてよい、または申告しないことを選べるとされる項目だけです。あなたの申告が要らないという意味ではありません。別の理由で申告する場合や損失の繰越を使う場合は、扱いが変わります。"));
    } else {
      summary.appendChild(el("p", "この回答から、国税庁の説明で、申告の手続や申告しない扱いが出てくる項目は出ませんでした。下の「あわせて確かめたい点」も確認してください。このツールは、株・配当・NISAの範囲だけを扱い、副業・暗号資産・FX・不動産・年金・退職金などの所得は聞いていません。申告が要らないことを示すものではありません。"));
    }
    summary.appendChild(el("p", "あなたが申告すべきかどうかは、この結果からは決まりません。収入や控除などの個別の事情で変わります。", "checker-strong"));
    resultRoot.appendChild(summary);

    renderGroup("確定申告の手続が出てくる項目", "国税庁の説明で、申告や控除の手続が関係する項目です。", r.related);
    renderGroup("申告をしなくてよい、または選べるとされる項目", "国税庁の説明で、申告しない扱いが出てくる項目です。あなたの申告が要らないという意味ではありません。", r.notneeded);
    renderGroup("あわせて確かめたい点", "", r.check);

    resultRoot.appendChild(el("p", "出典: 国税庁ホームページ「タックスアンサー」(https://www.nta.go.jp/taxes/shiraberu/taxanswer/index2.htm)、「所得税の確定申告」(https://www.nta.go.jp/taxes/shiraberu/shinkoku/kakutei.htm)を加工して作成。令和8年4月1日現在法令等、2026年11月24日確認。このツールは国税庁が作成・監修したものではありません。", "checker-credit"));

    progressBar.style.width = "100%";
    live.textContent = "結果を表示しました";
    head.focus();
    shownAt = Date.now();
    track("checker_complete", { result_type: type });
  }

  function renderGroup(title, note, items) {
    if (items.length === 0) return;
    var wrap = el("div", "", "checker-group");
    wrap.appendChild(el("h3", title));
    if (note) wrap.appendChild(el("p", note, "checker-note"));
    var ul = el("ul", "", "checker-list");
    items.forEach(function (it) {
      var li = el("li", "", "checker-item");
      li.appendChild(el("h4", it.title));
      li.appendChild(el("p", it.body));
      if (it.src.length > 0) {
        var p = el("div", "", "checker-src");
        p.appendChild(el("span", "出典(国税庁・新しいタブで開きます)", "checker-src-label"));
        it.src.forEach(function (s) {
          var a = el("a", s.label);
          a.href = s.url; a.target = "_blank"; a.rel = "noopener";
          p.appendChild(a);
        });
        li.appendChild(p);
      }
      if (it.art.length > 0) {
        var p2 = el("div", "", "checker-src");
        p2.appendChild(el("span", "くわしく(当ブログの記事)", "checker-src-label"));
        it.art.forEach(function (s) {
          var a2 = el("a", s.label);
          a2.href = "../" + s.slug + "/";
          a2.addEventListener("click", function () { track("checker_article_click", { slug: s.slug }); });
          p2.appendChild(a2);
        });
        li.appendChild(p2);
      }
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    resultRoot.appendChild(wrap);
  }

  startBtn.addEventListener("click", function () {
    answers = {}; cur = 0;
    track("checker_start");
    renderQuestion();
  });
  nextBtn.addEventListener("click", goNext);
  backBtn.addEventListener("click", function () {
    if (cur > 0) { cur -= 1; renderQuestion(); } else { show(qCard, false); show(intro, true); startBtn.focus(); }
  });
  retryBtn.addEventListener("click", function () {
    answers = {}; cur = 0;
    show(rCard, false); show(intro, true);
    startBtn.focus();
    intro.scrollIntoView();
  });
})();
