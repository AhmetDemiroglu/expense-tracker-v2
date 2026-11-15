import type { ScreenKayit } from "@/shell";
import { sheets } from "@/shell";
import { KayitEkleSayfasi } from "./KayitEkleSayfasi";
import { KayitSilSayfasi } from "./KayitSilSayfasi";

export const kayit: ScreenKayit = {
  sheets: { "kayit-ekle": KayitEkleSayfasi, "kayit-sil": KayitSilSayfasi },
  onAdd: () => sheets.open("kayit-ekle"),
};
