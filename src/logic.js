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

// set = 단추 카메라 + 이어폰 세트, glasses = AI 안경
export const DEVICES = ['set', 'glasses'];

// 소지품 검사에서 기기를 발견할 확률
export const INSPECT_PROB = { set: 0.35, glasses: 0.15 };
// 신호를 목격한 직후(redHandedWindow 초 이내) 검사를 시작하면 발견 확률 가산. sinceSighting: 마지막 목격 후 경과 초(없으면 Infinity)
export const inspectChance = (device, sinceSighting) => {
  const base = INSPECT_PROB[device] ?? 0;
  return sinceSighting <= TUNE.redHandedWindow ? Math.min(0.95, base + TUNE.redHandedBonus) : base;
};
export const inspectFound = (device, roll, sinceSighting = Infinity) => roll < inspectChance(device, sinceSighting);

const lerp = (v, a, b) => clamp((v - a) / (b - a), 0, 1);

/**
 * 발광 부위(kind)의 신호가 감독관에게 보이는 정도 0~1. kind: 'camai'(단추) | 'earbud'(귀) | 'glasses'(렌즈).
 * 세트 범인은 camai·earbud 두 kind 를 각각 판정한다.
 * angleDeg = 수험생 기준 감독관의 방위각(-180~180).
 *   0 = 감독관이 수험생 정면(수험생이 보는 방향, 월드 -z 쪽), +90 = 수험생 본인의 오른쪽(월드 +x), ±180 = 등 뒤.
 * camai 는 가슴 단추라 정면에서만, glasses 는 렌즈 빛샘이라 비스듬할 때만, earbud 는 오른쪽 귀라 오른쪽~뒤에서 보인다.
 */
export function signalVisibility(kind, angleDeg) {
  const a = angleDeg;
  const m = Math.abs(a);
  if (kind === 'camai') return 1 - lerp(m, 45, 70);
  if (kind === 'glasses') return m < 20 ? 0 : m <= 90 ? lerp(m, 20, 45) : 1 - lerp(m, 90, 120);
  if (kind === 'earbud') return a >= 30 ? 1 : a >= 10 ? lerp(a, 10, 30) : a <= -150 ? 0.6 : 0;
  return 0;
}

// 부감독관이 신호를 알아챘는가. angleDeg 는 signalVisibility 와 같은 정의.
export const coSpots = (kind, angleDeg, dist, roll) =>
  dist <= TUNE.co.range && signalVisibility(kind, angleDeg) >= TUNE.co.minVis && roll < TUNE.co.sightProb;

/**
 * 수험생 배정. 반환: 길이 n 배열, 인덱스 i = 책상 i, id = i + 1.
 * type: 'cheater' | 'distracted' | 'hearing' | 'normal'
 * 규칙: 부정행위자 3~4(그중 정확히 1명 glasses, 나머지 set), 산만한 무고 2~3, 보청기 0~1.
 * glasses: 안경 착용 여부. device==='glasses' 범인은 true, 그 외 비범인 5~6명도 true(정체 누출 방지).
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
  const list = Array.from({ length: n }, (_, i) => ({ id: i + 1, type: 'normal', device: null, glasses: false }));
  let k = 0;
  const glassesAt = Math.floor(r() * nCheat); // 범인 중 정확히 1명이 AI 안경
  for (let c = 0; c < nCheat; c++) {
    const idx = order[k++];
    const device = c === glassesAt ? 'glasses' : 'set';
    list[idx] = { id: idx + 1, type: 'cheater', device };
    list[idx].glasses = device === 'glasses';
  }
  for (let c = 0; c < nDistract; c++) list[order[k++]].type = 'distracted';
  for (let c = 0; c < nHearing; c++) list[order[k++]].type = 'hearing';
  // 안경 낀 무고: 범인이 아닌 학생 중 5~6명 (기존 난수 소비 뒤에 뽑아 기존 배정은 그대로)
  const nGlasses = 5 + Math.floor(r() * 2);
  const pool = list.filter((e) => e.type !== 'cheater');
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let c = 0; c < nGlasses; c++) pool[c].glasses = true;
  return list;
}

/**
 * state: {
 *   caught: number[],                       // 맞게 적발한 번호
 *   wrongCaught: {id, type}[],              // 오적발
 *   missed: {id, device, progress?}[],      // 놓친 부정행위자. progress 0~100 = 베낀 진척
 *                                           //   전부 copyThreshold 미만이면 'stalemate', 하나라도 이상이거나 없으면 'topscorer'
 *   hearingDamaged: boolean,
 *   empCount: number,
 *   parentRisk?: number,                    // 0~100 학부모 리스크 %. riskSafeBelow 미만이면 고소 판정 없음
 *   riskRoll?: number,                      // 0~1 주사위. riskRoll < parentRisk/100 이면 고소
 *   replaced?: boolean,                     // true 면 학부모 항의 폭주로 시험 도중 감독관 교체(최우선)
 * }
 * missed 의 device 는 DEVICES 2종(set|glasses) 중 하나.
 * 반환: { id: 'replaced'|'lawsuit'|'medical'|'lawsuit_risk'|'stalemate'|'topscorer'|'perfect'|'complaint', emp: boolean }
 */
