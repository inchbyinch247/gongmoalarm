import { BannerAd } from '../components/BannerAd';
import { ChevronDown, ChevronRight, ChevronUp } from '../components/icons';
import type { Ipo } from '../data/types';
import { type IpoStatus, STATUS_LABEL, shortDate, statusOf, thisWeek, won } from '../lib/ipo';

// 상장 완료 종목은 v1 일정 목록에서 뺀다 — 내 청약에서만 확인한다
const SECTIONS: IpoStatus[] = ['open', 'upcoming', 'listing'];
// 청약 예정·상장 예정을 한 화면에 함께 보이게 앞의 몇 개만 보여주고 나머지는 더보기로 펼친다
const COLLAPSIBLE: IpoStatus[] = ['upcoming', 'listing'];
const PREVIEW = 3;

interface Props {
  ipos: Ipo[];
  subscribed: string[];
  expanded: IpoStatus[];
  showAlertsCta: boolean;
  onEnableAlerts: () => void;
  onOpen: (id: string) => void;
  onToggleExpand: (status: IpoStatus) => void;
}

function rowMeta(ipo: Ipo, status: IpoStatus) {
  if (status === 'listing') return `상장 ${shortDate(ipo.listingDate)}`;
  const price = ipo.offerPrice ? `공모가 ${won(ipo.offerPrice)}` : '공모가 확정 전';
  return `청약 ${shortDate(ipo.subscriptionStart)}~${shortDate(ipo.subscriptionEnd)} · ${price}`;
}

export function SchedulePage({ ipos, subscribed, expanded, showAlertsCta, onEnableAlerts, onOpen, onToggleExpand }: Props) {
  const groups = SECTIONS.map((s) => ({
    status: s,
    items: ipos.filter((i) => statusOf(i) === s).sort((a, b) => a.subscriptionStart.localeCompare(b.subscriptionStart)),
  })).filter((g) => g.items.length > 0);
  const openCount = groups.find((g) => g.status === 'open')?.items.length ?? 0;
  const [mon, sun] = thisWeek();
  const stats = [
    { label: '이번 주 청약', value: ipos.filter((i) => i.subscriptionStart <= sun && i.subscriptionEnd >= mon).length },
    { label: '이번 주 상장', value: ipos.filter((i) => i.listingDate && i.listingDate >= mon && i.listingDate <= sun).length },
    { label: '내 청약', value: ipos.filter((i) => subscribed.includes(i.id)).length },
  ];

  return (
    <main className="screen canvas bg-canvas has-tabbar">
      <h1 className="hero-title">{openCount > 0 ? `지금 청약할 수 있는 공모주 ${openCount}개` : '공모주 청약 일정'}</h1>

      <dl className="card stats">
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      {showAlertsCta && (
        <ul className="card list">
          <li>
            <button type="button" className="row row-compact" onClick={onEnableAlerts}>
              <span className="tf alert-emoji" aria-hidden="true">
                🔔
              </span>
              <span className="row-main">
                <span className="row-title">청약일·상장일 알림 받기</span>
              </span>
              <ChevronRight size={20} />
            </button>
          </li>
        </ul>
      )}

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
            {(COLLAPSIBLE.includes(g.status) && !expanded.includes(g.status) ? g.items.slice(0, PREVIEW) : g.items).map((ipo) => (
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
            {COLLAPSIBLE.includes(g.status) && g.items.length > PREVIEW && (
              <li>
                <button type="button" className="more" aria-expanded={expanded.includes(g.status)} onClick={() => onToggleExpand(g.status)}>
                  {expanded.includes(g.status) ? (
                    <>
                      접기 <ChevronUp size={18} />
                    </>
                  ) : (
                    <>
                      더보기 ({g.items.length - PREVIEW}개) <ChevronDown size={18} />
                    </>
                  )}
                </button>
              </li>
            )}
          </ul>
        </section>
      ))}

      <BannerAd />
    </main>
  );
}
