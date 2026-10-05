import { CircleAlert, FileCode2, FileText, Folder, Hammer, History, KeyRound, Loader2, MonitorPlay, PackageOpen, Square, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApiKey } from '../ai/key';
import { MAX_OUTPUT_TOKENS, MODELS, costUSD, formatUSD, modelInfo, type ModelId } from '../ai/models';
import type { GeneratedFile } from '../ai/output';
import { desktop } from '../platform';
import { estimateTokens, type BotRequirements } from '../compiler/compile';
import { useFlowPrompt, useGeneration, type GenerationRecord } from '../store/generation';
import { useIssues } from '../store/issues';
import { useUI } from '../store/ui';
import { Button, cx } from '../ui/controls';
import { CopyButton } from '../ui/copy';
import { highlight } from '../ui/highlight';
import { DiscordSetup, Notes, envNames } from './SetupGuide';
import { downloadBlob, safeFileName } from '../ui/files';
import { t, useLang } from '../i18n/t';
import { tx } from '../i18n/tx';

async function downloadZip(record: GenerationRecord) {
  try {
    const { zipProject, projectSlug } = await import('../ai/zip');
    const bytes = zipProject(projectSlug(record.projectName), record.files);
    downloadBlob(`${safeFileName(record.projectName)}.zip`, new Blob([bytes as BlobPart], { type: 'application/zip' }));
  } catch {
    useUI.getState().notify(t('zip 파일을 만들지 못했습니다.'), 'error');
  }
}

/** `shown`: the result on screen, if any. `current`: there is a result made from the flow that is open now. */
function Toolbar({ inputTokens, shown, current }: { inputTokens: number; shown: GenerationRecord | null; current: boolean }) {
  const { status, model, setModel, start, cancel } = useGeneration();
  const key = useApiKey((s) => s.label);
  const errors = useIssues((s) => s.errors);
  const running = status === 'running';

  const low = costUSD(model, inputTokens, 8_000);
  const high = costUSD(model, inputTokens, MAX_OUTPUT_TOKENS);

  const onGenerate = () => {
    if (!key) useUI.getState().setKeyDialogOpen(true);
    else void start();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2">
      <label className="flex items-center gap-2 text-[13px] text-fg-muted">{tx('모델{0}', [<select
          value={model}
          disabled={running}
          onChange={(e) => setModel(e.target.value as ModelId)}
          className="h-7 rounded-md border border-line bg-field px-2 text-[13px] text-fg focus:border-accent focus:outline-none"
        >
          {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} · {t(m.hint)}</option>)}
        </select>])}</label>
      <span className="text-xs text-fg-subtle tabular-nums" title={t('입력은 추정치, 출력은 결과 길이에 따라 달라집니다.')}>{t('예상 비용 {0} ~ {1}', [formatUSD(low), formatUSD(high)])}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => useUI.getState().setKeyDialogOpen(true)}>
          {key ?? t('API 키 입력')}
        </Button>
        {shown && !running && (
          <Button size="sm" icon={PackageOpen} onClick={() => downloadZip(shown)}>{t('zip 받기')}</Button>
        )}
        {desktop && current && !running && (
          <Button size="sm" icon={MonitorPlay} onClick={() => useUI.getState().openBottom('bot')}>{t('이 PC에서 실행')}</Button>
        )}
        {running ? (
          <Button size="sm" variant="danger" icon={Square} onClick={cancel}>{t('취소')}</Button>
        ) : (
          <Button size="sm" variant="primary" icon={Hammer} onClick={onGenerate} disabled={errors > 0}>
            {current ? t('다시 생성') : t('봇 코드 생성')}
          </Button>
        )}
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'danger' | 'warning' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-center gap-2 border-b border-line px-4 py-2 text-[13px]',
        tone === 'danger' && 'bg-danger-soft text-danger',
        tone === 'warning' && 'bg-warning-soft text-warning',
        tone === 'info' && 'text-fg-muted',
      )}
    >
      {children}
    </div>
  );
}

function StatusBanners() {
  const { status, error } = useGeneration();
  const errors = useIssues((s) => s.errors);
  return (
    <>
      {errors > 0 && status !== 'running' && (
        <Banner tone="warning">
          <TriangleAlert size={15} className="shrink-0" aria-hidden />
          <span>{t('흐름에 오류가 {0}개 있어 생성할 수 없습니다.', [errors])}</span>
          <button type="button" onClick={() => useUI.getState().openBottom('problems')} className="ml-auto font-medium underline underline-offset-2">{t('문제 보기')}</button>
        </Banner>
      )}
      {status === 'error' && error && (
        <Banner tone="danger">
          <CircleAlert size={15} className="shrink-0" aria-hidden />
          <span>{error.message}</span>
          {(error.kind === 'auth' || error.kind === 'no_key' || error.kind === 'permission') && (
            <button type="button" onClick={() => useUI.getState().setKeyDialogOpen(true)} className="ml-auto font-medium underline underline-offset-2">{t('키 확인')}</button>
          )}
        </Banner>
      )}
    </>
  );
}

