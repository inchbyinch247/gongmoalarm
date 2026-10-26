import { ChevronRight } from '../components/icons';
import type { Ipo } from '../data/types';
import { STATUS_LABEL, dDay, shortDate, statusOf } from '../lib/ipo';

interface Props {
  ipos: Ipo[];
  onOpen: (id: string) => void;
  onBrowse: () => void;
}

export function MinePage({ ipos, onOpen, onBrowse }: Props) {
  // 상장일 미정 종목은 맨 뒤로
  const items = [...ipos].sort((a, b) => (a.listingDate ?? '9999').localeCompare(b.listingDate ?? '9999'));

  if (items.length === 0) {
    return (
      <main className="screen canvas bg-canvas has-tabbar">
        <section className="card empty">
          <p className="empty-title">아직 청약한 종목이 없어요</p>
          <p className="row-meta">종목 상세에서 '청약했어요'를 누르면 여기에 모여요.</p>
          <button type="button" className="cta" onClick={onBrowse}>
            청약 일정 보기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen canvas bg-canvas has-tabbar">
      <h1 className="hero-title">내 청약 {items.length}개</h1>
      <ul className="card list">
        {items.map((ipo) => {
          const status = statusOf(ipo);
          return (
            <li key={ipo.id}>
              <button type="button" className="row" onClick={() => onOpen(ipo.id)}>
                <span className="row-main">
                  <span className="row-title">{ipo.name}</span>
                  <span className="row-meta">
                    상장 {shortDate(ipo.listingDate)}
                    {ipo.listingDate && ` · ${status === 'listed' ? STATUS_LABEL.listed : dDay(ipo.listingDate)}`}
                  </span>
                </span>
                <ChevronRight size={20} />
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
