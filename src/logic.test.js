import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignExaminees, evaluateEnding, DEVICES,
  stressStep, stressLevel, heatStep, calmStep, cheaterMul, innocentTellMul, parentRisk,
  nervousSignProb, releaseNoEvidence, TUNE,
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
  }
  assert.deepEqual(assignExaminees(7), assignExaminees(7));
});

test('엔딩 우선순위와 EMP 징계', () => {
  const base = { caught: [], wrongCaught: [], missed: [], hearingDamaged: false, empCount: 0 };
  const all = {
    ...base,
    wrongCaught: [{ id: 3, type: 'distracted' }],
    hearingDamaged: true,
    missed: [{ id: 5, device: 'camai' }],
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
  near(stressStep(50, { proctorDist: 1.5, dt: 1 }), 52.2);
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
    near(cheaterMul(0, 15).tell, 1); // 경계: 초과해야 대담
  near(cheaterMul(0, 25).tell, 1.3);
  near(cheaterMul(0, 35).progress, 1.6);
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
  assert.equal(parentRisk({ emptyInspects: 1, meltdowns: 1, wrongArrests: 1 }), 53);
  assert.equal(parentRisk({ emptyInspects: 10, meltdowns: 10, wrongArrests: 10 }), 100);
});

test('lawsuit_risk 우선순위', () => {
  const base = { caught: [], wrongCaught: [], missed: [{ id: 5, device: 'camai' }], hearingDamaged: false, empCount: 0 };
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
  const m = (...p) => p.map((progress, i) => ({ id: i + 1, device: 'camai', progress }));
  assert.equal(evaluateEnding({ ...base, missed: m(0, 59.9) }).id, 'stalemate');
  assert.equal(evaluateEnding({ ...base, missed: m(10, 60) }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, missed: [{ id: 1, device: 'camai' }] }).id, 'topscorer');
  assert.equal(evaluateEnding({ ...base, missed: [] }).id, 'perfect');
});

test('nervousSignProb 경계', () => {
  assert.equal(nervousSignProb(29), 0);
  near(nervousSignProb(30), 0.2);
  near(nervousSignProb(90), 0.6);
  near(nervousSignProb(150), 0.6);
});

test('releaseNoEvidence', () => {
  const arr = [{ id: 1, evidence: true }, { id: 2, evidence: false }, { id: 3, evidence: false }];
  assert.deepEqual(releaseNoEvidence(arr, () => 0), { kept: [1], released: [2, 3] });
  assert.deepEqual(releaseNoEvidence(arr, () => TUNE.releaseNoEvidence), { kept: [1, 2, 3], released: [] });
});
