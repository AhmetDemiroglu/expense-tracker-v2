/* Ekran kaydı tipleri. Her ekran klasörü src/screens/<klasör>/kayit.tsx içinde `export const kayit: ScreenKayit` verir. */
import type { ComponentType, ReactNode } from "react";
import type { TabKey } from "./router/stack";

/** Kök sekme içeriği. active: sekme önde ve üstünde ekran yok. */
export interface TabProps {
  active: boolean;
}
/** Üstüne binen ekran. */
export interface ScreenProps {
  params: Record<string, unknown>;
  active: boolean;
}
/** Ortak alt sayfa. İçinde <Sheet open={open} onClose={close}> kullanılır. */
export interface SheetScreenProps {
  open: boolean;
  close: () => void;
  params: Record<string, unknown>;
}

export interface ScreenKayit {
  tabs?: Partial<Record<TabKey, ComponentType<TabProps>>>;
  screens?: Record<string, ComponentType<ScreenProps>>;
  sheets?: Record<string, ComponentType<SheetScreenProps>>;
  /** Bakır ekle düğmesi (P6). */
  onAdd?: () => void;
  /** Üst bardaki profil düğmesi (P8). */
  onProfile?: () => void;
  /** Kabuğu saran kapı: giriş, karşılama, ilk kurulum (P8). */
  gate?: ComponentType<{ children: ReactNode }>;
  /** Açılış bunu bekler (en çok 2,5 sn). Veri açılışı için (P8 / P4). */
  ready?: () => Promise<void>;
}

export interface Registry {
  tabs: Partial<Record<TabKey, ComponentType<TabProps>>>;
  screens: Record<string, ComponentType<ScreenProps>>;
  sheets: Record<string, ComponentType<SheetScreenProps>>;
  onAdd?: () => void;
  onProfile?: () => void;
  gates: ComponentType<{ children: ReactNode }>[];
  ready: (() => Promise<void>)[];
}

/** Kayıtları tek kayıt defterinde birleştirir. Aynı ad iki kez verilirse geliştirmede uyarır, ilki kalır. */
export function buildRegistry(list: readonly ScreenKayit[], warn: (msg: string) => void = () => {}): Registry {
  const reg: Registry = { tabs: {}, screens: {}, sheets: {}, gates: [], ready: [] };
  for (const k of list) {
    for (const [key, comp] of Object.entries(k.tabs ?? {})) {
      const tab = key as TabKey;
      if (reg.tabs[tab]) warn(`Sekme iki kez kaydedildi: ${tab}`);
      else if (comp) reg.tabs[tab] = comp;
    }
    for (const [name, comp] of Object.entries(k.screens ?? {})) {
      if (reg.screens[name]) warn(`Ekran adı iki kez kaydedildi: ${name}`);
      else reg.screens[name] = comp;
    }
    for (const [name, comp] of Object.entries(k.sheets ?? {})) {
      if (reg.sheets[name]) warn(`Alt sayfa adı iki kez kaydedildi: ${name}`);
      else reg.sheets[name] = comp;
    }
    if (k.onAdd) {
      if (reg.onAdd) warn("onAdd iki kez kaydedildi");
      else reg.onAdd = k.onAdd;
    }
    if (k.onProfile) {
      if (reg.onProfile) warn("onProfile iki kez kaydedildi");
      else reg.onProfile = k.onProfile;
    }
    if (k.gate) reg.gates.push(k.gate);
    if (k.ready) reg.ready.push(k.ready);
  }
  return reg;
}
