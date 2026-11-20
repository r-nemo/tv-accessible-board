# v1 予測変換・漢字変換機能 アーカイブ (2026-11-20 削除分)

精度調整のため v1.html から削除した予測変換・内蔵辞書・Google CGI API 連携コード一式です。

---
## 1. CSS
```css
    /* 予測変換サジェスト枠 */
    .suggest-row {
      display: flex;
      align-items: center;
      gap: 0.8vw;
      min-height: 6vh;
    }

    .suggest-label {
      font-size: clamp(14px, 2vh, 22px);
      color: #ffd54f;
      font-weight: bold;
      white-space: nowrap;
    }

    .suggest-list {
      display: flex;
      gap: 0.8vw;
      flex: 1;
      overflow-x: auto;
    }

    .suggest-list::-webkit-scrollbar {
      display: none;
    }

    /* サジェストボタン */
    .btn-suggest {
      padding: 0 1.2vw;
      height: 5.2vh;
      font-size: clamp(14px, 2.2vh, 24px);
      background: #142233;
      border-color: #254060;
      color: #80d8ff;
      white-space: nowrap;
    }
```

---
## 2. HTML
```html
    <!-- 予測変換候補エリア -->
    <div class="suggest-row">
      <span class="suggest-label">予測:</span>
      <div id="suggestList" class="suggest-list">
        <!-- 動的にサジェスト候補が挿入されます -->
      </div>
    </div>
```

