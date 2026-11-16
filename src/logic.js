// 순수 함수 모음. DOM·three 에 의존하지 않는다.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEVICES = ['paper', 'watch', 'earbud', 'camai', 'glasses'];
export const isElectronic = (device) => device !== 'paper';

// 소지품 검사에서 기기를 발견할 확률
export const INSPECT_PROB = { paper: 0.85, watch: 0.5, earbud: 0.35, camai: 0.3, glasses: 0.15 };
export const inspectFound = (device, roll) => roll < (INSPECT_PROB[device] ?? 0);

/**
 * 수험생 배정. 반환: 길이 n 배열, 인덱스 i = 책상 i, id = i + 1.
 * type: 'cheater' | 'distracted' | 'hearing' | 'normal'
 * 규칙: 부정행위자 3~4, 산만한 무고 2~3, 보청기 0~1.
 */
export function assignExaminees(seed, n = 24) {
  const r = mulberry32(seed);
  const nCheat = 3 + Math.floor(r() * 2);
  const nDistract = 2 + Math.floor(r() * 2);
  const nHearing = Math.floor(r() * 2);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const list = Array.from({ length: n }, (_, i) => ({ id: i + 1, type: 'normal', device: null }));
  let k = 0;
  for (let c = 0; c < nCheat; c++) {
    const idx = order[k++];
    list[idx] = { id: idx + 1, type: 'cheater', device: DEVICES[Math.floor(r() * DEVICES.length)] };
  }
  for (let c = 0; c < nDistract; c++) list[order[k++]].type = 'distracted';
  for (let c = 0; c < nHearing; c++) list[order[k++]].type = 'hearing';
  return list;
}

/**
 * state: {
 *   caught: number[],                       // 맞게 적발한 번호
 *   wrongCaught: {id, type}[],              // 오적발
 *   missed: {id, device}[],                 // 놓친 부정행위자
 *   hearingDamaged: boolean,
 *   empCount: number,
 * }
 * 반환: { id: 'lawsuit'|'medical'|'topscorer'|'perfect'|'complaint', emp: boolean }
 */
export function evaluateEnding(state) {
  const emp = state.empCount >= 2;
  let id;
  if (state.wrongCaught.some((w) => w.type === 'distracted')) id = 'lawsuit';
  else if (state.hearingDamaged) id = 'medical';
  else if (state.missed.length > 0) id = 'topscorer';
  else if (state.wrongCaught.length === 0) id = 'perfect';
  else id = 'complaint'; // 지시서 4종 밖: 전부 잡았지만 평범한 수험생을 오적발한 경우
  return { id, emp };
}
