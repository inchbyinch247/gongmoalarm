// 개발용: 공시 하나의 원본을 절 단위로 fixtures/<접수번호>/에 저장해 파서를 맞춰 본다.
// 실행: node --env-file-if-exists=.env collector/dump.ts 20261021000363
import { mkdirSync, writeFileSync } from 'node:fs';
import { fetchSections } from './dart.ts';

const rcpNo = process.argv[2];
if (!process.env.DART_API_KEY || !rcpNo) throw new Error('사용법: DART_API_KEY 설정 후 node collector/dump.ts <접수번호>');

const sections = await fetchSections(process.env.DART_API_KEY, rcpNo);
const dir = new URL(`./fixtures/${rcpNo}/`, import.meta.url);
mkdirSync(dir, { recursive: true });
sections.forEach((s, i) => writeFileSync(new URL(`${String(i).padStart(3, '0')}.xml`, dir), `<!-- ${s.title} -->\n${s.html}`));
writeFileSync(new URL('toc.txt', dir), sections.map((s, i) => `${String(i).padStart(3, '0')} ${s.title} (${s.html.length})`).join('\n'));
console.log(`${sections.length}개 절 저장 → collector/fixtures/${rcpNo}/`);
