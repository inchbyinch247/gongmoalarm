-- 알림에 동의한 사용자. 토스 익명 키 외에 개인정보는 두지 않는다
CREATE TABLE IF NOT EXISTS users (
  anon_key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- '청약했어요'를 누른 종목 (상장일 알림 대상)
CREATE TABLE IF NOT EXISTS subscriptions (
  anon_key TEXT NOT NULL,
  ipo_id TEXT NOT NULL,
  PRIMARY KEY (anon_key, ipo_id)
);

-- 하루 템플릿별 발송 기록 — 중복 발송 방지
CREATE TABLE IF NOT EXISTS sends (
  day TEXT NOT NULL,
  template TEXT NOT NULL,
  PRIMARY KEY (day, template)
);
