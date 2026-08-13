/**
 * ranking.js
 * Sistema de ranking TOP 10, isolado do resto do jogo.
 *
 * Hoje persiste via LocalStorage (através de storage.js).
 * No futuro, basta substituir a implementação interna destas funções
 * por chamadas a uma API (ex: rankingAPI.addScore(name, score)) sem
 * precisar alterar quem consome o módulo Ranking.
 */
const Ranking = (() => {
  const KEY = 'ranking';
  const MAX_ENTRIES = 10;
  const NAME_MAX_LENGTH = 15;

  /** Carrega o ranking completo (já ordenado e limitado a 10). */
  function loadRanking() {
    const data = Storage.get(KEY, []);
    return Array.isArray(data) ? data : [];
  }

  /** Salva a lista de ranking fornecida. */
  function saveRanking(list) {
    Storage.set(KEY, list);
  }

  /** Ordena da maior para a menor pontuação. */
  function sortRanking(list) {
    return [...list].sort((a, b) => b.score - a.score);
  }

  /** Retorna apenas os 10 melhores de uma lista. */
  function getTop10() {
    return sortRanking(loadRanking()).slice(0, MAX_ENTRIES);
  }

  /** Verifica se uma pontuação seria suficiente para entrar no TOP 10. */
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

  /**
   * Adiciona uma nova pontuação ao ranking, respeitando o TOP 10.
   * Retorna { added: boolean, top10: Array }
   */
  function addScore(name, score) {
    const cleanName = sanitizeName(name);
    if (!cleanName) return { added: false, top10: getTop10() };

    const entry = {
      name: cleanName,
      score: Math.max(0, Math.floor(score)),
      date: new Date().toISOString().slice(0, 10)
    };

    let list = loadRanking();
    list.push(entry);
    list = sortRanking(list).slice(0, MAX_ENTRIES);
    saveRanking(list);

    return { added: true, top10: list };
  }

  /**
   * Renderiza o ranking em um elemento <ol>/<ul> do DOM.
   * emptyEl é opcional: exibido quando não há pontuações.
   */
  function renderRanking(listEl, emptyEl) {
    const top10 = getTop10();
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

  /** Melhor pontuação já registrada (0 se ranking vazio). */
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
