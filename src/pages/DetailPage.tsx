import { BannerAd } from '../components/BannerAd';
import type { Ipo } from '../data/types';
import { STATUS_LABEL, eok, eokAmount, shortDate, statusOf, won } from '../lib/ipo';

interface Props {
  ipo: Ipo;
  subscribed: boolean;
  onToggle: () => void;
}

const PENDING = '수요예측 후 공개';
const CHECKING = '확인 중';

export function DetailPage({ ipo, subscribed, onToggle }: Props) {
  const status = statusOf(ipo);
  // 청약이 시작된 뒤부터 상장 전까지만 표시할 수 있다
  const canMark = status === 'open' || status === 'listing';
  const fin = ipo.financials;
  const price = ipo.offerPrice ? won(ipo.offerPrice) : ipo.priceBand ? `${won(ipo.priceBand[0])} ~ ${won(ipo.priceBand[1])}` : '미정';

  return (
    <main className={`screen canvas bg-canvas${canMark ? ' has-cta' : ''}`}>
      <header className="detail-head">
        <span className="row-meta">
          {ipo.market} · <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
        </span>
        <h1 className="hero-title">{ipo.name}</h1>
        {ipo.summary && <p className="body">{ipo.summary}</p>}
      </header>

      <section className="section">
        <h2 className="section-title">일정</h2>
        <dl className="card facts">
          <div>
            <dt>청약일</dt>
            <dd>
              {shortDate(ipo.subscriptionStart)} ~ {shortDate(ipo.subscriptionEnd)}
            </dd>
          </div>
          <div>
            <dt>상장일</dt>
            <dd>{shortDate(ipo.listingDate)}</dd>
          </div>
          <div>
            <dt>{ipo.offerPrice ? '확정 공모가' : '희망 공모가'}</dt>
            <dd>{price}</dd>
          </div>
          <div>
            <dt>청약 증권사</dt>
            <dd>{ipo.underwriters.join(', ')}</dd>
          </div>
        </dl>
      </section>

      <section className="section">
        <h2 className="section-title">핵심 정보</h2>
        <dl className="card facts">
          <div>
            <dt>매출액{fin && ` (${fin.year}년)`}</dt>
            <dd>{fin ? eok(fin.revenue) : CHECKING}</dd>
          </div>
          <div>
            <dt>영업이익{fin && ` (${fin.year}년)`}</dt>
            <dd>{fin ? eok(fin.operatingProfit) : CHECKING}</dd>
          </div>
          <div>
            <dt>상장일 유통가능 물량</dt>
            <dd>
              {ipo.floatShares ? (
                <>
                  {ipo.floatShares.shares.toLocaleString('ko-KR')}주 ({ipo.floatShares.ratio}%)
                  {ipo.offerPrice ? (
                    <span className="dd-sub">공모가 기준 약 {eokAmount(ipo.floatShares.shares * ipo.offerPrice)}</span>
                  ) : (
                    ipo.priceBand && (
                      // 확정 전에는 희망공모가 밴드 양 끝으로 범위를 보여준다
                      <span className="dd-sub">
                        희망공모가 기준 약 {eokAmount(ipo.floatShares.shares * ipo.priceBand[0]).replace(' 원', '')} ~{' '}
                        {eokAmount(ipo.floatShares.shares * ipo.priceBand[1])}
                      </span>
                    )
                  )}
                </>
              ) : (
                PENDING
              )}
            </dd>
          </div>
          <div>
            <dt>의무보유확약비율</dt>
            <dd>{ipo.lockupRatio !== null ? `${ipo.lockupRatio}%` : PENDING}</dd>
          </div>
        </dl>
      </section>

      <section className="section">
        <h2 className="section-title">경쟁사 대비 경쟁력</h2>
        <p className="card body prose">{ipo.competitiveness ?? '증권신고서 내용을 확인하고 있어요.'}</p>
      </section>

      <BannerAd />

      <p className="footnote">
        출처: {ipo.source.doc} ({ipo.source.asOf} 기준). 투자 판단과 그 결과의 책임은 본인에게 있어요.
      </p>

      {canMark && (
        <div className="cta-bar">
          <button type="button" className={`cta${subscribed ? ' cta-secondary' : ''}`} aria-pressed={subscribed} onClick={onToggle}>
            {subscribed ? '청약 표시 취소' : '청약했어요'}
          </button>
        </div>
      )}
    </main>
  );
}
