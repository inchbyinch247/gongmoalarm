export type Market = '코스피' | '코스닥';

export interface Ipo {
  /** DART 고유번호(corp_code) */
  id: string;
  name: string;
  market: Market;
  /** 한국표준산업분류명(DART 기업개황 코드 기준) */
  industry?: string | null;
  /** YYYY-MM-DD */
  subscriptionStart: string;
  subscriptionEnd: string;
  /** 증권신고서에는 대개 없다 — 거래소 일정이 나오면 채운다 */
  listingDate: string | null;
  /** 확정 공모가(원). 수요예측 전이면 null — 희망 밴드를 대신 보여준다 */
  offerPrice: number | null;
  priceBand: [number, number] | null;
  summary: string | null;
  /** 최근 사업연도, 억 원 */
  financials: { year: number; revenue: number; operatingProfit: number } | null;
  /** 증권신고서의 비교기업·경쟁우위 서술 요약 — 평가·추천 문구를 넣지 않는다 */
  competitiveness: string | null;
  /** 상장일 유통가능 물량. 수요예측 전이면 null */
  floatShares: { shares: number; ratio: number } | null;
  /** 의무보유확약비율(%). 수요예측 전이면 null */
  lockupRatio: number | null;
  underwriters: string[];
  /** 출처 공시와 기준일 */
  source: { doc: string; asOf: string; rcptNo?: string; confirmRcptNo?: string };
}
