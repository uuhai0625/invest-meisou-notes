// 「このページは役に立ちましたか?」の一問。記事・ツール・ガイドの末尾に出す。
// 送るのは、押したボタンの種類とページのパスだけ(自由記入欄はなく、個人を特定する情報は集めない)。
// GA4のイベント名で数える: feedback_yes / feedback_no / feedback_no_old / feedback_no_unclear / feedback_no_missing
(function () {
  var parts = location.pathname.split('/').filter(function (p) { return p && p !== 'index.html'; });
  var slug = parts[parts.length - 1];
  if (!slug) return;
  var isArticle = typeof ARTICLES_DATA !== 'undefined' && ARTICLES_DATA.some(function (a) { return a.slug === slug; });
  if (!isArticle && slug !== 'toushi-guide') return;
  var main = document.querySelector('main');
  if (!main) return;

  var KEY = 'fb:' + location.pathname;
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function send(name) {
    if (typeof gtag === 'function') {
      gtag('event', name, { page_path: location.pathname, transport_type: 'beacon' });
    }
  }

  var css = document.createElement('style');
  css.textContent =
    '.fb-box{margin:40px 0 8px;padding:18px 20px;border:1px solid var(--navy-soft,rgba(46,60,88,.08));border-left:3px solid var(--gold,#9a4a2e);border-radius:6px;background:var(--navy-soft,rgba(46,60,88,.08))}' +
    '.fb-q{margin:0 0 10px;font-weight:700}' +
    '.fb-q:focus{outline:none}' +
    '.fb-btns{display:flex;flex-wrap:wrap;gap:10px}' +
    '.fb-btns button{min-height:44px;padding:8px 16px;font:inherit;color:inherit;background:transparent;border:1px solid var(--navy,#2e3c58);border-radius:6px;cursor:pointer}' +
    '.fb-btns button:hover{background:var(--navy-soft,rgba(46,60,88,.08))}' +
    '.fb-btns button:focus-visible{outline:2px solid var(--navy,#2e3c58);outline-offset:2px}' +
    '.fb-msg{margin:10px 0 0;font-size:.95em}' +
    '.fb-msg a{text-decoration:underline}';
  document.head.appendChild(css);

  var box = document.createElement('section');
  box.className = 'fb-box';
  box.setAttribute('aria-labelledby', 'fb-q');
  var q = document.createElement('p');
  q.className = 'fb-q'; q.id = 'fb-q'; q.tabIndex = -1;
  var btns = document.createElement('div');
  btns.className = 'fb-btns';
  var msg = document.createElement('p');
  msg.className = 'fb-msg';
  msg.setAttribute('role', 'status');
  msg.setAttribute('aria-live', 'polite');
  box.appendChild(q); box.appendChild(btns); box.appendChild(msg);

  function button(label, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.addEventListener('click', function () {
      if (b.disabled) return;
      Array.prototype.forEach.call(btns.children, function (x) { x.disabled = true; });
      fn();
      q.focus();
    });
    btns.appendChild(b);
  }
  function clear() { while (btns.firstChild) btns.removeChild(btns.firstChild); }
  function contactLink() {
    var a = document.createElement('a');
    a.href = 'https://x.com/uuhai0625';
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = '運営者のX(@uuhai0625)';
    return a;
  }
  function thanks(text) {
    clear();
    q.textContent = 'ご回答ありがとうございます。';
    msg.textContent = (text ? text + ' ' : '') + '間違いの指摘や、足してほしい内容は、';
    msg.appendChild(contactLink());
    msg.appendChild(document.createTextNode('までお知らせください(個人情報や資産額は書かないでください)。'));
  }

  function askReason() {
    q.textContent = 'どこが役に立たなかったか、近いものを選んでください(任意)';
    clear(); msg.textContent = '';
    button('情報が古い・間違っている', function () { send('feedback_no_old'); store('no'); thanks('ありがとうございます。確認して直します。'); });
    button('分かりにくい', function () { send('feedback_no_unclear'); store('no'); thanks('ありがとうございます。書き方を見直します。'); });
    button('知りたいことが書いていない', function () { send('feedback_no_missing'); store('no'); thanks('ありがとうございます。足せるものを検討します。'); });
    button('理由は選ばない', function () { store('no'); thanks('ご回答ありがとうございます。'); });
  }

  function ask() {
    q.textContent = 'このページは役に立ちましたか?';
    button('役に立った', function () { send('feedback_yes'); store('yes'); thanks('励みになります。'); });
    button('役に立たなかった', function () { send('feedback_no'); store('no'); askReason(); });
  }

  if (load()) {
    thanks('');
  } else {
    ask();
  }

  var rel = document.getElementById('related-articles');
  if (rel && rel.parentNode) rel.parentNode.insertBefore(box, rel);
  else main.appendChild(box);
})();
