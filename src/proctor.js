import * as THREE from 'three';
import { audio } from './audio.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { buildClassroom, seatExaminees, createPerson, animatePerson, seatPos, exitPath, autoResize, renderPortraits, ROOM, SEAT_RADIUS } from './scene.js';
import { assignExaminees, evaluateEnding, inspectChance, signalVisibility, mulberry32, TUNE, stressStep, stressLevel, heatStep, calmStep, cheaterMul, innocentTellMul, parentRisk, nervousSignProb, releaseNoEvidence, coSpots } from './logic.js';
import { C } from './content.js';

const P = C.proctor;
const GLOW = { camai: 'button', earbud: 'ear', glasses: 'lens' }; // 신호 kind → 발광 부위
// 진짜 신호 몸짓은 발광 부위(단추·귀)를 손으로 가리지 않는다. 손 대는 동작은 닮은꼴 몫
const REAL_GESTURE = { camai: () => null, earbud: () => 'cock', glasses: (r) => (r() < 0.5 ? 'frame' : null) };
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function startProctor({ renderer, ui, onEnd }) {
  const seed = (Math.random() * 1e9) | 0;
  const rand = mulberry32(seed);
  const { scene, flicker, setClock, ring } = buildClassroom();
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.2, 60);
  camera.position.set(0, 1.65, ROOM.zMin + 1.5);
  camera.lookAt(0, 1.1, 0);
  const controls = new PointerLockControls(camera, renderer.domElement);
  const stopResize = autoResize(renderer, camera);

  const people = seatExaminees(scene, seed);
  // 뒤에 선 부감독관 NPC: 교실 뒤를 가로로 오가며 학생들 등을 본다
  const co = createPerson(rand, { color: 0x3b4252, proctor: true });
  const coZ = ROOM.zMax - 1.3;
  co.group.position.set(-4, 0, coZ);
  co.walk = { pts: [[-4, coZ], [4, coZ]], i: 1, loop: true };
  scene.add(co.group);
  const marks = []; // 부감독관이 가리킨 학생 {e, el, until}
  const ex = assignExaminees(seed).map((e, i) => {
    const person = people[i];
    const s = seatPos(i);
    person.glasses.visible = e.glasses;
    return {
      ...e, i, person, removed: false, seen: 0, lastSight: null, sig: null, deviceDead: false, found: false, empFlag: false,
      stress: 0, dwell: 0, meltdown: false, progress: 0, done: false, inspected: null,
      pos: new THREE.Vector3(s.x, 1.25, s.z), next: 2 + rand() * 6,
    };
  });

  const seenDev = new Set();
  const state = { caught: [], wrongCaught: [], missed: [], hearingDamaged: false, empCount: 0, released: [], directive: null, directiveCount: 0 };
  let t = 0, timeLeft = Number(new URLSearchParams(location.search).get("t")) || 180, // 개발용: ?t=5 로 시험 시간 단축
    emp = 0, flick = 0, inspectT = 0, inspectId = null;
  let heat = 0, calmTime = 0, emptyInspects = 0, meltdowns = 0, inspectCd = 0, boldFired = false;
  const T0 = timeLeft, glassesChecked = new Set();
  let dStage = 0, dEnd = 0, bannerOff = 0;
  let whisperE = null, overTimer = 0, risk = 0, pulse = 0, aimKey = '', aimPrev = null, lastTick = 0, lastJ = null;
  const totalCheaters = ex.filter((e) => e.type === 'cheater').length;
  const riskOf = () => parentRisk({ emptyInspects, meltdowns, wrongArrests: state.wrongCaught.length });
  let running = false, started = false, ended = false, raf = 0;
  const keys = {};

  // HUD
  ui.innerHTML = `
    <div class="hud proctor">
      <div class="vignette" id="p-vig"></div><div class="emp-flash" id="p-flash"></div>
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
      <div id="p-wh" class="aim wh" hidden>${P.whisperChip}</div>
      <div id="p-marks"></div>
      <div id="p-act" class="acthint" hidden>${P.actHint.replace(/(\[E\][^[]*)/, '<s>$1</s>')}<span id="p-hot" class="hot"></span></div>
      <div id="p-insp" class="insp" hidden><i><u></u></i><span>${P.inspecting}</span></div>
      <div id="p-caps" class="caps"></div>
      <div class="ticker"><b class="ticker-tag">${P.tickerTag}</b><div class="ticker-in">${P.ticker.join('　　●　　')}　　●　　${P.ticker.join('　　●　　')}</div></div>
      <div id="p-ov" class="overlay"></div>
    </div>`;
  const $ = (id) => ui.querySelector('#' + id);
  const hotSec = (e) => (e.lastSight !== null && t - e.lastSight <= TUNE.redHandedWindow ? Math.ceil(TUNE.redHandedWindow - (t - e.lastSight)) : 0);
  const ov = $('p-ov');
  const showOverlay = (title, lines, btn, note = '') => {
    ov.hidden = false;
    ov.innerHTML = `<div class="panel"><h2>${title}</h2>${lines.map((l) => `<p>${l}</p>`).join('')}${note ? `<small class="note">${note}</small>` : ''}<p class="cta">${btn}</p></div>`;
  };
  showOverlay(P.startTitle, P.startLines, P.clickStart, P.coNote);
  ov.onclick = () => { audio.init(); audio.hum(true); controls.lock(); };

  // 포인터락이 안 되는 환경(헤드리스 등)이면 락 없이 그냥 진행한다.
  const onLockErr = () => { if (!ended) setRun(true); };
  const setRun = (v) => {
    running = v; started = true;
    ov.hidden = v;
    audio.hum(v); if (!v) audio.heartbeat(0);
    if (!v) audio.whisper(0);
    if (!v && !ended) showPause();
  };
  // 일시정지 패널 = 기기 신호 도감. 패널 안 클릭은 계속되지 않고, 계속 버튼·바깥 클릭만 계속한다
  function showPause() {
    const X = P.codex;
    ov.hidden = false;
    ov.innerHTML = `<div class="panel codex"><h2>${P.paused} · ${P.clickResume}</h2>
      <button class="resume">${X.resume}</button>
      <h3>${X.title}</h3>
      <div class="cards">${Object.entries(X.cards).map(([d, c]) => `<div class="card">${seenDev.has(d) ? `<span class="stamp">${X.stamp}</span>` : ''}<h4>${c.name}</h4>
        <dl><dt>${X.f.real}</dt><dd>${c.real}</dd><dt>${X.f.like}</dt><dd>${c.like}</dd><dt>${X.f.where}</dt><dd>${c.where}</dd></dl><p class="memo">${c.memo}</p></div>`).join('')}</div>
      <p class="common">${X.common}</p>
      <p class="common">${X.evidence}</p>
      <p class="common">${P.coNote}</p>
      <table>${P.keys.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')}</table>
      <dl class="gl">${X.gauges.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>`;
    ov.querySelector('.panel').onclick = (ev) => ev.stopPropagation();
    ov.querySelector('.resume').onclick = ov.onclick;
  }
  controls.addEventListener('lock', () => setRun(true));
  controls.addEventListener('unlock', () => { if (!ended && started) setRun(false); });
  document.addEventListener('pointerlockerror', onLockErr);

  const capsEl = $('p-caps'); const caps = [];
  const cap = (m, chip) => {
    const el = document.createElement('div');
    el.textContent = m;
    if (chip) { const c = document.createElement('em'); c.className = 'chip'; c.textContent = chip; el.append(c); }
    capsEl.append(el); caps.push({ el, life: 5 });
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
  const journal = (id, text, sus = false) => {
    logEl.querySelector('.empty')?.remove();
    // 같은 학생·같은 문구가 연속이면 새 줄 대신 ×N
    if (lastJ && lastJ.id === id && lastJ.text === text && lastJ.li.isConnected) {
      lastJ.li.lastChild.textContent = ` ×${++lastJ.n}`; return;
    }
    const li = document.createElement('li');
    if (sus) li.className = sus === true ? 'sus' : sus;
    li.append(id ? P.log(id, text) : text, document.createElement('em'));
    lastJ = { id, text, li, n: 1 };
    logEl.prepend(li);
    while (logEl.children.length > 12) logEl.lastChild.remove();
  };

  const banner = (text, withdraw) => {
    const b = $('p-banner'); b.hidden = false; b.classList.toggle('withdraw', !!withdraw);
    b.innerHTML = withdraw
      ? `<p class="old"><s>${P.directive.start}</s></p><span class="stamp">${P.stamp.correction}</span><p>${text}</p>`
      : `<p>${text}</p>`;
    restart(b, 'drop');
    withdraw ? audio.stamp() : audio.chime();
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

  // 신호(진짜)·닮은꼴 시작. 몸짓은 같고, 발광·소리는 진짜 신호에만 붙는다
  function start(e, name, real, kind) {
    const dur = real ? TUNE.signalDur[kind] : TUNE.lookalikeDur;
    if (name) e.person.setGesture(name, t, dur);
    e.sig = { name, kind, until: t + dur, real, sighted: false, neutral: false, ph: rand() * 6 };
    if (real) coLook(e, kind);
  }
  // 부감독관 시야: 플레이어와 같은 방위각 공식, 관찰자만 다르다. 가리킬 뿐 목격·현행범 기록은 건드리지 않는다
  function coLook(e, kind) {
    const c = co.group.position, dx = c.x - e.pos.x, dz = c.z - e.pos.z;
    if (!coSpots(kind, Math.atan2(dx, -dz) * 180 / Math.PI, Math.hypot(dx, dz), rand())) return;
    const m = marks.find((k) => k.e === e);
    if (m) { m.until = t + TUNE.co.markDur; return; }
    const el = document.createElement('div'); el.className = 'comark'; el.textContent = '[!]';
    $('p-marks').append(el); marks.push({ e, el, until: t + TUNE.co.markDur });
    journal(null, P.coLog(e.id), 'co'); cap(P.cap.co(e.id));
  }
  const cycleGap = (e) => {
    const [lo, hi] = TUNE.signalGap[e.device];
    return (lo + rand() * (hi - lo)) / (cheaterMul(heat, calmTime).tell * (e.done ? TUNE.doneTellMul : 1));
  };
  function schedule(e) {
    const cheating = e.type === 'cheater' && !e.deviceDead;
    // 세트 범인: 카메라 신호 → setGap 초 뒤 이어폰 신호(한 사이클). 안경은 한 신호가 한 사이클
    if (cheating && e.followup) {
      e.followup = false;
      start(e, REAL_GESTURE.earbud(rand), true, 'earbud');
      e.next = t + TUNE.signalDur.earbud + cycleGap(e);
      return;
    }
    if (cheating && rand() > 0.25) {
      if (e.device === 'set') {
        const [g0, g1] = TUNE.setGap;
        start(e, null, true, 'camai'); e.followup = true;
        e.next = t + TUNE.signalDur.camai + g0 + rand() * (g1 - g0);
      } else {
        start(e, REAL_GESTURE.glasses(rand), true, 'glasses');
        e.next = t + TUNE.signalDur.glasses + cycleGap(e);
      }
      return;
    }
    let names = ['pen', 'stretch', 'look'], lo = 3, hi = 8, div = 1; // 신호 사이의 무해 행동
    if (!cheating) {
      const k = TUNE.innocentGap[e.type] ? e.type : 'normal';
      [lo, hi] = TUNE.innocentGap[k]; div = innocentTellMul(e.stress);
      const like = k === 'hearing' ? ['scratch', 'tilt', 'cock'] : ['scratch', 'button', 'tilt', 'cock', ...(e.glasses ? ['frame'] : [])];
      // 긴장한 학생은 닮은꼴 비율이 높아진다. 나머지는 얌전한 행동(기지개는 드물게)
      names = rand() < nervousSignProb(e.stress) || rand() < TUNE.innocentLookalikeShare[k] ? like : [...(rand() < 0.1 ? ['stretch'] : ['pen', 'look'])];
    }
    e.next = t + (lo + rand() * (hi - lo)) / div;
    start(e, pick(rand, names), false);
  }
  // 신호 진행: 발광·소리·목격 기록. 정체(진짜/닮은꼴)는 보이는 결과로만 구분된다
  function tickSignals(aimNow) {
    let whisper = 0; whisperE = null;
    for (const e of ex) {
      if (e.removed) continue;
      const sg = e.sig, kind = sg && GLOW[sg.kind];
      if (sg && t >= sg.until) { e.sig = null; if (sg.real) e.person.setGlow(kind, 0); continue; }
      if (!sg) continue;
      const dx = camera.position.x - e.pos.x, dz = camera.position.z - e.pos.z, d = camera.position.distanceTo(e.pos);
      const vis = sg.real ? signalVisibility(sg.kind, Math.atan2(dx, -dz) * 180 / Math.PI) : 0;
      if (sg.real) {
        const att = d > TUNE.glowDist ? 0 : 1 - d / TUNE.glowDist * 0.5;
        const blink = sg.kind === 'glasses' ? 1 : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t + sg.ph) * 12));
        e.person.setGlow(kind, vis * att * blink * (sg.kind === 'glasses' ? TUNE.lensGlowMax : 1));
        if (sg.kind === 'earbud' && d <= 2 && 1 - d / 2 > whisper) { whisper = 1 - d / 2; whisperE = e; }
      }
      if (aimNow !== e || d > TUNE.sightDist) continue;
      if (sg.real && vis >= 0.35 && !sg.sighted) {
        sg.sighted = true; e.seen++; e.lastSight = t;
        journal(e.id, P.signs.sight[sg.kind], true);
        if (!seenDev.has(e.device)) { seenDev.add(e.device); cap(P.cap.codex(P.codex.cards[e.device].name)); }
      } else if (!sg.neutral && !sg.sighted && P.signs.like[sg.name]) {
        sg.neutral = true; journal(e.id, P.signs.like[sg.name], false);
      }
    }
    audio.whisper(whisper);
  }

  function remove(e) {
    e.removed = true;
    e.person.leave(exitPath(e.i));
    e.person.setHighlight(false);
    if (e.sig?.real) e.person.setGlow(GLOW[e.sig.kind], 0);
    e.sig = null;
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

  // 증거 3단계: 기기 발견·EMP 반응 = hard, 목격만 = soft
  const evidenceOf = (e) => (e.found || e.empFlag ? 'hard' : e.seen >= 1 ? 'soft' : 'none');
  function arrest(e) {
    const n = stirNeighbors(e);
    if (e.type === 'cheater') {
      state.caught.push(e.id);
      emp = Math.min(100, emp + 25);
      const ev = evidenceOf(e);
      cap(P.cap.caughtRight(e.id, addHeat(TUNE.heatArrest), n, ev), ev === 'none' ? P.stamp.noEvidence : '');
    } else {
      state.wrongCaught.push({ id: e.id, type: e.type });
      const h = addHeat(TUNE.heatArrest);
      cap(P.cap.caughtWrong(e.id, syncRisk(), h, n));
    }
    remove(e);
    audio.stamp();
  }

  function inspect(e) {
    inspectCd = TUNE.inspectCooldown;
    const n = stirNeighbors(e), h = addHeat(TUNE.heatInspect);
    if (dStage === 1 && e.glasses) {
      glassesChecked.add(e.id); state.directive = 'followed'; state.directiveCount = glassesChecked.size;
    }
    if (e.type === 'cheater' && rand() < inspectChance(e.device, t - (e.lastSight ?? -Infinity))) {
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
    ring.pulse(camera.position.x, camera.position.z, TUNE.empRadius);
    restart($('p-flash'), 'go'); audio.emp();
    $('p-audit').textContent = state.empCount;
    let n = 0;
    const target = aimed(8);
    for (const e of ex) {
      if (e.removed) continue;
      if (Math.hypot(e.pos.x - camera.position.x, e.pos.z - camera.position.z) > TUNE.empRadius) continue;
      n++;
      if (e.type === 'cheater' && !e.deviceDead) {
        const set = e.device === 'set';
        e.deviceDead = true; e.sig = null; e.followup = false;
        for (const k of set ? ['button', 'ear'] : ['lens']) { e.person.setGlow(k, 0); e.person.flashGlow(k); }
        e.person.setGesture(set ? 'emp_ear' : 'emp_lens', t, 3); e.person.setFace('panic', 3);
        e.stress = Math.min(100, e.stress + TUNE.stressEmpCheater);
        if (target === e) { e.empFlag = true; e.seen++; journal(e.id, P.signs.emp, true); }
      } else {
        e.stress = Math.min(100, e.stress + TUNE.stressEmpInnocent);
        if (!e.meltdown) e.person.setGesture('look', t, 1.5);
        if (e.type === 'hearing') state.hearingDamaged = true;
      }
    }
    cap(P.cap.emp(state.hearingDamaged ? 'hearing' : 'none', addHeat(TUNE.heatEmp), n));
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
    audio.stopAll();
    controls.unlock();
    // 증거 없이 잡은 범인은 시험 후 석방될 수 있다
    const { released } = releaseNoEvidence(
      ex.filter((e) => state.caught.includes(e.id)).map((e) => ({ id: e.id, evidence: evidenceOf(e) })), rand);
    state.released = released;
    state.caught = state.caught.filter((id) => !released.includes(id));
    state.missed = ex.filter((e) => e.type === 'cheater' && !state.caught.includes(e.id)).map((e) => ({ id: e.id, device: e.device, progress: Math.round(e.progress) }));
    state.parentRisk = risk; state.riskRoll = rand();
    // 엔딩 좌석 배치도·범인 초상. 옷 색은 몸통(첫 자식) 재질에서 가져온다
    const seats = ex.map((e) => ({
      id: e.id, type: e.type, device: e.device,
      status: e.type === 'cheater' ? (state.released.includes(e.id) ? 'released' : state.caught.includes(e.id) ? 'caught' : 'missed')
        : state.wrongCaught.some((w) => w.id === e.id) ? 'wrong' : e.meltdown ? 'meltdown' : null,
    }));
    // 초상은 덤이다. WebGL 컨텍스트를 못 얻어도 엔딩은 떠야 한다
    let portraits = [];
    try { portraits = renderPortraits(ex.filter((e) => e.type === 'cheater').map((e) => ({ color: e.person.group.children[0].material.color.getHex(), device: e.device }))); } catch (err) { console.warn('portraits', err); }
    onEnd({ ending: evaluateEnding(state), state, risk, meltdowns, emptyInspects, seats, portraits });
  }

  const timer = new THREE.Timer();
  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update(); const dt = Math.min(timer.getDelta(), 0.05);
    if (running && !ended) update(dt);
    ring.update(dt);
    for (const p of people) animatePerson(p, t, dt);
    animatePerson(co, t, dt); co.group.rotation.y = 0; // 걷는 방향과 무관하게 정면은 -z
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
    // 학생 몸은 통과 못 한다(책상은 통과 가능)
    for (const e of ex) {
      if (e.removed) continue;
      const dx = camera.position.x - e.pos.x, dz = camera.position.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d < SEAT_RADIUS) {
        const k = d > 1e-4 ? SEAT_RADIUS / d : 0;
        camera.position.x = e.pos.x + (d > 1e-4 ? dx * k : SEAT_RADIUS);
        camera.position.z = e.pos.z + dz * k;
      }
    }

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
      if (e.type === 'cheater' && !e.done && !e.deviceDead && (e.progress += TUNE.cheatBaseRate * mul.progress * dt) >= 100) e.done = true;
      if (t >= e.next) schedule(e);
    }
    tickSignals(aimed(8));
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
      v.copy(a.pos).add(new THREE.Vector3(0, 0.25, 0)).project(camera);
      aim.hidden = false;
      aim.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
      aim.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
      // 3m 안이면 확장 카드. 정체(범인 여부)는 절대 싣지 않는다
      const key = camera.position.distanceTo(a.pos) <= 3
        ? P.aimCard(a.id, P.levels[a.meltdown ? 'meltdown' : stressLevel(a.stress)], a.seen, P.inspected[a.inspected === 'found' ? 'found' : a.empFlag ? 'emp' : a.inspected ?? 'none'], hotSec(a))
        : P.aimLabel(a.id, a.seen, hotSec(a)) + (a.found ? ` · ${P.foundTag}` : a.empFlag ? ` · ${P.inspected.emp}` : '');
      if (key !== aimKey) { aimKey = key; aim.innerHTML = key; }
    } else aim.hidden = true;
    if (a !== aimPrev) { aimPrev?.person.setHighlight(false); a?.person.setHighlight(true); aimPrev = a; }
    const act = $('p-act'), hotEl = $('p-hot');
    const rc = reach();
    act.hidden = !rc;
    hotEl.textContent = rc && hotSec(rc) ? P.hotHint(hotSec(rc)) : '';
    act.classList.toggle('cool', inspectCd > 0);

    // 이어폰 소리 자막(무음 대응)과 부감독관 [!] 마커: 3D 위치를 화면에 투영
    const proj = (el, pos, up) => {
      v.copy(pos).add(new THREE.Vector3(0, up, 0)).project(camera);
      el.hidden = v.z > 1;
      el.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
      el.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
    };
    const wh = $('p-wh'); wh.hidden = !whisperE;
    if (whisperE) proj(wh, whisperE.pos, 0.45);
    for (let k = marks.length - 1; k >= 0; k--) {
      const m = marks[k];
      if (t >= m.until || m.e.removed) { m.el.remove(); marks.splice(k, 1); } else proj(m.el, m.e.pos, 0.5);
    }
    for (let k = caps.length - 1; k >= 0; k--) if ((caps[k].life -= dt) <= 0) caps.splice(k, 1)[0].el.remove();
    const sec = Math.max(0, Math.ceil(timeLeft)), low = timeLeft <= 30;
    const timeEl = $('p-time'), ts = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (timeEl.textContent !== ts) timeEl.textContent = ts;
    timeEl.classList.toggle('low', low);
    const cs = P.counts(state.caught.length, totalCheaters);
    if ($('p-counts').textContent !== cs) $('p-counts').textContent = cs;
    pulse = Math.max(0, pulse - dt * 2);
    const vig = Math.min(1, risk / 100 * 0.7 + pulse * 0.5);
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
    $('p-g-risk').classList.toggle('danger', risk >= 90);
    ring.preview(camera.position.x, camera.position.z, TUNE.empRadius, emp >= 100);
    setClock(Math.max(0, timeLeft / T0));
    if (t >= 30) ui.querySelector('.keys').classList.add('dim');
    if (low && sec !== lastTick && sec > 0) { lastTick = sec; audio.tick(1 - sec / 31); }
    audio.heartbeat(inspectT > 0 ? 0.6 + 0.4 * (inspectT / 2) : risk < 40 ? 0 : ((risk - 40) / 60) * 0.5);
    if (risk >= TUNE.riskGameOver) return gameOver();
    if (timeLeft <= 0) finish();
  }
  // 학부모 항의 폭주로 즉시 종료: 붉은 화면 + 캡션 + 도장 소리, 잠시 뒤 엔딩
  function gameOver() {
    ended = true; state.replaced = true;
    audio.stopAll(); audio.stamp();
    $('p-vig').style.opacity = 1;
    ov.hidden = false; ov.className = 'overlay over'; ov.onclick = null; ov.innerHTML = '';
    capsEl.innerHTML = ''; cap(P.gameOverCap);
    overTimer = setTimeout(finish, 2200);
  }
  frame();

  return {
    stop() {
      cancelAnimationFrame(raf); clearTimeout(overTimer); ended = true; audio.stopAll();
      stopResize(); controls.unlock(); controls.dispose();
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      document.removeEventListener('pointerlockerror', onLockErr);
      ui.innerHTML = '';
    },
  };
}
