import { isMinVersionSupported, TossAds } from '@apps-in-toss/web-framework';
import { useEffect, useRef, useState } from 'react';

// shortcut: 광고 그룹 ID가 비어 있으면 배너를 그리지 않는다. 콘솔에서 배너 광고 그룹을 만든 뒤 그 ID를 넣는다.
export const BANNER_AD_GROUP_ID = '';

// 초기화는 앱에서 한 번만 — 두 번 부르면 '[toss-ad] Already initialized' 에러
let initialized: Promise<boolean> | null = null;

function initTossAds() {
  initialized ??= new Promise((resolve) => {
    try {
      // 토스 앱 5.241.0 미만은 배너 API가 없어 빈 영역이 남을 수 있다(공식 문서)
      if (!isMinVersionSupported({ android: '5.241.0', ios: '5.241.0' })) return resolve(false);
      if (!TossAds.initialize.isSupported() || !TossAds.attachBanner.isSupported()) return resolve(false);
      TossAds.initialize({
        callbacks: {
          onInitialized: () => resolve(true),
          onInitializationFailed: () => resolve(false),
        },
      });
    } catch {
      resolve(false);
    }
  });
  return initialized;
}

/** 인라인 배너 — 광고가 없거나 지원하지 않는 환경이면 자리를 남기지 않는다 */
export function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let attached: { destroy: () => void } | undefined;
    let cancelled = false;
    initTossAds().then((ok) => {
      if (cancelled || !ref.current) return;
      if (!ok || !BANNER_AD_GROUP_ID) return setHidden(true);
      attached = TossAds.attachBanner(BANNER_AD_GROUP_ID, ref.current, {
        theme: 'light',
        variant: 'card',
        callbacks: {
          onNoFill: () => setHidden(true),
          onAdFailedToRender: () => setHidden(true),
        },
      });
    });
    return () => {
      cancelled = true;
      attached?.destroy();
    };
  }, []);

  if (hidden) return null;
  // 부착 요소 내부는 비워 둔다(공식 가이드)
  return <div ref={ref} className="banner-ad" />;
}
