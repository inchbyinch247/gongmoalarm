import { Storage } from '@apps-in-toss/web-framework';

// shortcut: "청약했어요" 표시는 이 기기에만 저장된다. 상장일 알림 서버가 생기면 서버 기록을 정본으로 바꾼다.
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
