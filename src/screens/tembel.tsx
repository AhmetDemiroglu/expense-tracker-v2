/* Ekranı ilk açılışta yüklenen parçaya ayırır (ilk yük JS'i küçülür). Parça gelene kadar boş durur; ekran geçişi animasyonu
   sürerken yüklenir, çoğu zaman fark edilmez. */
import { lazy, Suspense, type ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tembel<C extends ComponentType<any>>(yukle: () => Promise<{ default: C }>): C {
  const Ic = lazy(yukle);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tembel = (props: any) => (
    <Suspense fallback={null}>
      <Ic {...props} />
    </Suspense>
  );
  return Tembel as unknown as C;
}
