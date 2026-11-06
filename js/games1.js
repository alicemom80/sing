// 레벨 1 놀이 (글자를 몰라도 소리로 할 수 있어요): 단어카드, 듣고 고르기, 풍선, 짝 맞추기
(function () {
  const { el, img } = A;

  A.games.card = {
    name: '단어 카드', icon: '🃏', level: 1, desc: '그림을 눌러 소리를 들어요',
    start(ctx) {
      let i = 0;
      const seen = new Set();
      const draw = () => {
        const w = ctx.words[i];
        seen.add(i);
        A.target = w;
        ctx.progress(i, ctx.words.length);
        const card = el('div', 'bigcard');
        card.innerHTML = `${img(w, 'hero')}
          <div class="word-en">${w.en}</div>
          <div class="word-ko">${w.ko}</div>
          <button class="btn sentence">🔊 ${A.isLine(w, w.en)}</button>`;
        card.querySelector('.hero').onclick = () => A.say(w);
        card.querySelector('.sentence').onclick = () => A.speak(A.isLine(w, w.say));
        card.querySelector('.word-en').onclick = () => A.say(w);
        const nav = el('div', 'nav');
        const prev = el('button', 'btn big', '◀');
        const next = el('button', 'btn big primary', i === ctx.words.length - 1 ? '끝! ⭐' : '▶');
        prev.disabled = i === 0;
        prev.onclick = () => { i--; draw(); };
        next.onclick = () => {
          if (i === ctx.words.length - 1) {
            ctx.progress(ctx.words.length, ctx.words.length);   // 끝 화면 전에 진행바를 100%로
            return ctx.finish(ctx.words.length, ctx.words.length);
          }
          i++; draw();
        };
        nav.append(prev, next);
        ctx.stage.replaceChildren(card, nav);
        A.say(w);   // 카드가 나오면 소리가 바로 나온다
      };
      draw();
    },
  };

  A.games.pick = {
    name: '듣고 고르기', icon: '👂', level: 1, desc: '소리를 듣고 그림을 골라요',
    start(ctx) {
      const n = ctx.diff === 0 ? 3 : 4;
      A.rounds(ctx, (w, api) => {
        const grid = el('div', `choices n${n}`);
        A.choices(w, ctx, n).forEach(c => {
          const b = el('button', 'btn choice', img(c) + `<span class="lbl">${c.en}</span>`);
          b.onclick = () => (c.id === w.id ? api.ok() : api.bad(b));
          grid.append(b);
        });
        ctx.stage.append(grid);
      });
    },
  };

  // 풍선: 5개가 아래에서 둥실 올라와 위로 사라지고, 다시 아래에서 올라온다
  const BALLOON_COUNT = 5;
  const BALLOON_COLORS = ['#ff6b81', '#ffb84d', '#5ad07a', '#4db8ff', '#b58cff'];
  const RISE_MS = [[12000, 16000], [10000, 13000], [8000, 11000]];   // 묶음이 뒤로 갈수록 빨라진다
  const STRING_PX = 30;
  const BALLOON_SPACE_PX = 150;   // 풍선 사이 틈과 줄 길이를 위한 여유

  A.games.balloon = {
    name: '풍선 터뜨리기', icon: '🎈', level: 1, desc: '들리는 동물의 풍선을 눌러요',
    start(ctx) {
      const [fastest, slowest] = RISE_MS[ctx.diff];
      A.rounds(ctx, (w, api) => {
        const sky = el('div', 'sky');
        let popped = false;
        // 모두 같은 속도로 올라오고 출발 시간을 고르게 나눠서, 풍선끼리 겹치지 않는다
        const duration = fastest + Math.random() * (slowest - fastest);
        const launch = (b, first) => {
          const height = sky.clientHeight, skyWidth = sky.clientWidth;
          // 위아래로 이웃한 풍선이 닿지 않도록, 하늘 높이에 맞춰 풍선 크기를 제한한다
          const maxSize = (height - BALLOON_SPACE_PX) / (BALLOON_COUNT - 1);
          const width = Math.min(skyWidth * 0.28, maxSize * 0.8);
          b.style.width = `${width}px`;
          const size = b.offsetHeight;
          b.style.left = `${Math.random() * (skyWidth - width)}px`;
          b.anim = b.animate(
            [{ transform: `translateY(${height}px)` }, { transform: `translateY(${-size - STRING_PX}px)` }],
            { duration, easing: 'linear', fill: 'backwards', delay: first ? -(b.slot * duration) / BALLOON_COUNT : 0 },
          );
          b.anim.onfinish = () => { if (b.isConnected && !popped) launch(b, false); };
        };
        const balloons = A.choices(w, ctx, BALLOON_COUNT).map((c, k) => {
          const b = el('button', 'balloon', `<div class="bball">${img(c)}<span class="lbl" style="--n:${c.en.length}">${c.en}</span></div>`);
          b.slot = k;
          const ball = b.firstChild;
          ball.style.setProperty('--c', BALLOON_COLORS[k % BALLOON_COLORS.length]);
          b.onclick = () => {
            if (popped) return;
            if (c.id !== w.id) return api.bad(ball);
            popped = true;
            A.sfx('pop');
            balloons.forEach(x => x.anim?.pause());
            ball.classList.add('pop');
            api.ok();
          };
          sky.append(b);
          return b;
        });
        ctx.stage.append(sky);
        requestAnimationFrame(() => balloons.forEach(b => launch(b, true)));
      });
    },
  };

  const MATCH_PAIRS = 3;

  A.games.match = {
    name: '짝 맞추기', icon: '🧩', level: 1, desc: '같은 그림 두 장을 찾아요',
    start(ctx) {
      const pairs = MATCH_PAIRS;   // 매번 카드 6장
      let base = A.shuffle(ctx.words).slice(0, pairs);   // 묶음의 5개 중 3개를 매번 다르게 뽑는다
      if (base.length < pairs) base = base.concat(A.shuffle(ctx.pool.filter(p => !base.includes(p))).slice(0, pairs - base.length));
      const deck = A.shuffle([...base, ...base].map((w, k) => ({ w, k })));
      const grid = el('div', 'memory');
      let open = [], matched = 0, mistakes = 0, busy = false;
      ctx.progress(0, pairs);
      A.target = null;
      deck.forEach(d => {
        const c = el('button', 'btn mcard', `<div class="face back">?</div><div class="face front">${img(d.w)}<span class="lbl" lang="en">${d.w.en}</span></div>`);
        c.onclick = () => {
          if (busy || c.classList.contains('flip') || c.classList.contains('done')) return;
          c.classList.add('flip');
          A.sfx('flip');
          A.say(d.w);   // 뒤집을 때마다 소리가 난다
          open.push({ c, d });
          if (open.length < 2) return;
          const [a, b] = open;
          open = [];
          if (a.d.w.id === b.d.w.id) {
            matched++;
            a.c.classList.add('done'); b.c.classList.add('done');
            A.burst(true);
            A.cheer(true, false);
            ctx.progress(matched, pairs);
            if (matched === pairs) {
              setTimeout(() => ctx.finish(Math.max(1, pairs - Math.min(pairs - 1, mistakes)), pairs), 900);
            }
          } else {
            mistakes++;
            A.oops(false);
            busy = true;
            setTimeout(() => { a.c.classList.remove('flip'); b.c.classList.remove('flip'); busy = false; }, 900);
          }
        };
        grid.append(c);
      });
      ctx.stage.replaceChildren(grid);
    },
  };
})();
