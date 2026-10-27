import { Notification, Storage, User } from '@apps-in-toss/web-framework';

// 알림 서버(server/) 주소 — 비어 있으면 알림 받기 안내를 숨긴다
export const ALARM_API = 'https://gongmoalarm-alarm.changmin621.workers.dev';
// 알림 동의문이 연결된 콘솔 템플릿 코드
const AGREEMENT_TEMPLATE = 'gongmoalarm-subscription-start';
const KEY = 'gongmoalarm:alerts:v1';

/** unknown: 아직 묻지 않음, on: 동의함, off: 거절함 */
export type AlertState = 'unknown' | 'on' | 'off';

export async function loadAlertState(): Promise<AlertState> {
  try {
    const v = await Storage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : 'unknown';
  } catch {
    return 'unknown';
  }
}

function requestAgreement(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!Notification.requestAgreement.isSupported()) return resolve(false);
      const off = Notification.requestAgreement({
        options: { templateCode: AGREEMENT_TEMPLATE },
        // 콜백이 끝난 뒤 리스너를 해제한다(공식 가이드)
        onEvent: ({ type }) => {
          setTimeout(off);
          resolve(type !== 'agreementRejected');
        },
        onError: () => {
          setTimeout(off);
          resolve(false);
        },
      });
    } catch {
      resolve(false);
    }
  });
}

/** 서버에 '청약했어요' 목록을 통째로 맞춘다 — 실패해도 다음 변경·다음 실행 때 다시 맞춰진다 */
export async function syncAlerts(subscribed: string[]): Promise<void> {
  if (!ALARM_API) return;
  try {
    const { code } = await User.createAnonymousKeyAuthCode();
    await fetch(`${ALARM_API}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subscribed }),
    });
  } catch {
    // 알림 등록 실패가 화면 흐름을 막지 않는다
  }
}

/** 알림 동의를 받고, 동의하면 서버에 등록한다 */
export async function enableAlerts(subscribed: string[]): Promise<AlertState> {
  const state: AlertState = (await requestAgreement()) ? 'on' : 'off';
  try {
    await Storage.setItem(KEY, state);
  } catch {
    // 저장 실패 시 다음 실행에서 다시 묻는다
  }
  if (state === 'on') await syncAlerts(subscribed);
  return state;
}
