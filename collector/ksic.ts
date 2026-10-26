// 한국표준산업분류(제10차) 코드 → 분류명. 표: 통계청 KSIC, FinanceData/KSIC의 KSIC_10.csv에서 변환.
import { readFileSync } from 'node:fs';

const TABLE = JSON.parse(readFileSync(new URL('./ksic10.json', import.meta.url), 'utf8')) as Record<string, string>;

/** 5자리 세세분류가 표에 없으면(11차 신설 코드, 중분류만 등록된 회사 등) 4·3·2자리 상위 분류명으로 대신한다 */
export function industryName(code: string | null): string | null {
  if (!code) return null;
  for (let len = Math.min(code.length, 5); len >= 2; len--) {
    const name = TABLE[code.slice(0, len)];
    if (name) return name;
  }
  return null;
}
