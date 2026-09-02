// GA4計測。既存3ライン(副業そろばん・相場ノート・診断ツール群)と同じ空文字ガードパターン。
// GA4プロパティ「資産形成の瞑想ノート」(2026-09-02作成)の測定ID。
const GA_MEASUREMENT_ID = 'G-GLXGGML2HZ';
// ローカル開発サーバーからのアクセスを除外するガード(本番GA4へのダミーpageview混入防止)。
const isLocalDev = ['localhost', '127.0.0.1', ''].includes(location.hostname);
if (GA_MEASUREMENT_ID && !isLocalDev) {
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}
