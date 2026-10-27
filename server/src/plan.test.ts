import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunk, joinNames, listingMessages, parseSyncBody, subscriptionMessages, todayKst, withSubject } from './plan.ts';

const ipos = [
  { id: '00000001', name: '한국반도체', subscriptionStart: '2026-10-28', listingDate: '2026-11-05' },
  { id: '00000002', name: '가나다전자', subscriptionStart: '2026-10-28', listingDate: null },
  { id: '00000003', name: '라마바산업', subscriptionStart: '2026-10-20', listingDate: '2026-10-28' },
];

test('한국 시간 기준 날짜 — UTC 23시는 다음 날', () => {
  assert.equal(todayKst(new Date('2026-10-27T23:05:00Z')), '2026-10-28');
  assert.equal(todayKst(new Date('2026-10-27T14:59:00Z')), '2026-10-27');
});

test('주격 조사', () => {
  assert.equal(withSubject('한국반도체'), '한국반도체가');
  assert.equal(withSubject('라마바산업'), '라마바산업이');
  assert.equal(withSubject('ABC'), 'ABC이(가)');
});

test('종목 이름 묶기', () => {
  assert.equal(joinNames(['A']), 'A');
  assert.equal(joinNames(['A', 'B', 'C']), 'A 외 2곳');
});

test('청약일 알림은 동의자마다 한 통', () => {
  const msgs = subscriptionMessages(ipos, '2026-10-28', ['k1', 'k2']);
  assert.deepEqual(msgs, [
    { anonKey: 'k1', context: { ipoNames: '가나다전자 외 1곳' } },
    { anonKey: 'k2', context: { ipoNames: '가나다전자 외 1곳' } },
  ]);
  assert.deepEqual(subscriptionMessages(ipos, '2026-10-29', ['k1']), []);
});

test('상장일 알림은 그 종목을 청약한 사람에게만', () => {
  const subs = [
    { anonKey: 'k1', ipoId: '00000003' },
    { anonKey: 'k2', ipoId: '00000001' },
  ];
  assert.deepEqual(listingMessages(ipos, '2026-10-28', subs), [
    { anonKey: 'k1', context: { ipoSubject: '라마바산업이', ipoId: '00000003' } },
  ]);
});

test('2,500건씩 나누기', () => {
  assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
  assert.deepEqual(chunk([]), []);
});

test('/sync 본문 검증', () => {
  assert.deepEqual(parseSyncBody({ code: 'c', subscribed: ['00000001', '00000001'] }), { code: 'c', subscribed: ['00000001'] });
  assert.equal(parseSyncBody({ code: '', subscribed: [] }), null);
  assert.equal(parseSyncBody({ code: 'c', subscribed: ['1; DROP'] }), null);
  assert.equal(parseSyncBody(null), null);
});
