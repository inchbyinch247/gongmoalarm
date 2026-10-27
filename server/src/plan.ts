// 오늘 보낼 알림을 정한다 — 네트워크·DB 없이 테스트할 수 있게 워커와 분리했다

export interface IpoLite {
  id: string;
  name: string;
  subscriptionStart: string;
  listingDate: string | null;
}

export interface Message {
  anonKey: string;
  context: Record<string, string>;
}

export const TEMPLATE_SUBSCRIPTION = 'gongmoalarm-subscription-start';
export const TEMPLATE_LISTING = 'gongmoalarm-listing';

/** 한국 시간 기준 오늘(YYYY-MM-DD) */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 이름 뒤에 주격 조사를 붙인다 — 끝 글자 받침 유무로 이/가 */
export function withSubject(name: string): string {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  // shortcut: 한글로 끝나지 않는 이름은 '이(가)'로 둔다. 영문·숫자로 끝나는 종목이 잦아지면 읽기 규칙을 넣는다
  if (code < 0 || code > 11171) return `${name}이(가)`;
  return `${name}${code % 28 ? '이' : '가'}`;
}

/** "A", "A 외 2곳" */
export function joinNames(names: string[]): string {
  return names.length > 1 ? `${names[0]} 외 ${names.length - 1}곳` : (names[0] ?? '');
}

/** 청약일 알림: 오늘 청약을 시작하는 종목을 동의자 전원에게 한 통으로 */
export function subscriptionMessages(ipos: IpoLite[], today: string, users: string[]): Message[] {
  const names = ipos
    .filter((i) => i.subscriptionStart === today)
    .map((i) => i.name)
    .sort();
  if (names.length === 0) return [];
  const ipoNames = joinNames(names);
  return users.map((anonKey) => ({ anonKey, context: { ipoNames } }));
}

/** 상장일 알림: 오늘 상장하는 종목에 '청약했어요'를 누른 사용자에게 종목마다 한 통 */
export function listingMessages(ipos: IpoLite[], today: string, subs: { anonKey: string; ipoId: string }[]): Message[] {
  const listing = new Map(ipos.filter((i) => i.listingDate === today).map((i) => [i.id, i]));
  return subs.flatMap((s) => {
    const ipo = listing.get(s.ipoId);
    return ipo ? [{ anonKey: s.anonKey, context: { ipoSubject: withSubject(ipo.name), ipoId: ipo.id } }] : [];
  });
}

/** 대량 발송 1회 최대 2,500건 */
export function chunk<T>(items: T[], size = 2500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** /sync 요청 본문 검증 — 신뢰할 수 없는 입력 */
export function parseSyncBody(body: unknown): { code: string; subscribed: string[] } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { code, subscribed } = body as Record<string, unknown>;
  if (typeof code !== 'string' || code.length === 0 || code.length > 512) return null;
  if (!Array.isArray(subscribed) || subscribed.length > 200) return null;
  // 종목 id는 DART 고유번호(8자리 숫자)
  if (!subscribed.every((id) => typeof id === 'string' && /^\d{8}$/.test(id))) return null;
  return { code, subscribed: [...new Set(subscribed as string[])] };
}
