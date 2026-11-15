import { hataMesaji, hataMi } from "@/data";
import { toast } from "@/ui";

/** Kullanıcı pencereyi kapattı: sessiz geçilir. */
export function iptalMi(e: unknown): boolean {
  return hataMi(e) && e.kod === "IPTAL";
}

/** Hata toast'ı (iptal hariç). */
export function hataGoster(e: unknown): void {
  if (!iptalMi(e)) toast.error(hataMesaji(e));
}
