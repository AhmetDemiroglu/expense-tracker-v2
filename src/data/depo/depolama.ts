// localStorage soyutlaması: testlerde bellek içi sahtesi kullanılır (Node'da DOM yok).

export interface AnahtarDeger {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export function bellekDeposu(baslangic: Record<string, string> = {}): AnahtarDeger {
  const m = new Map<string, string>(Object.entries(baslangic));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
    keys: () => [...m.keys()],
  };
}

let varsayilan: AnahtarDeger | null = null;

/** Tarayıcının localStorage'ı. Yoksa (Node, gizli kip hatası) bellek deposu. */
export function cihazDeposu(): AnahtarDeger {
  if (varsayilan) return varsayilan;
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      varsayilan = {
        getItem: (k) => ls.getItem(k),
        setItem: (k, v) => ls.setItem(k, v),
        removeItem: (k) => ls.removeItem(k),
        keys: () => {
          const out: string[] = [];
          for (let i = 0; i < ls.length; i += 1) {
            const k = ls.key(i);
            if (k !== null) out.push(k);
          }
          return out;
        },
      };
      return varsayilan;
    }
  } catch {
    // erişim engelli: bellek deposuna düş
  }
  varsayilan = bellekDeposu();
  return varsayilan;
}

/** Yalnız testler için. */
export function cihazDeposunuAyarla(d: AnahtarDeger | null): void {
  varsayilan = d;
}

export function jsonOku(d: AnahtarDeger, key: string): unknown {
  const raw = d.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
