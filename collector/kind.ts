// 한국거래소 KIND "공모기업현황" 목록에서 상장예정일·확정공모가를 가져온다(하루 한두 번 요청).
import { toRows } from './parse.ts';

export interface KindSchedule {
  listingDate: string | null;
  offerPrice: number | null;
}

const PAGE_SIZE = 100;

/** 회사명 비교용 — "(주)", 공백 차이를 없앤다 */
export const normalizeName = (s: string) => s.replace(/\(주\)|㈜|주식회사|\s/g, '');

/** 공모기업현황 표 → 회사명별 일정. 열: 회사명|신고서제출일|수요예측일|청약일|납입일|확정공모가|공모금액|상장예정일|주관사 */
export function parseKindList(html: string): Map<string, KindSchedule> {
  const out = new Map<string, KindSchedule>();
  for (const r of toRows(html)) {
    if (r.length < 9 || !/^\d{4}-\d{2}-\d{2}$/.test(r[1])) continue;
    out.set(normalizeName(r[0]), {
      listingDate: /^\d{4}-\d{2}-\d{2}$/.test(r[7]) ? r[7] : null,
      offerPrice: /\d/.test(r[5]) ? Number(r[5].replace(/,/g, '')) : null,
    });
  }
  return out;
}

export async function fetchKindSchedules(fromDate: string, toDate: string): Promise<Map<string, KindSchedule>> {
  const all = new Map<string, KindSchedule>();
  for (let page = 1; page <= 10; page++) {
    const body = new URLSearchParams({
      method: 'searchPubofrProgComSub',
      currentPageSize: String(PAGE_SIZE),
      pageIndex: String(page),
      orderMode: '1',
      orderStat: 'D',
      marketType: '',
      fromDate,
      toDate,
      searchCorpName: '',
    });
    const res = await fetch('https://kind.krx.co.kr/listinvstg/pubofrprogcom.do', { method: 'POST', body });
    if (!res.ok) throw new Error(`KIND ${res.status}`);
    const rows = parseKindList(await res.text());
    for (const [k, v] of rows) all.set(k, v);
    if (rows.size < PAGE_SIZE) break;
  }
  return all;
}
