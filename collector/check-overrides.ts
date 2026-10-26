// overrides.json의 기업 개요·경쟁력 문장을 검사한다. 규칙을 어긴 문장은 지우고 나머지는 둔다.
// 사람 검토 없이 자동으로 올라가므로 투자 권유로 읽힐 표현을 여기서 막는다.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Ipo } from '../src/data/types.ts';

const FILE = new URL('./overrides.json', import.meta.url);

const LIMITS = { summary: 120, competitiveness: 200 } as const;
// 평가·추천·수익 기대 표현
const BANNED = /추천|유망|저평가|고평가|상승\s*여력|수익률|대박|따상|매수|매도|투자\s*가치|기대\s*수익|확실|보장|최고의|1위\s*기업/;

export function checkText(field: keyof typeof LIMITS, text: unknown): string | null {
  if (typeof text !== 'string') return '문자열이 아님';
  const t = text.trim();
  if (t.length < 10) return '너무 짧음';
  if (t.length > LIMITS[field]) return `${LIMITS[field]}자 초과`;
  if (BANNED.test(t)) return `금지 표현: ${t.match(BANNED)![0]}`;
  if (/[<>{}]|https?:/.test(t)) return '태그·링크 포함';
  return null;
}

export function sanitize(overrides: Record<string, Partial<Ipo>>): { cleaned: Record<string, Partial<Ipo>>; removed: string[] } {
  const removed: string[] = [];
  const cleaned: Record<string, Partial<Ipo>> = {};
  for (const [id, entry] of Object.entries(overrides)) {
    const next = { ...entry };
    for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
      if (next[field] === undefined) continue;
      const problem = checkText(field, next[field]);
      if (problem) {
        removed.push(`${id}.${field}: ${problem}`);
        delete next[field];
      } else next[field] = (next[field] as string).trim();
    }
    if (Object.keys(next).length > 0) cleaned[id] = next;
  }
  return { cleaned, removed };
}

if (import.meta.main) {
  // JSON이 깨졌으면 예외로 끝내 워크플로가 커밋하지 않게 한다
  const { cleaned, removed } = sanitize(JSON.parse(readFileSync(FILE, 'utf8')));
  writeFileSync(FILE, `${JSON.stringify(cleaned, null, 2)}\n`);
  for (const r of removed) console.log(`  삭제 ${r}`);
  console.log(`overrides 검사: ${Object.keys(cleaned).length}개 종목, 삭제 ${removed.length}건`);
}
