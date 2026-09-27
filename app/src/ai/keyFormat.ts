/** Shape of an Anthropic API key. Shared by the renderer and the Electron main process. */
export const KEY_PATTERN = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export const maskKey = (key: string) => `${key.slice(0, 7)}…${key.slice(-4)}`;
