// 関連記事自動生成(related-articles.js)用のメタデータ。
// 新しい記事を公開したら、sitemap.xml・トップページのarticle-list・hikakuページ更新と同様に、
// ここにも1行追加すること(忘れやすいので新記事公開チェックリストに含める)。
// tags: 'kigyou'(企業分析) / 'ippan'(一般知識) / 'nikki'(投資日記) / 'fudousan'(不動産)
// type: 'tool'(クイズ・用語集・シミュレーター等の記事以外のコンテンツ)。省略時は通常の記事扱い。
// related: 関連記事を手動指定するslugの配列(指定があればスコアリングより優先、2026-09-19〜)。
// tool: 関連ツールとして出すslug(省略時は、企業分析・暗号資産シリーズは用語集、それ以外は非表示)。
// slugはフォルダ名と一致させる(画像は images/eyecatch/<slug>.jpg を参照する)。
const ARTICLES_DATA = [
  { slug: 'kigyou-seichou-yomikata-case1', title: 'ニッポン高度紙工業——企業の「成長段階」を読む【日本株 1/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'paper' },
  { slug: 'kigyou-seichou-yomikata-case2', title: 'グロービング——企業の「成長段階」を読む【日本株 2/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'service' },
  { slug: 'kigyou-seichou-yomikata-case3', title: 'さくらインターネット——企業の「成長段階」を読む【日本株 3/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'it' },
  { slug: 'kigyou-seichou-yomikata-case4', title: 'サンワテクノス——企業の「成長段階」を読む【日本株 4/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'wholesale' },
  { slug: 'kigyou-seichou-yomikata-case5', title: 'テクノフレックス——企業の「成長段階」を読む【日本株 5/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'metal' },
  { slug: 'kigyou-seichou-yomikata-case6', title: '大阪有機化学工業——企業の「成長段階」を読む【日本株 6/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'chemical' },
  { slug: 'kigyou-seichou-yomikata-case7', title: 'ウシオ電機——企業の「成長段階」を読む【日本株 7/7】', tags: ['kigyou', 'ippan'], country: 'jp', industry: 'electric' },
  { slug: 'kigyou-seichou-yomikata-hikaku', title: '企業の「成長段階」はどう読むか——7社を並べて比較する', tags: ['kigyou', 'ippan'], country: 'jp' },
  { slug: 'kigyou-seichou-yomikata-case8', title: 'Ambiq Micro——企業の「成長段階」を読む【米国株 1/6】', tags: ['kigyou', 'ippan'], country: 'us', industry: 'semiconductor' },
  { slug: 'kigyou-seichou-yomikata-case9', title: 'MaxLinear——企業の「成長段階」を読む【米国株 2/6】', tags: ['kigyou', 'ippan'], country: 'us', industry: 'semiconductor' },
  { slug: 'kigyou-seichou-yomikata-case10', title: 'Astera Labs——企業の「成長段階」を読む【米国株 3/6】', tags: ['kigyou', 'ippan'], country: 'us', industry: 'semiconductor' },
  { slug: 'kigyou-seichou-yomikata-case11', title: 'Tower Semiconductor——企業の「成長段階」を読む【米国株 4/6】', tags: ['kigyou', 'ippan'], country: 'us', industry: 'semiconductor' },
  { slug: 'kigyou-seichou-yomikata-case12', title: 'Credo Technology——企業の「成長段階」を読む【米国株 5/6】', tags: ['kigyou', 'ippan'], country: 'us', industry: 'semiconductor' },
  { slug: 'kigyou-seichou-yomikata-case13', title: 'BESI——企業の「成長段階」を読む【米国株 6/6】', tags: ['kigyou', 'ippan'], country: 'us', industry: 'semiconductor' },
  { slug: 'kigyou-seichou-yomikata-hikaku-us', title: '企業の「成長段階」はどう読むか——米国株6社を並べて比較する', tags: ['kigyou', 'ippan'], country: 'us' },
  { slug: 'shisan-kouhyou-kiten', title: 'いま、私の資産はどこにあるのか', tags: ['nikki'], related: ['nisa-ideco-hikaku', 'kakei-katachi-toushi-kangaekata'] },
  { slug: 'shoken-koza-hikaku', title: '証券口座はどう選ぶか', tags: ['ippan'], related: ['nisa-ideco-hikaku', 'toushin-etf-hikaku'], tool: 'toushi-yougo-shu' },
  { slug: 'nisa-ideco-hikaku', title: '新NISAとiDeCo、どこが違うのか', tags: ['ippan'], related: ['ideco-dc-nisa-heiyou', 'shoken-koza-hikaku'], tool: 'ideco-setsuzei-simulator' },
  { slug: 'fudousan-kiso-yougo', title: '不動産投資をはじめる前に、静かに整理しておきたい基礎知識', tags: ['fudousan', 'ippan'], related: ['toushin-etf-hikaku', 'kakei-katachi-toushi-kangaekata'], tool: 'toushi-yougo-shu' },
  { slug: 'kasoutsuka-2021-furikaeri', title: '2021年、仮想通貨で学んだこと', tags: ['nikki'], related: ['kasoutsuka-hajimekata', 'kasoutsuka-koza-hikaku'] },
  { slug: 'kasoutsuka-hajimekata', title: '仮想通貨、何から始めればいいのか', tags: ['kasoutsuka', 'ippan'], related: ['kasoutsuka-koza-hikaku', 'kasoutsuka-2021-furikaeri'], tool: 'toushi-yougo-shu' },
  { slug: 'kasoutsuka-koza-hikaku', title: '暗号資産取引所はどう選ぶか', tags: ['kasoutsuka', 'ippan'], related: ['kasoutsuka-hajimekata', 'kasoutsuka-kachi-yomikata-hikaku'] },
  { slug: 'kasoutsuka-kachi-yomikata-case1', title: 'ビットコイン——暗号資産の「価値」を読む【1/5】', tags: ['kasoutsuka', 'ippan'] },
  { slug: 'kasoutsuka-kachi-yomikata-case2', title: 'イーサリアム——暗号資産の「価値」を読む【2/5】', tags: ['kasoutsuka', 'ippan'] },
  { slug: 'kasoutsuka-kachi-yomikata-case3', title: '柴犬コイン(SHIB)——暗号資産の「価値」を読む【3/5】', tags: ['kasoutsuka', 'ippan'] },
  { slug: 'kasoutsuka-kachi-yomikata-case4', title: 'XRP(Ripple)——暗号資産の「価値」を読む【4/5】', tags: ['kasoutsuka', 'ippan'] },
  { slug: 'toushi-news', title: '投資まわりのニュースまとめ', tags: ['ippan'] },
  { slug: 'nisa-ideco-koza-kaisetsu-kiroku', title: 'NISA・iDeCoは、始める前がいちばん大変だった', tags: ['nikki'], related: ['nisa-ideco-hikaku', 'shoken-koza-hikaku'] },
  { slug: 'kasoutsuka-kachi-yomikata-case5', title: 'テザー(USDT)——暗号資産の「価値」を読む【5/5】', tags: ['kasoutsuka', 'ippan'] },
  { slug: 'toushi-literacy-quiz', title: '投資まわりの基礎知識クイズ', tags: ['ippan'], type: 'tool' },
  { slug: 'kasoutsuka-kachi-yomikata-hikaku', title: '暗号資産の「価値」はどう読むか——5銘柄を並べて比較する', tags: ['kasoutsuka', 'ippan'] },
  { slug: 'toushi-yougo-shu', title: '投資まわりの用語集', tags: ['ippan'], type: 'tool' },
  { slug: 'souba-hendou-kakunin', title: '相場が下がったとき、何を確認すればいいか', tags: ['ippan'], related: ['tsumitate-ikkatsu-hikaku', 'kakei-katachi-toushi-kangaekata'], tool: 'toushi-yougo-shu' },
  { slug: 'nisa-uridashi-tetsuzuki', title: 'NISAは、売った後にも手続きがある', tags: ['ippan'], related: ['nisa-ideco-hikaku', 'ideco-dc-nisa-heiyou'], tool: 'toushi-yougo-shu' },
  { slug: 'kakei-katachi-toushi-kangaekata', title: '投資を始める考え方は、家計の「形」で変わる', tags: ['ippan'], related: ['nisa-ideco-hikaku', 'shoken-koza-hikaku'], tool: 'toushi-yougo-shu' },
  { slug: 'ideco-dc-nisa-heiyou', title: 'iDeCo・企業型DC・新NISA、会社員はどう組み合わせて考えるか', tags: ['ippan'], related: ['nisa-ideco-hikaku', 'shoken-koza-hikaku'], tool: 'ideco-setsuzei-simulator' },
  { slug: 'ideco-setsuzei-simulator', title: 'iDeCo節税額シミュレーター', tags: ['ippan'], type: 'tool' },
  { slug: 'toushin-etf-hikaku', title: '投資信託とETF、何が違うのか', tags: ['ippan'], related: ['tsumitate-ikkatsu-hikaku', 'shoken-koza-hikaku'], tool: 'toushi-yougo-shu' },
  { slug: 'gaika-shisan-kiso', title: '外貨・ドル建て資産の基礎', tags: ['ippan'], related: ['toushin-etf-hikaku', 'shoken-koza-hikaku'], tool: 'toushi-yougo-shu' },
  { slug: 'tsumitate-ikkatsu-hikaku', title: '積立投資と一括投資、何が違うのか', tags: ['ippan'], related: ['toushin-etf-hikaku', 'nisa-ideco-hikaku'], tool: 'toushi-literacy-quiz' },
  { slug: 'toushi-hajimeru-junban', title: '投資を始める前に、決めておくこと', tags: ['ippan'], related: ['nisa-ideco-hikaku', 'shoken-koza-hikaku'], tool: 'toushi-yougo-shu' },
];
