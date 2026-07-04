/*
  Pulo Zero — mini-game de pular obstáculos.
  Uso: coloque o markup abaixo em qualquer página e inclua game.css + game.js.

  <div class="jump-game" data-jump-game>
    <canvas class="jump-game__canvas"></canvas>
    <div class="jump-game__hud">
      <span class="jump-game__score">0</span>
      <span class="jump-game__best">Recorde 0</span>
    </div>
    <div class="jump-game__overlay">
      <span class="jump-game__badge"><span class="dot"></span>Pulo Zero</span>
      <p class="jump-game__title">Toque, clique ou pressione espaço</p>
      <p class="jump-game__subtitle">para pular os obstáculos</p>
    </div>
  </div>

  Não requer nenhuma dependência externa.
*/
(function(){
  'use strict';

  const STORAGE_KEY = 'jumpGameBestScore';

  function initGame(root){
    const canvas = root.querySelector('.jump-game__canvas');
    const hudScore = root.querySelector('.jump-game__score');
    const hudBest = root.querySelector('.jump-game__best');
    const overlay = root.querySelector('.jump-game__overlay');
    const title = root.querySelector('.jump-game__title');
    const subtitle = root.querySelector('.jump-game__subtitle');
    if(!canvas) return;

    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    // ---------- estado ----------
    let state = 'idle'; // idle | playing | over
    let best = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    let score = 0;
    let speed = 0;
    let elapsed = 0;
    let lastTime = null;
    let shakeT = 0;

    const GROUND_RATIO = 0.78; // posição do chão relativa à altura do canvas

    const player = {
      x: 0, y: 0, size: 0,
      vy: 0,
      rotation: 0,
      onGround: true
    };

    let obstacles = [];
    let nextSpawnIn = 0;
    let particles = [];

    function colors(){
      const cs = getComputedStyle(root);
      return {
        black: cs.getPropertyValue('--jg-black').trim() || '#0a0a0a',
        white: cs.getPropertyValue('--jg-white').trim() || '#ffffff',
        gray: cs.getPropertyValue('--jg-gray').trim() || '#eaeaec',
        grayDim: cs.getPropertyValue('--jg-gray-dim').trim() || '#86868b',
        accent: cs.getPropertyValue('--jg-accent').trim() || '#2f5fff'
      };
    }

    function resize(){
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      player.size = Math.max(22, H * 0.11);
      player.x = W * 0.14;
      if(player.onGround) player.y = H * GROUND_RATIO - player.size;
    }

    function resetGame(){
      score = 0;
      speed = W * 0.42; // px/s inicial, escala com o tamanho do canvas
      elapsed = 0;
      obstacles = [];
      particles = [];
      nextSpawnIn = 0.6;
      player.y = H * GROUND_RATIO - player.size;
      player.vy = 0;
      player.rotation = 0;
      player.onGround = true;
      shakeT = 0;
    }

    function startGame(){
      resetGame();
      state = 'playing';
      overlay.classList.add('is-hidden');
      lastTime = null;
      requestAnimationFrame(loop);
    }

    function endGame(){
      state = 'over';
      best = Math.max(best, Math.floor(score));
      localStorage.setItem(STORAGE_KEY, String(best));
      hudBest.textContent = 'Recorde ' + best;
      title.textContent = 'Fim de jogo — ' + Math.floor(score) + ' pts';
      subtitle.textContent = 'Toque, clique ou pressione espaço para tentar de novo';
      overlay.classList.remove('is-hidden');
      shakeT = 0.25;
    }

    function jump(){
      if(state === 'idle' || state === 'over'){
        startGame();
        return;
      }
      if(state !== 'playing') return;
      if(player.onGround){
        player.vy = -H * 0.92; // impulso de pulo, escala com altura
        player.onGround = false;
        spawnBurst(player.x + player.size * 0.4, player.y + player.size);
      }
    }

    function spawnBurst(x, y){
      for(let i = 0; i < 6; i++){
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 140,
          vy: -Math.random() * 90,
          life: 0.4 + Math.random() * 0.2
        });
      }
    }

    function spawnObstacle(){
      const groundY = H * GROUND_RATIO;
      // altura máxima que o pulo alcança: v^2 / (2*g), com margem de segurança
      // para garantir que TODO obstáculo gerado seja sempre pulável.
      const jumpVel = H * 0.92;
      const gravityV = H * 3.1;
      const maxJumpHeight = (jumpVel * jumpVel) / (2 * gravityV);
      const h = maxJumpHeight * (0.32 + Math.random() * 0.33); // entre 32% e 65% do pulo máximo
      const w = Math.max(14, H * 0.09);
      obstacles.push({ x: W + w, y: groundY - h, w, h, passed: false });
    }

    function update(dt){
      elapsed += dt;
      speed += dt * (W * 0.012); // aceleração gradual
      score += dt * (speed / (W * 0.42)) * 9;

      // física do jogador
      const gravity = H * 3.1;
      player.vy += gravity * dt;
      player.y += player.vy * dt;
      const groundY = H * GROUND_RATIO - player.size;
      if(player.y >= groundY){
        player.y = groundY;
        player.vy = 0;
        if(!player.onGround) spawnBurst(player.x + player.size * 0.4, player.y + player.size);
        player.onGround = true;
      } else {
        player.onGround = false;
      }
      player.rotation = player.onGround ? 0 : Math.min(0.5, player.rotation + dt * 3);
      if(player.onGround) player.rotation = 0;

      // obstáculos
      nextSpawnIn -= dt;
      if(nextSpawnIn <= 0){
        spawnObstacle();
        const gap = 0.9 - Math.min(0.5, elapsed * 0.01);
        nextSpawnIn = gap + Math.random() * 0.5;
      }
      for(let i = obstacles.length - 1; i >= 0; i--){
        const o = obstacles[i];
        o.x -= speed * dt;
        if(!o.passed && o.x + o.w < player.x){
          o.passed = true;
          score += 10;
        }
        if(o.x + o.w < -20) obstacles.splice(i, 1);
      }

      // partículas
      for(let i = particles.length - 1; i >= 0; i--){
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += H * 2 * dt;
        if(p.life <= 0) particles.splice(i, 1);
      }

      // colisão (hitbox levemente menor que o sprite, mais justo)
      const pad = player.size * 0.18;
      const px = player.x + pad, py = player.y + pad;
      const ps = player.size - pad * 2;
      for(const o of obstacles){
        if(px < o.x + o.w && px + ps > o.x && py < o.y + o.h && py + ps > o.y){
          endGame();
          break;
        }
      }

      hudScore.textContent = String(Math.floor(score));
    }

    function draw(){
      const c = colors();
      ctx.clearRect(0, 0, W, H);

      let shakeX = 0, shakeY = 0;
      if(shakeT > 0){
        shakeX = (Math.random() - 0.5) * 8 * shakeT;
        shakeY = (Math.random() - 0.5) * 8 * shakeT;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // chão
      const groundY = H * GROUND_RATIO;
      ctx.strokeStyle = c.gray;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 0.5);
      ctx.lineTo(W, groundY + 0.5);
      ctx.stroke();

      // marcações do chão (dão sensação de movimento)
      ctx.fillStyle = c.gray;
      const dashW = 18, gap = 26;
      const offset = (elapsed * speed) % (dashW + gap);
      for(let x = -offset; x < W; x += dashW + gap){
        ctx.fillRect(x, groundY + 10, dashW, 2);
      }

      // obstáculos
      ctx.fillStyle = c.black;
      obstacles.forEach(o=>{
        const r = Math.min(6, o.w / 3);
        roundRect(ctx, o.x, o.y, o.w, o.h, r);
        ctx.fill();
      });

      // partículas
      particles.forEach(p=>{
        ctx.globalAlpha = Math.max(0, p.life / 0.6);
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // jogador
      ctx.save();
      ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
      ctx.rotate(player.rotation);
      ctx.fillStyle = c.accent;
      roundRect(ctx, -player.size / 2, -player.size / 2, player.size, player.size, player.size * 0.28);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r){
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function loop(ts){
      if(lastTime === null) lastTime = ts;
      let dt = (ts - lastTime) / 1000;
      dt = Math.min(dt, 1 / 30); // evita saltos grandes se a aba ficar em segundo plano
      lastTime = ts;

      if(shakeT > 0) shakeT = Math.max(0, shakeT - dt);

      if(state === 'playing') update(dt);
      draw();

      if(state === 'playing') requestAnimationFrame(loop);
    }

    // ---------- input ----------
    root.addEventListener('pointerdown', (e)=>{
      e.preventDefault();
      jump();
    });
    window.addEventListener('keydown', (e)=>{
      if(e.code === 'Space' || e.code === 'ArrowUp'){
        // só responde ao teclado se este jogo estiver visível na tela
        const rect = root.getBoundingClientRect();
        const visible = rect.top < window.innerHeight && rect.bottom > 0;
        if(visible){
          e.preventDefault();
          jump();
        }
      }
    });
    window.addEventListener('resize', ()=>{
      const wasIdle = state !== 'playing';
      resize();
      if(wasIdle && state !== 'playing'){
        player.y = H * GROUND_RATIO - player.size;
      }
    });

    // ---------- init ----------
    hudBest.textContent = 'Recorde ' + best;
    resize();
    draw();
  }

  function initAll(){
    document.querySelectorAll('.jump-game[data-jump-game]').forEach(initGame);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
