import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { KEY_PATTERN, useApiKey } from '../ai/key';
import { desktop } from '../platform';
import { useUI } from '../store/ui';
import { Button, IconButton, cx } from '../ui/controls';

export function KeyDialog() {
  const open = useUI((s) => s.keyDialogOpen);
  const setOpen = useUI((s) => s.setKeyDialogOpen);
  const { label, remembered, setKey, clear } = useApiKey();
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(remembered);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setValue('');
      setTouched(false);
      setError(null);
      setRemember(useApiKey.getState().remembered);
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const trimmed = value.trim();
  const valid = KEY_PATTERN.test(trimmed);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setKey(trimmed, remember).then(
      () => setOpen(false),
      (err: unknown) => setError(err instanceof Error ? err.message : '키를 저장하지 못했습니다.'),
    );
  };

  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      aria-labelledby="key-title"
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-xl border border-line bg-panel p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="key-title" className="text-base font-semibold">Anthropic API 키</h2>
          <IconButton icon={X} label="닫기" onClick={() => setOpen(false)} className="-mt-1 -mr-2" />
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          봇 코드를 만들 때 이 키로 Claude를 호출합니다. 키는 <code className="font-mono text-xs">api.anthropic.com</code>으로만
          전송되고, 요금은 키 소유자의 계정에 청구됩니다.
          {desktop && ' 데스크톱 앱에서는 키를 운영체제의 암호화 저장소에 보관하며, 화면 쪽 코드는 키를 다시 읽을 수 없습니다.'}
        </p>

        {label && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
            <span>
              현재 키 <code className="font-mono text-xs text-fg-muted">{label}</code>
              <span className="ml-2 text-xs text-fg-subtle">{desktop ? '암호화되어 저장됨' : remembered ? '이 브라우저에 저장됨' : '이 탭에서만 사용'}</span>
            </span>
            <Button size="sm" variant="danger" onClick={() => void clear()}>삭제</Button>
          </div>
        )}

        <label htmlFor="api-key" className="mt-4 mb-1 block text-sm">{label ? '새 키로 바꾸기' : 'API 키'}</label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="sk-ant-…"
          aria-invalid={touched && !!trimmed && !valid}
          aria-describedby="api-key-help"
          className={cx(
            'h-9 w-full rounded-md border bg-field px-2.5 font-mono text-sm text-fg focus:border-accent focus:outline-none',
            touched && trimmed && !valid ? 'border-danger' : 'border-line',
          )}
        />
        <p id="api-key-help" className={cx('mt-1 text-xs', touched && trimmed && !valid ? 'text-danger' : 'text-fg-subtle')}>
          {touched && trimmed && !valid ? 'sk-ant- 로 시작하는 Anthropic API 키가 아닙니다.' : (
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-fg underline underline-offset-2">
              Anthropic 콘솔에서 키 만들기 <ExternalLink size={12} aria-hidden />
            </a>
          )}
        </p>

        {!desktop && (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
            <span>
              이 브라우저에 저장
              <span className="block text-xs text-fg-subtle">끄면 이 탭을 닫을 때 키를 잊습니다. 여러 사람이 쓰는 컴퓨터에서는 켜지 마세요.</span>
            </span>
          </label>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button type="submit" variant="primary" disabled={!trimmed}>저장</Button>
        </div>
      </form>
    </dialog>
  );
}
