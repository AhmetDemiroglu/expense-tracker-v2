// FirestorePort'un gerçek uygulaması (Firebase JS SDK). Testlerde kullanılmaz.

import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { FirestorePort, YazimIslemi } from "./firestoreRepo";

export function sdkPortu(db: Firestore): FirestorePort {
  return {
    koleksiyonuDinle(koleksiyon, userId, cb, hata) {
      const q = query(collection(db, koleksiyon), where("userId", "==", userId));
      return onSnapshot(
        q,
        { includeMetadataChanges: true },
        (s) =>
          cb({
            docs: s.docs.map((d) => ({ id: d.id, veri: d.data() })),
            fromCache: s.metadata.fromCache,
            hasPendingWrites: s.metadata.hasPendingWrites,
          }),
        hata,
      );
    },
    dokumaniDinle(koleksiyon, id, cb, hata) {
      return onSnapshot(
        doc(db, koleksiyon, id),
        { includeMetadataChanges: true },
        (s) =>
          cb({
            exists: s.exists(),
            veri: s.exists() ? s.data() : undefined,
            fromCache: s.metadata.fromCache,
            hasPendingWrites: s.metadata.hasPendingWrites,
          }),
        hata,
      );
    },
    async toplu(islemler: readonly YazimIslemi[]) {
      const b = writeBatch(db);
      for (const i of islemler) {
        const ref = doc(db, i.koleksiyon, i.id);
        if (i.tur === "sil") {
          b.delete(ref);
        } else if (i.birlestir) {
          const veri: Record<string, unknown> = { ...i.veri };
          for (const k of i.silinecek ?? []) veri[k] = deleteField();
          b.set(ref, veri, { merge: true });
        } else {
          b.set(ref, i.veri);
        }
      }
      await b.commit();
    },
  };
}
