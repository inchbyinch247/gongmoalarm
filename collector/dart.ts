// OpenDART 공식 API만 쓴다: 공시 목록(list.json)과 공시서류 원본(document.xml, zip).
import { unzipSync } from 'fflate';

export interface Filing {
  corp_code: string;
  corp_name: string;
  corp_cls: string; // Y 유가, K 코스닥, N 코넥스, E 기타(비상장)
  report_nm: string;
  rcept_no: string;
  rcept_dt: string; // YYYYMMDD
}

export interface Section {
  title: string;
  html: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mask = (url: string) => url.replace(/crtfc_key=[^&]+/, 'crtfc_key=***');

async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (attempt >= 3) throw new Error(`HTTP ${res.status} ${mask(url)}`);
    } catch (e) {
      if (attempt >= 3) throw e;
    }
    await sleep(1000 * attempt);
  }
}

/** 기간 안의 증권신고서(지분증권) 계열 공시 — 회사 미지정 검색은 최대 3개월 */
export async function listEquityFilings(apiKey: string, bgnDe: string, endDe: string): Promise<Filing[]> {
  const out: Filing[] = [];
  for (let page = 1; ; page++) {
    const q = new URLSearchParams({ crtfc_key: apiKey, bgn_de: bgnDe, end_de: endDe, pblntf_detail_ty: 'C001', page_no: String(page), page_count: '100' });
    const body = await (await get(`https://opendart.fss.or.kr/api/list.json?${q}`)).json();
    if (body.status === '013') break; // 조회된 데이터 없음
    if (body.status !== '000') throw new Error(`OpenDART ${body.status}: ${body.message}`);
    out.push(...body.list);
    if (page >= body.total_page) break;
  }
  return out;
}

/** 기업개황의 표준산업분류 코드(induty_code). 실패하면 null */
export async function fetchIndustryCode(apiKey: string, corpCode: string): Promise<string | null> {
  const body = await (await get(`https://opendart.fss.or.kr/api/company.json?${new URLSearchParams({ crtfc_key: apiKey, corp_code: corpCode })}`)).json();
  return body.status === '000' && body.induty_code ? String(body.induty_code) : null;
}

/** 공시서류 원본을 받아 목차 제목(TITLE) 단위로 자른다. 본문 문서(접수번호.xml)만 쓰고 첨부는 뺀다 */
export async function fetchSections(apiKey: string, rcpNo: string): Promise<Section[]> {
  await sleep(500); // OpenDART 호출 한도(분당)를 넘기지 않게 간격을 둔다
  const res = await get(`https://opendart.fss.or.kr/api/document.xml?${new URLSearchParams({ crtfc_key: apiKey, rcept_no: rcpNo })}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // 오류는 zip이 아니라 XML 상태 메시지로 온다
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error(`document.xml ${rcpNo}: ${new TextDecoder().decode(buf).slice(0, 200)}`);

  const files = unzipSync(buf);
  const name = Object.keys(files).find((n) => n === `${rcpNo}.xml`) ?? Object.keys(files).sort()[0];
  const raw = files[name];
  const head = new TextDecoder('ascii').decode(raw.slice(0, 200));
  const xml = new TextDecoder(/encoding="euc-kr"/i.test(head) ? 'euc-kr' : 'utf-8').decode(raw);

  const titles = [...xml.matchAll(/<TITLE[^>]*>([\s\S]*?)<\/TITLE>/gi)];
  return titles.map((m, i) => ({
    title: m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    html: xml.slice(m.index! + m[0].length, titles[i + 1]?.index ?? xml.length),
  }));
}

/** 제목이 맞는 첫 절의 원문. 없으면 빈 문자열 */
export function sectionHtml(sections: Section[], title: RegExp): string {
  return sections.find((s) => title.test(s.title.replace(/\s/g, '')))?.html ?? '';
}
