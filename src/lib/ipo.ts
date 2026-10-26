import type { Ipo } from '../data/types';

export type IpoStatus = 'upcoming' | 'open' | 'listing' | 'listed';

export const STATUS_LABEL: Record<IpoStatus, string> = {
  upcoming: '청약 예정',
  open: '청약 중',
  listing: '상장 예정',
  listed: '상장 완료',
};

/** 오늘 날짜(로컬) YYYY-MM-DD — 문자열 비교로 날짜 순서를 판단한다 */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function statusOf(ipo: Ipo, now = today()): IpoStatus {
  if (now < ipo.subscriptionStart) return 'upcoming';
  if (now <= ipo.subscriptionEnd) return 'open';
  if (!ipo.listingDate || now < ipo.listingDate) return 'listing';
  return 'listed';
}

/** 2026-10-26 → 10.26(월). 날짜가 아직 없으면 '미정' */
export function shortDate(iso: string | null): string {
  if (!iso) return '미정';
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}.${d.getDate()}(${'일월화수목금토'[d.getDay()]})`;
}

export function dDay(iso: string, now = today()): string {
  const days = Math.round((Date.parse(`${iso}T00:00:00`) - Date.parse(`${now}T00:00:00`)) / 86_400_000);
  return days === 0 ? '오늘' : days > 0 ? `D-${days}` : `D+${-days}`;
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const eok = (n: number) => `${n.toLocaleString('ko-KR')}억 원`;
/** 원 단위 금액 → 억 원(소수 첫째 자리) */
export const eokAmount = (wonAmount: number) => eok(Math.round(wonAmount / 1e7) / 10);
