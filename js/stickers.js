// 스티커 (기획서 6장): 별 10개마다 그림 스티커 하나, 주제 하나를 모두 끝내면 주제 스티커,
// 주제 여섯 개를 모두 끝내면 특별 스티커. 스티커북에서 모은 것을 볼 수 있어요.
(function () {
  const { el, img } = A;
  const KEY = A.storageKey('stickers');
  const PER = A.CONFIG.rewards.starsPerSticker;
  const SPECIAL_KEY = 'special';
  const SPECIAL_ITEM = { id: A.CONFIG.special.id, en: A.CONFIG.special.en };
  const themeKey = (t) => `theme:${t.id}`;
  const ALL_ITEMS = () => A.THEMES.reduce((s, t) => s + t.words.length + 1, 0) + 1;   // 그림 + 주제 스티커 + 특별 1장

  let owned = {};   // { 그림 id: 받은 횟수, 'theme:<주제 id>': 1, special: 1 }
  try { owned = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { owned = {}; }
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch (e) { /* 저장 불가 기기는 무시 */ }
  };

  const has = (key) => (owned[key] || 0) > 0;
  const grant = (key) => {
    owned = { ...owned, [key]: (owned[key] || 0) + 1 };
    persist();
  };
  const countIn = (words) => words.filter(w => has(w.id)).length;
  const total = () => A.THEMES.reduce((s, t) => s + countIn(t.words) + (has(themeKey(t)) ? 1 : 0), 0)
    + (has(SPECIAL_KEY) ? 1 : 0);

  // 그 묶음에서 아직 없는 그림부터, 다 모았으면 같은 주제의 없는 그림, 그것도 없으면 아무 그림이나 "하나 더"
  const pickWord = (theme, gi) => {
    const group = theme.groups[gi] || [];
    const missing = (list) => list.filter(w => !has(w.id));
    const fresh = missing(group).length ? missing(group) : missing(theme.words);
    const word = A.shuffle(fresh.length ? fresh : (group.length ? group : theme.words))[0];
    const isNew = !has(word.id);
    grant(word.id);
    return { kind: 'word', word, isNew };
  };

  // 놀이 한 판이 끝난 뒤 받을 스티커 목록 (순서: 특별, 주제, 별 스티커)
  // sumBefore/sumAfter: 모은 별 합계 전·후. themeDone/allDone: 지금 주제·전체를 끝냈는지
  const award = ({ theme, gi, sumBefore, sumAfter, themeDone, allDone }) => {
    const rewards = [];
    if (allDone && !has(SPECIAL_KEY)) { grant(SPECIAL_KEY); rewards.push({ kind: 'special' }); }
    if (themeDone && !has(themeKey(theme))) { grant(themeKey(theme)); rewards.push({ kind: 'theme', theme }); }
    const count = Math.floor(sumAfter / PER) - Math.floor(sumBefore / PER);
    for (let k = 0; k < count; k++) rewards.push(pickWord(theme, gi));
    return rewards;
  };

  // 받은 스티커를 화면·말소리용 이름으로 바꾼다
  const describe = (r) => {
    if (r.kind === 'word') {
      return { item: r.word, name: r.word.en, sub: r.isNew ? '스티커를 받았어요!' : '스티커 하나 더!', isNew: r.isNew, say: r.word.say };
    }
    if (r.kind === 'theme') {
      return { item: { id: r.theme.cover, en: r.theme.en }, name: `${r.theme.ko} 완료`, sub: '주제를 다 끝냈어요!', isNew: true, say: r.theme.en };
    }
    return { item: SPECIAL_ITEM, name: SPECIAL_ITEM.en, sub: '모든 주제를 다 끝냈어요!', isNew: true, say: SPECIAL_ITEM.en };
  };

  // 놀이 끝 화면에 붙는 "새 스티커" 카드
  const rewardNode = (r) => {
    const d = describe(r);
    const card = el('div', 'reward', `
      <div class="rpic">${img(d.item)}${d.isNew ? '<span class="rnew">NEW!</span>' : ''}</div>
      <div class="rtext"><b>${d.name}</b><small>${d.sub}</small></div>`);
    card.onclick = () => A.speak(d.say);
    return card;
  };
  const rewardSpeech = (r) => {
    if (r.kind === 'special') return 'Wow! You are a super friend!';
    if (r.kind === 'theme') return `Wow! You finished ${r.theme.en}!`;
    return `Great job! You got the ${r.word.say} sticker!`;
  };

  // 스티커북 칸 하나: 가진 것은 색깔 그림, 없는 것은 흐린 칸
  const tile = (key, item, label, say) => {
    const got = has(key);
    const s = el('button', `stk ${got ? 'has' : 'miss'}`, `${img(item)}${owned[key] > 1 ? `<i class="scount">×${owned[key]}</i>` : ''}`);
    s.setAttribute('aria-label', got ? label : '아직 없어요');
    s.onclick = () => (got ? (A.sfx('ok'), A.speak(say)) : A.sfx('bad'));
    return s;
  };

  // 스티커북: 주제마다 한 쪽 (그림들 + 주제 스티커), 마지막 쪽에 특별 스티커
  const book = (back) => {
    const page = el('div', 'page bookpage');
    page.append(A.topbar(`📒 스티커북<small>Sticker Book ${total()} / ${ALL_ITEMS()}</small>`, back, false));
    const tabs = el('div', 'btabs');
    const slots = el('div', 'stk-grid');
    const sections = [
      ...A.THEMES.map(t => ({
        icon: t.icon, color: t.color, ko: t.ko,
        count: countIn(t.words) + (has(themeKey(t)) ? 1 : 0), size: t.words.length + 1, done: has(themeKey(t)),
        tiles: () => [
          ...t.words.map(w => tile(w.id, w, w.en, w.say)),
          tile(themeKey(t), { id: t.cover, en: t.en }, `${t.ko} 주제 스티커`, t.en),
        ],
      })),
      {
        icon: '🏆', color: '#fff0a6', ko: '특별', count: has(SPECIAL_KEY) ? 1 : 0, size: 1, done: has(SPECIAL_KEY),
        tiles: () => [tile(SPECIAL_KEY, SPECIAL_ITEM, SPECIAL_ITEM.en, SPECIAL_ITEM.en)],
      },
    ];
    const buttons = sections.map(s => {
      const b = el('button', 'btn btab', `<span>${s.icon}</span><small>${s.count}/${s.size}</small>${s.done ? '<i class="bstar">⭐</i>' : ''}`);
      b.style.setProperty('--c', s.color);
      b.setAttribute('aria-label', `${s.ko} 스티커`);
      b.onclick = () => { A.sfx('flip'); show(s); };
      tabs.append(b);
      return b;
    });
    const show = (s) => {
      buttons.forEach((b, i) => b.classList.toggle('on', sections[i] === s));
      slots.replaceChildren(...s.tiles());
    };
    page.append(tabs, slots);
    A.show(page);
    show(sections[0]);
  };

  const reset = () => {
    owned = {};
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장 불가 기기는 무시 */ }
  };

  A.stickers = { reset, has, total, all: ALL_ITEMS, award, rewardNode, rewardSpeech, book };
})();
