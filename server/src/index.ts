import {
  type IpoLite,
  type Message,
  TEMPLATE_LISTING,
  TEMPLATE_SUBSCRIPTION,
  chunk,
  listingMessages,
  parseSyncBody,
  subscriptionMessages,
  todayKst,
} from './plan.ts';

interface Env {
  DB: D1Database;
  /** 앱인토스 콘솔에서 발급한 mTLS 클라이언트 인증서 — 파트너 API는 이걸로만 호출된다 */
  TOSS: Fetcher;
  DATA_URL: string;
}

const API = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function tossApi(env: Env, path: string, body: unknown) {
  const res = await env.TOSS.fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // 업무 오류도 HTTP 200으로 오므로 resultType으로 판정한다
  const json = (await res.json().catch(() => null)) as { resultType?: string; success?: any; error?: unknown } | null;
  if (json?.resultType !== 'SUCCESS') throw new Error(`${path} ${res.status} ${JSON.stringify(json?.error ?? json)}`);
  return json.success;
}

/** 앱이 보낸 일회용 코드를 익명 키로 바꾼다 — 요청자가 실제 그 사용자임을 토스가 보증한다 */
async function exchange(env: Env, code: string): Promise<string | null> {
  try {
    const success = await tossApi(env, '/users/anon-key/exchange', { code });
    return typeof success?.anonKey === 'string' ? success.anonKey : null;
  } catch (e) {
    console.warn('exchange failed', e);
    return null;
  }
}

/** POST /sync {code, subscribed} — 알림에 동의한 사용자와 그 사람의 '청약했어요' 목록을 통째로 맞춘다 */
async function sync(req: Request, env: Env): Promise<Response> {
  const input = parseSyncBody(await req.json().catch(() => null));
  if (!input) return new Response('bad request', { status: 400, headers: CORS });
  const anonKey = await exchange(env, input.code);
  if (!anonKey) return new Response('unauthorized', { status: 401, headers: CORS });

  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO users (anon_key) VALUES (?)').bind(anonKey),
    env.DB.prepare('DELETE FROM subscriptions WHERE anon_key = ?').bind(anonKey),
    ...input.subscribed.map((id) => env.DB.prepare('INSERT INTO subscriptions (anon_key, ipo_id) VALUES (?, ?)').bind(anonKey, id)),
  ]);
  return new Response(null, { status: 204, headers: CORS });
}

/** 같은 날 같은 템플릿은 한 번만 — 수동 재실행으로 같은 알림이 두 번 가지 않게 */
async function sendOnce(env: Env, day: string, template: string, messages: Message[]) {
  if (messages.length === 0) return;
  const claimed = await env.DB.prepare('INSERT OR IGNORE INTO sends (day, template) VALUES (?, ?)').bind(day, template).run();
  if (claimed.meta.changes === 0) return console.log(`skip ${template} ${day}: already sent`);
  try {
    // shortcut: 건수와 상관없이 대량 발송 API를 쓴다(워커 무료 플랜은 실행당 외부 요청 50회 제한). 문서는 50건 이상일 때 쓰라고 권한다
    for (const part of chunk(messages)) {
      const r = await tossApi(env, '/messenger/send-bulk-message', { templateSetCode: template, contextList: part });
      console.log(`${template} ${day}: ${r?.msgCount ?? 0}건 발송`);
    }
  } catch (e) {
    // 실패하면 기록을 지워 다시 실행할 수 있게 한다
    await env.DB.prepare('DELETE FROM sends WHERE day = ? AND template = ?').bind(day, template).run();
    throw e;
  }
}

async function sendToday(env: Env, now = new Date()) {
  const res = await fetch(env.DATA_URL, { cf: { cacheTtl: 0 } });
  if (!res.ok) throw new Error(`data ${res.status}`);
  const ipos = (await res.json()) as IpoLite[];
  const day = todayKst(now);

  const users = await env.DB.prepare('SELECT anon_key FROM users').all<{ anon_key: string }>();
  await sendOnce(env, day, TEMPLATE_SUBSCRIPTION, subscriptionMessages(ipos, day, users.results.map((u) => u.anon_key)));

  const subs = await env.DB.prepare('SELECT anon_key AS anonKey, ipo_id AS ipoId FROM subscriptions').all<{ anonKey: string; ipoId: string }>();
  await sendOnce(env, day, TEMPLATE_LISTING, listingMessages(ipos, day, subs.results));
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const { pathname } = new URL(req.url);
    if (req.method === 'POST' && pathname === '/sync') return sync(req, env);
    return new Response('not found', { status: 404, headers: CORS });
  },
  async scheduled(controller, env) {
    await sendToday(env, new Date(controller.scheduledTime));
  },
} satisfies ExportedHandler<Env>;
