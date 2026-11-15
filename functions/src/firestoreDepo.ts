// deleteAccount için Firestore ve Auth uygulaması (Admin SDK, kuralları atlar).
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { AccountStore, UserCollection } from "./silme";

const PAGE = 400;

export class AdminAccountStore implements AccountStore {
  constructor(
    private readonly db: Firestore,
    private readonly auth: Auth,
  ) {}

  async deleteWhereUser(collection: UserCollection, uid: string): Promise<number> {
    let total = 0;
    // Sayfa sayfa sil: büyük kullanıcıda bellek ve yazma sınırına takılmaz.
    for (;;) {
      const snap = await this.db.collection(collection).where("userId", "==", uid).limit(PAGE).get();
      if (snap.empty) return total;
      const batch = this.db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      total += snap.size;
      if (snap.size < PAGE) return total;
    }
  }

  async deleteDoc(collection: string, id: string): Promise<number> {
    const ref = this.db.collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return 0;
    await ref.delete();
    return 1;
  }

  async deleteAuthUser(uid: string): Promise<void> {
    try {
      await this.auth.deleteUser(uid);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/user-not-found") return;
      throw e;
    }
  }
}
