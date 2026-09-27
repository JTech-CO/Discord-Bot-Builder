import { CircleAlert, FileCode2, FileText, Folder, Hammer, KeyRound, Loader2, PackageOpen, Square, TriangleAlert } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { maskKey, useApiKey } from '../ai/key';
import { MAX_OUTPUT_TOKENS, MODELS, costUSD, formatUSD, modelInfo, type ModelId } from '../ai/models';
import type { GeneratedFile } from '../ai/output';
import { compilePrompt, estimateTokens } from '../compiler/compile';
import { useGeneration, type GenerationRecord } from '../store/generation';
import { useIssues } from '../store/issues';
import { useProject } from '../store/project';
import { useUI } from '../store/ui';
import { Button, cx } from '../ui/controls';
import { downloadBlob, safeFileName } from '../ui/files';

async function downloadZip(record: GenerationRecord) {
  try {
    const { zipProject, projectSlug } = await import('../ai/zip');
    const bytes = zipProject(projectSlug(record.projectName), record.files);
    downloadBlob(`${safeFileName(record.projectName)}.zip`, new Blob([bytes as BlobPart], { type: 'application/zip' }));
  } catch {
    useUI.getState().notify('zip 파일을 만들지 못했습니다.', 'error');
  }
}

function Toolbar() {
  const { status, model, setModel, start, cancel, result } = useGeneration();
  const key = useApiKey((s) => s.key);
  const errors = useIssues((s) => s.errors);
  const rev = useIssues((s) => s.rev);
  const running = status === 'running';

  // Input size for the cost estimate; recomputed when the flow changes.
  const inputTokens = useMemo(() => {
    const { meta, nodes, edges } = useProject.getState();
    return estimateTokens(compilePrompt(meta, nodes, edges, 'api').text) + 400;
  }, [rev]);
  const low = costUSD(model, inputTokens, 8_000);
  const high = costUSD(model, inputTokens, MAX_OUTPUT_TOKENS);

  const onGenerate = () => {
    if (!key) useUI.getState().setKeyDialogOpen(true);
    else void start();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2">
      <label className="flex items-center gap-2 text-[13px] text-fg-muted">
        모델
        <select
          value={model}
          disabled={running}
          onChange={(e) => setModel(e.target.value as ModelId)}
          className="h-7 rounded-md border border-line bg-field px-2 text-[13px] text-fg focus:border-accent focus:outline-none"
        >
          {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label} · {m.hint}</option>)}
        </select>
      </label>
      <span className="text-xs text-fg-subtle tabular-nums" title="입력은 추정치, 출력은 결과 길이에 따라 달라집니다.">
        예상 비용 {formatUSD(low)} ~ {formatUSD(high)}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => useUI.getState().setKeyDialogOpen(true)}>
          {key ? maskKey(key) : 'API 키 입력'}
        </Button>
        {result && !running && (
          <Button size="sm" icon={PackageOpen} onClick={() => downloadZip(result)}>zip 받기</Button>
        )}
        {running ? (
          <Button size="sm" variant="danger" icon={Square} onClick={cancel}>취소</Button>
        ) : (
          <Button size="sm" variant="primary" icon={Hammer} onClick={onGenerate} disabled={errors > 0}>
            {result ? '다시 생성' : '봇 코드 생성'}
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
  const { status, progress, error } = useGeneration();
  const errors = useIssues((s) => s.errors);
  return (
    <>
      {errors > 0 && status !== 'running' && (
        <Banner tone="warning">
          <TriangleAlert size={15} className="shrink-0" aria-hidden />
          <span>흐름에 오류가 {errors}개 있어 생성할 수 없습니다.</span>
          <button type="button" onClick={() => useUI.getState().openBottom('problems')} className="ml-auto font-medium underline underline-offset-2">문제 보기</button>
        </Banner>
      )}
      {status === 'running' && progress && (
        <Banner tone="info">
          <Loader2 size={15} className="shrink-0 animate-spin text-accent-fg" aria-hidden />
          <span className="tabular-nums">
            생성 중 · 파일 {progress.files}개 · {progress.chars.toLocaleString()}자
            {progress.current && <> · <code className="font-mono text-xs">{progress.current}</code></>}
          </span>
        </Banner>
      )}
      {status === 'error' && error && (
        <Banner tone="danger">
          <CircleAlert size={15} className="shrink-0" aria-hidden />
          <span>{error.message}</span>
          {(error.kind === 'auth' || error.kind === 'no_key' || error.kind === 'permission') && (
            <button type="button" onClick={() => useUI.getState().setKeyDialogOpen(true)} className="ml-auto font-medium underline underline-offset-2">키 확인</button>
          )}
        </Banner>
      )}
    </>
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

function Summary({ record }: { record: GenerationRecord }) {
  const info = modelInfo(record.model);
  const cost = costUSD(record.model, record.usage.input, record.usage.output);
  return (
    <div className="h-full space-y-4 overflow-y-auto p-4 text-sm">
      <div>
        <h3 className="font-semibold text-fg">{record.projectName} · 파일 {record.files.length}개</h3>
        <p className="mt-1 text-xs text-fg-subtle tabular-nums">
          {new Date(record.createdAt).toLocaleString()} · {info.label}
          {record.servedBy && ` (거절되어 ${record.servedBy}가 대신 완성)`} · 입력 {record.usage.input.toLocaleString()} / 출력 {record.usage.output.toLocaleString()} 토큰 · 약 {formatUSD(cost)}
        </p>
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
      <section aria-labelledby="gen-notes">
        <h4 id="gen-notes" className="text-xs font-semibold text-fg-subtle">AI가 남긴 설치 안내</h4>
        <p className="mt-1.5 whitespace-pre-wrap text-fg">{record.notes || '(없음)'}</p>
      </section>
      <p className="text-xs text-fg-subtle">
        생성된 코드는 AI가 쓴 것이므로 실행 전에 한 번 살펴보세요. 실행 방법은 README.md에 있습니다.
      </p>
    </div>
  );
}

function Result({ record }: { record: GenerationRecord }) {
  const selected = useGeneration((s) => s.selected);
  const select = useGeneration((s) => s.select);
  const tree = useMemo(() => buildTree(record.files), [record]);
  const file = record.files.find((f) => f.path === selected);

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
      <nav aria-label="생성된 파일" className="max-h-40 overflow-y-auto border-b border-line py-1 md:max-h-none md:border-r md:border-b-0">
        <button
          type="button"
          aria-current={selected === null ? 'true' : undefined}
          onClick={() => select(null)}
          className={cx('flex w-full items-center gap-1.5 px-3 py-1 text-left text-[13px]', selected === null ? 'bg-accent-soft text-fg' : 'text-fg hover:bg-hover')}
        >
          <FileText size={14} className="shrink-0 text-fg-subtle" aria-hidden />
          요약
          {record.problems.length > 0 && <span className="ml-auto text-xs text-warning tabular-nums">{record.problems.length}</span>}
        </button>
        <TreeList node={tree} depth={0} selected={selected} onSelect={select} />
      </nav>
      {file ? (
        <div className="flex min-h-0 flex-col">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line px-4 text-xs text-fg-subtle">
            <code className="font-mono text-fg-muted">{file.path}</code>
            <span className="tabular-nums">{file.content.split('\n').length}줄</span>
          </div>
          <pre data-native-keys tabIndex={0} aria-label={file.path} className="min-h-0 flex-1 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
            {file.content}
          </pre>
        </div>
      ) : (
        <Summary record={record} />
      )}
    </div>
  );
}

function EmptyState() {
  const key = useApiKey((s) => s.key);
  return (
    <div className="h-full overflow-y-auto p-4 text-sm text-fg-muted">
      <p className="max-w-prose">
        흐름을 Claude에게 보내 실행할 수 있는 봇 프로젝트(discord.js · TypeScript)를 만듭니다. 결과는 여기서 파일별로 확인하고 zip으로 받을 수 있습니다.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>{key ? 'API 키가 준비되었습니다.' : '오른쪽 위 "API 키 입력"에서 Anthropic API 키를 넣으세요.'}</li>
        <li>문제 탭의 오류를 모두 고치세요.</li>
        <li>"봇 코드 생성"을 누르세요. 보통 1~3분 걸립니다.</li>
      </ol>
      <p className="mt-3 max-w-prose text-xs text-fg-subtle">
        키가 없거나 다른 AI를 쓰고 싶다면 프롬프트 탭의 내용을 복사해 붙여 넣어도 됩니다.
      </p>
    </div>
  );
}

export function GenerateView() {
  const result = useGeneration((s) => s.result);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar />
      <StatusBanners />
      {result ? <Result record={result} /> : <EmptyState />}
    </div>
  );
}
