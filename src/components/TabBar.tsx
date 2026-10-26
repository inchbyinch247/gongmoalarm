import type { Tab } from '../lib/router';
import { Calendar, CheckList, Home } from './icons';

const TABS: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: '홈', Icon: Home },
  { id: 'calendar', label: '캘린더', Icon: Calendar },
  { id: 'mine', label: '내 청약', Icon: CheckList },
];

export function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="주요 화면">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tab${id === current ? ' is-active' : ''}`}
          aria-current={id === current ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <span className="tab-icon">
            <Icon size={24} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
