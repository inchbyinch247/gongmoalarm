// 공모주 데이터 수집: OpenDART 공시 목록 → 회사별 증권신고서 원문 파싱 → KIND 상장예정일 → overrides.json 보정 → data/ipos.json
// 실행: npm run collect (.env의 DART_API_KEY 사용)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Ipo } from '../src/data/types.ts';
import { type Filing, type Section, fetchSections, listEquityFilings, sectionHtml } from './dart.ts';
import { type KindSchedule, fetchKindSchedules, normalizeName } from './kind.ts';
import { parseConfirmedPrice, parseFinancials, parseFloat, parseGeneral, parseListingDate, parseLockup, parsePriceBand } from './parse.ts';

const OUT = new URL('./data/ipos.json', import.meta.url);
const OVERRIDES = new URL('./overrides.json', import.meta.url);
const LOOKBACK_DAYS = 90; // 회사 미지정 공시 검색 한도(3개월)
const KEEP_AFTER_LISTING_DAYS = 30;

const apiKey = process.env.DART_API_KEY;
if (!apiKey) throw new Error('DART_API_KEY가 없습니다. opendart.fss.or.kr에서 발급받아 환경변수로 넣어 주세요.');

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const ymd = (d: Date) => isoDay(d).replaceAll('-', '');
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const readJson = <T>(url: URL, fallback: T): T => (existsSync(url) ? (JSON.parse(readFileSync(url, 'utf8')) as T) : fallback);

interface IpoFilings {
  /** 최신 전체 신고서(최초·[기재정정]) — 일정·밴드·재무·유통물량 */
  full?: Filing;
  /** [발행조건확정] — 확정공모가·확약비율만 담긴 정정 문서 */
  confirm?: Filing;
}

/**
 * 신규 상장 공모의 증권신고서(지분증권). 비상장(기타법인)이거나, 이미 상장돼 법인구분이 바뀐 회사는
 * KIND 공모기업 목록에 있을 때만 받는다(상장사 유상증자와 구분). 철회한 회사와 스팩은 뺀다.
 */
function ipoFilings(filings: Filing[], kindNames: Set<string>): Map<string, IpoFilings> {
  const withdrawn = new Set(filings.filter((f) => f.report_nm.includes('철회')).map((f) => f.corp_code));
  const byCorp = new Map<string, IpoFilings>();
  for (const f of filings) {
    const isIpo = f.corp_cls === 'E' || kindNames.has(normalizeName(f.corp_name));
    if (!isIpo || !f.report_nm.includes('증권신고서(지분증권)') || withdrawn.has(f.corp_code)) continue;
    // [첨부정정]·[첨부추가]는 첨부서류만 있어 본문(document.xml)이 없다
    if (f.report_nm.includes('첨부')) continue;
    // shortcut: 스팩(기업인수목적회사)은 사업 실체가 없어 재무·경쟁력이 비므로 v1에서 뺀다
    if (/기업인수목적|스팩/.test(f.corp_name)) continue;
    const entry = byCorp.get(f.corp_code) ?? {};
    const kind = f.report_nm.includes('발행조건확정') ? 'confirm' : 'full';
    if (!entry[kind] || f.rcept_no > entry[kind]!.rcept_no) entry[kind] = f;
    byCorp.set(f.corp_code, entry);
  }
  return byCorp;
}

const isoOf = (rcptDt: string) => `${rcptDt.slice(0, 4)}-${rcptDt.slice(4, 6)}-${rcptDt.slice(6)}`;
const wholeDoc = (sections: Section[]) => sections.map((s) => s.html).join(' ');

/** 전체 신고서에서 기본 정보를 만든다 */
async function fromFull(f: Filing, prev: Ipo | undefined): Promise<Ipo | null> {
  const sections = await fetchSections(apiKey!, f.rcept_no);
  // 목차가 없는 정정 문서도 있어 일반사항 절을 못 찾으면 문서 전체에서 찾는다
  const general = parseGeneral(sectionHtml(sections, /모집또는매출에관한일반사항/) || wholeDoc(sections));
  if (!general.subscriptionStart || !general.market) {
    console.warn(`건너뜀(${f.corp_name} ${f.rcept_no}): 청약기일·시장을 찾지 못함`);
    return null;
  }
  return {
    id: f.corp_code,
    name: f.corp_name,
    market: general.market,
    subscriptionStart: general.subscriptionStart,
    subscriptionEnd: general.subscriptionEnd ?? general.subscriptionStart,
    listingDate: parseListingDate(sectionHtml(sections, /공모개요/)) ?? prev?.listingDate ?? null,
    // 확정 전 신고서의 모집가액은 밴드 하단이라 공모가로 쓰지 않는다 — 확정가는 [발행조건확정]에서
    offerPrice: prev?.offerPrice ?? null,
    priceBand: parsePriceBand(sectionHtml(sections, /공모가격결정방법/)) ?? prev?.priceBand ?? null,
    // 기업 개요·경쟁력은 사람이 쓴다 — overrides.json에 적으면 main()에서 덮어쓴다
    summary: prev?.summary ?? null,
    financials: parseFinancials(sectionHtml(sections, /^\d*\.?요약재무정보/)) ?? prev?.financials ?? null,
    competitiveness: prev?.competitiveness ?? null,
    floatShares: parseFloat(sectionHtml(sections, /^\d*\.?기타위험/)) ?? prev?.floatShares ?? null,
    lockupRatio: prev?.lockupRatio ?? null,
    underwriters: general.underwriters,
    source: { doc: f.report_nm.trim(), asOf: isoOf(f.rcept_dt), rcptNo: f.rcept_no, confirmRcptNo: prev?.source.confirmRcptNo },
  };
}

