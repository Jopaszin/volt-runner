/**
 * storage.js
 * Camada fina de abstração sobre o LocalStorage.
 * Nenhum outro módulo deve chamar window.localStorage diretamente —
 * todos passam por aqui, o que facilita trocar a persistência no futuro
 * (ex: substituir por uma API remota).
 */
const Storage = (() => {
  const PREFIX = 'voltrunner:';

  function isAvailable() {
    try {
      const testKey = `${PREFIX}__test__`;
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  const available = isAvailable();

  function get(key, fallback = null) {
    if (!available) return fallback;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Storage.get falhou para a chave', key, e);
      return fallback;
    }
  }

  function set(key, value) {
    if (!available) return false;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage.set falhou para a chave', key, e);
      return false;
    }
  }

  function remove(key) {
    if (!available) return;
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch (e) {
      console.warn('Storage.remove falhou para a chave', key, e);
    }
  }

  return { get, set, remove, available };
})();
