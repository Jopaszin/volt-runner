/**
 * ui.js
 * Controla as telas (menu, como jogar, ranking, game over) e o HUD.
 * Não conhece detalhes do loop do jogo — comunica-se por callbacks.
 */
const UI = (() => {
  const els = {};
  let callbacks = {};
  let pendingScore = 0;

  function cacheElements() {
    els.hud = document.getElementById('hud');
    els.hudScore = document.getElementById('hud-score');
    els.hudHiscore = document.getElementById('hud-hiscore');
    els.mobileControls = document.getElementById('mobile-controls');

    els.screens = {
      menu: document.getElementById('screen-menu'),
      howto: document.getElementById('screen-howto'),
      ranking: document.getElementById('screen-ranking'),
      gameover: document.getElementById('screen-gameover')
    };

    els.menuBestScore = document.getElementById('menu-best-score');
    els.btnPlay = document.getElementById('btn-play');
    els.btnRanking = document.getElementById('btn-ranking');
    els.btnHowto = document.getElementById('btn-howto');
    els.btnHowtoBack = document.getElementById('btn-howto-back');
    els.btnRankingBack = document.getElementById('btn-ranking-back');

    els.rankingList = document.getElementById('ranking-list');
    els.rankingEmpty = document.getElementById('ranking-empty');

    els.finalScore = document.getElementById('final-score');
    els.finalBest = document.getElementById('final-best');
    els.newRecordBanner = document.getElementById('new-record-banner');
    els.nameEntry = document.getElementById('name-entry');
    els.playerName = document.getElementById('player-name');
    els.btnSaveScore = document.getElementById('btn-save-score');
    els.btnRetry = document.getElementById('btn-retry');
    els.btnGameoverMenu = document.getElementById('btn-gameover-menu');

    els.btnMute = document.getElementById('btn-mute');
    els.btnMuteMenu = document.getElementById('btn-mute-menu');

    els.btnJumpTouch = document.getElementById('btn-jump');
    els.btnDuckTouch = document.getElementById('btn-duck');
  }

  function hideAllScreens() {
    Object.values(els.screens).forEach(s => s.classList.add('hidden'));
  }

  function showScreen(name) {
    hideAllScreens();
    if (els.screens[name]) els.screens[name].classList.remove('hidden');
  }

  function hideAllScreensForGameplay() {
    hideAllScreens();
    els.hud.classList.remove('hidden');
    if (isTouchDevice()) els.mobileControls.classList.remove('hidden');
  }

  function isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  function updateHUD(score, hiscore) {
    els.hudScore.textContent = `SCORE: ${formatScore(score)}`;
    els.hudHiscore.textContent = `HI-SCORE: ${formatScore(hiscore)}`;
  }

  function formatScore(n) {
    return String(Math.floor(n)).padStart(6, '0');
  }

  function refreshMenuBestScore() {
    els.menuBestScore.textContent = Ranking.formatScore(Ranking.getBestScore());
  }

  function refreshMuteIcons() {
    const muted = AudioFX.isMuted();
    const icon = muted ? '🔇' : '🔊';
    els.btnMute.textContent = icon;
    els.btnMuteMenu.textContent = `${icon} SOM`;
  }

  function showGameOverScreen({ score, best, madeTop10 }) {
    pendingScore = score;
    els.finalScore.textContent = Ranking.formatScore(score);
    els.finalBest.textContent = Ranking.formatScore(best);

    if (madeTop10) {
      els.newRecordBanner.classList.remove('hidden');
      els.nameEntry.classList.remove('hidden');
      els.playerName.value = '';
      setTimeout(() => els.playerName.focus(), 50);
    } else {
      els.newRecordBanner.classList.add('hidden');
      els.nameEntry.classList.add('hidden');
    }

    els.hud.classList.add('hidden');
    els.mobileControls.classList.add('hidden');
    showScreen('gameover');
  }

  function refreshRankingScreen() {
    Ranking.renderRanking(els.rankingList, els.rankingEmpty);
  }

  async function handleSaveScore() {
    const name = els.playerName.value;
    if (!name.trim()) {
      els.playerName.focus();
      els.playerName.placeholder = 'DIGITE UM NOME VÁLIDO';
      return;
    }
    
    // Aguarda o salvamento assíncrono (Firebase + Local)
    const result = await Ranking.addScore(name, pendingScore);
    
    if (result.added) {
      AudioFX.playRankingEntry();
      
      // Oculta o banner de recorde e a caixinha de nome ao salvar com sucesso
      els.newRecordBanner.classList.add('hidden');
      els.nameEntry.classList.add('hidden');
      
      refreshMenuBestScore();
      // fluxo: após salvar, mostra o ranking já atualizado com o TOP 10
      refreshRankingScreen();
      showScreen('ranking');
      if (callbacks.onScoreSaved) callbacks.onScoreSaved();
    }
  }

  function bindEvents() {
    els.btnPlay.addEventListener('click', () => {
      AudioFX.playButton();
      hideAllScreensForGameplay();
      if (callbacks.onPlay) callbacks.onPlay();
    });

    els.btnRanking.addEventListener('click', () => {
      AudioFX.playButton();
      refreshRankingScreen();
      showScreen('ranking');
    });

    els.btnHowto.addEventListener('click', () => {
      AudioFX.playButton();
      showScreen('howto');
    });

    els.btnHowtoBack.addEventListener('click', () => {
      AudioFX.playButton();
      showScreen('menu');
    });

    els.btnRankingBack.addEventListener('click', () => {
      AudioFX.playButton();
      showScreen('menu');
    });

    els.btnRetry.addEventListener('click', () => {
      AudioFX.playButton();
      hideAllScreensForGameplay();
      if (callbacks.onPlay) callbacks.onPlay();
    });

    els.btnGameoverMenu.addEventListener('click', () => {
      AudioFX.playButton();
      refreshMenuBestScore();
      showScreen('menu');
    });

    els.btnSaveScore.addEventListener('click', handleSaveScore);
    els.playerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSaveScore();
    });

    els.btnMute.addEventListener('click', () => {
      AudioFX.toggleMuted();
      refreshMuteIcons();
    });
    els.btnMuteMenu.addEventListener('click', () => {
      AudioFX.toggleMuted();
      refreshMuteIcons();
      AudioFX.playButton();
    });

    // controles de toque (mobile)
    const bindTouch = (el, onDown, onUp) => {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
      if (onUp) {
        el.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });
        el.addEventListener('touchcancel', (e) => { e.preventDefault(); onUp(); }, { passive: false });
      }
      // fallback para testes em desktop com mouse
      el.addEventListener('mousedown', () => onDown());
      if (onUp) el.addEventListener('mouseup', () => onUp());
    };

    bindTouch(els.btnJumpTouch, () => callbacks.onJumpPress && callbacks.onJumpPress());
    bindTouch(
      els.btnDuckTouch,
      () => callbacks.onDuckPress && callbacks.onDuckPress(true),
      () => callbacks.onDuckPress && callbacks.onDuckPress(false)
    );
  }

  function init(userCallbacks) {
    callbacks = userCallbacks || {};
    cacheElements();
    bindEvents();
    refreshMenuBestScore();
    refreshMuteIcons();
    showScreen('menu');
  }

  return {
    init,
    showScreen,
    updateHUD,
    showGameOverScreen,
    refreshRankingScreen,
    refreshMenuBestScore,
    refreshMuteIcons,
    isTouchDevice
  };
})();