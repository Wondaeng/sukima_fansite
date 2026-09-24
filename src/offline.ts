import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

type OfflineState = { online: boolean; saved: boolean; update: boolean; failed: boolean };
let state: OfflineState = { online: navigator.onLine, saved: false, update: false, failed: false };
const listeners = new Set<() => void>();
function patch(next: Partial<OfflineState>) {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useOffline() {
  return useSyncExternalStore(subscribe, () => state);
}
let applyUpdate: (() => Promise<void>) | undefined;
export function updateOfflineContent() { return applyUpdate?.(); }

export function startOfflineCache() {
  window.addEventListener("online", () => patch({ online: true }));
  window.addEventListener("offline", () => patch({ online: false }));
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onOfflineReady: () => patch({ saved: true, failed: false }),
    onNeedRefresh: () => patch({ update: true }),
    onRegisterError: () => patch({ failed: true }),
    onRegisteredSW: (_url, registration) => {
      if (registration?.active) patch({ saved: true });
      window.addEventListener("online", () => { void registration?.update().catch(() => {}); });
    },
  });
  applyUpdate = () => updateSW(true);
}
