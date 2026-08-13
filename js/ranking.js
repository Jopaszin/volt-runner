/**
 * js/ranking.js - Gerenciador de Ranking Global com Firebase Firestore
 */
const Ranking = (() => {
  // Credenciais do seu projeto VoltRunner no Firebase
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

  // Inicializa o Firebase e o banco Firestore
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;
  const COLLECTION_NAME = 'scores';
  const MAX_ENTRIES = 10;
  const NAME_MAX_LENGTH = 15;

  let localCacheTop10 = [];

  /**
   * Busca as 10 maiores pontuações diretamente na nuvem (Firestore)
   */
  async function fetchTop10FromCloud() {
    if (!db) {
      console.warn("Firebase não inicializado.");
      return localCacheTop10;
    }

    try {
      const snapshot = await db.collection(COLLECTION_NAME)
        .orderBy('score', 'desc')
        .limit(MAX_ENTRIES)
        .get();

      const list = [];
      snapshot.forEach(doc => {
        list.push(doc.data());
      });

      localCacheTop10 = list;
      return list;
    } catch (error) {
      console.error("Erro ao buscar ranking global do Firebase:", error);
      return localCacheTop10;
    }
  }

  /**
   * Sanitiza e limita o tamanho do nome do jogador
   */
  function sanitizeName(rawName) {
    let name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (name.length > NAME_MAX_LENGTH) {
      name = name.slice(0, NAME_MAX_LENGTH);
    }
    return name;
  }

  /**
   * Adiciona uma nova pontuação ao Firestore
   */
  async function addScore(name, score) {
    const cleanName = sanitizeName(name);
    if (!cleanName) return { added: false };

    const entry = {
      name: cleanName,
      score: Math.max(0, Math.floor(score)),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!db) return { added: false };

    try {
      await db.collection(COLLECTION_NAME).add(entry);
      // Atualiza o cache local de pontuações após salvar
      await fetchTop10FromCloud();
      return { added: true, top10: localCacheTop10 };
    } catch (error) {
      console.error("Erro ao salvar pontuação no Firestore:", error);
      return { added: false };
    }
  }

  /**
   * Verifica se uma determinada pontuação qualifica para o TOP 10
   */
  function isTop10(score) {
    if (localCacheTop10.length < MAX_ENTRIES) return score > 0;
    return score > localCacheTop10[localCacheTop10.length - 1].score;
  }

  /**
   * Renderiza a lista de classificação no elemento HTML
   */
  async function renderRanking(listEl, emptyEl) {
    if (!listEl) return;

    listEl.innerHTML = '<li style="text-align:center; padding:10px;">CARREGANDO...</li>';

    const top10 = await fetchTop10FromCloud();
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
    return localCacheTop10.length ? localCacheTop10[0].score : 0;
  }

  // Carrega a primeira busca ao iniciar
  fetchTop10FromCloud();

  return {
    addScore,
    isTop10,
    renderRanking,
    getBestScore,
    formatScore
  };
})();