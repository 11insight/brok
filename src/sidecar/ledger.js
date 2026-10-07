export function createLedger(seed) {
  let rows = seed.map((row) => ({ ...row }));
  const listeners = new Set();

  function emit() {
    const snapshot = rows.map((row) => ({ ...row }));
    listeners.forEach((fn) => fn(snapshot));
  }

  return {
    list() {
      return rows.map((row) => ({ ...row }));
    },
    add(row) {
      if (row.id && rows.some((item) => item.id === row.id)) return false;
      rows = [{ ...row, at: new Date().toISOString() }, ...rows];
      emit();
      return true;
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