export function evaluateEnding(state) {
  const emp = state.empCount >= 2;
  let id;
  if (state.replaced === true) id = 'replaced';
  else if (state.wrongCaught.some((w) => w.type === 'distracted')) id = 'lawsuit';
  else if (state.hearingDamaged) id = 'medical';
  else if (state.parentRisk !== undefined && state.parentRisk >= TUNE.riskSafeBelow && state.riskRoll !== undefined && state.riskRoll < state.parentRisk / 100) id = 'lawsuit_risk';
  else if (state.missed.length > 0) {
    const stale = state.missed.every((m) => typeof m.progress === 'number' && m.progress < TUNE.copyThreshold);
    id = stale ? 'stalemate' : 'topscorer';
  }
  else if (state.wrongCaught.length === 0) id = 'perfect';
  else id = 'complaint'; // 지시서 4종 밖: 전부 잡았지만 평범한 수험생을 오적발한 경우
  return { id, emp };
}

export const TUNE = {
  inspectCooldown: 5, // 검사(E) 쿨타임 초
  // 개인 긴장(stress) 0~100
  stressEmptyInspect: 35,
  stressNeighbor: 10,
  neighborDist: 2.4,
  stressProximityRate: 3,
  proximityDist: 1.5,
  stressEmpCheater: 20, stressEmpInnocent: 5,
  stressDecay: 0.8,
  meltdownAt: 100,
  // 교실 경계도(heat) 0~100
  heatInspect: 25, heatArrest: 30, heatEmp: 60, heatDecay: 1.0,
  calmBelow: 20,
  boldAfter: 15,
  boldRamp: 20,
  boldMax: 1.6, // 대담 배율 상한
  proximityDwell: 3, // 근접 긴장은 이 시간(초) 이상 머문 뒤부터 (판정은 proctor)
  empRadius: 4,
  redHandedWindow: 4, redHandedBonus: 0.4, // 신호 목격 후 4초 안에 검사하면 발견 확률 +0.4(최대 0.95)
  doneTellMul: 1 / 3, // 베끼기를 끝낸 범인의 신호 빈도 배율
  sightDist: 5, glowDist: 7, // 일지 기록 최대 거리, 발광이 보이는 최대 거리
  signalDur: { camai: 3, earbud: 3.5, glasses: 4 }, // 발광 kind 별 신호 지속 초
  setGap: [2, 4], // 세트: 카메라 신호 끝 → 이어폰 신호 시작 사이 초
  signalGap: { set: [10, 18], glasses: [9, 16] }, // 기기별 한 사이클 사이 간격 초(배율 1 기준)
  lookalikeDur: 1.2,
  releaseByEvidence: { hard: 0, soft: 0.2, none: 0.5 }, // 증거 수준별 석방 확률
  nervousSignAt: 30,
  directiveAt: 0.5, // 전체 시험 시간 대비 지침 방송 시점 비율
  directiveDur: 30, // 지침 철회까지 초
  copyThreshold: 60, // 이 이상 베끼면 topscorer
  // 범인 부정행위 진척
  cheatBaseRate: 100 / 120,
  // 학부모 리스크 가중치
  riskEmptyInspect: 8, riskMeltdown: 20, riskWrongArrest: 40,
  riskSafeBelow: 15, // 이 미만이면 고소 판정 없음
  riskGameOver: 100, // 리스크가 이 값에 닿으면 즉시 시험 중단
  // 부감독관(NPC) 목격 판정
  co: { range: 7, sightProb: 0.35, markDur: 3, minVis: 0.35 },
  // 무고 학생 행동 간격(초)과 행동 중 닮은꼴 비율(나머지는 pen/look 같은 무해 행동)
  innocentGap: { normal: [14, 26], distracted: [6, 12], hearing: [16, 28] },
  innocentLookalikeShare: { normal: 0.3, distracted: 0.6, hearing: 0.5 },
  lensGlowMax: 0.45, // AI 안경 빛샘 발광 세기 상한(proctor 가 세기에 곱함)
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 개인 긴장 한 프레임 갱신. proctorDist = 감독관과의 수평 거리(m).
export function stressStep(stress, { proctorDist, dt }) {
  const up = proctorDist <= TUNE.proximityDist ? TUNE.stressProximityRate : 0;
  return clamp(stress + (up - TUNE.stressDecay) * dt, 0, 100);
}

export function stressLevel(stress) {
  if (stress >= 100) return 'meltdown';
  if (stress >= 60) return 'high';
  if (stress >= 30) return 'tense';
  return 'calm';
}

export const heatStep = (heat, dt) => Math.max(0, heat - TUNE.heatDecay * dt);

export const calmStep = (calmTime, heat, dt) => (heat < TUNE.calmBelow ? calmTime + dt : 0);

// 범인 배율 {tell, progress}. 대담해지면 heat 배율 대신 대담 배율을 쓴다.
export function cheaterMul(heat, calmTime) {
  let m;
  if (calmTime > TUNE.boldAfter) m = 1 + (TUNE.boldMax - 1) * Math.min(1, (calmTime - TUNE.boldAfter) / TUNE.boldRamp);
  else m = 1 - 0.6 * Math.min(1, heat / 50);
  return { tell: m, progress: m };
}

export const innocentTellMul = (stress) => Math.min(3, 1 + stress / 50);

export const parentRisk = ({ emptyInspects, meltdowns, wrongArrests }) =>
  clamp(
    emptyInspects * TUNE.riskEmptyInspect + meltdowns * TUNE.riskMeltdown + wrongArrests * TUNE.riskWrongArrest,
    0,
    100,
  );

// 긴장한 학생은 범인이든 무고든 같은 확률로 수상한 몸짓을 섞는다(정체 누출 방지)
export const nervousSignProb = (stress) => (stress < TUNE.nervousSignAt ? 0 : Math.min(0.6, stress / 150));

// arrests: [{id, evidence: 'hard'|'soft'|'none'}] 맞게 잡은 범인. hard(기기 발견·EMP 반응)는 석방 없음, soft(목격만)·none 은 확률 석방.
// boolean 은 하위 호환: true → 'hard', false → 'none'.
export function releaseNoEvidence(arrests, rand) {
  const kept = [];
  const released = [];
  for (const a of arrests) {
    const ev = a.evidence === true ? 'hard' : a.evidence === false ? 'none' : a.evidence;
    const p = TUNE.releaseByEvidence[ev] ?? 0;
    (p > 0 && rand() < p ? released : kept).push(a.id);
  }
  return { kept, released };
}
