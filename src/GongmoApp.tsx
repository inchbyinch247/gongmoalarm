import { Environment } from '@apps-in-toss/web-framework';
import { useEffect, useState } from 'react';
import { TabBar } from './components/TabBar';
import { SNAPSHOT, fetchLatest } from './data/ipos';
import type { IpoStatus } from './lib/ipo';
import { ALARM_API, type AlertState, enableAlerts, loadAlertState, syncAlerts } from './lib/notify';
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
  const [alerts, setAlerts] = useState<AlertState>('unknown');

  const [ipos, setIpos] = useState(SNAPSHOT);
  // 상세에 다녀와도 펼친 목록이 유지되게 화면 밖에 둔다
  const [expanded, setExpanded] = useState<IpoStatus[]>([]);

  useEffect(() => {
    Promise.all([loadSubscribed(), loadAlertState()]).then(([subs, state]) => {
      setSubscribed(subs);
      setAlerts(state);
      // 지난번 동기화가 실패했어도 실행할 때마다 서버를 다시 맞춘다
      if (state === 'on') syncAlerts(subs);
    });
    fetchLatest().then((latest) => latest && setIpos(latest));
    // 상장일 알림을 눌러 들어오면 intoss://gongmoalarm?ipo=<id> — 그 종목 상세를 연다
    try {
      const id = new URL(Environment.initialURL).searchParams.get('ipo');
      if (id) push({ name: 'detail', id });
    } catch {
      // 진입 링크를 못 읽으면 홈에서 시작한다
    }
  }, [push]);

  const toggle = (id: string) => {
    const next = subscribed.includes(id) ? subscribed.filter((s) => s !== id) : [...subscribed, id];
    setSubscribed(next);
    saveSubscribed(next);
    // 처음 '청약했어요'를 누를 때 상장일 알림 동의를 묻는다. 거절한 사람에게는 다시 묻지 않는다
    if (alerts === 'unknown' && next.length > subscribed.length) enableAlerts(next).then(setAlerts);
    else if (alerts === 'on') syncAlerts(next);
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
      {tab === 'home' && (
        <SchedulePage
          ipos={ipos}
          subscribed={subscribed}
          expanded={expanded}
          showAlertsCta={!!ALARM_API}
          alertsOn={alerts === 'on'}
          onEnableAlerts={() => enableAlerts(subscribed).then(setAlerts)}
          onOpen={open}
          onToggleExpand={(s) => setExpanded((e) => (e.includes(s) ? e.filter((x) => x !== s) : [...e, s]))}
        />
      )}
      <TabBar current={tab} onChange={setTab} />
    </>
  );
}
