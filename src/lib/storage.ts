import { Storage } from '@apps-in-toss/web-framework';

// "청약했어요" 표시는 이 기기 저장이 정본이다 — 알림에 동의한 사용자는 바뀔 때마다 서버(상장일 알림 대상)에 통째로 맞춘다(lib/notify.ts)
const KEY = 'gongmoalarm:subscribed:v1';

export async function loadSubscribed(): Promise<string[]> {
  try {
    const raw = await Storage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveSubscribed(ids: string[]): Promise<void> {
  try {
    await Storage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // 저장 실패는 화면 흐름을 막지 않는다 — 다음 변경 때 다시 저장된다
  }
}
