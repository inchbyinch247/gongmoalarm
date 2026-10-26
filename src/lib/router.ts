import { useCallback, useEffect, useState } from 'react';

export type Tab = 'home' | 'calendar' | 'mine';
export type Route = { name: Tab } | { name: 'detail'; id: string };

/**
 * 화면 스택을 브라우저 history와 맞춘다 — 플랫폼 뒤로가기·swipe-back이
 * popstate로 한 단계씩 돌아오게 한다. 루트(탭 화면)에서의 뒤로가기는
 * 플랫폼이 미니앱을 닫는다.
 */
export function useRouter() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);

  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const push = useCallback((r: Route) => {
    window.history.pushState({ depth: Date.now() }, '');
    setStack((s) => [...s, r]);
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => window.history.back(), []);

  // 탭 전환은 루트를 바꿔 끼울 뿐 history를 쌓지 않는다 — 뒤로가기로 탭 사이를 오가지 않게
  const setTab = useCallback((tab: Tab) => {
    setStack([{ name: tab }]);
    window.scrollTo(0, 0);
  }, []);

  return { route: stack[stack.length - 1], push, back, setTab };
}
