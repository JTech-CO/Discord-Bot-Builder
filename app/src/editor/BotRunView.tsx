import { CircleAlert, CircleCheck, FolderOpen, Play, RefreshCw, Save, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { desktop } from '../platform';
import type { BotStatus } from '../platform/api';
import { useDesktop, requiredEnv } from '../store/desktop';
import { useCurrentResult, useGeneration } from '../store/generation';
import { useUI } from '../store/ui';
import { Button, cx } from '../ui/controls';

const STATUS: Record<BotStatus, string> = {
  idle: '대기',
  installing: '패키지 설치 중',
  building: '빌드 중',
  running: '실행 중',
  stopped: '멈춤',
  failed: '실패',
};

const ACTIVE: BotStatus[] = ['installing', 'building', 'running'];

function EnvRow({ name, stored }: { name: string; stored: boolean }) {
  const [value, setValue] = useState('');
  const { setEnv, clearEnv } = useDesktop();
  const id = `env-${name}`;
  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        void setEnv(name, value.trim()).then(() => setValue(''));
      }}
    >
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm">
        <code className="font-mono text-xs text-fg">{name}</code>
        <span className={cx('text-xs', stored ? 'text-success' : 'text-fg-subtle')}>{stored ? '저장됨' : '비어 있음'}</span>
      </label>
      <div className="flex gap-1.5">
        <input
          id={id}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          maxLength={4096}
          onChange={(e) => setValue(e.target.value)}
          placeholder={stored ? '바꾸려면 새 값 입력' : '값 입력'}
          className="h-8 min-w-0 flex-1 rounded-md border border-line bg-field px-2.5 font-mono text-sm text-fg focus:border-accent focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={!value.trim()}>저장</Button>
        {stored && <Button size="sm" variant="danger" onClick={() => void clearEnv(name)}>삭제</Button>}
      </div>
    </form>
  );
}

function Controls() {
  const { node, dir: savedDir, dirProject, envSet, bot, chooseAndSave, saveAgain, start, stop } = useDesktop();
  const anyResult = useGeneration((s) => s.result !== null);
  const result = useCurrentResult();
  // The saved folder belongs to the project it was saved from; another project picks its own.
  const dir = result && dirProject === result.projectName ? savedDir : null;
  const env = result ? requiredEnv() : [];
  const active = ACTIVE.includes(bot.status);

  return (
    <div className="space-y-5 p-4 text-sm">
      <section aria-labelledby="bot-node">
        <h3 id="bot-node" className="text-xs font-semibold text-fg-subtle">실행 환경</h3>
        {node === null ? (
          <p className="mt-1.5 text-fg-muted">확인 중…</p>
        ) : node.ok ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-fg"><CircleCheck size={15} className="text-success" aria-hidden /> {node.message}</p>
        ) : (
          <p className="mt-1.5 flex items-start gap-1.5 text-danger">
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {node.message}{' '}
              <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">nodejs.org</a>
            </span>
          </p>
        )}
      </section>

      <section aria-labelledby="bot-folder">
        <h3 id="bot-folder" className="text-xs font-semibold text-fg-subtle">프로젝트 폴더</h3>
        {!result ? (
          <p className="mt-1.5 text-fg-muted">
            {anyResult ? '마지막 결과는 지금 흐름으로 만든 것이 아닙니다. ' : '먼저 '}
            <button type="button" className="text-accent-fg underline underline-offset-2" onClick={() => useUI.getState().openBottom('generate')}>생성 탭</button>
            에서 {anyResult ? '지금 흐름으로 다시 만드세요.' : '봇 코드를 만드세요.'}
          </p>
        ) : (
          <>
            {dir ? (
              <p className="mt-1.5 truncate font-mono text-xs text-fg-muted" title={dir}>{dir}</p>
            ) : (
              <p className="mt-1.5 text-fg-muted">아직 저장하지 않았습니다.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant={dir ? 'secondary' : 'primary'} icon={Save} onClick={() => void chooseAndSave()} disabled={active}>
                {dir ? '다른 폴더에 저장' : '폴더 골라 저장'}
              </Button>
              {dir && <Button size="sm" icon={RefreshCw} onClick={() => void saveAgain()} disabled={active}>최신 결과로 다시 저장</Button>}
              {dir && <Button size="sm" variant="ghost" icon={FolderOpen} onClick={() => void desktop?.project.reveal(dir)}>폴더 열기</Button>}
            </div>
          </>
        )}
      </section>

      {dir && env.length > 0 && (
        <section aria-labelledby="bot-env" className="space-y-3">
          <div>
            <h3 id="bot-env" className="text-xs font-semibold text-fg-subtle">환경변수</h3>
            <p className="mt-1 text-xs text-fg-subtle">
              .env 파일 대신 운영체제의 암호화 저장소에 보관하고, 봇을 실행할 때만 넘겨줍니다. 저장한 값은 다시 볼 수 없습니다.
            </p>
          </div>
          {env.map((name) => <EnvRow key={name} name={name} stored={envSet.includes(name)} />)}
        </section>
      )}

      {(dir || active) && (
        <div className="flex items-center gap-2">
          {active ? (
            <Button variant="danger" icon={Square} onClick={() => void stop()}>중지</Button>
          ) : (
            <Button variant="primary" icon={Play} onClick={() => void start()} disabled={!node?.ok}>봇 실행</Button>
          )}
          <span className={cx('text-sm', bot.status === 'failed' ? 'text-danger' : bot.status === 'running' ? 'text-success' : 'text-fg-muted')}>
            {STATUS[bot.status]}
            {bot.status === 'failed' && bot.code != null && ` (종료 코드 ${bot.code})`}
          </span>
        </div>
      )}
    </div>
  );
}

function LogConsole() {
  const logs = useDesktop((s) => s.logs);
  const clear = useDesktop((s) => s.clearLogs);
  const pre = useRef<HTMLPreElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = pre.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line px-4 text-xs text-fg-subtle">
        <span>로그 {logs.length}줄</span>
        <Button size="sm" variant="ghost" onClick={clear} disabled={!logs.length}>지우기</Button>
      </div>
      <pre
        ref={pre}
        data-native-keys
        tabIndex={0}
        aria-label="봇 로그"
        aria-live="off"
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="min-h-0 flex-1 overflow-auto bg-canvas px-4 py-3 font-mono text-[13px] leading-relaxed"
      >
        {logs.length === 0 ? (
          <span className="font-sans text-fg-subtle">봇을 실행하면 설치·빌드·실행 로그가 여기에 나옵니다.</span>
        ) : (
          logs.map((l, i) => (
            <div key={i} className={cx('break-words whitespace-pre-wrap', l.stream === 'err' ? 'text-danger' : l.stream === 'sys' ? 'text-accent-fg' : 'text-fg')}>
              {l.text}
            </div>
          ))
        )}
      </pre>
    </div>
  );
}

export function BotRunView() {
  const refresh = useDesktop((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[340px_minmax(0,1fr)] md:grid-rows-1">
      <div className="max-h-64 overflow-y-auto border-b border-line md:max-h-none md:border-r md:border-b-0">
        <Controls />
      </div>
      <LogConsole />
    </div>
  );
}
