// 레벨 3 놀이: 미로, 숨은그림찾기, 묻고 답하기
(function () {
  const { el, img } = A;

  /* ---------- 미로 ---------- */
  // 칸마다 [위, 오른쪽, 아래, 왼쪽] 벽이 있는지(true=막힘)
  function makeMaze(N) {
    const cells = Array.from({ length: N * N }, () => [true, true, true, true]);
    const DIRS = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const cx = cur % N, cy = Math.floor(cur / N);
      const nexts = A.shuffle(DIRS).filter(([dx, dy]) => {
        const nx = cx + dx, ny = cy + dy;
        return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(ny * N + nx);
      });
      if (!nexts.length) { stack.pop(); continue; }
      const [dx, dy, wall, opp] = nexts[0];
      const nxt = (cy + dy) * N + cx + dx;
      cells[cur][wall] = false;
      cells[nxt][opp] = false;
      seen.add(nxt);
      stack.push(nxt);
    }
    return cells;
  }
  // src 칸에서 각 칸까지 걸어가야 하는 걸음 수
  function distancesFrom(cells, N, src) {
    const dist = Array(N * N).fill(-1);
    dist[src] = 0;
    const q = [src];
    const step = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    while (q.length) {
      const cur = q.shift();
      const cx = cur % N, cy = Math.floor(cur / N);
      step.forEach(([dx, dy], d) => {
        const nx = cx + dx, ny = cy + dy, ni = ny * N + nx;
        if (cells[cur][d] || nx < 0 || ny < 0 || nx >= N || ny >= N || dist[ni] >= 0) return;
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      });
    }
    return dist;
  }
  // 동물 놓을 칸 고르기: 출발점에서도, 서로서로도 멀리 떨어진 칸
  // 동물은 막다른 길 끝에만 놓아서, 다른 동물을 지나쳐 가야 하는 일이 없게 한다
  function farthestCells(cells, N, count) {
    const chosen = [0];
    const fromEach = [distancesFrom(cells, N, 0)];
    const deadEnds = cells.map((wl, k) => k).filter(k => k !== 0 && cells[k].filter(wall => !wall).length === 1);
    const candidates = deadEnds.length >= count ? deadEnds : cells.map((wl, k) => k).filter(k => k !== 0);
    while (chosen.length <= count) {
      let best = -1, bestScore = -1;
      for (const k of candidates) {
        if (chosen.includes(k)) continue;
        const score = Math.min(...fromEach.map(d => d[k]));
        if (score > bestScore) { bestScore = score; best = k; }
      }
      chosen.push(best);
      fromEach.push(distancesFrom(cells, N, best));
    }
    return chosen.slice(1);
  }

  // 길을 둥글고 굵은 선으로 그려서 직각 느낌을 줄인다
  const MAZE_WALL = '#86c98a', MAZE_PATH = '#fff1c9';
  function paintMaze(canvas, cells, N) {
    const size = canvas.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = Math.round(size * dpr);
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    const cell = size / N;
    g.fillStyle = MAZE_WALL;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = MAZE_PATH; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = cell * 0.74;
    const mid = (k) => [(k % N + 0.5) * cell, (Math.floor(k / N) + 0.5) * cell];
    cells.forEach((wl, k) => {
      const [x, y] = mid(k);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y); g.stroke();
      if (!wl[1] && k % N < N - 1) { g.beginPath(); g.moveTo(x, y); g.lineTo(...mid(k + 1)); g.stroke(); }
      if (!wl[2] && k + N < N * N) { g.beginPath(); g.moveTo(x, y); g.lineTo(...mid(k + N)); g.stroke(); }
    });
  }

  const MAZE_WRONG_GAP_MS = 1200;   // 틀린 칸을 다시 밟았을 때 격려를 또 하기까지 기다리는 시간
  const whereIs = (w) => `${w.plural ? 'Where are' : 'Where is'} the ${w.say}?`;   // 미로에서 읽어 주는 질문
  const GIRL_FALLBACK = "this.replaceWith(Object.assign(document.createElement('span'),{textContent:'👧'}))";

  A.games.maze = {
    name: '미로 찾기', icon: '🌀', level: 3, desc: '소리의 주인공에게 길을 찾아가요',
    start(ctx) {
      const N = 5 + Math.min(ctx.diff, 2);
      const spoken = new Map();   // 동물 id → 지금 화면의 [{text, node}] (말풍선이 읽을 때 번쩍이게)
      const askText = (w) => spoken.get(w.id) || [];
      A.rounds(ctx, (w, api) => {
        const cells = makeMaze(N);
        const far = farthestCells(cells, N, 3);
        const picks = A.choices(w, ctx, 3);
        const items = new Map(far.map((cell, k) => [cell, picks[k]]));
        let me = 0;
        const board = el('div', 'maze');
        board.style.setProperty('--n', N);
        const canvas = el('canvas', 'mazebg');
        board.append(canvas);
        const spot = (k) => `left:${(k % N) * 100 / N}%;top:${Math.floor(k / N) * 100 / N}%;`;
        far.forEach((cell, k) => {
          const item = el('div', 'mitem', img(picks[k]));
          item.style.cssText = spot(cell);
          board.append(item);
        });
        const player = el('div', 'me', `<img class="pic" src="images/girl.webp" alt="" onerror="${GIRL_FALLBACK}">`);
        player.style.cssText = spot(0);
        board.append(player);
        requestAnimationFrame(() => paintMaze(canvas, cells, N));
        let lastWrongAt = 0;   // 마지막으로 틀린 칸을 알린 시각
        const arrive = () => {
          player.style.cssText = spot(me);
          const found = items.get(me);
          if (!found) return;
          if (found.id === w.id) { api.ok(); return; }
          const now = Date.now();
          if (now - lastWrongAt < MAZE_WRONG_GAP_MS) return;   // 틀린 칸을 연달아 밟으면 격려를 한 번만
          lastWrongAt = now;
          api.bad(player);
        };
        const go = (d) => {
          const dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d];
          const x = me % N, y = Math.floor(me / N);
          if (cells[me][d] || x + dx < 0 || y + dy < 0 || x + dx >= N || y + dy >= N) return false;
          me = (y + dy) * N + x + dx;
          arrive();
          return true;
        };
        // 손가락으로 끌어서 움직이기
        board.addEventListener('pointermove', (e) => {
          if (e.buttons === 0 && e.pointerType === 'mouse') return;
          const r = board.getBoundingClientRect();
          const px = Math.floor(((e.clientX - r.left) / r.width) * N);
          const py = Math.floor(((e.clientY - r.top) / r.height) * N);
          const x = me % N, y = Math.floor(me / N);
          [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], d) => {
            if (px === x + dx && py === y + dy) go(d);
          });
        });
        board.style.touchAction = 'none';
        // 큰 화살표 버튼
        const pad = el('div', 'dpad');
        [['⬆', 0], ['⬅', 3], ['➡', 1], ['⬇', 2]].forEach(([t, d]) => {
          const b = el('button', `btn big k${d}`, t);
          b.onclick = () => go(d);
          pad.append(b);
        });
        const bubble = el('div', 'bubble sm', whereIs(w));
        spoken.set(w.id, [{ text: whereIs(w), node: bubble }]);
        bubble.onclick = () => A.speak(askText(w));
        ctx.stage.append(bubble, board, pad);
      }, askText);
    },
  };

  /* ---------- 숨은그림찾기 ---------- */
  // 테마마다 장면 그림 1장에 동물 4마리가 그려져 있고, 위치는 js/scenes.js 에 있다.
  // 그림 파일이 아직 없으면 임시 그림(동물 사진 + 풀)으로 보여 준다.
  const HINT_MS = 15000;      // 이만큼 못 찾으면 그 자리가 반짝
  const SCENE_RATIO = 4 / 3;  // 장면 그림 가로 / 세로
  const WRONG_GAP_MS = 1200;  // 잘못 눌러도 소리가 너무 자주 나지 않게
  const findWord = (id) => A.allWords().find(w => w.id === id);

  // 목록 칸에 쓸, 장면에서 동물 부분만 오려 보이는 스타일
  const cropStyle = (s, src) => {
    const pad = s.r * 1.3, W = 2 * pad, H = W * SCENE_RATIO;
    const pct = (v) => Math.min(100, Math.max(0, v));
    return `background-image:url(${src});background-size:${10000 / W}% auto;`
      + `background-position:${pct((s.x - pad) / (100 - W) * 100)}% ${pct((s.y - H / 2) / (100 - H) * 100)}%`;
  };

  A.games.hidden = {
    name: '숨은그림찾기', icon: '🔍', level: 3, desc: '그림 속에 숨은 동물을 찾아요',
    start(ctx) {
      const def = A.SCENES && A.SCENES[ctx.theme.id];
      const targets = (def ? def.targets : []).map(s => ({ ...s, w: findWord(s.id) })).filter(s => s.w);
      if (!targets.length) { ctx.stage.append(el('div', 'hint', '장면을 준비하고 있어요')); return; }
      const src = `images/scenes/${ctx.theme.id}.webp`;
      const probe = new Image();
      probe.onload = () => build(true);
      probe.onerror = () => build(false);
      probe.src = src;

      function build(hasArt) {
        if (!ctx.stage.isConnected) return;
        const scene = el('div', `hscene${hasArt ? '' : ' noart'}`);
        if (hasArt) scene.style.backgroundImage = `url(${src})`;
        const slots = el('div', 'slots');
        const bubble = el('div', 'bubble sm', '');
        const askLine = (w) => [{ text: whereIs(w), node: bubble }];   // 읽을 때 말풍선이 번쩍인다
        bubble.onclick = () => { if (!locked) A.speak(askLine(cur().w)); };
        const order = [...targets].sort((a, b) => b.y - a.y);   // 아래쪽 동물부터: 위 동물의 이름표가 아래 동물을 가리지 않게
        const parts = new Map();   // 동물 id → { hot, slot }

        targets.forEach(s => {
          const hot = el('button', 'hot', hasArt ? '' : `${A.img(s.w)}<span class="cover">🌿</span>`);
          hot.setAttribute('aria-label', '숨은 동물');
          hot.style.cssText = `left:${s.x - s.r}%;top:${s.y - s.r * SCENE_RATIO}%;width:${s.r * 2}%`;
          hot.onclick = (e) => { e.stopPropagation(); tap(s); };
          scene.append(hot);
          const face = hasArt ? `<div class="crop" style="${cropStyle(s, src)}"></div>` : A.img(s.w, 'sil');
          const slot = el('div', 'slot', `${face}<b class="slotword"></b>`);
          slots.append(slot);
          parts.set(s.id, { hot, slot });
        });

        let i = 0, stars = 0, tried = false, locked = false, afterPraise = false;
        let hintTimer = null, lastWrong = 0;
        const cur = () => order[i];

        const ask = () => {
          if (!scene.isConnected) return;   // 놀이 화면을 떠났으면 묻지 않는다
          const s = cur();
          tried = false; locked = false;
          A.target = null; A.targetText = askLine(s.w);
          bubble.textContent = whereIs(s.w);
          ctx.progress(i, order.length);
          A.speak(askLine(s.w), afterPraise);
          afterPraise = false;
          clearTimeout(hintTimer);
          hintTimer = setTimeout(() => {
            if (scene.isConnected && !locked) parts.get(s.id).hot.classList.add('hint');
          }, HINT_MS);
        };

        const found = (s) => {
          locked = true;
          clearTimeout(hintTimer);
          if (!tried) stars++;
          const { hot, slot } = parts.get(s.id);
          hot.classList.remove('hint');
          hot.classList.add('found');
          hot.append(el('span', 'hlabel', `<b>${s.w.en}</b><small>${s.w.ko}</small>`));
          slot.classList.add('got');
          slot.querySelector('.slotword').textContent = s.w.en;
          A.burst(!tried);
          A.cheer(!tried);
          i++;
          if (i >= order.length) {
            ctx.progress(order.length, order.length);
            setTimeout(() => ctx.finish(stars, order.length), 1400);
          } else {
            afterPraise = true;
            setTimeout(ask, 1400);
          }
        };

        const tooSoon = () => {
          const now = Date.now();
          if (now - lastWrong < WRONG_GAP_MS) return true;
          lastWrong = now;
          return false;
        };
        const tap = (s) => {
          if (locked || parts.get(s.id).hot.classList.contains('found')) return;
          if (s.id === cur().id) return found(s);
          tried = true;                       // 다른 동물을 눌렀다: 벌점 없이 소리 다시
          if (tooSoon()) return;
          A.shake(parts.get(s.id).hot);
          A.oops();
          A.speak(askLine(cur().w), true);
        };
        scene.onclick = () => {               // 빈 곳을 눌렀다: 소리만 다시 (별은 그대로)
          if (locked || tooSoon()) return;
          A.speak(askLine(cur().w));
        };

        ctx.stage.replaceChildren(bubble, scene, slots);
        ask();
      }
    },
  };

  /* ---------- 묻고 답하기 ---------- */
  A.games.qa = {
    name: '묻고 답하기', icon: '💬', level: 3, desc: '질문을 듣고 알맞게 대답해요',
    start(ctx) {
      // 단어마다 질문 종류를 미리 정한다 (What is this? / Is it a ...?)
      const kind = new Map(A.shuffle(ctx.words).map((w, i) => [w.id, i % 2 === 0]));
      // 글을 못 읽는 아이를 위해 질문 뒤에 보기도 한 줄씩 읽어 주고, 읽는 보기가 번쩍인다
      const spoken = new Map();   // 단어 id → 지금 화면의 [{text, node}] 목록
      const askText = (w) => spoken.get(w.id) || [];
      A.rounds(ctx, (w, api) => {
        const wh = kind.get(w.id);
        const shown = wh ? w : (Math.random() < 0.5 ? w : A.choices(w, ctx, 2).find(x => x.id !== w.id));
        const isYes = shown.id === w.id;
        const bubble = el('div', 'bubble', wh ? A.whatLine(w) : A.askLine(w, w.en));
        const pic = el('div', 'oxpic', img(shown, 'hero'));
        const list = el('div', 'answers');
        const lines = [{ text: wh ? A.whatLine(w) : A.askLine(w, w.say), node: bubble }];
        const addOption = (shownText, spokenText, correct) => {
          const b = el('button', 'btn answer', `<span>${shownText}</span>`);
          const line = { text: spokenText, node: b };
          // 효과음을 먼저 내고, 효과음이 끝난 뒤에 누른 보기 문장을 읽는다 (소리가 겹치지 않게)
          b.onclick = () => {
            if (correct) { api.ok(1500, true); A.speak(line); }
            else api.bad(b, true, line);
          };
          lines.push(line);
          list.append(b);
        };
        if (wh) {
          A.choices(w, ctx, 3).forEach(c => addOption(A.itLine(c, c.en), A.itLine(c, c.say), c.id === w.id));
        } else {
          const answers = w.plural
            ? [['Yes, they are.', true], ["No, they aren't.", false]]
            : [['Yes, it is.', true], ['No, it isn’t.', false]];
          answers.forEach(([t, yes]) => addOption(t, t.replace('’', "'"), yes === isYes));
        }
        spoken.set(w.id, lines);
        bubble.onclick = () => A.speak(askText(w));
        ctx.stage.append(bubble, pic, list);
      }, askText);
    },
  };
})();
