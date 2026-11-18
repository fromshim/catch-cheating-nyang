import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { buildClassroom, seatExaminees, animatePerson, seatPos, exitPath, autoResize, ROOM } from './scene.js';
import { assignExaminees, evaluateEnding, inspectFound, isElectronic, mulberry32, TUNE, stressStep, stressLevel, heatStep, calmStep, cheaterMul, innocentTellMul, parentRisk, nervousSignProb, releaseNoEvidence } from './logic.js';
import { C } from './content.js';

const P = C.proctor;
const SIGNS_BY = {
  paper: ['sleeve'], watch: ['wrist'], earbud: ['ear', 'lips'], camai: ['freeze'], glasses: ['glint'],
};
const SIGN_DUR = { freeze: 4, glint: 2.5, look: 2, spark: 3 };
const NERVOUS = ['look', 'ear', 'freeze', 'lips', 'sleeve'];
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function startProctor({ renderer, ui, onEnd }) {
  const seed = (Math.random() * 1e9) | 0;
  const rand = mulberry32(seed);
  const { scene, flicker } = buildClassroom();
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 60);
  camera.position.set(0, 1.65, ROOM.zMin + 1.5);
  camera.lookAt(0, 1.1, 0);
  const controls = new PointerLockControls(camera, renderer.domElement);
  const stopResize = autoResize(renderer, camera);

  const people = seatExaminees(scene, seed);
  const ex = assignExaminees(seed).map((e, i) => {
    const person = people[i];
    const s = seatPos(i);
    person.glasses.visible = e.glasses;
    return {
      ...e, i, person, removed: false, seen: 0, found: false, empFlag: false,
      stress: 0, dwell: 0, meltdown: false, progress: 0, done: false, inspected: null,
      pos: new THREE.Vector3(s.x, 1.25, s.z), next: 2 + rand() * 6,
    };
  });

  const state = { caught: [], wrongCaught: [], missed: [], hearingDamaged: false, empCount: 0, released: [], directive: null, directiveCount: 0 };
  let t = 0, timeLeft = Number(new URLSearchParams(location.search).get("t")) || 180, // 개발용: ?t=5 로 시험 시간 단축
    emp = 0, flick = 0, inspectT = 0, inspectId = null;
  let heat = 0, calmTime = 0, emptyInspects = 0, meltdowns = 0, inspectCd = 0, boldFired = false;
  const T0 = timeLeft, glassesChecked = new Set();
  let dStage = 0, dEnd = 0, bannerOff = 0;
  let risk = 0, pulse = 0, aimKey = '';
  const totalCheaters = ex.filter((e) => e.type === 'cheater').length;
  const riskOf = () => parentRisk({ emptyInspects, meltdowns, wrongArrests: state.wrongCaught.length });
  let running = false, started = false, ended = false, raf = 0;
  const keys = {};

  // HUD
  ui.innerHTML = `
    <div class="hud proctor">
      <div class="vignette" id="p-vig"></div>
      <div class="hud-center"><b id="p-time">0:00</b><span id="p-counts"></span></div>
      <div id="p-banner" class="banner" hidden></div>
      <div class="gauges">
        <div class="gauge"><label id="p-emp-l">${P.emp}</label><i><u id="p-emp"></u></i></div>
        <div class="gauge warn" id="p-g-risk"><label>${P.risk} <b id="p-risk-n">0%</b><em id="p-pl-risk"></em></label><i><u id="p-risk"></u></i></div>
        <div class="gauge heat" id="p-g-heat"><label>${P.heat} <b id="p-heat-n"></b><em id="p-pl-heat"></em></label><i><u id="p-heat"></u></i></div>
        <div class="gauge-note">${P.empCount} <b id="p-audit">0</b></div>
      </div>
      <div class="journal"><h3>${P.journal}</h3><ul id="p-log"><li class="empty">${P.journalEmpty}</li></ul></div>
      <div class="cross"></div>
      <ul class="keys">${P.keys.map(([k, v]) => `<li data-k="${k}"><kbd>${k}</kbd>${v}</li>`).join('')}</ul>
      <div id="p-aim" class="aim" hidden></div>
      <div id="p-insp" class="insp" hidden><i><u></u></i><span>${P.inspecting}</span></div>
      <div id="p-caps" class="caps"></div>
      <div class="ticker"><div class="ticker-in">${P.ticker.join('　　●　　')}　　●　　${P.ticker.join('　　●　　')}</div></div>
      <div id="p-ov" class="overlay"></div>
    </div>`;
  const $ = (id) => ui.querySelector('#' + id);
  const ov = $('p-ov');
  const showOverlay = (title, lines, btn) => {
    ov.hidden = false;
    ov.innerHTML = `<div class="panel"><h2>${title}</h2>${lines.map((l) => `<p>${l}</p>`).join('')}<p class="cta">${btn}</p></div>`;
  };
  showOverlay(P.startTitle, P.startLines, P.clickStart);
  ov.onclick = () => controls.lock();

  // 포인터락이 안 되는 환경(헤드리스 등)이면 락 없이 그냥 진행한다.
  const onLockErr = () => { if (!ended) setRun(true); };
  const setRun = (v) => {
    running = v; started = true;
    ov.hidden = v;
    if (!v && !ended) showOverlay(P.paused, [], P.clickResume);
  };
  controls.addEventListener('lock', () => setRun(true));
  controls.addEventListener('unlock', () => { if (!ended && started) setRun(false); });
  document.addEventListener('pointerlockerror', onLockErr);

  const capsEl = $('p-caps'); const caps = [];
  const cap = (m) => {
    const el = document.createElement('div');
    el.textContent = m; capsEl.append(el); caps.push({ el, life: 5 });
    if (caps.length > 3) caps.shift().el.remove();
  };
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const flash = (k, d) => {
    restart($('p-g-' + k), 'flash');
    const pl = $('p-pl-' + k); pl.textContent = '+' + Math.round(d); restart(pl, 'up');
  };
  const addHeat = (x) => { const d = Math.min(100, heat + x) - heat; heat += d; if (d > 0) flash('heat', d); return Math.round(d); };
  // 리스크가 오른 만큼 알리고(게이지 번쩍·비네트 펄스), 오른 정수 폭을 돌려준다
  const syncRisk = () => {
    const nr = riskOf(), d = nr - risk; risk = nr;
    if (d > 0) { flash('risk', d); pulse = 1; }
    return Math.round(d);
  };
  const cd = document.createElement('b'); cd.className = 'cd';
  const eLi = ui.querySelector('.keys li[data-k="E 홀드"]'); eLi.querySelector('kbd').append(cd);
  const qLi = ui.querySelector('.keys li[data-k="Q"]');
  const logEl = $('p-log');
  const journal = (id, text) => {
    logEl.querySelector('.empty')?.remove();
    const li = document.createElement('li');
    li.textContent = P.log(id, text);
    logEl.prepend(li);
    while (logEl.children.length > 12) logEl.lastChild.remove();
  };

  const banner = (text, withdraw) => {
    const b = $('p-banner'); b.textContent = text; b.hidden = false; b.classList.toggle('withdraw', !!withdraw);
  };
  const dir = new THREE.Vector3(), v = new THREE.Vector3();
  // 화면 중앙에 가장 가깝게 걸린 수험생(거리 maxDist 안)
  // 검사·적발 대상은 조준 라벨이 가리키는 바로 그 학생이고, 2m 안이어야 한다
  const reach = () => { const a = aimed(8); return a && a.pos.distanceTo(camera.position) <= 2 ? a : null; };
  function aimed(maxDist) {
    camera.getWorldDirection(dir);
    let best = null, bestR = 1;
    for (const e of ex) {
      if (e.removed) continue;
      v.copy(e.pos).sub(camera.position);
      const d = v.length();
      if (d > maxDist) continue;
      const r = dir.angleTo(v) / Math.atan(0.45 / d);
      if (r < bestR) { bestR = r; best = e; }
    }
    return best;
  }

  function sign(e, name) {
    e.person.setGesture(name, t, SIGN_DUR[name] ?? 1.6);
    if (aimed(8) !== e) return;
    // 멀리서는 무슨 징후인지 안 보인다
    if (camera.position.distanceTo(e.pos) > TUNE.signDetailDist) return journal(e.id, P.signs.far.text);
    const s = P.signs[name];
    if (s.sus) e.seen++;
    journal(e.id, s.text);
  }
  function schedule(e) {
    let names, lo, hi, div;
    if (e.type === 'cheater') {
      names = e.done || rand() < 0.2 ? ['pen', 'stretch'] : SIGNS_BY[e.device]; lo = 5; hi = 11;
      div = e.done ? 1 : cheaterMul(heat, calmTime).tell;
    } else {
      // 긴장하면 무고한 학생도 더 수상해 보인다(간격이 짧아짐)
      div = innocentTellMul(e.stress);
      if (e.type === 'distracted') { names = ['look', 'ear', 'wrist']; lo = 3; hi = 7; }
      else if (e.type === 'hearing') { names = ['ear']; lo = 10; hi = 18; }
      else { names = ['stretch', 'pen']; lo = 10; hi = 22; }
      // 안경 쓴 무고도 가끔 렌즈가 반짝여 안경 불빛만으론 범인을 못 가린다
      if (e.glasses && rand() < 0.2) names = ['glint'];
    }
    e.next = t + (lo + rand() * (hi - lo)) / div;
    let name = pick(rand, names);
    // 긴장한 학생은 타입 무관하게 수상한 몸짓을 섞는다
    if (rand() < nervousSignProb(e.stress)) name = pick(rand, e.glasses ? [...NERVOUS, 'glint'] : NERVOUS);
    sign(e, name);
  }

  function remove(e) {
    e.removed = true;
    e.person.leave(exitPath(e.i));
  }

  // src 반경 neighborDist 안의 다른 학생을 긴장시키고 그 수를 돌려준다
  function stirNeighbors(src) {
    let n = 0;
    for (const o of ex) {
      if (o === src || o.removed || o.meltdown) continue;
      if (Math.hypot(o.pos.x - src.pos.x, o.pos.z - src.pos.z) > TUNE.neighborDist) continue;
      o.stress = Math.min(100, o.stress + TUNE.stressNeighbor); n++;
    }
    return n;
  }

  function arrest(e) {
    const n = stirNeighbors(e);
    if (e.type === 'cheater') {
      state.caught.push(e.id);
      emp = Math.min(100, emp + 25);
      cap(P.cap.caughtRight(e.id, addHeat(TUNE.heatArrest), n, e.found || e.empFlag));
    } else {
      state.wrongCaught.push({ id: e.id, type: e.type });
      const h = addHeat(TUNE.heatArrest);
      cap(P.cap.caughtWrong(e.id, syncRisk(), h, n));
    }
    remove(e);
  }

  function inspect(e) {
    inspectCd = TUNE.inspectCooldown;
    const n = stirNeighbors(e), h = addHeat(TUNE.heatInspect);
    if (dStage === 1 && e.glasses) {
      glassesChecked.add(e.id); state.directive = 'followed'; state.directiveCount = glassesChecked.size;
    }
    if (e.type === 'cheater' && inspectFound(e.device, rand())) {
      e.found = true; e.inspected = 'found';
      cap(P.cap.found(e.id, C.deviceNames[e.device], h, n));
    } else {
      // 범인이든 무고든 빈손이면 똑같이 처리한다(결과로 정체가 새면 안 된다)
      e.inspected = e.found ? 'found' : 'empty';
      emptyInspects++; e.stress = Math.min(100, e.stress + TUNE.stressEmptyInspect);
      cap(P.cap.empty(e.id, syncRisk(), h, n));
    }
  }

  function fireEmp() {
    emp = 0; state.empCount++; flick = 1.2;
    $('p-audit').textContent = state.empCount;
    let hit = 0, n = 0;
    const target = aimed(8);
    for (const e of ex) {
      if (e.removed) continue;
      if (Math.hypot(e.pos.x - camera.position.x, e.pos.z - camera.position.z) > TUNE.empRadius) continue;
      e.stress = Math.min(100, e.stress + TUNE.stressEmp); n++;
      if (e.type === 'cheater' && isElectronic(e.device)) {
        e.person.setGesture('spark', t, 3); e.empFlag = true; hit++;
        if (target === e) { e.seen++; journal(e.id, P.signs.emp.text); }
      } else if (e.type === 'hearing') state.hearingDamaged = true;
    }
    cap(P.cap.emp(state.hearingDamaged ? 'hearing' : hit ? 'hit' : 'none', addHeat(TUNE.heatEmp), n));
  }

  const onKey = (down) => (ev) => {
    keys[ev.code] = down;
    if (!down || !running || ended || ev.repeat) return;
    if (ev.code === 'KeyF') { const e = reach(); if (e) arrest(e); }
    if (ev.code === 'KeyQ' && emp >= 100) fireEmp();
  };
  const kd = onKey(true), ku = onKey(false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  function finish() {
    ended = true; running = false;
    controls.unlock();
    // 증거 없이 잡은 범인은 시험 후 석방될 수 있다
    const { released } = releaseNoEvidence(
      ex.filter((e) => state.caught.includes(e.id)).map((e) => ({ id: e.id, evidence: e.found || e.empFlag })), rand);
    state.released = released;
    state.caught = state.caught.filter((id) => !released.includes(id));
    state.missed = ex.filter((e) => e.type === 'cheater' && !state.caught.includes(e.id)).map((e) => ({ id: e.id, device: e.device, progress: Math.round(e.progress) }));
    state.parentRisk = risk; state.riskRoll = rand();
    onEnd({ ending: evaluateEnding(state), state, risk, meltdowns, emptyInspects });
  }

  const clock = new THREE.Clock();
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (running && !ended) update(dt);
    for (const p of people) animatePerson(p, t, dt);
    renderer.render(scene, camera);
  }

  function update(dt) {
    t += dt; timeLeft -= dt; emp = Math.min(100, emp + 1.2 * dt);
    const sp = 3.2 * dt;
    if (keys.KeyW) controls.moveForward(sp);
    if (keys.KeyS) controls.moveForward(-sp);
    if (keys.KeyD) controls.moveRight(sp);
    if (keys.KeyA) controls.moveRight(-sp);
    camera.position.x = Math.max(-ROOM.x + 0.4, Math.min(ROOM.x - 0.4, camera.position.x));
    camera.position.z = Math.max(ROOM.zMin + 0.4, Math.min(ROOM.zMax - 0.4, camera.position.z));
    camera.position.y = 1.65;

    // 긴장·멘붕·부정행위 진척
    const mul = cheaterMul(heat, calmTime);
    for (const e of ex) {
      if (e.removed) continue;
      if (!e.meltdown) {
        const dist = Math.hypot(e.pos.x - camera.position.x, e.pos.z - camera.position.z);
        e.dwell = dist <= TUNE.proximityDist ? e.dwell + dt : 0;
        e.stress = stressStep(e.stress, { proctorDist: e.dwell >= TUNE.proximityDwell ? dist : Infinity, dt });
        if (e.stress >= TUNE.meltdownAt) {
          e.meltdown = true; meltdowns++;
          e.person.setGesture('slump', t, 9999);
          cap(P.cap.meltdown(e.id, syncRisk()));
        }
      }
      e.person.setStress(e.stress);
      if (e.meltdown) continue;
      if (e.type === 'cheater' && !e.done && (e.progress += TUNE.cheatBaseRate * mul.progress * dt) >= 100) e.done = true;
      if (t >= e.next) schedule(e);
    }
    heat = heatStep(heat, dt); calmTime = calmStep(calmTime, heat, dt);
    if (calmTime > TUNE.boldAfter && !boldFired) { boldFired = true; cap(P.cap.bold); }
    else if (calmTime === 0) boldFired = false;

    // 시험 중 지침 번복 방송
    if (dStage === 0 && t >= T0 * TUNE.directiveAt) {
      dStage = 1; dEnd = t + TUNE.directiveDur; state.directive = 'ignored';
      banner(P.directive.start); cap(P.directive.start);
    } else if (dStage === 1 && t >= dEnd) {
      dStage = 2; banner(P.directive.withdraw, true); cap(P.directive.withdraw); bannerOff = t + 8;
    }
    if (bannerOff && t >= bannerOff) { bannerOff = 0; $('p-banner').hidden = true; }

    // 소지품 검사: E 홀드 2초 (쿨타임 중엔 불가)
    inspectCd = Math.max(0, inspectCd - dt);
    const near = inspectCd > 0 ? null : reach();
    if (keys.KeyE && near && near.id === inspectId) {
      inspectT += dt;
      if (inspectT >= 2) { inspect(near); inspectT = 0; keys.KeyE = false; }
    } else { inspectT = 0; inspectId = keys.KeyE && near ? near.id : null; }
    const insp = $('p-insp'); insp.hidden = !(inspectT > 0);
    insp.querySelector('u').style.width = (inspectT / 2) * 100 + '%';

    if (flick > 0) { flick -= dt; flicker(false); } else flicker(true);

    // 조준 라벨
    const a = aimed(8), aim = $('p-aim');
    if (a) {
      v.copy(a.pos).add(new THREE.Vector3(0, 0.55, 0)).project(camera);
      aim.hidden = false;
      aim.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
      aim.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
      // 3m 안이면 확장 카드. 정체(범인 여부)는 절대 싣지 않는다
      const key = camera.position.distanceTo(a.pos) <= 3
        ? P.aimCard(a.id, P.levels[a.meltdown ? 'meltdown' : stressLevel(a.stress)], a.seen, P.inspected[a.inspected === 'found' ? 'found' : a.empFlag ? 'emp' : a.inspected ?? 'none'])
        : P.aimLabel(a.id, a.seen) + (a.found ? ` · ${P.foundTag}` : a.empFlag ? ` · ${P.inspected.emp}` : '');
      if (key !== aimKey) { aimKey = key; aim.innerHTML = key; }
    } else aim.hidden = true;

    for (let k = caps.length - 1; k >= 0; k--) if ((caps[k].life -= dt) <= 0) caps.splice(k, 1)[0].el.remove();
    const sec = Math.max(0, Math.ceil(timeLeft)), low = timeLeft <= 30;
    const timeEl = $('p-time'), ts = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (timeEl.textContent !== ts) timeEl.textContent = ts;
    timeEl.classList.toggle('low', low);
    const cs = P.counts(state.caught.length, totalCheaters);
    if ($('p-counts').textContent !== cs) $('p-counts').textContent = cs;
    pulse = Math.max(0, pulse - dt * 2);
    const vig = Math.min(1, Math.max(risk / 100 * 0.7, low ? 0.375 + 0.125 * Math.sin(t * 6) : 0) + pulse * 0.5);
    $('p-vig').style.opacity = vig.toFixed(2);
    const cdS = Math.ceil(inspectCd);
    eLi.classList.toggle('cool', cdS > 0);
    if (cd.textContent !== (cdS > 0 ? String(cdS) : '')) cd.textContent = cdS > 0 ? cdS : '';
    $('p-risk-n').textContent = Math.round(risk) + '%';
    $('p-heat').style.width = heat + '%';
    const hn = calmTime > TUNE.boldAfter ? P.heatBold : calmTime > 0 ? P.heatCalm(Math.floor(calmTime), TUNE.boldAfter) : '';
    if ($('p-heat-n').textContent !== hn) $('p-heat-n').textContent = hn;
    $('p-emp').style.width = emp + '%';
    $('p-emp-l').textContent = emp >= 100 ? P.empReady : P.emp;
    $('p-emp').parentNode.classList.toggle('ready', emp >= 100);
    qLi.classList.toggle('off', emp < 100);
    $('p-risk').style.width = risk + '%';
    if (timeLeft <= 0) finish();
  }
  frame();

  return {
    stop() {
      cancelAnimationFrame(raf); ended = true;
      stopResize(); controls.unlock(); controls.dispose();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      document.removeEventListener('pointerlockerror', onLockErr);
      ui.innerHTML = '';
    },
  };
}
