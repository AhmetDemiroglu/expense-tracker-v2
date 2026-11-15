/* Dokunsal geri bildirim. Uygulamadaki TEK dokunsal modülü budur. Web'de sessizce boştur. */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "./platform";

const safe = (fn: () => Promise<void>) => () => {
  if (!isNative) return;
  fn().catch(() => {});
};

export const haptic = {
  light: safe(() => Haptics.impact({ style: ImpactStyle.Light })),
  medium: safe(() => Haptics.impact({ style: ImpactStyle.Medium })),
  selection: safe(() => Haptics.selectionChanged()),
  success: safe(() => Haptics.notification({ type: NotificationType.Success })),
  warning: safe(() => Haptics.notification({ type: NotificationType.Warning })),
  error: safe(() => Haptics.notification({ type: NotificationType.Error })),
};
