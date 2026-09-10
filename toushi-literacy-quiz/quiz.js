(function () {
  "use strict";

  var QUESTIONS = [
    {
      q: "2024年から始まった新NISAで、成長投資枠の年間投資上限額は?",
      options: ["120万円", "240万円", "360万円", "600万円"],
      correct: 1,
      explain: "新NISAは「つみたて投資枠(年120万円)」と「成長投資枠(年240万円)」の2本立てで、合わせて年360万円まで投資できます。"
    },
    {
      q: "新NISAの、つみたて投資枠と成長投資枠を合わせた「生涯非課税保有限度額」は?",
      options: ["800万円", "1,200万円", "1,800万円", "3,000万円"],
      correct: 2,
      explain: "生涯の非課税保有限度額は1,800万円。そのうち成長投資枠で使えるのは1,200万円までという内訳があります。"
    },
    {
      q: "iDeCo(個人型確定拠出年金)の掛金は、税制上どのように扱われる?",
      options: ["全額が所得控除の対象になる", "掛金の半額が控除される", "控除の対象にはならない", "運用益にのみ控除がある"],
      correct: 0,
      explain: "iDeCoは拠出時に掛金が全額所得控除の対象になります。これはNISAにはない、iDeCo特有の税制優遇です。"
    },
    {
      q: "「ドルコスト平均法」の説明として正しいのは?",
      options: ["常に同じ株数を買い続ける方法", "一定期間ごとに一定金額を買い続け、購入価格を平準化する方法", "価格が下がった時だけ買う方法", "為替差益だけを狙う方法"],
      correct: 1,
      explain: "一定額を定期的に買い続けることで、価格が高い時は少なく、安い時は多く買うことになり、平均購入価格がならされる効果が期待されます。"
    },
    {
      q: "分散投資の主な目的として、最も適切なのは?",
      options: ["リターンを最大化すること", "手数料を減らすこと", "値動きの異なる資産を組み合わせ、価格変動のリスクを抑えること", "短期的な利益を狙うこと"],
      correct: 2,
      explain: "分散投資は「儲けを増やす」ためというより、一つの資産に集中したときの値動きのブレを抑えるための、リスク管理の考え方です。"
    },
    {
      q: "「複利」の説明として正しいのは?",
      options: ["元本にのみ利息がつく仕組み", "利息にも次の利息がつき、雪だるま式に増えていく仕組み", "手数料が複数回かかる仕組み", "為替レートの変動を利用した運用方法"],
      correct: 1,
      explain: "複利は、得られた利息が元本に組み込まれ、次の期間はその合計額に対して利息がつく仕組みです。長期の積立で特に効果を発揮するとされます。"
    }
  ];

  var RESULT_TYPES = [
    {
      min: 0, max: 1,
      title: "はじめの一歩タイプ",
      desc: "まだ聞き慣れない用語があっても大丈夫です。このブログには「証券口座はどう選ぶか」「新NISAとiDeCo、どこが違うのか」のような、ゼロから読める記事を揃えています。焦らず、気になったところから読んでみてください。"
    },
    {
      min: 2, max: 3,
      title: "基礎固めタイプ",
      desc: "NISA・iDeCoの制度や分散投資の基本は、部分的に押さえられています。あと少しで全体像がつながりそうです。"
    },
    {
      min: 4, max: 5,
      title: "実践タイプ",
      desc: "NISA・iDeCoの制度や分散投資・複利の考え方について、基礎知識はしっかり身についています。制度への理解が、かなり深まっている段階だと思います。"
    },
    {
      min: 6, max: 6,
      title: "知識マスタータイプ",
      desc: "6問全問正解、制度・考え方の基礎知識は十分に身についています。このブログでは企業分析シリーズなど、もう一段掘り下げた読み物も扱っているので、興味があれば覗いてみてください。"
    }
  ];

  var state = { index: 0, score: 0, answered: false };

  var introEl = document.getElementById("quiz-intro");
  var questionEl = document.getElementById("quiz-question");
  var resultEl = document.getElementById("quiz-result");
  var startBtn = document.getElementById("quiz-start-btn");
  var nextBtn = document.getElementById("quiz-next-btn");
  var retryBtn = document.getElementById("quiz-retry-btn");
  var progressLabel = document.getElementById("quiz-progress-label");
  var progressBar = document.getElementById("quiz-progress-bar");
  var questionText = document.getElementById("quiz-question-text");
  var optionsList = document.getElementById("quiz-options");
  var explainEl = document.getElementById("quiz-explain");

  function resetState() {
    state = { index: 0, score: 0, answered: false };
  }

  function showQuestion() {
    var q = QUESTIONS[state.index];
    state.answered = false;
    progressLabel.textContent = (state.index + 1) + " / " + QUESTIONS.length;
    progressBar.style.width = Math.round((state.index / QUESTIONS.length) * 100) + "%";
    questionText.textContent = q.q;
    explainEl.classList.remove("is-shown");
    explainEl.textContent = "";
    nextBtn.classList.remove("is-shown");

    optionsList.innerHTML = "";
    q.options.forEach(function (opt, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = opt;
      btn.addEventListener("click", function () { onAnswer(i, btn); });
      li.appendChild(btn);
      optionsList.appendChild(li);
    });
  }

  function onAnswer(selectedIndex, btnEl) {
    if (state.answered) { return; }
    state.answered = true;
    var q = QUESTIONS[state.index];
    var buttons = optionsList.querySelectorAll(".quiz-option");
    buttons.forEach(function (b, i) {
      b.disabled = true;
      if (i === q.correct) { b.classList.add("is-correct"); }
      else if (i === selectedIndex) { b.classList.add("is-wrong"); }
    });
    if (selectedIndex === q.correct) { state.score += 1; }
    explainEl.textContent = q.explain;
    explainEl.classList.add("is-shown");
    nextBtn.classList.add("is-shown");
  }

  function onNext() {
    state.index += 1;
    if (state.index >= QUESTIONS.length) {
      progressBar.style.width = "100%";
      showResult();
    } else {
      showQuestion();
    }
  }

  function getResultType(score) {
    for (var i = 0; i < RESULT_TYPES.length; i++) {
      if (score >= RESULT_TYPES[i].min && score <= RESULT_TYPES[i].max) { return RESULT_TYPES[i]; }
    }
    return RESULT_TYPES[0];
  }

  function showResult() {
    questionEl.style.display = "none";
    resultEl.style.display = "block";
    var type = getResultType(state.score);
    document.getElementById("quiz-result-score").textContent = state.score + " / " + QUESTIONS.length + " 問正解";
    document.getElementById("quiz-result-type").textContent = type.title;
    document.getElementById("quiz-result-desc").textContent = type.desc;

    drawShareCard(state.score, type.title);

    var tweetText = "投資まわりの基礎知識クイズ(制度の理解度チェック)、" + state.score + "/" + QUESTIONS.length + "問正解で「" + type.title + "」でした。#資産形成の瞑想ノート";
    var tweetUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweetText) + "&url=" + encodeURIComponent(location.href);
    document.getElementById("quiz-share-x").href = tweetUrl;
  }

  function drawShareCard(score, typeTitle) {
    var canvas = document.getElementById("quiz-share-canvas");
    var ctx = canvas.getContext("2d");
    var w = canvas.width, h = canvas.height;

    // background
    ctx.fillStyle = "#faf8f3";
    ctx.fillRect(0, 0, w, h);

    // subtle top accent bar
    ctx.fillStyle = "#ef7d3f";
    ctx.fillRect(0, 0, w, 10);

    ctx.textAlign = "center";
    ctx.fillStyle = "#565a6b";
    ctx.font = "500 28px 'Noto Sans JP', sans-serif";
    ctx.fillText("投資まわりの基礎知識クイズ", w / 2, 110);

    ctx.fillStyle = "#a2501a";
    ctx.font = "900 64px 'Zen Kaku Gothic New', sans-serif";
    ctx.fillText(typeTitle, w / 2, 280);

    ctx.fillStyle = "#1c1e26";
    ctx.font = "700 34px 'Noto Sans JP', sans-serif";
    ctx.fillText(score + " / " + QUESTIONS.length + " 問正解", w / 2, 360);

    // decorative dots
    ctx.fillStyle = "#2f5fd9";
    var dotCount = QUESTIONS.length;
    var dotSpacing = 66;
    var dotStartX = w / 2 - ((dotCount - 1) * dotSpacing) / 2;
    for (var i = 0; i < dotCount; i++) {
      ctx.beginPath();
      var cx = dotStartX + i * dotSpacing;
      ctx.arc(cx, 430, 14, 0, Math.PI * 2);
      if (i < score) { ctx.fill(); } else {
        ctx.strokeStyle = "#2f5fd9";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#676b74";
    ctx.font = "500 24px 'Noto Sans JP', sans-serif";
    ctx.fillText("資産形成の瞑想ノート", w / 2, 540);

    ctx.fillStyle = "#888c99";
    ctx.font = "500 18px 'Noto Sans JP', sans-serif";
    ctx.fillText("※知識テストの結果です。投資診断・投資助言ではありません", w / 2, 575);
  }

  function onRetry() {
    resetState();
    resultEl.style.display = "none";
    questionEl.style.display = "block";
    showQuestion();
  }

  startBtn.addEventListener("click", function () {
    introEl.style.display = "none";
    questionEl.style.display = "block";
    showQuestion();
  });
  nextBtn.addEventListener("click", onNext);
  retryBtn.addEventListener("click", onRetry);

  document.getElementById("quiz-share-dl").addEventListener("click", function () {
    var canvas = document.getElementById("quiz-share-canvas");
    var link = document.createElement("a");
    link.download = "toushi-literacy-quiz-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
})();
