import { ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { BotRequirements } from '../compiler/compile';
import { desktop } from '../platform';
import { CopyButton, CopyCode } from '../ui/copy';
import { t } from '../i18n/t';
import { tx } from '../i18n/tx';

const PORTAL = 'https://discord.com/developers/home';

/** Names the developer portal shows for privileged intents. */
const INTENT_NAMES: Record<string, string> = {
  MessageContent: 'Message Content Intent',
  GuildMembers: 'Server Members Intent',
  GuildPresences: 'Presence Intent',
};

function Link({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-baseline gap-0.5 break-all text-accent-fg underline underline-offset-2">
      {children ?? href}
      <ExternalLink size={12} className="shrink-0 self-center" aria-hidden />
    </a>
  );
}

// ── AI notes ──────────────────────────────────────────

// `code`, **bold** or a bare http(s) URL; nothing else becomes markup.
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]])/g;
const IS_URL = /^https?:\/\/\S+$/;

function Inline({ text }: { text: string }) {
  return text.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    const value = part.startsWith('`') ? part.slice(1, -1) : part;
    if (IS_URL.test(value)) {
      return (
        <span key={i} className="inline-flex max-w-full items-center gap-0.5 align-baseline">
          <Link href={value} />
          <CopyButton text={value} label={t('링크 복사')} />
        </span>
      );
    }
    return <CopyCode key={i} text={value} />;
  });
}

/** The AI's install notes, with links that open and code that copies on click. */
export function Notes({ text }: { text: string }) {
  if (!text.trim()) return <p className="mt-1.5 text-fg-muted">{t('(없음)')}</p>;
  // Odd parts are the bodies of ``` fenced blocks.
  const parts = text.split(/```[^\n]*\n([\s\S]*?)```/g);
  return (
    <div className="mt-1.5 space-y-2 text-fg">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <div key={i} className="relative">
            <pre className="scroll-hidden-y overflow-x-auto rounded-md bg-canvas py-2 pr-10 pl-3 font-mono text-[12.5px] leading-relaxed">{part.replace(/\n$/, '')}</pre>
            <CopyButton text={part.replace(/\n$/, '')} label={t('코드 복사')} className="absolute top-1.5 right-1.5" />
          </div>
        ) : part.trim() ? (
          <div key={i} className="leading-relaxed whitespace-pre-wrap">
            <Inline text={part.replace(/^\n+|\n+$/g, '')} />
          </div>
        ) : null,
      )}
    </div>
  );
}

// ── Discord setup ─────────────────────────────────────

/** Variable names a generated project expects, read from its .env.example. */
export function envNames(files: { path: string; content: string }[]): string[] {
  const example = files.find((f) => f.path === '.env.example')?.content ?? '';
  return [...new Set([...example.matchAll(/^\s*([A-Z][A-Z0-9_]{0,63})\s*=/gm)].map((m) => m[1]))];
}

const APP_ID = /^\d{17,20}$/;

function InviteLink({ permissions }: { permissions: string }) {
  const [id, setId] = useState('');
  const valid = APP_ID.test(id.trim());
  const url = `https://discord.com/oauth2/authorize?client_id=${id.trim()}&scope=bot%20applications.commands&permissions=${permissions}`;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <input
        value={id}
        onChange={(e) => setId(e.target.value.replace(/\D/g, '').slice(0, 20))}
        inputMode="numeric"
        placeholder="Application ID"
        aria-label="Application ID"
        className="h-7 w-52 rounded-md border border-line bg-field px-2 font-mono text-[13px] text-fg focus:border-accent focus:outline-none"
      />
      {valid ? (
        <>
          <Link href={url}>{t('봇 초대하기')}</Link>
          <CopyButton text={url} label={t('초대 링크 복사')} />
        </>
      ) : (
        <span className="text-xs text-fg-subtle">{t('숫자 17~20자리를 넣으면 초대 링크가 만들어집니다.')}</span>
      )}
    </div>
  );
}

/**
 * Steps a non-developer follows in the Discord developer portal to get the values the bot needs.
 * `requirements` is null when the result was made from another flow, so intents and permissions may not match.
 */
export function DiscordSetup({ env, requirements }: { env: string[]; requirements: BotRequirements | null }) {
  const has = (name: string) => env.includes(name);
  const intents = (requirements?.privilegedIntents ?? []).map((i) => INTENT_NAMES[i] ?? i);
  return (
    <section aria-labelledby="discord-setup">
      <h4 id="discord-setup" className="text-xs font-semibold text-fg-subtle">{t('디스코드에서 준비할 것')}</h4>
      <ol className="mt-1.5 list-decimal space-y-2 pl-5 leading-relaxed text-fg">
        <li>{tx('{0}에 로그인해 {1}으로 앱을 하나 만듭니다.', [<Link href={PORTAL}>{t('디스코드 개발자 포털')}</Link>, <b className="font-semibold">New Application</b>])}</li>
        {has('DISCORD_TOKEN') && (
          <li>{tx('왼쪽 {0} 메뉴에서 {1}을 눌러 나온 토큰을 {2}에 넣습니다. 토큰은 비밀번호와 같으니 다른 사람에게 보여 주지 마세요.', [<b className="font-semibold">Bot</b>, <b className="font-semibold">Reset Token</b>, <CopyCode text="DISCORD_TOKEN" />])}</li>
        )}
        {intents.length > 0 && (
          <li>{tx('같은 Bot 메뉴의 {0}에서 {1}를 켭니다.', [<b className="font-semibold">Privileged Gateway Intents</b>, intents.map((n, i) => <span key={n}>{i > 0 && ', '}<b className="font-semibold">{n}</b></span>)])}</li>
        )}
        {has('DISCORD_CLIENT_ID') && (
          <li>{tx('{0} 메뉴의 {1}를 {2}에 넣습니다.', [<b className="font-semibold">General Information</b>, <b className="font-semibold">Application ID</b>, <CopyCode text="DISCORD_CLIENT_ID" />])}</li>
        )}
        {has('DISCORD_GUILD_ID') && (
          <li>{tx('디스코드 앱의 {0}에서 개발자 모드를 켜고, 테스트할 서버 아이콘을 우클릭해 {1}를 누릅니다. 이 값을 {2}에 넣습니다.', [<b className="font-semibold">{t('사용자 설정 › 고급')}</b>, <b className="font-semibold">{t('서버 ID 복사')}</b>, <CopyCode text="DISCORD_GUILD_ID" />])}</li>
        )}
        {requirements && (
          <li>{tx('봇을 서버에 초대합니다. Application ID를 넣으면 이 흐름에 필요한 권한이 담긴 초대 링크가 만들어집니다.{0}', [<InviteLink permissions={requirements.permissionBits} />])}</li>
        )}
      </ol>
      <p className="mt-2 text-xs text-fg-subtle">
        {desktop ? t('값은 봇 실행 탭에 넣습니다. 직접 실행할 때는 프로젝트 폴더의 .env 파일에 넣습니다.') : t('값은 프로젝트 폴더에서 .env.example을 .env로 복사한 뒤 그 파일에 넣습니다.')}
      </p>
    </section>
  );
}