/** [발행조건확정]에서 확정공모가·확약비율을 덮어쓴다. 기본 정보가 없으면(전체 신고서가 검색 기간 밖) 이 문서로 만든다 */
async function withConfirm(f: Filing, base: Ipo | null): Promise<Ipo | null> {
  const doc = wholeDoc(await fetchSections(apiKey!, f.rcept_no));
  if (!base) {
    const general = parseGeneral(doc);
    if (!general.subscriptionStart || !general.market) {
      console.warn(`건너뜀(${f.corp_name} ${f.rcept_no}): 청약기일·시장을 찾지 못함`);
      return null;
    }
    base = {
      id: f.corp_code, name: f.corp_name, market: general.market,
      subscriptionStart: general.subscriptionStart, subscriptionEnd: general.subscriptionEnd ?? general.subscriptionStart,
      listingDate: null, offerPrice: null, priceBand: null, summary: null, financials: null,
      competitiveness: null, floatShares: null, lockupRatio: null, underwriters: general.underwriters,
      source: { doc: '', asOf: '' },
    };
  }
  return {
    ...base,
    offerPrice: parseConfirmedPrice(doc) ?? base.offerPrice,
    lockupRatio: parseLockup(doc) ?? base.lockupRatio,
    listingDate: parseListingDate(doc) ?? base.listingDate,
    source: { ...base.source, doc: f.report_nm.trim(), asOf: isoOf(f.rcept_dt), confirmRcptNo: f.rcept_no },
  };
}

async function build({ full, confirm }: IpoFilings, prev: Ipo | undefined): Promise<Ipo | null> {
  // 같은 공시는 다시 받지 않는다
  let ipo: Ipo | null = full && prev?.source.rcptNo !== full.rcept_no ? await fromFull(full, prev) : (prev ?? null);
  if (confirm && ipo?.source.confirmRcptNo !== confirm.rcept_no) ipo = await withConfirm(confirm, ipo);
  return ipo;
}

const MISSING: (keyof Ipo)[] = ['listingDate', 'offerPrice', 'summary', 'financials', 'competitiveness', 'floatShares', 'lockupRatio'];

async function main() {
  const previous = new Map(readJson<Ipo[]>(OUT, []).map((i) => [i.id, i]));
  const overrides = readJson<Record<string, Partial<Ipo>>>(OVERRIDES, {});
  // KIND가 실패해도 DART 데이터는 저장한다 — 상장일만 이전 값으로 남는다
  const kind = await fetchKindSchedules(isoDay(daysAgo(LOOKBACK_DAYS)), isoDay(daysAgo(-180))).catch((e) => {
    console.warn(`KIND 조회 실패: ${e}`);
    return new Map<string, KindSchedule>();
  });
  const filings = ipoFilings(await listEquityFilings(apiKey!, ymd(daysAgo(LOOKBACK_DAYS)), ymd(new Date())), new Set(kind.keys()));
  console.log(`대상 회사 ${filings.size}곳 (KIND 공모기업 ${kind.size}곳)`);

  const results = new Map<string, Ipo>();
  for (const [corp, f] of filings) {
    const prev = previous.get(corp);
    const name = (f.full ?? f.confirm)!.corp_name;
    const ipo = await build(f, prev).catch((e) => (console.warn(`실패(${name}): ${e}`), prev ?? null));
    if (ipo) results.set(ipo.id, ipo);
  }
  // 검색 기간을 벗어났지만 아직 상장 전후인 종목은 이전 결과를 유지한다
  for (const [id, ipo] of previous) if (!results.has(id)) results.set(id, ipo);

  const cutoff = daysAgo(KEEP_AFTER_LISTING_DAYS).toISOString().slice(0, 10);
  const out = [...results.values()]
    .map((ipo) => {
      // 상장일은 KIND가 정본. 확정공모가는 신고서 값을 우선하고 없을 때만 KIND 값
      const k = kind.get(normalizeName(ipo.name));
      return { ...ipo, listingDate: k?.listingDate ?? ipo.listingDate, offerPrice: ipo.offerPrice ?? k?.offerPrice ?? null };
    })
    .map((ipo) => ({ ...ipo, ...overrides[ipo.id] }))
    .filter((ipo) => (ipo.listingDate ?? ipo.subscriptionEnd) >= cutoff)
    .sort((a, b) => a.subscriptionStart.localeCompare(b.subscriptionStart));

  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`저장 ${out.length}건 → collector/data/ipos.json`);
  for (const ipo of out) {
    const missing = MISSING.filter((k) => ipo[k] === null);
    if (missing.length) console.log(`  확인 필요 ${ipo.name}(${ipo.id}): ${missing.join(', ')}`);
  }
}

await main();
