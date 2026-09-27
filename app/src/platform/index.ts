import type { DesktopAPI } from './api';

/** Present only inside the Electron app (exposed by the preload script). */
export const desktop: DesktopAPI | null = (globalThis as { dbb?: DesktopAPI }).dbb ?? null;
