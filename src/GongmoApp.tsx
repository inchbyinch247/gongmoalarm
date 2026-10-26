import { useEffect, useState } from 'react';
import { TabBar } from './components/TabBar';
import { SNAPSHOT, fetchLatest } from './data/ipos';
import { useRouter } from './lib/router';
import { loadSubscribed, saveSubscribed } from './lib/storage';
import { CalendarPage } from './pages/CalendarPage';
import { DetailPage } from './pages/DetailPage';
import { MinePage } from './pages/MinePage';
import { SchedulePage } from './pages/SchedulePage';
import './screens.css';

export default function GongmoApp() {
  const { route, push, setTab } = useRouter();
  const [subscribed, setSubscribed] = useState<string[]>([]);

  const [ipos, setIpos] = useState(SNAPSHOT);

  useEffect(() => {
    loadSubscribed().then(setSubscribed);
    fetchLatest().then((latest) => latest && setIpos(latest));
  }, []);

  const toggle = (id: string) => {
    const next = subscribed.includes(id) ? subscribed.filter((s) => s !== id) : [...subscribed, id];
    setSubscribed(next);
    saveSubscribed(next);
  };

  const open = (id: string) => push({ name: 'detail', id });

  if (route.name === 'detail') {
    const ipo = ipos.find((i) => i.id === route.id);
    if (ipo) return <DetailPage ipo={ipo} subscribed={subscribed.includes(ipo.id)} onToggle={() => toggle(ipo.id)} />;
  }

  const tab = route.name === 'detail' ? 'home' : route.name;
  return (
    <>
      {tab === 'calendar' && <CalendarPage ipos={ipos} subscribed={subscribed} onOpen={open} />}
      {tab === 'mine' && <MinePage ipos={ipos.filter((i) => subscribed.includes(i.id))} onOpen={open} onBrowse={() => setTab('home')} />}
      {tab === 'home' && <SchedulePage ipos={ipos} subscribed={subscribed} onOpen={open} />}
      <TabBar current={tab} onChange={setTab} />
    </>
  );
}
