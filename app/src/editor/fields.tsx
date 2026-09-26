import { Braces, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { indexGraph, refSources } from '../flow/graph';
import { nodeNumber } from '../flow/model';
import { nodeRef } from '../flow/refs';
import { TYPE_LABEL, type Issue } from '../flow/validate';
import { list, rows } from '../nodes/helpers';
import type { FieldDef, ListField, TableColumn, TableField, TableRow, TextField, ValueType } from '../nodes/types';
import { useProject } from '../store/project';
import { cx, onMenuKeyDown, usePopover } from '../ui/controls';

const inputBase =
  'w-full rounded-md border bg-field px-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none';
const inputCls = (invalid?: boolean) => cx(inputBase, 'h-8', invalid ? 'border-danger' : 'border-line');

interface FieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  nodeId: string;
  issues: Issue[];
}

export function Field({ field, value, onChange, nodeId, issues }: FieldProps) {
  const id = `f-${nodeId}-${field.key}`;
  const invalid = issues.some((i) => i.level === 'error');
  const describedBy = [field.help && `${id}-help`, issues.length > 0 && `${id}-issues`].filter(Boolean).join(' ') || undefined;
  const common = { id, invalid, describedBy };

  let control: ReactNode;
  switch (field.kind) {
    case 'text':
    case 'textarea':
      control = <TextControl {...common} field={field} value={typeof value === 'string' ? value : ''} onChange={onChange} nodeId={nodeId} />;
      break;
    case 'number':
      control = <NumberControl {...common} value={typeof value === 'number' ? value : undefined} onChange={onChange} min={field.min} max={field.max} step={field.step} />;
      break;
    case 'boolean':
      return (
        <div className="flex items-start justify-between gap-3">
          <div>
            <label htmlFor={id} className="text-sm text-fg">{field.label}</label>
            {field.help && <p id={`${id}-help`} className="mt-0.5 text-xs text-fg-subtle">{field.help}</p>}
          </div>
          <Switch id={id} checked={value === true} onChange={onChange} describedBy={describedBy} />
        </div>
      );
    case 'select':
      control = (
        <select
          id={id}
          value={typeof value === 'string' ? value : field.default}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={inputCls(invalid)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    case 'color': {
      const hex = typeof value === 'string' ? value : field.default ?? '#5865F2';
      control = (
        <div className="flex gap-2">
          <input
            type="color"
            aria-label={`${field.label} 선택`}
            value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-line bg-field p-0.5"
          />
          <input id={id} value={hex} onChange={(e) => onChange(e.target.value)} maxLength={7} aria-invalid={invalid || undefined} aria-describedby={describedBy} className={cx(inputCls(invalid), 'font-mono')} />
        </div>
      );
      break;
    }
    case 'list':
      control = <ListControl field={field} items={list({ v: value }, 'v')} onChange={onChange} id={id} />;
      break;
    case 'table':
      control = <TableControl field={field} rows={rows({ v: value }, 'v')} onChange={onChange} id={id} />;
      break;
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-baseline gap-1.5 text-sm text-fg">
        {field.label}
        {field.required && <span className="text-xs text-fg-subtle">필수</span>}
      </label>
      {control}
      {field.help && <p id={`${id}-help`} className="mt-1 text-xs text-fg-subtle">{field.help}</p>}
      <FieldIssues id={`${id}-issues`} issues={issues} />
    </div>
  );
}

function FieldIssues({ id, issues }: { id: string; issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul id={id} className="mt-1 space-y-0.5">
      {issues.map((i) => (
        <li key={i.key} className={cx('text-xs', i.level === 'error' ? 'text-danger' : 'text-warning')}>
          {i.message}
        </li>
      ))}
    </ul>
  );
}

// ── Text with reference insertion ─────────────────────

interface TextControlProps {
  id: string;
  invalid: boolean;
  describedBy?: string;
  field: TextField;
  value: string;
  onChange: (v: string) => void;
  nodeId: string;
}

function TextControl({ id, invalid, describedBy, field, value, onChange, nodeId }: TextControlProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);

  useEffect(() => {
    if (pendingCaret.current === null || !ref.current) return;
    ref.current.focus();
    ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);

  const insert = (token: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    pendingCaret.current = start + token.length;
    onChange(value.slice(0, start) + token + value.slice(end));
  };

  const props = {
    id,
    ref,
    value,
    placeholder: field.placeholder,
    maxLength: field.maxLength ? field.maxLength * 2 : undefined, // let validation explain overflows instead of silently truncating
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    spellCheck: false,
  };

  return (
    <div className="relative">
      {field.kind === 'textarea' ? (
        <textarea {...props} rows={4} className={cx(inputBase, 'min-h-20 resize-y py-1.5 leading-relaxed', invalid ? 'border-danger' : 'border-line', field.refs && 'pr-10')} />
      ) : (
        <input {...props} className={cx(inputCls(invalid), field.refs && 'pr-10')} />
      )}
      {field.refs && (
        <div className="absolute top-0.5 right-0.5">
          <RefMenu nodeId={nodeId} accepts={Array.isArray(field.refs) ? field.refs : undefined} onPick={insert} />
        </div>
      )}
    </div>
  );
}

const typeOk = (accepts: ValueType[] | undefined, t: ValueType) =>
  !accepts || t === 'any' || accepts.includes(t) || (t === 'member' && accepts.includes('user'));

function RefMenu({ nodeId, accepts, onPick }: { nodeId: string; accepts?: ValueType[]; onPick: (token: string) => void }) {
  const { open, setOpen, root } = usePopover();
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  let sources: ReturnType<typeof refSources> = [];
  if (open) {
    const { nodes, edges } = useProject.getState();
    sources = refSources(indexGraph(nodes, edges), nodeId)
      .map((s) => ({ ...s, outputs: s.outputs.filter((o) => typeOk(accepts, o.type)) }))
      .filter((s) => s.outputs.length > 0);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        data-popover-trigger
        aria-label="변수 넣기"
        title="앞 노드의 값을 넣습니다"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex size-7 items-center justify-center rounded text-fg-subtle hover:bg-hover hover:text-fg"
      >
        <Braces size={15} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label="넣을 값"
          onKeyDown={onMenuKeyDown}
          className="absolute top-full right-0 z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-line bg-raised p-1 shadow-lg"
        >
          {sources.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-fg-muted">
              넣을 수 있는 값이 없습니다. 이 노드 앞에 값을 내보내는 노드를 연결하세요.
            </p>
          ) : (
            sources.map((s) => (
              <div key={s.node.id} role="group" aria-label={`#${nodeNumber(s.node.id)} ${s.def.label}`}>
                <div className="px-2.5 pt-2 pb-1 text-xs text-fg-subtle">
                  <span className="font-mono">#{nodeNumber(s.node.id)}</span> {s.def.label}
                </div>
                {s.outputs.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onPick(nodeRef(s.node.id, o.key));
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-fg outline-none hover:bg-hover focus-visible:bg-hover"
                  >
                    <span className="truncate">{o.label}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{TYPE_LABEL[o.type]}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Number ────────────────────────────────────────────

interface NumberControlProps {
  id: string;
  invalid: boolean;
  describedBy?: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
}

function NumberControl({ id, invalid, describedBy, value, onChange, min, max, step }: NumberControlProps) {
  // Local text keeps partial input like "-" or "1." while typing.
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => {
    if (value === undefined ? text !== '' : Number(text) !== value) setText(value === undefined ? '' : String(value));
  }, [value]);
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      value={text}
      min={min}
      max={max}
      step={step ?? 'any'}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.valueAsNumber;
        if (e.target.value === '') onChange(undefined);
        else if (Number.isFinite(n)) onChange(n);
      }}
      className={cx(inputCls(invalid), 'tabular-nums')}
    />
  );
}

// ── Switch ────────────────────────────────────────────

function Switch({ id, checked, onChange, describedBy }: { id: string; checked: boolean; onChange: (v: boolean) => void; describedBy?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-100',
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-field',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'inline-block size-3.5 rounded-full bg-white transition-transform duration-100',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

// ── List of strings ───────────────────────────────────

function ListControl({ field, items, onChange, id }: { field: ListField; items: string[]; onChange: (v: string[]) => void; id: string }) {
  const lastInput = useRef<HTMLInputElement>(null);
  const [focusLast, setFocusLast] = useState(false);
  useEffect(() => {
    if (focusLast) {
      lastInput.current?.focus();
      setFocusLast(false);
    }
  }, [focusLast]);

  const add = () => {
    onChange([...items, '']);
    setFocusLast(true);
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            id={i === 0 ? id : undefined}
            ref={i === items.length - 1 ? lastInput : undefined}
            value={item}
            placeholder={field.placeholder}
            aria-label={`${field.label} ${i + 1}`}
            onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && i === items.length - 1 && items.length < field.maxItems) {
                e.preventDefault();
                add();
              }
            }}
            className={inputCls()}
          />
          <RemoveButton label={`${field.label} ${i + 1} 삭제`} onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      {items.length < field.maxItems && (
        <AddButton id={items.length === 0 ? id : undefined} onClick={add}>항목 추가</AddButton>
      )}
    </div>
  );
}

// ── Table (list of objects) ───────────────────────────

const wide = (c: TableColumn) => c.kind === 'text' && !c.pattern && (c.maxLength ?? 0) > 45;

function TableControl({ field, rows: data, onChange, id }: { field: TableField; rows: TableRow[]; onChange: (v: TableRow[]) => void; id: string }) {
  const newRow = (): TableRow => Object.fromEntries(field.columns.map((c) => [c.key, c.default ?? (c.kind === 'boolean' ? false : c.kind === 'select' ? c.options?.[0]?.value ?? '' : '')]));
  const update = (i: number, key: string, v: string | boolean) => onChange(data.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="space-y-2">
      {data.map((row, i) => (
        <fieldset key={i} className="rounded-md border border-line p-2.5">
          <legend className="sr-only">{`${field.label} ${i + 1}`}</legend>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-fg-subtle">{i + 1}</span>
            <RemoveButton label={`${field.label} ${i + 1} 삭제`} onClick={() => onChange(data.filter((_, j) => j !== i))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field.columns.map((c) => {
              const cid = `${id}-${i}-${c.key}`;
              const v = row[c.key];
              if (c.kind === 'boolean') {
                return (
                  <label key={c.key} htmlFor={cid} className="flex items-center gap-2 self-end pb-1.5 text-sm text-fg">
                    <input id={cid} type="checkbox" checked={v === true} onChange={(e) => update(i, c.key, e.target.checked)} className="size-4 accent-[var(--accent)]" />
                    {c.label}
                  </label>
                );
              }
              return (
                <div key={c.key} className={wide(c) ? 'col-span-2' : undefined}>
                  <label htmlFor={cid} className="mb-1 block text-xs text-fg-muted">{c.label}</label>
                  {c.kind === 'select' ? (
                    <select id={cid} value={typeof v === 'string' ? v : ''} onChange={(e) => update(i, c.key, e.target.value)} className={inputCls()}>
                      {c.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input id={cid} value={typeof v === 'string' ? v : ''} placeholder={c.placeholder} spellCheck={false} onChange={(e) => update(i, c.key, e.target.value)} className={inputCls()} />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      {data.length < field.maxRows && (
        <AddButton id={data.length === 0 ? id : undefined} onClick={() => onChange([...data, newRow()])}>{field.addLabel}</AddButton>
      )}
    </div>
  );
}

function AddButton({ id, onClick, children }: { id?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[13px] text-accent-fg hover:bg-accent-soft"
    >
      <Plus size={14} strokeWidth={2} aria-hidden />
      {children}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-hover hover:text-danger"
    >
      <X size={14} strokeWidth={2} aria-hidden />
    </button>
  );
}
