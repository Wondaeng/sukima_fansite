(() => {
  'use strict';

  const text = {
    ko: {
      ...window.SuikaGameText.ko,
      pageTitle: '스키마 수박게임 · Sukima Arcade',
      settings: '게임 설정',
      language: '언어 선택',
      soundControl: '배경음악과 효과음',
      help: '게임 방법',
      titleFirst: '스키마',
      titleSecond: '수박게임',
      descriptionFirst: '같은 조각 두 개를 합쳐',
      descriptionSecond: '마지막 앨범을 완성하세요.',
      scoreboard: '점수판',
      scoreLabel: '점수',
      bestLabel: '최고 점수',
      nextPiece: '다음 조각',
      finalMerge: '최종 합체',
      boardLabel: '게임판',
      boardAria: '게임판. 방향키로 위치를 정하고 스페이스 키로 조각을 떨어뜨리세요. 화면을 터치해서도 플레이할 수 있습니다.',
      boardFallback: '방향키로 위치를 정하고 스페이스 키로 조각을 떨어뜨리세요.',
      restart: '다시 시작',
      touchHint: '클릭·터치로 떨어뜨리기',
      moveHint: '이동',
      dropHint: '낙하',
      evolution: '합체 순서',
      evolutionAria: '조각의 합체 순서'
    },
    ja: {
      ...window.SuikaGameText.ja,
      pageTitle: 'スキマスイカゲーム · Sukima Arcade',
      settings: 'ゲーム設定',
      language: '言語を選択',
      soundControl: 'BGMと効果音',
      help: '遊び方',
      titleFirst: 'スキマ',
      titleSecond: 'スイカゲーム',
      descriptionFirst: '同じピースを2つ合わせて、',
      descriptionSecond: '最後のアルバムを完成させよう。',
      scoreboard: 'スコアボード',
      scoreLabel: 'スコア',
      bestLabel: 'ベストスコア',
      nextPiece: '次のピース',
      finalMerge: '最後のピース',
      boardLabel: 'プレイエリア',
      boardAria: 'プレイエリア。左右の矢印キーで位置を決め、スペースキーでピースを落とします。タッチ操作でも遊べます。',
      boardFallback: '左右の矢印キーで位置を決め、スペースキーでピースを落としてください。',
      restart: 'やり直す',
      touchHint: 'クリック・タッチで落とす',
      moveHint: '移動',
      dropHint: '落とす',
      evolution: '合体の順番',
      evolutionAria: 'ピースが合体する順番'
    }
  };

  const preference = 'sukima-suika-language';
  let lang = 'ko';
  try {
    if (localStorage.getItem(preference) === 'ja') lang = 'ja';
  } catch { /* Language switching also works without persistent storage. */ }

  const select = document.getElementById('languageSelect');
  const listeners = new Set();

  function t(key, values) {
    const value = text[lang][key];
    if (!values) return value;
    return value.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  }

  function paintStaticText() {
    document.documentElement.lang = lang;
    select.value = lang;
    for (const element of document.querySelectorAll('[data-i18n]')) {
      element.textContent = t(element.dataset.i18n);
    }
    for (const element of document.querySelectorAll('[data-i18n-aria]')) {
      element.setAttribute('aria-label', t(element.dataset.i18nAria));
    }
    for (const element of document.querySelectorAll('[data-i18n-title]')) {
      element.title = t(element.dataset.i18nTitle);
    }
  }

  function setLang(value) {
    if ((value !== 'ko' && value !== 'ja') || value === lang) return;
    lang = value;
    try { localStorage.setItem(preference, value); } catch { /* Optional preference. */ }
    paintStaticText();
    for (const listener of listeners) listener();
  }

  window.SuikaI18n = {
    get lang() { return lang; },
    t, setLang,
    pieceName(index) {
      const piece = window.SuikaArt.pieces[index];
      return lang === 'ja' ? piece.nameJa : piece.name;
    },
    onChange(listener) { listeners.add(listener); }
  };
  select.addEventListener('change', () => setLang(select.value));
  paintStaticText();
})();
