import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignExaminees, evaluateEnding, DEVICES,
  stressStep, stressLevel, heatStep, calmStep, cheaterMul, innocentTellMul, parentRisk,
  nervousSignProb, releaseNoEvidence, allCaught, coSpots, TUNE, INSPECT_PROB, inspectChance, inspectFound, signalVisibility,
} from './logic.js';

test('수험생 배정 수가 규칙대로다', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const list = assignExaminees(seed);
    const n = (t) => list.filter((e) => e.type === t).length;
    assert.equal(list.length, 24);
    assert.equal(new Set(list.map((e) => e.id)).size, 24);
    assert.ok(n('cheater') >= 3 && n('cheater') <= 4);
    assert.ok(n('distracted') >= 2 && n('distracted') <= 3);
    assert.ok(n('hearing') <= 1);
    const g = list.filter((e) => e.glasses && e.type !== 'cheater').length;
    assert.ok(g >= 5 && g <= 6);
    for (const e of list) if (e.device === 'glasses') assert.equal(e.glasses, true);
    for (const e of list) assert.equal(e.type === 'cheater', DEVICES.includes(e.device));
    assert.equal(list.filter((e) => e.device === 'glasses').length, 1);
  }
  assert.deepEqual(assignExaminees(7), assignExaminees(7));
});

test('보청기 학생은 0 또는 1명, 1명 비율은 약 20%', () => {
  let ones = 0;
  const N = 1000;
  for (let seed = 1; seed <= N; seed++) {
    const h = assignExaminees(seed).filter((e) => e.type === 'hearing').length;
    assert.ok(h === 0 || h === 1);
    ones += h;
  }
  const ratio = ones / N;
  assert.ok(ratio >= 0.12 && ratio <= 0.28, `ratio ${ratio}`);
});

test('allCaught 경계', () => {
  const ex = [
    { id: 1, type: 'cheater' }, { id: 2, type: 'cheater' },
    { id: 3, type: 'normal' }, { id: 4, type: 'distracted' },
  ];
  assert.equal(allCaught([{ id: 3, type: 'normal' }], [3]), false); // 범인 0명
  assert.equal(allCaught(ex, []), false);
  assert.equal(allCaught(ex, [1]), false);
  assert.equal(allCaught(ex, [1, 3]), false);
  assert.equal(allCaught(ex, [1, 2]), true);
  assert.equal(allCaught(ex, [1, 2, 3, 4]), true); // 무고 섞여도 범인 전원이면 true
});

test('TUNE 신규 값', () => {
  assert.equal(TUNE.inspectHold, 1.2);
  assert.equal(TUNE.redHandedChance, 0.7);
  assert.equal(TUNE.redHandedArrest, 1.0);
  assert.equal(TUNE.empArrest, 25);
  assert.equal(TUNE.empArrestRedHanded, 40);
  assert.equal(TUNE.buttonGlowMax, 0.55);
});

test('엔딩 우선순위와 EMP 징계', () => {
  const base = { caught: [], wrongCaught: [], missed: [], hearingDamaged: false, empCount: 0 };
  const all = {
    ...base,
    wrongCaught: [{ id: 3, type: 'distracted' }],
    hearingDamaged: true,
    missed: [{ id: 5, device: 'set' }],
  };
  assert.equal(evaluateEnding(all).id, 'lawsuit');
  assert.equal(evaluateEnding({ ...all, wrongCaught: [] }).id, 'medical');
  assert.equal(evaluateEnding({ ...all, wrongCaught: [], hearingDamaged: false }).id, 'topscorer');
  assert.equal(evaluateEnding(base).id, 'perfect');
  assert.equal(evaluateEnding({ ...base, empCount: 1 }).emp, false);
  assert.equal(evaluateEnding({ ...base, empCount: 2 }).emp, true);
  assert.equal(evaluateEnding({ ...all, empCount: 3 }).id, 'lawsuit');
});

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('stressStep 감쇠·근접 가산·클램프', () => {
  near(stressStep(50, { proctorDist: 5, dt: 1 }), 49.2);
  near(stressStep(50, { proctorDist: 1.5, dt: 1 }), 54.2);
  near(stressStep(50, { proctorDist: 0, dt: 1 }), 59.2); // 바로 옆은 2배
  near(stressStep(50, { proctorDist: 0.75, dt: 1 }), 56.7);
  near(stressStep(50, { proctorDist: 1.6, dt: 1 }), 49.2);
  assert.equal(stressStep(0.5, { proctorDist: 5, dt: 1 }), 0);
  assert.equal(stressStep(99.5, { proctorDist: 0, dt: 1 }), 100);
});

