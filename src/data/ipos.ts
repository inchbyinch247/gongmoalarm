import snapshot from '../../collector/data/ipos.json';
import type { Ipo } from './types';

// 수집기(GitHub Actions)가 매일 갱신하는 공개 JSON. raw.githubusercontent.com은 CORS를 모두 허용한다.
export const DATA_URL = 'https://raw.githubusercontent.com/inchbyinch247/gongmoalarm/main/collector/data/ipos.json';

/** 빌드에 포함된 스냅샷 — 첫 화면을 바로 그리고, 최신 데이터를 못 받으면 이걸 계속 쓴다 */
export const SNAPSHOT = snapshot as Ipo[];

const isIpo = (v: unknown): v is Ipo =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Ipo).id === 'string' &&
  typeof (v as Ipo).name === 'string' &&
  typeof (v as Ipo).subscriptionStart === 'string' &&
  Array.isArray((v as Ipo).underwriters);

/** 최신 데이터. 실패하거나 형식이 다르면 null — 호출하는 쪽은 스냅샷을 유지한다 */
export async function fetchLatest(): Promise<Ipo[] | null> {
  if (!DATA_URL) return null;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return Array.isArray(data) && data.length > 0 && data.every(isIpo) ? data : null;
  } catch {
    return null;
  }
}
