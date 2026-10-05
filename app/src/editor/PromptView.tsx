import { Check, CircleAlert, Copy, Download } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { compilePrompt, estimateTokens, type CompiledPrompt, type PromptMode } from '../compiler/compile';
import { PERMISSION_LABEL } from '../compiler/discord';
import { nodeNumber } from '../flow/model';
import { useIssues } from '../store/issues';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { Button, cx } from '../ui/controls';
import { downloadText, safeFileName } from '../ui/files';
import { t } from '../i18n/t';
import { tx } from '../i18n/tx';

const MODES: { id: PromptMode; label: string; hint: string }[] = [
  { id: 'agent', label: '코딩 에이전트', hint: 'Claude Code, Cursor처럼 파일을 직접 만드는 AI에 붙여 넣으세요. 빌드 확인까지 지시합니다.' },
  { id: 'chat', label: '채팅 AI', hint: 'ChatGPT, Claude 웹처럼 답변으로 코드를 주는 AI에 붙여 넣으세요. 파일별 코드 블록으로 받습니다.' },
];

function ModeSwitch({ mode, onChange }: { mode: PromptMode; onChange: (m: PromptMode) => void }) {
  return (
    <div role="radiogroup" aria-label={t('붙여 넣을 AI')} className="inline-flex rounded-md border border-line bg-field p-0.5">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={mode === m.id}
          title={t(m.hint)}
          onClick={() => onChange(m.id)}
          className={cx(
            'h-7 rounded px-2.5 text-[13px] transition-colors duration-100',
            mode === m.id ? 'bg-raised text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
          )}
        >
          {t(m.label)}
        </button>
      ))}
    </div>
  );
}

function Requirements({ compiled }: { compiled: CompiledPrompt }) {
  const r = compiled.requirements;
  const privileged = new Set(r.privilegedIntents);
  const h = 'text-xs font-semibold text-fg-subtle';
  return (
    <div className="space-y-4 p-4 text-[13px]">
      <p className="text-fg-muted">{t('흐름 {0}개 · 단계 {1}개가 프롬프트에 들어 있습니다.', [compiled.flowCount, compiled.stepCount])}</p>

      {compiled.omitted.length > 0 && (
        <p className="rounded-md bg-warning-soft px-2.5 py-2 text-warning">{t('{0}은(는) 트리거와 이어져 있지 않아 빠졌습니다.', [compiled.omitted.map((id) => `#${nodeNumber(id)}`).join(', ')])}</p>
      )}

      <section>
        <h3 className={h}>{t('개발자 포털에서 켤 인텐트')}</h3>
        <ul className="mt-1.5 space-y-1">
          {r.intents.map((i) => (
            <li key={i} className="flex items-baseline justify-between gap-2">
              <code className="font-mono text-xs text-fg">{i}</code>
              {privileged.has(i) && <span className="text-xs text-warning">{t('특권 · 직접 켜야 함')}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={h}>{t('봇 권한')}</h3>
        {r.permissions.length ? (
          <>
            <ul className="mt-1.5 space-y-0.5 text-fg">
              {r.permissions.map((p) => <li key={p}>{t(PERMISSION_LABEL[p])}</li>)}
            </ul>
            <p className="mt-1.5 text-xs text-fg-subtle">{tx('초대 링크 권한 값 {0}', [<code className="font-mono text-fg-muted">{r.permissionBits}</code>])}</p>
          </>
        ) : (
          <p className="mt-1.5 text-fg-muted">{t('추가 권한 없음')}</p>
        )}
      </section>

      <section>
        <h3 className={h}>{t('.env 환경변수')}</h3>
        <ul className="mt-1.5 space-y-1">
          {r.env.map((e) => (
            <li key={e.name}>
              <code className="font-mono text-xs text-fg">{e.name}</code>
            </li>
          ))}
        </ul>
      </section>

      {(r.packages.length > 2 || r.storage) && (
        <section>
          <h3 className={h}>{t('그 밖에')}</h3>
          <ul className="mt-1.5 space-y-0.5 text-fg-muted">
            {r.packages.slice(2).map((p) => <li key={p}>{tx('패키지 {0}', [<code className="font-mono text-xs text-fg">{p}</code>])}</li>)}
            {r.storage && <li>{tx('데이터 파일 {0}', [<code className="font-mono text-xs text-fg">data/store.json</code>])}</li>}
          </ul>
        </section>
      )}
    </div>
  );
}

export function PromptView() {
  const rev = useIssues((s) => s.rev);
  const errors = useIssues((s) => s.errors);
  const mode = useUI((s) => s.promptMode);
  const setMode = useUI((s) => s.setPromptMode);
  const [copied, setCopied] = useState(false);
  const pre = useRef<HTMLPreElement>(null);

  // Recompile when props, edges or settings change (rev), not on every drag frame.
  const compiled = useMemo(() => {
    const { meta, nodes, edges } = useProject.getState();
    return compilePrompt(meta, nodes, edges, mode);
  }, [rev, mode]);
  const tokens = useMemo(() => estimateTokens(compiled.text), [compiled]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(compiled.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; select the text so Ctrl+C is all that's left.
      if (pre.current) {
        pre.current.focus();
        window.getSelection()?.selectAllChildren(pre.current);
      }
      useUI.getState().notify(t('브라우저가 클립보드 접근을 막았습니다. 프롬프트 전체를 선택해 두었으니 Ctrl+C로 복사하세요.'), 'error');
    }
  };

  const save = () => downloadText(`${safeFileName(useProject.getState().meta.name)}.prompt.md`, compiled.text, 'text/markdown');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2">
        <ModeSwitch mode={mode} onChange={setMode} />
        <span className="text-xs text-fg-subtle tabular-nums">{t('{0}자 · 약 {1} 토큰', [compiled.text.length.toLocaleString(), tokens.toLocaleString()])}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" icon={Download} onClick={save}>{t('.md 저장')}</Button>
          <Button size="sm" variant="primary" icon={copied ? Check : Copy} onClick={copy}>
            {copied ? t('복사됨') : t('프롬프트 복사')}
          </Button>
        </div>
      </div>

      {errors > 0 && (
        <div role="status" className="flex items-center gap-2 border-b border-line bg-danger-soft px-4 py-2 text-[13px] text-danger">
          <CircleAlert size={15} className="shrink-0" aria-hidden />
          <span>{t('오류 {0}개가 남아 있습니다. 이대로면 AI가 의도와 다른 봇을 만들 수 있습니다.', [errors])}</span>
          <button type="button" onClick={() => useUI.getState().openBottom('problems')} className="ml-auto shrink-0 font-medium underline underline-offset-2">{t('문제 보기')}</button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-1">
        <div className="scroll-hidden max-h-40 overflow-y-auto border-b border-line md:max-h-none md:border-r md:border-b-0">
          <p className="border-b border-line px-4 py-2.5 text-xs text-fg-subtle">{t(MODES.find((m) => m.id === mode)?.hint ?? '')}</p>
          <Requirements compiled={compiled} />
        </div>
        <pre
          ref={pre}
          data-native-keys
          tabIndex={0}
          onKeyDown={(e) => {
            // Select just the prompt, not the whole page.
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
              e.preventDefault();
              window.getSelection()?.selectAllChildren(e.currentTarget);
            }
          }}
          aria-label={t('생성된 프롬프트')}
          className="scroll-hidden min-h-0 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-fg"
        >
          {compiled.text}
        </pre>
      </div>
    </div>
  );
}
