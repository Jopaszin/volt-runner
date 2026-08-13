/**
 * ranking.js
 * Ranking TOP 10 sincronizado com o Realtime Database do Firebase (Com UID único por jogador e reset automático).
 */
const Ranking = (() => {
  const KEY = 'ranking';
  const MAX_ENTRIES = 10;
  const NAME_MAX_LENGTH = 15;

  const firebaseConfig = {
    apiKey: "AIzaSyAQ_kLKPRwkBHYzC8nQjcqbpeR2HTU-BmA",
    authDomain: "voltrunner.firebaseapp.com",
    databaseURL: "https://voltrunner-default-rtdb.firebaseio.com",
    projectId: "voltrunner",
    storageBucket: "voltrunner.firebasestorage.app",
    messagingSenderId: "579510817053",
    appId: "1:579510817053:web:afe53385369d06b5f4d1f4",
    measurementId: "G-QSVCML07LH"
  };

  let db = null;
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
  }

  function loadRanking() {
    const data = Storage.get(KEY, []);
    return Array.isArray(data) ? data : [];
  }

  function saveRanking(list) {
    Storage.set(KEY, list);
  }

  function sortRanking(list) {
    return [...list].sort((a, b) => b.score - a.score);
  }

  function getTop10() {
    return sortRanking(loadRanking()).slice(0, MAX_ENTRIES);
  }

  async function fetchGlobalTop10() {
    if (!db) return getTop10();

    try {
      const snapshot = await db.ref('ranking').once('value');
      const data = snapshot.val();

      if (data) {
        const globalList = Object.values(data);
        const sortedGlobal = sortRanking(globalList).slice(0, MAX_ENTRIES);
        saveRanking(sortedGlobal); // Salva no cache local
        return sortedGlobal;
      } else {
        // RESET: Se o Firebase estiver vazio, limpa o cache local também
        saveRanking([]);
        return [];
      }
    } catch (err) {
      console.error("Erro ao carregar o ranking global:", err);
    }

    return getTop10();
  }

  function isTop10(score) {
    const top = getTop10();
    if (top.length < MAX_ENTRIES) return score > 0;
    return score > top[top.length - 1].score;
  }

  function sanitizeName(rawName) {
    let name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (name.length > NAME_MAX_LENGTH) name = name.slice(0, NAME_MAX_LENGTH);
    return name;
  }

  async function addScore(name, score) {
    const cleanName = sanitizeName(name);
    if (!cleanName) return { added: false, top10: getTop10() };

    const finalScore = Math.max(0, Math.floor(score));
    const uid = window.playerUid; // Pega o ID gerado pelo login anônimo

    const entry = {
      name: cleanName,
      score: finalScore,
      date: new Date().toISOString().slice(0, 10)
    };

    // 1. Salva localmente (resposta imediata para a UI do jogo)
    let list = loadRanking();
    list.push(entry);
    list = sortRanking(list).slice(0, MAX_ENTRIES);
    saveRanking(list);

    // 2. Envia para a nuvem usando o UID como chave (evita duplicadas do mesmo jogador)
    if (db) {
      const userRef = db.ref('ranking/' + (uid ? uid : 'guest_' + Date.now()));
      
      try {
        const snapshot = await userRef.once('value');
        const dadosAntigos = snapshot.val();

        if (dadosAntigos) {
          // Se o usuário já existe no banco, só atualiza se a pontuação nova for maior
          if (finalScore > dadosAntigos.score) {
            await userRef.set({
              name: cleanName,
              score: finalScore,
              createdAt: dadosAntigos.createdAt || Date.now()
            });
          }
        } else {
          // Primeira vez que o jogador entra no ranking global
          await userRef.set({
            name: cleanName,
            score: finalScore,
            createdAt: Date.now()
          });
        }
      } catch (err) {
        console.error("Erro ao salvar no banco:", err);
      }
    }

    return { added: true, top10: list };
  }

  async function renderRanking(listEl, emptyEl) {
    if (!listEl) return;

    listEl.innerHTML = '<li style="text-align:center; padding:10px;">Carregando...</li>';

    const top10 = await fetchGlobalTop10();
    listEl.innerHTML = '';

    if (top10.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    top10.forEach((entry, index) => {
      const li = document.createElement('li');
      if (index === 0) li.classList.add('rank-first');
      li.innerHTML = `
        <span class="rank-pos">#${index + 1}</span>
        <span class="rank-name">${escapeHtml(entry.name)}</span>
        <span class="rank-score">${formatScore(entry.score)}</span>
      `;
      listEl.appendChild(li);
    });
  }

  function formatScore(score) {
    return Math.floor(score).toLocaleString('pt-BR');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getBestScore() {
    const top10 = getTop10();
    return top10.length ? top10[0].score : 0;
  }

  return {
    loadRanking,
    saveRanking,
    addScore,
    sortRanking,
    getTop10,
    isTop10,
    renderRanking,
    getBestScore,
    formatScore
  };
})();