function StaleNotice({ record, shown, onToggle }: { record: GenerationRecord; shown: boolean; onToggle: () => void }) {
  return (
    <Banner tone={shown ? 'warning' : 'info'}>
      <History size={15} className="shrink-0" aria-hidden />
      <span>{t('{0}(‘{1}’, {2})는 지금 흐름으로 만든 것이 아닙니다.{3}', [shown ? t('이 결과') : t('마지막 결과'), record.projectName, new Date(record.createdAt).toLocaleString(useLang.getState().lang === 'en' ? 'en-US' : 'ko-KR'), shown ? t(' 지금 흐름과 다를 수 있습니다.') : t(' 그 뒤 흐름을 고쳤거나 다른 프로젝트를 열었습니다. 생성하면 지금 흐름으로 새로 만듭니다.')])}</span>
      <button type="button" onClick={onToggle} className="ml-auto shrink-0 font-medium underline underline-offset-2">
        {shown ? t('숨기기') : t('이전 결과 보기')}
      </button>
    </Banner>
  );
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Running() {
  const progress = useGeneration((s) => s.progress);
  const startedAt = useGeneration((s) => s.startedAt);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Claude thinks before it writes, so for a while nothing streams in.
  const writing = !!progress && progress.chars > 0;

  return (
    <div className="scroll-hidden h-full overflow-y-auto p-4 text-sm">
      <p className="flex items-center gap-2 text-fg">
        <Loader2 size={15} className="shrink-0 animate-spin text-accent-fg" aria-hidden />
        <span role="status" className="font-medium">{writing ? t('파일을 쓰고 있습니다') : t('Claude가 흐름을 읽고 코드를 설계하고 있습니다')}</span>
        {startedAt !== null && <span className="text-fg-subtle tabular-nums">{clock(Math.max(0, now - startedAt))}</span>}
      </p>
      {writing ? (
        <p className="mt-1.5 text-fg-muted tabular-nums">{tx('파일 {0}개 · {1}자{2}', [progress.files, progress.chars.toLocaleString(), progress.current && <> · <code className="font-mono text-xs">{progress.current}</code></>])}</p>
      ) : (
        <p className="mt-1.5 max-w-prose text-fg-muted">{t('설계가 끝나면 파일이 하나씩 나타납니다. 보통 1~3분 걸리고, 흐름이 크면 더 걸립니다.')}</p>
      )}
      <p className="mt-3 text-xs text-fg-subtle">{t('기다리는 동안 다른 탭을 써도 됩니다.')}</p>
    </div>
  );
}

// ── Result ────────────────────────────────────────────

interface TreeNode {
  dirs: Map<string, TreeNode>;
  files: GeneratedFile[];
}

function buildTree(files: GeneratedFile[]): TreeNode {
  const root: TreeNode = { dirs: new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split('/');
    let node = root;
    for (const dir of parts.slice(0, -1)) {
      if (!node.dirs.has(dir)) node.dirs.set(dir, { dirs: new Map(), files: [] });
      node = node.dirs.get(dir)!;
    }
    node.files.push(f);
  }
  return root;
}

function TreeList({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected: string | null; onSelect: (p: string) => void }) {
  const pad = { paddingLeft: `${12 + depth * 14}px` };
  return (
    <ul>
      {[...node.dirs].sort(([a], [b]) => a.localeCompare(b)).map(([name, child]) => (
        <li key={name}>
          <div className="flex items-center gap-1.5 py-1 pr-2 text-[13px] text-fg-muted" style={pad}>
            <Folder size={14} className="shrink-0" aria-hidden />
            {name}
          </div>
          <TreeList node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
        </li>
      ))}
      {node.files.map((f) => {
        const name = f.path.split('/').pop();
        return (
          <li key={f.path}>
            <button
              type="button"
              aria-current={selected === f.path ? 'true' : undefined}
              onClick={() => onSelect(f.path)}
              className={cx(
                'flex w-full items-center gap-1.5 py-1 pr-2 text-left text-[13px]',
                selected === f.path ? 'bg-accent-soft text-fg' : 'text-fg hover:bg-hover',
              )}
              style={pad}
            >
              <FileCode2 size={14} className="shrink-0 text-fg-subtle" aria-hidden />
              <span className="truncate">{name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Summary({ record, requirements }: { record: GenerationRecord; requirements: BotRequirements | null }) {
  const info = modelInfo(record.model);
  const cost = costUSD(record.model, record.usage.input, record.usage.output);
  return (
    <div className="scroll-hidden h-full space-y-4 overflow-y-auto p-4 text-sm">
      <div>
        <h3 className="font-semibold text-fg">{t('{0} · 파일 {1}개', [record.projectName, record.files.length])}</h3>
        <p className="mt-1 text-xs text-fg-subtle tabular-nums">{t('{0} · {1}{2} · 입력 {3} / 출력 {4} 토큰 · 약 {5}', [new Date(record.createdAt).toLocaleString(useLang.getState().lang === 'en' ? 'en-US' : 'ko-KR'), info.label, record.servedBy && t(' (거절되어 {0}가 대신 완성)', [record.servedBy]), record.usage.input.toLocaleString(), record.usage.output.toLocaleString(), formatUSD(cost)])}</p>
      </div>
      {record.problems.length > 0 && (
        <ul className="space-y-1.5">
          {record.problems.map((p, i) => (
            <li key={i} className={cx('flex gap-2 rounded-md px-2.5 py-2 text-[13px]', p.level === 'error' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning')}>
              {p.level === 'error' ? <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden /> : <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />}
              <span>{p.message}</span>
            </li>
          ))}
        </ul>
      )}
      <DiscordSetup env={envNames(record.files)} requirements={requirements} />
      <section aria-labelledby="gen-notes">
        <h4 id="gen-notes" className="text-xs font-semibold text-fg-subtle">{t('AI가 남긴 설치 안내')}</h4>
        <Notes text={record.notes} />
      </section>
      <p className="text-xs text-fg-subtle">{t('생성된 코드는 AI가 쓴 것이므로 실행 전에 한 번 살펴보세요. 실행 방법은 README.md에 있습니다.')}</p>
    </div>
  );
}

/** `requirements` of the open flow, or null when the result was made from another flow. */
function Result({ record, requirements }: { record: GenerationRecord; requirements: BotRequirements | null }) {
  const selected = useGeneration((s) => s.selected);
  const select = useGeneration((s) => s.select);
  const tree = useMemo(() => buildTree(record.files), [record]);
  const file = record.files.find((f) => f.path === selected);
  const code = useMemo(() => (file ? highlight(file.path, file.content) : null), [file]);

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
      <nav aria-label={t('생성된 파일')} className="scroll-hidden max-h-40 overflow-y-auto border-b border-line py-1 md:max-h-none md:border-r md:border-b-0">
        <button
          type="button"
          aria-current={selected === null ? 'true' : undefined}
          onClick={() => select(null)}
          className={cx('flex w-full items-center gap-1.5 px-3 py-1 text-left text-[13px]', selected === null ? 'bg-accent-soft text-fg' : 'text-fg hover:bg-hover')}
        >{tx('{0}요약{1}', [<FileText size={14} className="shrink-0 text-fg-subtle" aria-hidden />, record.problems.length > 0 && <span className="ml-auto text-xs text-warning tabular-nums">{record.problems.length}</span>])}</button>
        <TreeList node={tree} depth={0} selected={selected} onSelect={select} />
      </nav>
      {file ? (
        <div className="flex min-h-0 flex-col">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line px-4 text-xs text-fg-subtle">
            <code className="font-mono text-fg-muted">{file.path}</code>
            <span className="tabular-nums">{t('{0}줄', [file.content.split('\n').length])}</span>
            <CopyButton text={file.content} label={t('파일 내용 복사')} className="ml-auto" />
          </div>
          <pre data-native-keys tabIndex={0} aria-label={file.path} className="scroll-hidden-y min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
            {code}
          </pre>
        </div>
      ) : (
        <Summary record={record} requirements={requirements} />
      )}
    </div>
  );
}

function EmptyState() {
  const key = useApiKey((s) => s.label);
  return (
    <div className="scroll-hidden h-full overflow-y-auto p-4 text-sm text-fg-muted">
      <p className="max-w-prose">{t('흐름을 Claude에게 보내 실행할 수 있는 봇 프로젝트(discord.js · TypeScript)를 만듭니다. 결과는 여기서 파일별로 확인하고 zip으로 받을 수 있습니다.')}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>{key ? t('API 키가 준비되었습니다.') : t('오른쪽 위 "API 키 입력"에서 Anthropic API 키를 넣으세요.')}</li>
        <li>{t('문제 탭의 오류를 모두 고치세요.')}</li>
        <li>{t('"봇 코드 생성"을 누르세요. 보통 1~3분 걸립니다.')}</li>
      </ol>
      <p className="mt-3 max-w-prose text-xs text-fg-subtle">{t('키가 없거나 다른 AI를 쓰고 싶다면 프롬프트 탭의 내용을 복사해 붙여 넣어도 됩니다.')}</p>
    </div>
  );
}

export function GenerateView() {
  const result = useGeneration((s) => s.result);
  const running = useGeneration((s) => s.status === 'running');
  const prompt = useFlowPrompt();
  const inputTokens = useMemo(() => estimateTokens(prompt.text) + 400, [prompt]);
  // A result made from another flow (another project, or this one before an edit) stays hidden unless asked for.
  const current = result?.flowKey === prompt.key ? result : null;
  const stale = result && !current ? result : null;
  const [peekAt, setPeekAt] = useState<number | null>(null);
  const shown = running ? null : current ?? (stale && peekAt === stale.createdAt ? stale : null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar inputTokens={inputTokens} shown={shown} current={!!current} />
      <StatusBanners />
      {stale && !running && (
        <StaleNotice record={stale} shown={shown === stale} onToggle={() => setPeekAt(shown === stale ? null : stale.createdAt)} />
      )}
      {running ? <Running /> : shown ? <Result record={shown} requirements={shown === current ? prompt.requirements : null} /> : <EmptyState />}
    </div>
  );
}
