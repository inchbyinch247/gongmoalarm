import { BannerAd } from '../components/BannerAd';
import { ChevronRight } from '../components/icons';
import type { Ipo } from '../data/types';
import { type IpoStatus, STATUS_LABEL, shortDate, statusOf, won } from '../lib/ipo';

// 상장 완료 종목은 v1 일정 목록에서 뺀다 — 내 청약에서만 확인한다
const SECTIONS: IpoStatus[] = ['open', 'upcoming', 'listing'];

interface Props {
  ipos: Ipo[];
  subscribed: string[];
  onOpen: (id: string) => void;
}

function rowMeta(ipo: Ipo, status: IpoStatus) {
  if (status === 'listing') return `상장 ${shortDate(ipo.listingDate)}`;
  const price = ipo.offerPrice ? `공모가 ${won(ipo.offerPrice)}` : '공모가 확정 전';
  return `청약 ${shortDate(ipo.subscriptionStart)}~${shortDate(ipo.subscriptionEnd)} · ${price}`;
}

export function SchedulePage({ ipos, subscribed, onOpen }: Props) {
  const groups = SECTIONS.map((s) => ({
    status: s,
    items: ipos.filter((i) => statusOf(i) === s).sort((a, b) => a.subscriptionStart.localeCompare(b.subscriptionStart)),
  })).filter((g) => g.items.length > 0);
  const openCount = groups.find((g) => g.status === 'open')?.items.length ?? 0;

  return (
    <main className="screen canvas bg-canvas has-tabbar">
      <h1 className="hero-title">{openCount > 0 ? `지금 청약할 수 있는 공모주 ${openCount}개` : '공모주 청약 일정'}</h1>

      {groups.length === 0 && (
        <section className="card empty">
          <p className="empty-title">예정된 공모주 청약이 없어요</p>
          <p className="row-meta">새 일정이 나오면 이 화면에 보여드려요.</p>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.status} className="section">
          <h2 className="section-title">{STATUS_LABEL[g.status]}</h2>
          <ul className="card list">
            {g.items.map((ipo) => (
              <li key={ipo.id}>
                <button type="button" className="row" onClick={() => onOpen(ipo.id)}>
                  <span className="row-main">
                    <span className="row-title">
                      {ipo.name}
                      {subscribed.includes(ipo.id) && <span className="badge">청약함</span>}
                    </span>
                    <span className="row-meta">
                      {ipo.market} · {rowMeta(ipo, g.status)}
                    </span>
                  </span>
                  <ChevronRight size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <BannerAd />
    </main>
  );
}
