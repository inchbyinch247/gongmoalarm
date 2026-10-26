// 증권신고서 뷰어 HTML(절 단위)에서 값을 뽑는 순수 함수들. 네트워크를 쓰지 않는다.

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** 태그를 지운 한 줄 텍스트 */
export function toText(html: string): string {
  return decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * 표를 행 단위 셀 배열로 — 회사마다 표 모양이 달라 셀 위치 대신 라벨 순서로 찾는다.
 * 뷰어 HTML은 td/th, 원본 XML(document.xml)은 TE/TU 셀을 쓴다.
 */
export function toRows(html: string): string[][] {
  const rows: string[][] = [];
  for (const tr of html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = (tr.match(/<(t[dheu])\b[^>]*>[\s\S]*?<\/\1>/gi) ?? []).map(toText);
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

const num = (s: string) => Number(s.replace(/[^\d.-]/g, ''));
/** "(1,600,838,550)" 같은 손실 표기를 음수로 */
const signed = (s: string) => (/^\(.*\)$/.test(s.trim()) ? -num(s) : num(s));

/** 2026년 11월 24일 → 2026-11-24 */
export function isoDate(s: string): string | null {
  const m = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/) ?? s.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

/** 라벨 행 바로 다음 행에서 같은 열의 값을 꺼낸다(신고서 표는 라벨 행 → 값 행 순서) */
function valueBelow(rows: string[][], label: string): string | null {
  for (let i = 0; i < rows.length - 1; i++) {
    const col = rows[i].findIndex((c) => c.replace(/\s/g, '') === label);
    if (col >= 0) return rows[i + 1][col] ?? null;
  }
  return null;
}

export interface GeneralInfo {
  market: '코스피' | '코스닥' | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  price: number | null;
  shares: number | null;
  underwriters: string[];
}

/** 요약정보 "모집 또는 매출에 관한 일반사항" */
export function parseGeneral(html: string): GeneralInfo {
  const rows = toRows(html);
  const text = toText(html);
  const sbd = valueBelow(rows, '청약기일') ?? '';
  const [start, end] = sbd.split('~').map((s) => isoDate(s));
  const price = valueBelow(rows, '모집(매출)가액');
  const shares = valueBelow(rows, '증권수량');

  // 인수인 표: '인수(주선)인' 라벨 행 다음부터 '청약기일' 라벨 행 전까지, 둘째 칸이 증권사명
  const underwriters: string[] = [];
  const from = rows.findIndex((r) => r[0]?.replace(/\s/g, '').startsWith('인수(주선)인') || r[0]?.replace(/\s/g, '') === '인수인');
  if (from >= 0) {
    for (const r of rows.slice(from + 1)) {
      if (r.some((c) => c.replace(/\s/g, '') === '청약기일')) break;
      if (r.length >= 2 && /^(대표|공동|인수|주관)/.test(r[0])) underwriters.push(r[1].replace(/㈜|\(주\)|주식회사/g, '').trim());
    }
  }

  return {
    market: /유가증권시장/.test(text) ? '코스피' : /코스닥시장/.test(text) ? '코스닥' : null,
    subscriptionStart: start ?? null,
    subscriptionEnd: end ?? start ?? null,
    price: price ? num(price) || null : null,
    shares: shares ? num(shares) || null : null,
    underwriters: [...new Set(underwriters)],
  };
}

/** "공모가격 결정방법"의 희망공모가액 밴드 */
export function parsePriceBand(html: string): [number, number] | null {
  const m = toText(html).match(/(?:희망공모가액|공모희망가액)[^0-9]{0,40}([\d,]+)\s*원\s*~\s*([\d,]+)\s*원/);
  return m ? [num(m[1]), num(m[2])] : null;
}

/**
 * "기타위험"의 상장 직후 유통가능 물량. 회사마다 문장 순서가 달라 이렇게 찾는다:
 * "상장 직후 … 유통 가능" 앞의 마지막 "N주" 또는 "상장일 유통가능 물량은 N주" 뒤의 첫 "N주"가 물량,
 * 그 괄호 안 % 또는 같은 문장에서 가장 가까운 %가 비율.
 */
export function parseFloat(html: string): { shares: number; ratio: number } | null {
  const text = toText(html);
  // 신고서 오타("37,68%")까지 받는다
  const pct = (s: string) => Number(s.replace(/^(\d+),(\d{1,2})$/, '$1.$2'));
  let sharesMatch: RegExpMatchArray | undefined;
  let sharesPos = -1;
  let anchor = text.search(/상장일\s*유통\s*가능\s*물량은/);
  if (anchor >= 0) {
    sharesMatch = text.slice(anchor).match(/([\d,]{3,})\s*주/) ?? undefined;
    if (sharesMatch) sharesPos = anchor + sharesMatch.index!;
  } else {
    anchor = text.search(/상장\s*직후\s*(?:시장에서\s*)?유통\s*가능/);
    if (anchor < 0) return null;
    const start = text.lastIndexOf('. ', anchor) + 1;
    sharesMatch = [...text.slice(start, anchor).matchAll(/([\d,]{3,})\s*주/g)].at(-1);
    if (sharesMatch) sharesPos = start + sharesMatch.index!;
  }
  if (!sharesMatch) return null;
  const sentenceStart = text.lastIndexOf('. ', sharesPos) + 1;
  const sentenceEnd = text.indexOf('. ', anchor) < 0 ? text.length : text.indexOf('. ', anchor);
  const paren = text.slice(sharesPos + sharesMatch[0].length).match(/^\s*\([^)%]*?(\d+(?:[.,]\d+)?)\s*%/);
  const nearest = [...text.slice(sentenceStart, sentenceEnd).matchAll(/(\d+(?:\.\d+)?)\s*%/g)]
    .map((m) => ({ ratio: Number(m[1]), dist: Math.abs(sentenceStart + m.index! - sharesPos) }))
    .sort((a, b) => a.dist - b.dist)[0];
  const ratio = paren ? pct(paren[1]) : nearest?.ratio;
  return ratio === undefined || Number.isNaN(ratio) ? null : { shares: num(sharesMatch[1]), ratio };
}

const isPeriodCell = (c: string) => /\d{4}|제\s*\d+\s*기/.test(c) && !/[\d,]{5,}/.test(c.replace(/\d{4}[.\-년]/g, ''));
/** 반기·분기가 아닌 사업연도 열인가 — "2025년도(제7기)", "제19기(2025년12월말)", "2025.01.01~2025.12.31", "제27기 2026.03.31"(3월 결산) */
function isFullYear(c: string): boolean {
  if (/반기|분기/.test(c)) return false;
  const monthEnd = c.match(/(\d{1,2})\s*월\s*말/);
  if (monthEnd && Number(monthEnd[1]) !== 12) return false; // "2026년6월말" = 반기
  const range = c.match(/\d{4}[.\-](\d{1,2})[.\-]\d{1,2}\s*~\s*\d{4}[.\-](\d{1,2})[.\-]\d{1,2}/);
  if (range) return (Number(range[2]) - Number(range[1]) + 12) % 12 === 11; // 12개월 기간만
  return true;
}
/** 열 설명에서 사업연도: 기간이면 끝 날짜의 연도, 아니면 첫 4자리 연도 */
const yearOf = (c: string) => Number(c.match(/(\d{4})[.\-]\d{1,2}[.\-]\d{1,2}\s*$/)?.[1] ?? c.match(/~\s*(\d{4})/)?.[1] ?? c.match(/(\d{4})/)?.[1]);

/** "요약재무정보" 첫 표(연결 우선)에서 가장 최근 사업연도 열의 매출액·영업이익(억 원) */
export function parseFinancials(html: string): { year: number; revenue: number; operatingProfit: number } | null {
  const rows = toRows(html);
  const label = (row: string[]) => row[0]?.replace(/[\s\-ㆍ·]|^[ⅠⅡⅢⅣⅤIVX\d]+\./g, '') ?? '';
  // "매출채권"이 먼저 나오므로 접두어가 아니라 라벨 전체로 맞춘다
  const revenueRow = rows.findIndex((r) => /^(매출액|영업수익|매출)(\(.*\))?$/.test(label(r)));
  const opRow = rows.findIndex((r) => /^영업(이익|손실)/.test(label(r)));
  if (revenueRow < 0 || opRow < 0) return null;

  // 매출액 행보다 위에 있는 첫 기간 헤더. 바로 아래 행이 기간 보조 줄(기수·날짜)이면 합쳐서 본다
  const h = rows.findIndex((r, i) => i < revenueRow && r.filter(isPeriodCell).length >= 2);
  if (h < 0) return null;
  const header = rows[h];
  const sub = rows[h + 1]?.every((c) => isPeriodCell(c) || c.trim() === '') ? rows[h + 1] : [];
  // 헤더 행은 첫 칸(구분)이 비거나 병합돼 값 행보다 짧을 수 있다 — 오른쪽 끝 기준으로 열을 맞춘다
  const desc = header.map((c, i) => `${c} ${sub[i - (header.length - sub.length)] ?? ''}`.trim());
  const col = desc.findIndex((c) => isPeriodCell(c) && isFullYear(c));
  if (col < 0) return null;
  const year = yearOf(desc[col]);
  const fromEnd = header.length - col;
  const pick = (r: string[]) => signed(r[r.length - fromEnd] ?? '');
  const revenue = pick(rows[revenueRow]);
  const op = pick(rows[opRow]);
  if (revenue === null || op === null || Number.isNaN(revenue) || Number.isNaN(op)) return null;
  // 표 단위가 회사마다 다르다: (단위 : 원 | 천원 | 백만원)
  const unit = toText(html).match(/단위\s*[:：]\s*(백만원|천원|원)/)?.[1] ?? '원';
  const toWon = { 원: 1, 천원: 1e3, 백만원: 1e6 }[unit]!;
  const eok = (v: number) => Math.round((v * toWon) / 1e7) / 10;
  return { year, revenue: eok(revenue), operatingProfit: eok(op) };
}

/** [발행조건확정] 신고서의 확정공모가 — 정정 전·후 표가 함께 있어 표 대신 결정 문장을 본다 */
export function parseConfirmedPrice(html: string): number | null {
  const m = toText(html).match(/확정공모가액을\s*([\d,]+)\s*원으로\s*(?:최종\s*)?결정/);
  return m ? num(m[1]) : null;
}

/**
 * 수요예측 확약기간별 참여내역의 의무보유확약비율(신청수량 기준, %).
 * "미확약" 행과 그 아래 "합계" 행의 마지막 열 묶음(건수|수량|신청가격)에서 수량을 읽어 1 - 미확약/합계.
 * 미확약이 확약 행들 위에 오는 표("1. 미확약 … 5. 6개월 확약, 합계")도 있어 합계는 몇 줄 아래까지 찾는다.
 */
export function parseLockup(html: string): number | null {
  const rows = toRows(html);
  const flat = (r: string[] | undefined) => r?.[0]?.replace(/\s|^\d+\./g, '') ?? '';
  // 표가 여러 쪽으로 나뉘면 마지막 쪽에 전체 합계 열이 있다
  const i = rows.findLastIndex((r) => flat(r) === '미확약');
  if (i < 0) return null;
  const t = rows.findIndex((r, idx) => idx > i && idx <= i + 8 && flat(r) === '합계');
  if (t < 0) return null;
  const qty = (r: string[]) => num(r[r.length - 2]);
  const unlocked = qty(rows[i]);
  const total = qty(rows[t]);
  if (!total || Number.isNaN(unlocked) || unlocked > total) return null;
  return Math.round((1 - unlocked / total) * 10000) / 100;
}

/** 상장(매매개시)예정일 — 증권신고서 최초본에는 대개 없다 */
export function parseListingDate(html: string): string | null {
  const m = toText(html).match(/(?:상장\s*예정일|매매\s*개시\s*(?:예정)?일)[^0-9]{0,20}(\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일|\d{4}[.-]\d{1,2}[.-]\d{1,2})/);
  return m ? isoDate(m[1]) : null;
}
