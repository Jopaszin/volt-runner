/**
 * game.js
 * Orquestra o loop principal do jogo: estados, física, cenário,
 * pontuação, dificuldade e integração com os demais módulos.
 */
(() => {
  const STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAMEOVER: 'gameover'
  };

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  let cssWidth = 0;
  let cssHeight = 0;
  let groundY = 0;

  let state = STATE.MENU;
  let player = null;
  let obstacles = null;

  let score = 0;
  let hiscore = Ranking.getBestScore();

  // ============ AJUSTES DE DIFICULDADE E VELOCIDADE INFINITA ============
  const BASE_SPEED = 350;       // Velocidade inicial (px/s)
  const SPEED_PER_SCORE = 0.18; // Aumento continuo por pontuacao (sem limite maximo)
  let speed = BASE_SPEED;

  let lastTime = 0;
  let particles = [];
  let scoreFlashTimer = 0;
  let lastScoreTickAt = 0;

  // Parallax / cenário
  let dayNightPhase = 0; // 0..1 ciclo completo
  const bgLayers = {
    farStars: [],
    mountains: [],
    groundDecor: []
  };

  // ============ SETUP DO CANVAS / RESPONSIVIDADE ============
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cssWidth = rect.width;
    cssHeight = rect.height;

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    groundY = cssHeight * 0.78;

    if (player) player.groundY = groundY;
    if (obstacles) {
      obstacles.groundY = groundY;
      obstacles.canvasWidth = cssWidth;
    }
    generateBackgroundLayers();
  }

  function generateBackgroundLayers() {
    bgLayers.farStars = Array.from({ length: 40 }, () => ({
      x: Math.random() * cssWidth,
      y: Math.random() * groundY * 0.75,
      r: Math.random() * 1.6 + 0.4,
      twinkle: Math.random() * Math.PI * 2
    }));

    bgLayers.mountains = Array.from({ length: 6 }, (_, i) => ({
      x: (cssWidth / 5) * i + Math.random() * 40,
      w: 160 + Math.random() * 120,
      h: 60 + Math.random() * 90
    }));

    bgLayers.groundDecor = Array.from({ length: 14 }, () => ({
      x: Math.random() * cssWidth,
      w: 14 + Math.random() * 22
    }));
  }

  // ============ INPUT ============
  function handleJumpInput() {
    if (state === STATE.MENU) return;
    if (state === STATE.PLAYING) player.jump();
  }

  function handleDuckInput(active) {
    if (state !== STATE.PLAYING) return;
    player.setDucking(active);
  }

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJumpInput();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleDuckInput(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown') {
        handleDuckInput(false);
      }
    });

    // Toque diretamente no canvas: metade superior pula, metade inferior agacha
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (state !== STATE.PLAYING) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const relY = touch.clientY - rect.top;
      
      if (relY < rect.height * 0.50) {
        handleJumpInput();
      } else {
        handleDuckInput(true);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleDuckInput(false);
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      handleDuckInput(false);
    });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));
  }

  // ============ PARTÍCULAS ============
  function spawnDustParticles(x, y, count = 1) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: -speed * 0.3 - Math.random() * 40,
        vy: -Math.random() * 60,
        life: 0.4 + Math.random() * 0.3,
        age: 0,
        size: 2 + Math.random() * 2,
        color: 'rgba(0,240,255,0.5)'
      });
    }
  }

  function spawnHitBurst(x, y) {
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.5 + Math.random() * 0.4,
        age: 0,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.5 ? 'rgba(255,77,94,0.9)' : 'rgba(255,210,63,0.9)'
      });
    }
  }

  function updateParticles(dt) {
    particles.forEach(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
    });
    particles = particles.filter(p => p.age < p.life);
  }

  function drawParticles() {
    particles.forEach(p => {
      const alpha = Math.max(0, 1 - p.age / p.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ============ CENÁRIO (parallax + ciclo dia/noite) ============
  function updateBackground(dt) {
    dayNightPhase += dt * 0.02;
    if (dayNightPhase > 1) dayNightPhase -= 1;

    bgLayers.mountains.forEach(m => {
      m.x -= speed * 0.15 * dt;
      if (m.x + m.w < 0) m.x = cssWidth + Math.random() * 60;
    });

    bgLayers.groundDecor.forEach(g => {
      g.x -= speed * 0.9 * dt;
      if (g.x + g.w < 0) g.x = cssWidth + Math.random() * 40;
    });

    bgLayers.farStars.forEach(s => {
      s.twinkle += dt * 2;
    });
  }

  function skyColors() {
    const t = (Math.sin(dayNightPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const day = { top: [19, 27, 46], bottom: [30, 46, 77] };
    const night = { top: [5, 7, 16], bottom: [9, 12, 24] };
    const lerp = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return {
      top: lerp(night.top, day.top),
      bottom: lerp(night.bottom, day.bottom),
      nightAmount: 1 - t
    };
  }

  function drawBackground() {
    const colors = skyColors();
    const grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0, `rgb(${colors.top.join(',')})`);
    grad.addColorStop(1, `rgb(${colors.bottom.join(',')})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cssWidth, groundY);

    if (colors.nightAmount > 0.05) {
      ctx.save();
      ctx.globalAlpha = colors.nightAmount;
      bgLayers.farStars.forEach(s => {
        const tw = (Math.sin(s.twinkle) + 1) / 2;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.5})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    const orbY = groundY * 0.22 + Math.cos(dayNightPhase * Math.PI * 2) * groundY * 0.08;
    const orbX = cssWidth * 0.82;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = colors.nightAmount > 0.5 ? '#dfe8ff' : '#ffe07a';
    ctx.shadowColor = colors.nightAmount > 0.5 ? 'rgba(223,232,255,0.6)' : 'rgba(255,224,122,0.6)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = `rgba(${colors.top[0] + 12},${colors.top[1] + 14},${colors.top[2] + 22},0.9)`;
    bgLayers.mountains.forEach(m => {
      ctx.beginPath();
      ctx.moveTo(m.x, groundY);
      ctx.lineTo(m.x + m.w * 0.5, groundY - m.h);
      ctx.lineTo(m.x + m.w, groundY);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, cssHeight);
    groundGrad.addColorStop(0, '#0d1526');
    groundGrad.addColorStop(1, '#060910');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, cssWidth, cssHeight - groundY);

    ctx.save();
    ctx.strokeStyle = 'rgba(0,240,255,0.55)';
    ctx.shadowColor = 'rgba(0,240,255,0.6)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 1);
    ctx.lineTo(cssWidth, groundY + 1);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 3;
    bgLayers.groundDecor.forEach(g => {
      ctx.beginPath();
      ctx.moveTo(g.x, groundY + 10);
      ctx.lineTo(g.x + g.w, groundY + 10);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ============ DIFICULDADE / VELOCIDADE INFINITA ============
  function updateSpeed() {
    speed = BASE_SPEED + score * SPEED_PER_SCORE;
  }

  // ============ CICLO DE ESTADOS ============
  function startGame() {
    score = 0;
    speed = BASE_SPEED;
    particles = [];
    player.reset();
    obstacles.reset();
    dayNightPhase = 0;
    state = STATE.PLAYING;
    AudioFX.playStart();
    UI.updateHUD(score, hiscore);
  }

  function endGame() {
    state = STATE.GAMEOVER;
    spawnHitBurst(player.x + player.width / 2, player.y + player.height / 2);

    hiscore = Math.max(hiscore, Math.floor(score));
    const madeTop10 = Ranking.isTop10(Math.floor(score));

    UI.showGameOverScreen({
      score: Math.floor(score),
      best: hiscore,
      madeTop10
    });
  }

  // ============ LOOP PRINCIPAL ============
  function update(dt) {
    if (state !== STATE.GAMEOVER) {
      updateBackground(dt);
    }
    updateParticles(dt);

    if (state === STATE.PLAYING) {
      updateSpeed();
      player.update(dt, speed);
      obstacles.update(dt, speed, score);

      if (!player.isJumping && Math.random() < 0.5) {
        spawnDustParticles(player.x + player.width * 0.3, player.y + player.height - 2, 1);
      }

      score += dt * (60 + speed * 0.05);

      if (score - lastScoreTickAt > 100) {
        lastScoreTickAt = score;
        AudioFX.playScoreTick();
        scoreFlashTimer = 0.15;
      }

      UI.updateHUD(score, Math.max(hiscore, Math.floor(score)));

      if (obstacles.checkCollision(player.getHitbox())) {
        player.die();
        endGame();
      }
    } else if (state === STATE.GAMEOVER) {
      player.update(dt, 0);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    drawBackground();

    if (state === STATE.PLAYING || state === STATE.GAMEOVER) {
      obstacles.draw(ctx);
      player.draw(ctx);
    }

    drawParticles();
  }

  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    dt = Math.min(dt, 1 / 20);

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // ============ INICIALIZAÇÃO ============
  function init() {
    // 🔐 Autenticação anônima do Firebase para gerar o UID único do jogador
    firebase.auth().signInAnonymously()
      .then((userCredential) => {
        window.playerUid = userCredential.user.uid;
        console.log("Jogador autenticado com ID anônimo:", window.playerUid);
      })
      .catch((error) => {
        console.error("Erro na autenticação anônima:", error.message);
      });

    resizeCanvas();
    player = new Player(groundY);
    obstacles = new ObstacleManager(groundY, cssWidth);

    bindInput();

    UI.init({
      onPlay: startGame,
      onJumpPress: handleJumpInput,
      onDuckPress: handleDuckInput,
      onScoreSaved: () => {
        UI.refreshRankingScreen();
      }
    });

    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', init);
})();