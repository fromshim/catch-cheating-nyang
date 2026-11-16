import test from 'node:test';
import assert from 'node:assert/strict';
import { assignExaminees, evaluateEnding, DEVICES } from './logic.js';

test('수험생 배정 수가 규칙대로다', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const list = assignExaminees(seed);
    const n = (t) => list.filter((e) => e.type === t).length;
    assert.equal(list.length, 24);
    assert.equal(new Set(list.map((e) => e.id)).size, 24);
    assert.ok(n('cheater') >= 3 && n('cheater') <= 4);
    assert.ok(n('distracted') >= 2 && n('distracted') <= 3);
    assert.ok(n('hearing') <= 1);
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
