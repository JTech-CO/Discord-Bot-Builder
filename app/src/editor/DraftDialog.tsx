import { CircleAlert, CircleCheck, Loader2, TriangleAlert, Wand, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MAX_DESCRIPTION } from '../ai/draftSpec';
import { costUSD, formatUSD, modelInfo } from '../ai/models';
import { useDraft, type DraftMode } from '../store/draft';
import { useGeneration } from '../store/generation';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { Button, IconButton } from '../ui/controls';
import { t } from '../i18n/t';
import { tx } from '../i18n/tx';

const EXAMPLES = [
  '욕설이 들어간 메시지를 지우고, 보낸 사람에게 경고 DM을 보내는 봇',
  '/출석 명령어로 하루에 한 번 포인트 10점을 주고, /포인트로 내 점수를 보여 주는 봇',
  '새 멤버가 들어오면 #환영 채널에 인사하고 "새내기" 역할을 주는 봇',
];

// Catalog prompt (~4.4K tokens, cached after the first call) plus a typical draft.
const INPUT_TOKENS = 4_600;
const OUTPUT_LOW = 2_000;
const OUTPUT_HIGH = 8_000;

function Summary({ onClose }: { onClose: () => void }) {
  const summary = useDraft((s) => s.summary)!;
  return (
    <div className="mt-4 space-y-3 text-sm">
      <p className="flex items-center gap-2 text-fg">{tx('{0} 노드 {1}개로 초안을 캔버스에 놓았습니다.', [<CircleCheck size={16} className="text-success" aria-hidden />, summary.nodes])}</p>
      {summary.issues > 0 && (
        <p className="flex items-start gap-2 text-warning">{tx('{0}확인이 필요한 문제가 {1}개 있습니다. 문제 탭에서 하나씩 고쳐 주세요.', [<TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />, summary.issues])}</p>
      )}
      {summary.dropped.length > 0 && <p className="text-fg-muted">{t('빠진 부분: {0}', [summary.dropped.join(', ')])}</p>}
      {summary.notes && (
        <div>
          <p className="text-xs font-semibold text-fg-subtle">{t('AI 메모')}</p>
          <p className="mt-1 whitespace-pre-wrap text-fg">{summary.notes}</p>
        </div>
      )}
      <p className="text-xs text-fg-subtle tabular-nums">{t('{0} · 입력 {1} / 출력 {2} 토큰 · 약 {3} · 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.', [modelInfo(summary.model).label, summary.usage.input.toLocaleString(), summary.usage.output.toLocaleString(), formatUSD(costUSD(summary.model, summary.usage.input, summary.usage.output))])}</p>
      <div className="flex justify-end gap-2 pt-1">
        {summary.issues > 0 && (
          <Button onClick={() => { onClose(); useUI.getState().openBottom('problems'); }}>{t('문제 보기')}</Button>
        )}
        <Button variant="primary" onClick={onClose}>{t('닫기')}</Button>
      </div>
    </div>
  );
}

export function DraftDialog() {
  const open = useUI((s) => s.draftOpen);
  const setOpen = useUI((s) => s.setDraftOpen);
  const { status, error, summary, run, cancel, reset } = useDraft();
  const hasNodes = useProject((s) => s.nodes.length > 0);
  const model = useGeneration((s) => s.model);
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<DraftMode>('new');
  const running = status === 'running';

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      reset();
      setMode(useProject.getState().nodes.length > 0 ? 'append' : 'new');
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open, reset]);

  const close = () => {
    if (running) cancel();
    setOpen(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) void run(text.trim(), hasNodes ? mode : 'new');
  };

  const low = costUSD(model, INPUT_TOKENS, OUTPUT_LOW);
  const high = costUSD(model, INPUT_TOKENS, OUTPUT_HIGH);

  return (
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="draft-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-xl border border-line bg-panel p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="draft-title" className="text-base font-semibold">{t('설명으로 흐름 초안 만들기')}</h2>
          <IconButton icon={X} label={t('닫기')} onClick={close} className="-mt-1 -mr-2" />
        </div>
        <p className="mt-2 text-sm text-fg-muted">{t('만들고 싶은 봇을 설명하면 Claude가 노드 흐름 초안을 그립니다. 초안은 캔버스에서 직접 고칠 수 있습니다.')}</p>

        {summary ? (
          <Summary onClose={close} />
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <label htmlFor="draft-text" className="sr-only">{t('봇 설명')}</label>
            <textarea
              id="draft-text"
              rows={5}
              maxLength={MAX_DESCRIPTION}
              value={text}
              disabled={running}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('예: /주사위 를 치면 1~6 사이 숫자를 굴리고, 같은 사람은 5초에 한 번만 쓸 수 있게 해 줘')}
              className="w-full resize-y rounded-md border border-line bg-field px-3 py-2 text-sm leading-relaxed text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <div className="flex flex-wrap gap-1.5" aria-label={t('예시')}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={running}
                  onClick={() => setText(t(ex))}
                  className="rounded-full border border-line px-2.5 py-1 text-left text-xs text-fg-muted hover:border-line-strong hover:text-fg disabled:opacity-50"
                >
                  {t(ex)}
                </button>
              ))}
            </div>

            {hasNodes && (
              <fieldset className="space-y-1 text-sm">
                <legend className="sr-only">{t('초안을 놓을 곳')}</legend>
                {([['append', t('지금 캔버스 오른쪽에 추가')], ['new', t('새 프로젝트로 바꾸기 (지금 흐름은 실행 취소로만 되돌림)')]] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input type="radio" name="draft-mode" value={value} checked={mode === value} onChange={() => setMode(value)} disabled={running} className="accent-[var(--accent)]" />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}

            <p className="text-xs text-fg-subtle tabular-nums">{t('{0} · 예상 비용 {1} ~ {2} · 모델은 생성 탭에서 바꿀 수 있습니다.', [modelInfo(model).label, formatUSD(low), formatUSD(high)])}</p>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {running ? (
                <>
                  <span className="mr-auto flex items-center gap-2 text-sm text-fg-muted">{tx('{0} 초안을 그리는 중… (보통 30초~1분)', [<Loader2 size={15} className="animate-spin text-accent-fg" aria-hidden />])}</span>
                  <Button variant="danger" onClick={cancel}>{t('취소')}</Button>
                </>
              ) : (
                <>
                  <Button onClick={close}>{t('닫기')}</Button>
                  <Button type="submit" variant="primary" icon={Wand} disabled={!text.trim()}>{t('초안 만들기')}</Button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

export const openDraft = () => useUI.getState().setDraftOpen(true);