---
## 3. JavaScript (辞書・Google CGI API・ナビゲーション特例)
```javascript
    /* よく使われる予測変換辞書 */
    const SUGGEST_DICTIONARY = {
      "あ": ["ありがとう", "あたまが痛い", "あつい", "あしが痛い", "あさ"],
      "い": ["いたい", "いいえ", "いつも", "いしゃ", "いっしょ"],
      "う": ["うえを向きたい", "うごけない", "うでが痛い"],
      "お": ["おねがい", "お水", "お茶", "お腹が痛い", "おわり"],
      "か": ["からだが痛い", "かゆい", "かえてほしい", "かわいた"],
      "き": ["きゅういん", "きもちわるい", "ききたい"],
      "く": ["くびが痛い", "くすり", "くるしい", "くらい"],
      "こ": ["こしが痛い", "これ", "こわい", "こえが出ない"],
      "さ": ["さむい", "さわってほしい", "さようなら"],
      "す": ["すこし待って", "すいぶん", "すわりたい"],
      "た": ["たんを取って", "たいへん", "たすけて", "たべたい"],
      "て": ["てがしびれる", "てをにぎって", "テレビを消して"],
      "と": ["トイレ", "とめて", "となりにいて"],
      "な": ["なんでもない", "なおして"],
      "ね": ["ねむい", "ねむれない", "ねつがある"],
      "の": ["のどが渇いた", "のみたい"],
      "は": ["はい", "はなして", "はやい"],
      "ひ": ["ひざが痛い", "ひやして"],
      "み": ["みず", "みぎ", "みえない"],
      "め": ["めが痛い", "めがね"],
      "よ": ["よろしく", "よる", "よんでほしい"],
      "わ": ["わかりました", "わからない"]
    };

    const suggestList = document.getElementById("suggestList");

    // ナビゲーション特例ルール (moveFocus内)
    // const aDanKeys = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"];
    // if (direction === "up" && currentBtn.classList.contains("btn-key") && aDanKeys.includes(currentBtn.textContent)) { ... }
    // if (direction === "up" && currentBtn.classList.contains("btn-suggest")) { ... }
    // if (direction === "down" && currentBtn.classList.contains("btn-action")) { ... }
    // if (direction === "down" && currentBtn.classList.contains("btn-suggest")) { ... }

    // 予測変換・漢字変換候補の更新（Google日本語入力 CGI API ＋ 内蔵辞書ハイブリッド）
    let jsonpCounter = 0;
    let lastQueryText = "";

    function updateSuggestions() {
      suggestList.innerHTML = "";
      const text = textBox.textContent;
      if (!text.length) {
        refreshNavElements();
        return;
      }

      const query = text.slice(-8);
      lastQueryText = query;

      const immediateList = getLocalCandidates(query, text);
      renderSuggestButtons(immediateList, query);

      fetchGoogleIME(query);
    }

    function getLocalCandidates(query, fullText) {
      const candidates = new Set();
      const last1 = query.slice(-1);
      const last2 = query.slice(-2);

      const DICT = {
        "あり": ["ありがとう", "有難うございます"],
        "あたま": ["頭が痛い", "頭"],
        "いた": ["痛いです", "痛い", "痛み止め"],
        "おね": ["お願いします", "お願い"],
        "おみ": ["お水", "お水が飲みたい"],
        "おちゃ": ["お茶", "温かいお茶"],
        "きゅう": ["吸引してください", "吸引"],
        "くる": ["苦しいです", "苦しい"],
        "たい": ["体位変換", "体位を変えて", "動かして"],
        "すい": ["水分", "吸ってください"],
        "たん": ["たんを取って", "痰"],
        "てれ": ["テレビをつけて", "テレビを消して"],
        "とい": ["トイレ", "トイレに行きたい"],
        "ねむ": ["眠いです", "眠れない"],
        "のど": ["喉が渇いた", "喉"],
        "あ": ["ありがとう", "あたまが痛い", "あつい"],
        "い": ["いたい", "いいえ", "いしゃ"],
        "う": ["うえを向きたい", "うごけない"],
        "え": ["えあこん", "えがお"],
        "お": ["おねがい", "お水", "お茶"],
        "か": ["かゆい", "からだが痛い"],
        "き": ["きゅういん", "きもちわるい"],
        "く": ["くるしい", "くびが痛い"],
        "け": ["けいたい", "けいれん"],
        "こ": ["こしが痛い", "こわい"],
        "さ": ["さむい", "さわって"],
        "し": ["しんどい", "しびれる"],
        "す": ["すこし待って", "すわりたい"],
        "せ": ["せなかが痛い"],
        "そ": ["そのままで"],
        "た": ["たんを取って", "たすけて"],
        "ち": ["ちかくにいて"],
        "つ": ["つらい", "つめたい"],
        "て": ["てが痛い", "テレビ"],
        "と": ["トイレ", "とめて"],
        "な": ["なんでもない"],
        "に": ["にくたい", "にがい"],
        "ぬ": ["ぬるい"],
        "ね": ["ねむい", "ねつがある"],
        "の": ["のどが渇いた"],
        "は": ["はい", "はなして"],
        "ひ": ["ひやして"],
        "ふ": ["ふとんをかけて"],
        "へ": ["へやがあつい"],
        "ほ": ["ほんとうに"],
        "ま": ["まくらを直して"],
        "み": ["みず", "みぎ"],
        "む": ["むねが苦しい"],
        "め": ["めが痛い", "めがね"],
        "も": ["もういいです"],
        "や": ["やすみたい"],
        "ゆ": ["ゆっくり"],
        "よ": ["よんでほしい"],
        "ら": ["らくになりたい"],
        "り": ["りょうかい"],
        "る": ["るすばん"],
        "れ": ["れんらく"],
        "ろ": ["ろうか"],
        "わ": ["わかりました"]
      };

      if (DICT[last2]) DICT[last2].forEach(w => candidates.add(w));
      if (DICT[last1]) DICT[last1].forEach(w => candidates.add(w));

      return Array.from(candidates);
    }

    function fetchGoogleIME(query) {
      if (!query || query.length === 0) return;
      const cbName = "googleImeCb_" + (++jsonpCounter);
      
      const script = document.createElement("script");
      script.id = cbName;
      script.src = `https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${encodeURIComponent(query)}&jsonp=${cbName}`;

      window[cbName] = (data) => {
        try {
          if (query === lastQueryText && Array.isArray(data)) {
            const googleResults = [];
            data.forEach(segment => {
              if (segment && segment[1] && Array.isArray(segment[1])) {
                segment[1].forEach(cand => googleResults.push(cand));
              }
            });

            if (googleResults.length > 0) {
              const merged = Array.from(new Set([...googleResults, ...getLocalCandidates(query, textBox.textContent)]));
              renderSuggestButtons(merged, query);
            }
          }
        } finally {
          delete window[cbName];
          script.remove();
        }
      };

      script.onerror = () => {
        delete window[cbName];
        script.remove();
      };

      document.body.appendChild(script);
    }

    function renderSuggestButtons(list, query) {
      suggestList.innerHTML = "";
      if (!list || !list.length) {
        refreshNavElements();
        return;
      }

      list.slice(0, 8).forEach(word => {
        const btn = document.createElement("button");
        btn.className = "btn-suggest";
        btn.textContent = word;
        btn.addEventListener("click", () => {
          playBeep(1000, 0.07, "triangle");
          const full = textBox.textContent;
          if (full.endsWith(query)) {
            textBox.textContent = full.slice(0, full.length - query.length) + word;
          } else {
            textBox.textContent += word;
          }
          speakText(textBox.textContent);
          updateSuggestions();
        });
        suggestList.appendChild(btn);
      });

      refreshNavElements();
    }
```
