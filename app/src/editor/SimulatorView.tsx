import { AppWindow, Bot, CircleAlert, Play, RotateCcw, TriangleAlert, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { indexGraph } from '../flow/graph';
import { nodeNumber } from '../flow/model';
import { getDef, isTrigger } from '../nodes/registry';
import { toText } from '../nodes/sim';
import type { SimEffect, SimInputDef } from '../nodes/types';
import type { SimRun } from '../sim/run';
import { useIssues } from '../store/issues';
import { useProject } from '../store/project';
import { useSimulator } from '../store/simulator';
import { useUI } from '../store/ui';
import { Button, cx } from '../ui/controls';
import { prettyRefs } from '../nodes/helpers';
import { t } from '../i18n/t';
import { tx } from '../i18n/tx';

const HEX = /^#[0-9a-fA-F]{6}$/;

function useTriggers() {
  return useProject(
    useShallow((s) =>
      s.nodes
        .filter((n) => isTrigger(getDef(n.data.type)))
        .sort((a, b) => Number(nodeNumber(a.id)) - Number(nodeNumber(b.id)))
        .map((n) => {
          const def = getDef(n.data.type)!;
          const summary = def.summary?.(n.data.props);
          return `${n.id}\u0000#${nodeNumber(n.id)} ${def.label}${summary ? ` · ${prettyRefs(summary)}` : ''}`;
        }),
    ),
  ).map((row) => {
    const [id, label] = row.split('\u0000');
    return { id, label };
  });
}

function InputField({ def, value, onChange }: { def: SimInputDef; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  const id = `sim-${def.key}`;
  if (def.kind === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-fg">
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        {def.label}
      </label>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-fg">{def.label}</label>
      <input
        id={id}
        type={def.kind === 'number' ? 'number' : 'text'}
        value={String(value)}
        maxLength={2000}
        onChange={(e) => onChange(def.kind === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        className="h-8 w-full rounded-md border border-line bg-field px-2.5 text-sm text-fg focus:border-accent focus:outline-none"
      />
    </div>
  );
}

function Controls() {
  const triggers = useTriggers();
  const { triggerId, typed, setTrigger, setInput, runNow, resetData, dataSize } = useSimulator();
  const rev = useIssues((s) => s.rev);
  const current = triggerId && triggers.some((tr) => tr.id === triggerId) ? triggerId : triggers[0]?.id ?? null;

  // Input fields come from the trigger definition (modal fields, slash options, …).
  const inputs = useMemo(() => {
    const { nodes, edges } = useProject.getState();
    const node = nodes.find((n) => n.id === current);
    const def = node && getDef(node.data.type);
    return node && def?.simInputs ? def.simInputs(node.data.props, indexGraph(nodes, edges).view) : [];
  }, [current, rev]);

  if (!current) {
    return <p className="p-4 text-sm text-fg-muted">{t('트리거가 없습니다. 캔버스에 트리거를 먼저 놓으세요.')}</p>;
  }

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (triggerId !== current) setTrigger(current);
        runNow();
      }}
    >
      <div>
        <label htmlFor="sim-trigger" className="mb-1 block text-sm text-fg">{t('시작할 트리거')}</label>
        <select
          id="sim-trigger"
          value={current}
          onChange={(e) => setTrigger(e.target.value)}
          className="h-8 w-full rounded-md border border-line bg-field px-2 text-sm text-fg focus:border-accent focus:outline-none"
        >
          {triggers.map((tr) => <option key={tr.id} value={tr.id}>{tr.label}</option>)}
        </select>
      </div>
      {inputs.map((d) => (
        <InputField key={d.key} def={d} value={typed[current]?.[d.key] ?? d.default} onChange={(v) => { setTrigger(current); setInput(d.key, v); }} />
      ))}
      <Button type="submit" variant="primary" icon={Play} className="w-full">{t('실행')}</Button>
      <div className="flex items-center justify-between gap-2 text-xs text-fg-subtle">
        <span>{t('기억 중인 값 {0}개 (저장 데이터·쿨다운)', [dataSize])}</span>
        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={resetData} disabled={dataSize === 0}>{t('초기화')}</Button>
      </div>
      <p className="text-xs text-fg-subtle">{t('디스코드와 AI 없이 이 앱 안에서만 실행합니다. HTTP·AI·RSS·자연어 지시 노드는 모의 값을 쓰고, 대기는 건너뜁니다.')}</p>
    </form>
  );
}

function MessagePreview({ effect, botName }: { effect: Extract<SimEffect, { kind: 'message' }>; botName: string }) {
  const color = effect.embed && HEX.test(effect.embed.color) ? effect.embed.color : 'var(--accent)';
  return (
    <div className="flex gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white" aria-hidden>
        <Bot size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-fg">{botName}</span>
          <span className="rounded bg-accent px-1 text-[11px] font-semibold text-white">{t('앱')}</span>
          {effect.to !== t('답장') && <span className="text-xs text-fg-subtle">→ {effect.to}</span>}
        </div>
        {effect.ephemeral && <p className="text-xs text-fg-subtle">{t('명령어를 쓴 사람에게만 보이는 메시지')}</p>}
        {effect.content && <p className="mt-0.5 break-words whitespace-pre-wrap text-fg">{effect.content}</p>}
        {effect.embed && (
          <div className="mt-1.5 max-w-md rounded border-l-4 bg-raised p-3" style={{ borderLeftColor: color }}>
            {effect.embed.title && <p className="font-semibold break-words text-fg">{effect.embed.title}</p>}
            {effect.embed.description && <p className="mt-1 text-sm break-words whitespace-pre-wrap text-fg">{effect.embed.description}</p>}
            {effect.embed.image && <p className="mt-2 text-xs break-all text-fg-subtle">{t('이미지: {0}', [effect.embed.image])}</p>}
            {effect.embed.footer && <p className="mt-2 text-xs text-fg-muted">{effect.embed.footer}</p>}
          </div>
        )}
        {effect.buttons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {effect.buttons.map((b, i) => <span key={i} className="rounded bg-hover px-3 py-1 text-sm text-fg">{b}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function EffectItem({ effect, botName }: { effect: SimEffect; botName: string }) {
  if (effect.kind === 'message') return <MessagePreview effect={effect} botName={botName} />;
  if (effect.kind === 'modal') {
    return (
      <div className="max-w-sm rounded-lg border border-line bg-raised p-3">
        <p className="flex items-center gap-2 font-semibold text-fg"><AppWindow size={15} aria-hidden /> {effect.title || t('모달')}</p>
        <ul className="mt-2 space-y-1.5">
          {effect.fields.map((f, i) => <li key={i} className="rounded border border-line bg-field px-2 py-1 text-sm text-fg-muted">{f}</li>)}
        </ul>
      </div>
    );
  }
  return (
    <p className="flex items-start gap-2 text-sm text-fg-muted">
      <Zap size={15} className="mt-0.5 shrink-0" aria-hidden />
      {effect.text}
    </p>
  );
}

const STATUS_TEXT: Record<SimRun['status'], string> = {
  done: '끝까지 실행했습니다',
  'no-match': '트리거 조건에 맞지 않아 시작되지 않았습니다',
  error: '오류로 멈췄습니다',
  limit: '단계가 너무 많아 멈췄습니다',
};

function Result({ run }: { run: SimRun }) {
  const botName = useProject((s) => s.meta.name) || t('봇');
  const types = useProject(useShallow((s) => Object.fromEntries(s.nodes.map((n) => [n.id, n.data.type]))));
  const stale = useIssues((s) => s.rev) !== useSimulator((s) => s.runRev);
  const active = useSimulator((s) => s.active);
  const setActive = useSimulator((s) => s.setActive);
  const effects = run.steps.filter((s) => s.effect);

  return (
    <div className="scroll-hidden h-full overflow-y-auto">
      {stale && (
        <p role="status" className="flex items-center gap-2 border-b border-line bg-warning-soft px-4 py-2 text-[13px] text-warning">{tx('{0} 흐름이 바뀌었습니다. 다시 실행하면 최신 흐름으로 확인합니다.', [<TriangleAlert size={15} aria-hidden />])}</p>
      )}
      <div className="grid gap-6 p-4 xl:grid-cols-2">
        <section aria-labelledby="sim-preview">
          <h3 id="sim-preview" className="text-xs font-semibold text-fg-subtle">{t('디스코드에서 보이는 것')}</h3>
          <div className="mt-2 space-y-4 rounded-lg border border-line bg-canvas p-4">
            {effects.length ? effects.map((s, i) => <EffectItem key={i} effect={s.effect!} botName={botName} />) : (
              <p className="text-sm text-fg-muted">{t('보이는 결과가 없습니다.')}</p>
            )}
          </div>
        </section>
        <section aria-labelledby="sim-steps">
          <h3 id="sim-steps" className="text-xs font-semibold text-fg-subtle">{t('단계 {0}개 · {1}', [run.steps.length, t(STATUS_TEXT[run.status])])}</h3>
          <ol className="mt-2 space-y-1">
            {run.steps.map((s, i) => {
              const def = getDef(types[s.nodeId] ?? s.type);
              const port = def && s.port && s.port !== 'next' ? def.ports?.(useProject.getState().nodes.find((n) => n.id === s.nodeId)?.data.props ?? {}).find((p) => p.id === s.port)?.label : null;
              const outputs = Object.entries(s.outputs);
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-current={active === i ? 'step' : undefined}
                    onClick={() => {
                      setActive(i);
                      useUI.getState().focusNode(s.nodeId);
                    }}
                    className={cx('w-full rounded-md px-2.5 py-2 text-left text-[13px]', active === i ? 'bg-accent-soft' : 'hover:bg-hover')}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-fg-subtle">#{nodeNumber(s.nodeId)}</span>
                      <span className="font-medium text-fg">{def?.label ?? s.type}</span>
                      {port && <span className="text-xs text-accent-fg">→ {port}</span>}
                    </span>
                    {s.error ? (
                      <span className="mt-0.5 flex items-center gap-1 text-danger"><CircleAlert size={13} aria-hidden /> {s.error}</span>
                    ) : (
                      <span className="mt-0.5 block break-words text-fg-muted">{s.log}</span>
                    )}
                    {outputs.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {outputs.map(([k, v]) => (
                          <code key={k} className="max-w-full truncate rounded bg-hover px-1.5 py-0.5 font-mono text-xs text-fg-muted">
                            {k}={toText(v) || '""'}
                          </code>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}

export function SimulatorView() {
  const run = useSimulator((s) => s.run);
  const hasTriggers = useProject((s) => s.nodes.some((n) => isTrigger(getDef(n.data.type))));
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[300px_minmax(0,1fr)] md:grid-rows-1">
      <div className="scroll-hidden max-h-56 overflow-y-auto border-b border-line md:max-h-none md:border-r md:border-b-0">
        <Controls />
      </div>
      {run && hasTriggers ? (
        <Result run={run} />
      ) : (
        <p className="p-4 text-sm text-fg-muted">{t('왼쪽에서 가짜 이벤트를 정하고 실행하세요. 어떤 노드를 거쳤는지 캔버스에 표시되고, 디스코드에서 보일 메시지를 미리 볼 수 있습니다.')}</p>
      )}
    </div>
  );
}

