import { useState } from 'react';
import { ChevronLeft, ChevronRight } from '../components/icons';
import type { Ipo } from '../data/types';
import { today } from '../lib/ipo';

type EventKind = 'sub' | 'list';
interface DayEvent {
  ipo: Ipo;
  kind: EventKind;
  label: string;
}

interface Props {
  ipos: Ipo[];
  subscribed: string[];
  onOpen: (id: string) => void;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function eventsOn(ipos: Ipo[], day: string): DayEvent[] {
  const out: DayEvent[] = [];
  for (const ipo of ipos) {
    if (day >= ipo.subscriptionStart && day <= ipo.subscriptionEnd) {
      const label = day === ipo.subscriptionEnd ? '청약 마감' : day === ipo.subscriptionStart ? '청약 시작' : '청약 중';
      out.push({ ipo, kind: 'sub', label });
    }
    if (day === ipo.listingDate) out.push({ ipo, kind: 'list', label: '상장' });
  }
  return out;
}

export function CalendarPage({ ipos, subscribed, onOpen }: Props) {
  const now = today();
  const [selected, setSelected] = useState(now);
  const [month, setMonth] = useState(() => {
    const [y, m] = now.split('-').map(Number);
    return { y, m: m - 1 };
  });

  const move = (delta: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const firstWeekday = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => iso(month.y, month.m, i + 1)),
  ];

  const [, sm, sd] = selected.split('-').map(Number);
  const selectedEvents = eventsOn(ipos, selected);

  return (
    <main className="screen canvas bg-canvas has-tabbar">
      <section className="card calendar">
        <div className="cal-head">
          <button type="button" className="icon-btn" aria-label="이전 달" onClick={() => move(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h1 className="cal-title">
            {month.y}년 {month.m + 1}월
          </h1>
          <button type="button" className="icon-btn" aria-label="다음 달" onClick={() => move(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="cal-grid" role="grid">
          {'일월화수목금토'.split('').map((w) => (
            <span key={w} className="cal-weekday">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} />;
            const kinds = new Set(eventsOn(ipos, day).map((e) => e.kind));
            const cls = ['cal-day', day === selected && 'is-selected', day === now && 'is-today'].filter(Boolean).join(' ');
            return (
              <button key={day} type="button" className={cls} aria-pressed={day === selected} onClick={() => setSelected(day)}>
                <span>{Number(day.slice(8))}</span>
                <span className="cal-dots" aria-hidden="true">
                  {kinds.has('sub') && <i className="dot dot-sub" />}
                  {kinds.has('list') && <i className="dot dot-list" />}
                </span>
              </button>
            );
          })}
        </div>

        <p className="cal-legend">
          <i className="dot dot-sub" /> 청약 <i className="dot dot-list" /> 상장
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">
          {sm}월 {sd}일 일정
        </h2>
        {selectedEvents.length === 0 ? (
          <p className="card empty row-meta">이날은 청약·상장 일정이 없어요.</p>
        ) : (
          <ul className="card list">
            {selectedEvents.map((e) => (
              <li key={`${e.ipo.id}-${e.kind}`}>
                <button type="button" className="row" onClick={() => onOpen(e.ipo.id)}>
                  <i className={`dot dot-${e.kind}`} aria-hidden="true" />
                  <span className="row-main">
                    <span className="row-title">
                      {e.ipo.name}
                      {subscribed.includes(e.ipo.id) && <span className="badge">청약함</span>}
                    </span>
                    <span className="row-meta">
                      {e.ipo.market} · {e.label}
                    </span>
                  </span>
                  <ChevronRight size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
