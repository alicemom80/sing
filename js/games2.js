// 레벨 2 놀이: 오엑스, 복권 긁기
(function () {
  const { el, img } = A;

  A.games.ox = {
    name: '오엑스 (O X)', icon: '⭕', level: 2, desc: '들은 소리와 그림이 같으면 O',
    start(ctx) {
      A.rounds(ctx, (w, api) => {
        const same = Math.random() < 0.5;
        const shown = same ? w : A.choices(w, ctx, 2).find(x => x.id !== w.id);
        const card = el('div', 'oxpic', img(shown, 'hero') + `<div class="word-en">${shown.en}</div>`);
        const row = el('div', 'oxrow');
        const yes = el('button', 'btn ox o', 'O');
        const no = el('button', 'btn ox x', 'X');
        yes.onclick = () => (same ? api.ok() : api.bad(yes));
        no.onclick = () => (!same ? api.ok() : api.bad(no));
        row.append(yes, no);
        ctx.stage.append(card, row);
      });
    },
  };

  A.games.scratch = {
    name: '복권 긁기', icon: '🎟️', level: 2, desc: '손가락으로 긁고, 맞는 카드를 눌러요',
    start(ctx) {
      A.rounds(ctx, (w, api) => {
        const grid = el('div', 'choices n3 scratchgrid');
        A.choices(w, ctx, 3).forEach(c => {
          const box = el('div', 'scard', img(c) + `<span class="lbl">${c.en}</span>`);
          const cv = el('canvas');
          box.append(cv);
          grid.append(box);
          requestAnimationFrame(() => setupScratch(box, cv, c, w, api));
        });
        ctx.stage.append(grid, el('div', 'hint', '👆 손가락으로 쓱쓱 긁어 보세요!'));
      });
    },
  };

  function setupScratch(box, cv, c, w, api) {
    // 칸이 아직 화면에 자리를 잡지 않았으면 다음 화면에서 다시 맞춘다 (크기 0으로 그리면 영영 안 열린다)
    if (!box.clientWidth || !box.clientHeight) {
      if (box.isConnected) requestAnimationFrame(() => setupScratch(box, cv, c, w, api));
      return;
    }
    const W = (cv.width = box.clientWidth), H = (cv.height = box.clientHeight);
    const g = cv.getContext('2d', { willReadFrequently: true });
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#c9d1e0'); grad.addColorStop(0.5, '#eef1f8'); grad.addColorStop(1, '#aab4c8');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7b87a1'; g.font = `bold ${Math.round(W * 0.5)}px sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', W / 2, H / 2);
    g.globalCompositeOperation = 'destination-out';
    const TAP_MAX_PX = 12;      // 이보다 덜 움직였을 때만 '누르기'로 본다
    let opened = false, down = false, wasOpened = false, strokes = 0;
    let sx = 0, sy = 0;         // 손가락이 지금 있는 자리 (그림 칸 기준)
    let downX = 0, downY = 0;   // 누른 자리
    let dragged = 0;            // 이번 누름에서 긁거나 끈 거리의 합
    // 손가락 위치(화면 px)를 캔버스 그림 칸(W×H) 위치로 바꾼다. 주소창이 접히거나 화면이 돌면 화면 크기가 달라지므로 비율로 맞춘다
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
    };
    const dot = (x, y) => { g.beginPath(); g.arc(x, y, Math.max(8, W * 0.06), 0, 7); g.fill(); };
    const revealedRatio = () => {
      const d = g.getImageData(0, 0, W, H).data;
      let clear = 0, total = 0;
      for (let p = 3; p < d.length; p += 64) { total++; if (d[p] < 40) clear++; }
      return clear / total;
    };
    cv.addEventListener('pointerdown', (e) => {
      down = true; wasOpened = opened; dragged = 0;
      [sx, sy] = pos(e); [downX, downY] = [sx, sy];
      cv.setPointerCapture(e.pointerId);
      if (!opened) dot(sx, sy);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!down) return;
      const [x, y] = pos(e);
      dragged += Math.hypot(x - sx, y - sy); sx = x; sy = y;   // 열린 뒤에도 끈 거리를 계속 잰다
      if (opened) return;                                       // 열린 카드는 더 긁지 않는다
      dot(x, y);
      if (++strokes % 6 === 0 && revealedRatio() > 0.35) {
        opened = true;
        cv.classList.add('gone');
      }
    });
    const release = (e) => {
      if (!down) return;
      down = false;
      const [ux, uy] = pos(e);
      const gap = Math.hypot(ux - downX, uy - downY);            // 누른 자리와 뗀 자리의 차이
      if (dragged > TAP_MAX_PX || gap > TAP_MAX_PX) return;      // 긁었거나 끌었으면 선택이 아니다
      if (!wasOpened) {                                          // 아직 안 열린 카드를 눌렀을 때
        A.shake(box);
        A.say(w);
        return;
      }
      if (c.id === w.id) api.ok(); else api.bad(box);
    };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', () => { down = false; });   // 브라우저가 제스처를 가져가면 선택하지 않는다
  }
})();
