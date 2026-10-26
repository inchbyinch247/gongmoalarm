import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseConfirmedPrice, parseFinancials, parseFloat, parseGeneral, parseLockup, parsePriceBand } from './parse.ts';

// 실제 공시: ㈜제논 증권신고서(지분증권) 정정, 접수번호 20261026000001
const fx = (ele: number) => readFileSync(new URL(`./fixtures/zenon/ele${ele}.html`, import.meta.url), 'utf8');

test('일반사항: 시장·청약기일·가액·증권사', () => {
  assert.deepEqual(parseGeneral(fx(7)), {
    market: '코스닥',
    subscriptionStart: '2026-11-24',
    subscriptionEnd: '2026-11-25',
    price: 9700,
    shares: 2_200_000,
    underwriters: ['삼성증권'],
  });
});

test('희망공모가 밴드', () => {
  assert.deepEqual(parsePriceBand(fx(12)), [9700, 12200]);
});

test('상장 직후 유통가능 물량', () => {
  assert.deepEqual(parseFloat(fx(19)), { shares: 4_166_180, ratio: 29.07 });
});

test('요약재무정보: 최근 사업연도 매출액·영업이익(억 원)', () => {
  // 첫 열은 2026년 반기라 건너뛰고 2025 사업연도(117억 4,395만 원 / 7억 173만 원)를 고른다
  assert.deepEqual(parseFinancials(fx(39)), { year: 2025, revenue: 117.4, operatingProfit: 7 });
});

// 원본 XML(document.xml) 샘플 — 회사마다 표·문장 모양이 다른 경우들
const xml = (name: string) => readFileSync(new URL(`./fixtures/${name}.xml`, import.meta.url), 'utf8');

test('유통가능 물량: 문장 모양 3종', () => {
  // "N주는 상장 직후 … 유통가능한 물량이며, 상장예정주식수 기준으로 R%"
  assert.deepEqual(parseFloat(xml('dongwon-risk')), { shares: 2_734_201, ratio: 29.47 });
  // "R%에 해당하는 N주는 상장직후 유통가능"
  assert.deepEqual(parseFloat(xml('baropharm-risk')), { shares: 3_629_716, ratio: 30.38 });
});

test('요약재무정보: 단위·헤더 모양별', () => {
  // (단위: 천원)
  assert.deepEqual(parseFinancials(xml('dongwon-finance')), { year: 2025, revenue: 922.5, operatingProfit: 77.6 });
  // "2025년 (제20기)", 연결 표가 먼저
  assert.deepEqual(parseFinancials(xml('cnm-finance')), { year: 2025, revenue: 2384.9, operatingProfit: 213.3 });
  // 3월 결산: "제27기" + 아래 줄 "2026.03.31"
  assert.deepEqual(parseFinancials(xml('sfc-finance')), { year: 2026, revenue: 1607.9, operatingProfit: 216.7 });
  // 헤더가 두 줄로 나뉨: "2025년도" / "(제22기)"
  assert.deepEqual(parseFinancials(xml('optonics-finance')), { year: 2025, revenue: 256, operatingProfit: 36 });
  // "제20기(2026년6월말)"은 반기라 건너뛴다
  assert.deepEqual(parseFinancials(xml('hana-finance')), { year: 2025, revenue: 332.9, operatingProfit: 49.9 });
});

test('[발행조건확정]: 확정공모가·확약비율·일정', () => {
  const doc = xml('est-confirm');
  // 정정 전(10,600원) 표가 먼저 나와도 결정 문장의 12,400원을 쓴다
  assert.equal(parseConfirmedPrice(doc), 12_400);
  // 합계 1,039,659,000주 중 미확약 1,037,170,000주 → 0.24%
  assert.equal(parseLockup(doc), 0.24);
  assert.equal(parseGeneral(doc).subscriptionStart, '2026-10-22');
});

test('유통가능 물량: "상장일 유통가능 물량은 N주(상장일 기준 R%)"', () => {
  assert.deepEqual(parseFloat(xml('aelrobot-risk')), { shares: 4_218_360, ratio: 35.01 });
  // 신고서 오타 "37,68%"
  assert.deepEqual(parseFloat(xml('est-risk')), { shares: 5_243_400, ratio: 37.68 });
});

test('희망공모가 밴드: "주당 공모희망가액" 표', () => {
  assert.deepEqual(parsePriceBand(xml('mbd-pricing')), [9600, 11700]);
});

test('확약비율: 미확약이 확약 행들 위에 있는 표', () => {
  // 합계 1,873,827,000주 중 미확약 1,320,623,000주 → 29.52%
  assert.equal(parseLockup(xml('tne-confirm')), 29.52);
});

test('KIND 공모기업현황: 상장예정일·확정공모가', async () => {
  const { parseKindList } = await import('./kind.ts');
  const m = parseKindList(readFileSync(new URL('./fixtures/kind-list.html', import.meta.url), 'utf8'));
  assert.deepEqual(m.get('동원파츠'), { listingDate: '2026-11-10', offerPrice: null });
  assert.deepEqual(m.get('이에스티'), { listingDate: '2026-11-04', offerPrice: 12_400 });
});

test('overrides 검사: 금지 표현·길이를 어긴 문장만 지운다', async () => {
  const { sanitize } = await import('./check-overrides.ts');
  const { cleaned, removed } = sanitize({
    a: { summary: '물류센터용 자율이동로봇과 관제 소프트웨어를 만들어요.', competitiveness: '상장 후 상승 여력이 큰 저평가 종목이에요.' },
    b: { summary: '짧음' },
    // '~한다'체는 앱 어투와 달라 지운다
    c: { summary: '물류센터용 자율이동로봇과 관제 소프트웨어를 만든다.' },
  });
  assert.deepEqual(cleaned, { a: { summary: '물류센터용 자율이동로봇과 관제 소프트웨어를 만들어요.' } });
  assert.equal(removed.length, 3);
});

test('업종: 표준산업분류 코드 → 분류명, 없으면 상위 분류', async () => {
  const { industryName } = await import('./ksic.ts');
  assert.equal(industryName('29271'), '반도체 제조용 기계 제조업');
  assert.equal(industryName('47911'), '전자상거래 소매 중개업');
  // 표에 없는 5자리 → 4자리 상위 분류
  assert.equal(industryName('29279'), '반도체 및 디스플레이 제조용 기계 제조업');
  // 중분류(2자리)만 등록된 회사
  assert.equal(industryName('29'), '기타 기계 및 장비 제조업');
  assert.equal(industryName(null), null);
});
