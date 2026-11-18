import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { buildClassroom, seatExaminees, animatePerson, seatPos, exitPath, autoResize, ROOM } from './scene.js';
import { assignExaminees, evaluateEnding, inspectFound, isElectronic, mulberry32 } from './logic.js';
import { C } from './content.js';

const P = C.proctor;
const SIGNS_BY = {
  paper: ['sleeve'], watch: ['wrist'], earbud: ['ear', 'lips'], camai: ['freeze'], glasses: ['glint'],
};
const SIGN_DUR = { freeze: 4, glint: 2.5, look: 2, spark: 3 };
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
    if (e.device === 'glasses') person.glasses.visible = true;
    return {
      ...e, i, person, removed: false, seen: 0, found: false, empFlag: false,
      pos: new THREE.Vector3(s.x, 1.25, s.z), next: 2 + rand() * 6,
    };
  });

  const state = { caught: [], wrongCaught: [], missed: [], hearingDamaged: false, empCount: 0 };
  let t = 0, timeLeft = Number(new URLSearchParams(location.search).get("t")) || 180, // 개발용: ?t=5 로 시험 시간 단축
    emp = 0, complaint = 0, flick = 0, inspectT = 0, inspectId = null;
  let running = false, started = false, ended = false, raf = 0;
  const keys = {};

  // HUD
  ui.innerHTML = `
    <div class="hud proctor">
      <div class="hud-top"><span>${P.timeLeft} <b id="p-time">180</b></span>
        <span id="p-counts"></span></div>
      <div class="gauges">
        <div class="gauge"><label id="p-emp-l">${P.emp}</label><i><u id="p-emp"></u></i></div>
        <div class="gauge warn"><label>${P.complaint}</label><i><u id="p-comp"></u></i></div>
        <div class="gauge-note">${P.empCount} <b id="p-audit">0</b></div>
      </div>
      <div class="journal"><h3>${P.journal}</h3><ul id="p-log"><li class="empty">${P.journalEmpty}</li></ul></div>
      <div class="cross"></div>
      <ul class="keys">${P.keys.map(([k, v]) => `<li><kbd>${k}</kbd>${v}</li>`).join('')}</ul>
      <div id="p-aim" class="aim" hidden></div>
      <div id="p-insp" class="insp" hidden><i><u></u></i><span>${P.inspecting}</span></div>
      <div id="p-toast" class="toast"></div>
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

  const toastEl = $('p-toast'); let toastT = 0;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('on'); toastT = 3.5; };
  const logEl = $('p-log');
  const journal = (id, text) => {
    logEl.querySelector('.empty')?.remove();
    const li = document.createElement('li');
    li.textContent = P.log(id, text);
    logEl.prepend(li);
    while (logEl.children.length > 12) logEl.lastChild.remove();
  };

  const dir = new THREE.Vector3(), v = new THREE.Vector3();
  // 화면 중앙에 가장 가깝게 걸린 수험생(거리 maxDist 안)
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
    if (aimed(8) === e) {
      const s = P.signs[name];
      if (s.sus) e.seen++;
      journal(e.id, s.text);
    }
  }
  function schedule(e) {
    let names, lo, hi;
    if (e.type === 'cheater') { names = rand() < 0.2 ? ['pen', 'stretch'] : SIGNS_BY[e.device]; lo = 5; hi = 11; }
    else if (e.type === 'distracted') { names = ['look', 'ear', 'wrist']; lo = 3; hi = 7; }
    else if (e.type === 'hearing') { names = ['ear']; lo = 10; hi = 18; }
    else { names = ['stretch', 'pen']; lo = 10; hi = 22; }
    e.next = t + lo + rand() * (hi - lo);
    sign(e, pick(rand, names));
  }

  function remove(e) {
    e.removed = true;
    e.person.leave(exitPath(e.i));
  }

  function arrest(e) {
    if (e.type === 'cheater') {
      state.caught.push(e.id);
      emp = Math.min(100, emp + 25);
      toast(P.toast.caughtRight(e.id));
    } else {
      state.wrongCaught.push({ id: e.id, type: e.type });
      complaint = Math.min(100, complaint + 20);
      toast(P.toast.caughtWrong(e.id));
    }
    remove(e);
  }

  function inspect(e) {
    if (e.type === 'cheater' && inspectFound(e.device, rand())) {
      e.found = true;
      toast(P.toast.foundDevice(e.id, C.deviceNames[e.device]));
    } else if (e.type === 'cheater') toast(P.toast.nothingCheater(e.id));
    else { complaint = Math.min(100, complaint + 25); toast(P.toast.nothingInnocent(e.id)); }
  }

  function fireEmp() {
    emp = 0; state.empCount++; flick = 1.2;
    $('p-audit').textContent = state.empCount;
    let hit = 0;
    for (const e of ex) {
      if (e.removed) continue;
      if (Math.hypot(e.pos.x - camera.position.x, e.pos.z - camera.position.z) > 10) continue;
      if (e.type === 'cheater' && isElectronic(e.device)) {
        e.person.setGesture('spark', t, 3); e.seen++; e.empFlag = true; hit++;
        journal(e.id, P.signs.emp.text);
      } else if (e.type === 'hearing') state.hearingDamaged = true;
    }
    toast(state.hearingDamaged ? P.toast.hearingDamaged : hit ? P.toast.empFired : P.toast.empNone);
  }

  const onKey = (down) => (ev) => {
    keys[ev.code] = down;
    if (!down || !running || ended || ev.repeat) return;
    if (ev.code === 'KeyF') { const e = aimed(2); if (e) arrest(e); }
    if (ev.code === 'KeyQ' && emp >= 100) fireEmp();
  };
  const kd = onKey(true), ku = onKey(false);
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  function finish() {
    ended = true; running = false;
    controls.unlock();
    state.missed = ex.filter((e) => e.type === 'cheater' && !state.caught.includes(e.id)).map((e) => ({ id: e.id, device: e.device }));
    onEnd({ ending: evaluateEnding(state), state, complaint });
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

    for (const e of ex) if (!e.removed && t >= e.next) schedule(e);

    // 소지품 검사: E 홀드 2초
    const near = aimed(2);
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
      aim.textContent = P.aimLabel(a.id, a.seen) + (a.found ? ` · ${P.foundTag}` : '');
    } else aim.hidden = true;

    if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('on');
    $('p-time').textContent = Math.max(0, Math.ceil(timeLeft));
    $('p-emp').style.width = emp + '%';
    $('p-emp-l').textContent = emp >= 100 ? P.empReady : P.emp;
    $('p-emp').parentNode.classList.toggle('ready', emp >= 100);
    ui.querySelector('.keys li:nth-child(5)').classList.toggle('off', emp < 100);
    $('p-comp').style.width = complaint + '%';
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
