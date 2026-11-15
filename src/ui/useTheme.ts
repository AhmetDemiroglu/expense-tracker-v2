import { useCallback, useSyncExternalStore } from "react";
import { currentTheme, readThemePref, setThemePref, subscribeTheme, type ResolvedTheme, type ThemePref } from "../theme";

export type { ThemePref, ResolvedTheme };

const snapshot = () => `${readThemePref()}|${currentTheme()}`;

/** Tema tercihi ve uygulanmış tema. setPref kalıcıdır, çubuk renkleri de değişir. */
export function useTheme(): { pref: ThemePref; resolved: ResolvedTheme; setPref: (p: ThemePref) => void } {
  const snap = useSyncExternalStore(subscribeTheme, snapshot, () => "system|light");
  const [pref, resolved] = snap.split("|") as [ThemePref, ResolvedTheme];
  const setPref = useCallback((p: ThemePref) => {
    setThemePref(p);
  }, []);
  return { pref, resolved, setPref };
}
