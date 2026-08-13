/**
 * js/ui.js - Gerenciador da Interface de Usuário
 */
const UI = (() => {
  let els = {};
  let callbacks = {};
  let pendingScore = 0;

  function init(options = {}) {
    callbacks = options;
    cacheElements();
    bindEvents();
    refreshMenuBestScore();
  }

  function cacheElements() {
    els = {
      // Telas
      hud: document.getElementById('hud'),
      screenMenu: document.getElementById('screen-menu'),
      screenControls: document.getElementById('screen-controls'),
      screenPause: document.getElementById('screen-pause'),
      screenGameover: document.getElementById('screen-gameover'),
      screenRanking: document.getElementById('screen-ranking'),

      // Botões Menu Principal
      btnStart: document.getElementById('btn-start'),
      btnRanking: document.getElementById('btn-ranking'),
      btnControls: document.getElementById('btn-controls'),

      // Botões Controles
      btnBackControls: document.getElementById('btn-back-controls'),

      // Botões Pausa
      btnResume: document.getElementById('btn-resume'),
      btnRestartPause: document.getElementById('btn-restart-pause'),
      btnQuitPause: document.getElementById('btn-quit-pause'),

      // Botões Game Over
      btnRestart: document.getElementById('btn-restart'),
      btnMenuGameover: document.getElementById('btn-menu-gameover'),
      btnSaveScore: document.getElementById('btn-save-score'),

      // Botões Ranking
      btnBackRanking: document.getElementById('btn-back-ranking'),

      // Elementos de Entrada e Exibição
      playerNameInput: document.getElementById('player-name-input'),
      nameEntryContainer: document.getElementById('name-entry-container'),
      
      // Displays do HUD e Game Over
      scoreDisplay: document.getElementById('score-display'),
      energyBarFill: document.getElementById('energy-bar-fill'),
      multiplierDisplay: document.getElementById('multiplier-display'),
      finalScore: document.getElementById('final-score'),
      finalDistance: document.getElementById('final-distance'),
      finalOrbs: document.getElementById('final-orbs'),
      menuBestScoreVal: document.getElementById('menu-best-score-val'),
      rankingList: document.getElementById('ranking-list'),
      rankingEmpty: document.getElementById('ranking-empty')
    };
  }

  function bindEvents() {
    if (els.btnStart) els.btnStart.addEventListener('click', () => { AudioFX.playSelect(); if (callbacks.onStart) callbacks.onStart(); });
    if (els.btnRanking) els.btnRanking.addEventListener('click', () => { AudioFX.playSelect(); showRankingScreen(); });
    if (els.btnControls) els.btnControls.addEventListener('click', () => { AudioFX.playSelect(); showScreen('controls'); });

    if (els.btnBackControls) els.btnBackControls.addEventListener('click', () => { AudioFX.playSelect(); showScreen('menu'); });

    if (els.btnResume) els.btnResume.addEventListener('click', () => { AudioFX.playSelect(); if (callbacks.onResume) callbacks.onResume(); });
    if (els.btnRestartPause) els.btnRestartPause.addEventListener('click', () => { AudioFX.playSelect(); if (callbacks.onRestart) callbacks.onRestart(); });
    if (els.btnQuitPause) els.btnQuitPause.addEventListener('click', () => { AudioFX.playSelect(); if (callbacks.onQuit) callbacks.onQuit(); });

    if (els.btnRestart) els.btnRestart.addEventListener('click', () => { AudioFX.playSelect(); if (callbacks.onRestart) callbacks.onRestart(); });
    if (els.btnMenuGameover) els.btnMenuGameover.addEventListener('click', () => { AudioFX.playSelect(); if (callbacks.onQuit) callbacks.onQuit(); });

    if (els.btnSaveScore) els.btnSaveScore.addEventListener('click', handleSaveScore);
    if (els.playerNameInput) {
      els.playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSaveScore();
      });
    }

    if (els.btnBackRanking) els.btnBackRanking.addEventListener('click', () => { AudioFX.playSelect(); showScreen('menu'); });
  }

  /**
   * Salva a pontuação enviando para o Firebase na nuvem
   */
  async function handleSaveScore() {
    const name = els.playerNameInput ? els.playerNameInput.value : '';
    if (!name.trim()) {
      if (els.playerNameInput) {
        els.playerNameInput.focus();
        els.playerNameInput.placeholder = 'DIGITE UM NOME VÁLIDO';
      }
      return;
    }

    if (els.btnSaveScore) els.btnSaveScore.disabled = true;

    // Envia assincronamente para o Firebase via Ranking.addScore
    const result = await Ranking.addScore(name, pendingScore);

    if (els.btnSaveScore) els.btnSaveScore.disabled = false;

    if (result.added) {
      AudioFX.playRankingEntry();
      if (els.nameEntryContainer) els.nameEntryContainer.classList.add('hidden');
      refreshMenuBestScore();
      showRankingScreen();
      if (callbacks.onScoreSaved) callbacks.onScoreSaved();
    }
  }

  function showScreen(screenName) {
    const screens = [els.screenMenu, els.screenControls, els.screenPause, els.screenGameover, els.screenRanking];
    screens.forEach(s => { if (s) s.classList.add('hidden'); });

    if (screenName === 'menu' && els.screenMenu) els.screenMenu.classList.remove('hidden');
    if (screenName === 'controls' && els.screenControls) els.screenControls.classList.remove('hidden');
    if (screenName === 'pause' && els.screenPause) els.screenPause.classList.remove('hidden');
    if (screenName === 'gameover' && els.screenGameover) els.screenGameover.classList.remove('hidden');
    if (screenName === 'ranking' && els.screenRanking) els.screenRanking.classList.remove('hidden');
  }

  function setHUDVisible(visible) {
    if (!els.hud) return;
    if (visible) {
      els.hud.classList.remove('hidden');
    } else {
      els.hud.classList.add('hidden');
    }
  }

  function updateHUD(score, energyPercent, multiplier) {
    if (els.scoreDisplay) els.scoreDisplay.textContent = String(Math.floor(score)).padStart(6, '0');
    if (els.energyBarFill) els.energyBarFill.style.width = `${Math.max(0, Math.min(100, energyPercent))}%`;
    if (els.multiplierDisplay) els.multiplierDisplay.textContent = `x${multiplier.toFixed(1)}`;
  }

  function showGameOver(score, distance, orbs) {
    pendingScore = score;

    if (els.finalScore) els.finalScore.textContent = Ranking.formatScore(score);
    if (els.finalDistance) els.finalDistance.textContent = `${Math.floor(distance)}m`;
    if (els.finalOrbs) els.finalOrbs.textContent = orbs;

    if (Ranking.isTop10(score)) {
      if (els.nameEntryContainer) els.nameEntryContainer.classList.remove('hidden');
      if (els.playerNameInput) {
        els.playerNameInput.value = '';
        els.playerNameInput.focus();
      }
    } else {
      if (els.nameEntryContainer) els.nameEntryContainer.classList.add('hidden');
    }

    setHUDVisible(false);
    showScreen('gameover');
  }

  async function showRankingScreen() {
    showScreen('ranking');
    if (els.rankingList) {
      await Ranking.renderRanking(els.rankingList, els.rankingEmpty);
    }
  }

  function refreshMenuBestScore() {
    if (els.menuBestScoreVal) {
      els.menuBestScoreVal.textContent = Ranking.formatScore(Ranking.getBestScore());
    }
  }

  return {
    init,
    showScreen,
    setHUDVisible,
    updateHUD,
    showGameOver,
    showRankingScreen,
    refreshMenuBestScore
  };
})();