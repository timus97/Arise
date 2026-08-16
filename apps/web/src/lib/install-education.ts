export const INSTALL_TITLE = "Add to Home Screen";
export const INSTALL_LEDE =
  "Install Arise on this phone so the SYSTEM window is one tap away.";
export const INSTALL_IOS = "iPhone or iPad — tap Share, then Add to Home Screen.";
export const INSTALL_ANDROID = "Android — open the browser menu, then Add to Home Screen.";
export const INSTALL_SETTINGS_ONELINER =
  "Add to Home Screen: Share on iPhone, or the browser menu on Android.";

export const INSTALL_SEEN_KEY = "arise.installEducation.seen";
export const INSTALL_MOBILE_QUERY = "(max-width: 767px)";

export type InstallEnv = {
  standalone: boolean;
  mobile: boolean;
  seen: boolean;
};

export function shouldShowInstallEducation(
  env: InstallEnv & { firstVisitOnly?: boolean },
): boolean {
  if (!env.mobile || env.standalone) return false;
  if (env.firstVisitOnly && env.seen) return false;
  return true;
}

export function isStandaloneDisplay(
  win: Pick<Window, "matchMedia" | "navigator"> | null = browserWindow(),
): boolean {
  if (!win) return false;
  if (win.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function isMobileViewport(
  win: Pick<Window, "matchMedia" | "navigator"> | null = browserWindow(),
): boolean {
  if (!win) return false;
  if (win.matchMedia(INSTALL_MOBILE_QUERY).matches) return true;
  return /Android|iPhone|iPad|iPod/i.test(win.navigator.userAgent);
}

export function readInstallSeen(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): boolean {
  try {
    return storage?.getItem(INSTALL_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInstallEducationSeen(
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  try {
    storage?.setItem(INSTALL_SEEN_KEY, "1");
  } catch {
    // private mode / blocked storage
  }
}

export function readInstallEnv(
  win: Pick<Window, "matchMedia" | "navigator"> | null = browserWindow(),
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): InstallEnv {
  return {
    standalone: isStandaloneDisplay(win),
    mobile: isMobileViewport(win),
    seen: readInstallSeen(storage),
  };
}

function browserWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
