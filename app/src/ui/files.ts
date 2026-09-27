/** A file name built from user text, without characters Windows or macOS reject. */
export const safeFileName = (name: string) => (name.trim() || 'bot').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 80);

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const downloadText = (filename: string, text: string, type = 'text/plain') =>
  downloadBlob(filename, new Blob([text], { type: `${type};charset=utf-8` }));