test('stressLevel 경계', () => {
  assert.equal(stressLevel(29.9), 'calm');
  assert.equal(stressLevel(30), 'tense');
  assert.equal(stressLevel(59.9), 'tense');
  assert.equal(stressLevel(60), 'high');
  assert.equal(stressLevel(99.9), 'high');
  assert.equal(stressLevel(100), 'meltdown');
});

test('heatStep·calmStep', () => {
  near(heatStep(10, 2), 8);
  assert.equal(heatStep(1, 2), 0);
  assert.equal(calmStep(3, 19.9, 1), 4);
  assert.equal(calmStep(3, 20, 1), 0);
});

test('cheaterMul heat 구간과 대담 구간', () => {
  near(cheaterMul(0, 0).tell, 1);
  near(cheaterMul(25, 0).progress, 0.7);
  near(cheaterMul(50, 0).tell, 0.4);
  near(cheaterMul(80, 0).progress, 0.4);
  near(cheaterMul(0, 20).tell, 1); // 경계: boldAfter(20초)를 넘어야 대담
  near(cheaterMul(0, 30).tell, 1.3);
  near(cheaterMul(0, 40).progress, 1.6);
  near(cheaterMul(0, 200).tell, 1.6);
});

test('innocentTellMul', () => {
  assert.equal(innocentTellMul(0), 1);
  assert.equal(innocentTellMul(50), 2);
  assert.equal(innocentTellMul(100), 3);
  assert.equal(innocentTellMul(500), 3);
});

test('parentRisk 가중치와 클램프', () => {
  assert.equal(parentRisk({ emptyInspects: 0, meltdowns: 0, wrongArrests: 0 }), 0);
  assert.equal(parentRisk({ emptyInspects: 1, meltdowns: 1, wrongArrests: 1 }), 85);
  assert.equal(parentRisk({ emptyInspects: 0, meltdowns: 0, wrongArrests: 2 }), 100); // 오적발 두 번이면 교체
  assert.equal(parentRisk({ emptyInspects: 10, meltdowns: 10, wrongArrests: 10 }), 100);
});

test('lawsuit_risk 우선순위', () => {
  const base = { caught: [], wrongCaught: [], missed: [{ id: 5, device: 'set' }], hearingDamaged: false, empCount: 0 };
  const risky = { ...base, parentRisk: 40, riskRoll: 0.39 };
  assert.equal(evaluateEnding(risky).id, 'lawsuit_risk');
  assert.equal(evaluateEnding({ ...risky, riskRoll: 0.4 }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...risky, hearingDamaged: true }).id, 'medical');
  assert.equal(evaluateEnding({ ...risky, wrongCaught: [{ id: 3, type: 'distracted' }] }).id, 'lawsuit');
  assert.equal(evaluateEnding({ ...base, riskRoll: 0 }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, parentRisk: 100 }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, parentRisk: 14, riskRoll: 0 }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, parentRisk: 15, riskRoll: 0 }).id, 'lawsuit_risk');
  assert.equal(evaluateEnding({ ...risky, missed: [] }).id, 'lawsuit_risk');
});

test('stalemate vs topscorer', () => {
  const base = { caught: [], wrongCaught: [], hearingDamaged: false, empCount: 0 };
  const m = (...p) => p.map((progress, i) => ({ id: i + 1, device: 'set', progress }));
  assert.equal(evaluateEnding({ ...base, missed: m(0, 59.9) }).id, 'stalemate');
  assert.equal(evaluateEnding({ ...base, missed: m(10, 60) }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, missed: [{ id: 1, device: 'set' }] }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, missed: [] }).id, 'perfect');
});

test('nervousSignProb 경계', () => {
  assert.equal(nervousSignProb(29), 0);
  near(nervousSignProb(30), 0.2);
  near(nervousSignProb(90), 0.6);
  near(nervousSignProb(150), 0.6);
});

