// 기업 개요·경쟁력이 비어 있는 종목의 공시 발췌를 collector/work/<id>.md로 저장한다.
// GitHub Actions에서 Claude Code가 이 파일만 읽고 overrides.json에 초안을 쓴다.
// 실행: npm run excerpts (.env의 DART_API_KEY 사용)
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Ipo } from '../src/data/types.ts';
import { fetchSections, sectionHtml } from './dart.ts';
import { toText } from './parse.ts';

// 하루 한 번 실행에서 다루는 최대 종목 수 — 구독 사용량을 한꺼번에 쓰지 않게
const MAX_PER_RUN = 8;
const WORK = new URL('./work/', import.meta.url);

const apiKey = process.env.DART_API_KEY;
if (!apiKey) throw new Error('DART_API_KEY가 없습니다.');

const ipos = JSON.parse(readFileSync(new URL('./data/ipos.json', import.meta.url), 'utf8')) as Ipo[];
const overrides = JSON.parse(readFileSync(new URL('./overrides.json', import.meta.url), 'utf8')) as Record<string, Partial<Ipo>>;
const today = new Date().toISOString().slice(0, 10);

// 상장 전 종목부터, 청약이 가까운 순서로
const targets = ipos
  .filter((i) => !(overrides[i.id]?.summary && overrides[i.id]?.competitiveness))
  .filter((i) => !i.listingDate || i.listingDate >= today)
  .sort((a, b) => a.subscriptionStart.localeCompare(b.subscriptionStart))
  .slice(0, MAX_PER_RUN);

/** keyword가 처음 나오는 곳 앞뒤를 잘라낸다. 없으면 빈 문자열 */
const around = (text: string, keyword: RegExp, length: number) => {
  const i = text.search(keyword);
  return i < 0 ? '' : text.slice(Math.max(0, i - 300), i + length);
};

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
const done: string[] = [];
for (const ipo of targets) {
  const rcpNo = ipo.source.rcptNo ?? ipo.source.confirmRcptNo;
  if (!rcpNo) continue;
  try {
    const sections = await fetchSections(apiKey, rcpNo);
    const business = toText(sectionHtml(sections, /^\d*\.?사업의개요/)).slice(0, 8000);
    const competition = around(toText(sectionHtml(sections, /기타참고사항/)), /경쟁/, 4000);
    const comparison = around(toText(sectionHtml(sections, /인수인의의견/)), /비교회사|유사회사|비교기업|유사기업/, 4000);
    if (!business) continue;
    writeFileSync(
      new URL(`${ipo.id}.md`, WORK),
      `# ${ipo.name} (id: ${ipo.id})\n출처: ${ipo.source.doc} ${rcpNo}\n\n## 사업의 개요\n${business}\n\n## 경쟁 관련 서술\n${competition || '(없음)'}\n\n## 비교회사 선정 근거\n${comparison || '(없음)'}\n`,
    );
    done.push(ipo.id);
  } catch (e) {
    console.warn(`발췌 실패(${ipo.name}): ${e}`);
  }
}

console.log(`발췌 ${done.length}건 → collector/work/`);
// GitHub Actions 다음 단계가 발췌가 있을 때만 Claude Code를 돌리게 알려 준다
if (process.env.GITHUB_OUTPUT && existsSync(process.env.GITHUB_OUTPUT)) appendFileSync(process.env.GITHUB_OUTPUT, `count=${done.length}\n`);