test('releaseNoEvidence', () => {
  const one = (evidence, r) => releaseNoEvidence([{ id: 1, evidence }], () => r);
  assert.deepEqual(one('hard', 0), { kept: [1], released: [] });
  assert.deepEqual(one('soft', 0.19), { kept: [], released: [1] });
  assert.deepEqual(one('soft', 0.2), { kept: [1], released: [] });
  assert.deepEqual(one('none', 0.49), { kept: [], released: [1] });
  assert.deepEqual(one('none', 0.5), { kept: [1], released: [] });
  assert.deepEqual(one(true, 0), { kept: [1], released: [] }); // boolean 하위 호환
  assert.deepEqual(one(false, 0), { kept: [], released: [1] });
});

test('DEVICES·INSPECT_PROB 는 2종', () => {
  assert.deepEqual(DEVICES, ['set', 'glasses']);
  assert.deepEqual(Object.keys(INSPECT_PROB), ['set', 'glasses']);
  assert.equal(TUNE.co.markDur, 3);
});

test('inspectChance 목격 횟수·직후 단계', () => {
  near(inspectChance('set', Infinity), 0.2);
  near(inspectChance('glasses', Infinity, 0), 0.2);
  near(inspectChance('set', Infinity, 1), 0.55);
  near(inspectChance('set', 10, 2), 0.75);
  near(inspectChance('glasses', 10, 5), 0.75);
  near(inspectChance('set', 3, 1), 0.7);
  near(inspectChance('set', 3.01, 1), 0.55);
  near(inspectChance('glasses', 0, 0), 0.7);
  assert.equal(inspectFound('set', 0.69, 0, 1), true);
  assert.equal(inspectFound('set', 0.7, 0, 1), false);
  assert.equal(inspectFound('set', 0.19), true);
  assert.equal(inspectFound('set', 0.2), false);
});

test('signalVisibility 경계값', () => {
  const v = signalVisibility;
  near(v('camai', 0), 1); near(v('camai', 45), 1); near(v('camai', -45), 1);
  near(v('camai', 57.5), 0.5); near(v('camai', 70), 0); near(v('camai', 180), 0);
  near(v('glasses', 0), 0); near(v('glasses', 20), 0); near(v('glasses', 32.5), 0.5);
  near(v('glasses', 45), 1); near(v('glasses', 90), 1); near(v('glasses', 105), 0.5);
  near(v('glasses', 120), 0); near(v('glasses', -60), 1); near(v('glasses', 180), 0);
  near(v('earbud', 0), 0); near(v('earbud', 10), 0); near(v('earbud', 20), 0.5);
  near(v('earbud', 30), 1); near(v('earbud', 90), 1); near(v('earbud', 180), 1);
  near(v('earbud', -150), 0.6); near(v('earbud', -90), 0);
});

test('replaced 는 최우선', () => {
  const s = {
    caught: [], wrongCaught: [{ id: 3, type: 'distracted' }], missed: [{ id: 5, device: 'set' }],
    hearingDamaged: true, empCount: 2, parentRisk: 100, riskRoll: 0, replaced: true,
  };
  assert.equal(evaluateEnding(s).id, 'replaced');
  assert.equal(evaluateEnding(s).emp, true);
  assert.equal(evaluateEnding({ ...s, replaced: false }).id, 'lawsuit');
});

test('coSpots 경계', () => {
  assert.equal(coSpots('earbud', 180, 7, 0), true); // 등 뒤 earbud, range 경계
  assert.equal(coSpots('earbud', 180, 7.01, 0), false);
  assert.equal(coSpots('earbud', 180, 3, 0.34), true);
  assert.equal(coSpots('earbud', 180, 3, 0.35), false);
  assert.equal(coSpots('glasses', 0, 3, 0), false); // 정면 glasses vis 0
  assert.equal(coSpots('camai', 0, 3, 0), true);
  // minVis 경계: glasses lerp(m,20,45) = 0.35 -> m = 28.75, 약간 안/밖
  assert.equal(coSpots('glasses', 29, 3, 0), true);
  assert.equal(coSpots('glasses', 28, 3, 0), false);
});
