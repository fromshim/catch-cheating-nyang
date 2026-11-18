import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { buildClassroom, seatExaminees, createPerson, animatePerson, seatPos, autoResize } from './scene.js';
import { mulberry32 } from './logic.js';
import { C } from './content.js';

const E = C.examinee;
const SEAT = 14; // 3번째 줄, 3번째 열
const RANGE = 5, HALF = (32 * Math.PI) / 180;
const PATHS = [
  [[0, -4.9], [0, 6.6], [-3.6, 6.6], [-3.6, -4.9]],
  [[-1.8, -4.9], [-1.8, 6.6], [1.8, 6.6], [1.8, -4.9]],
];

export function startExaminee({ renderer, ui, onEnd }) {
  const seed = (Math.random() * 1e9) | 0;
  const { scene } = buildClassroom();
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 60);
  const s = seatPos(SEAT);
  camera.position.set(s.x, 1.3, s.z);
  const controls = new PointerLockControls(camera, renderer.domElement);
  const stopResize = autoResize(renderer, camera);
  const people = seatExaminees(scene, seed, SEAT);

  // 감독관 NPC 2명 + 바닥 시야 원뿔
  const rand = mulberry32(seed);
  const npcs = PATHS.map((pts, k) => {
    const p = createPerson(rand, { color: 0x3b4252, proctor: true });
    p.group.position.set(pts[0][0], 0, pts[0][1] + k * 6);
    p.walk = { pts, i: 1, loop: true };
    scene.add(p.group);
    const geo = new THREE.CircleGeometry(RANGE, 20, Math.PI / 2 - HALF, HALF * 2);
    geo.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = 0.03;
    scene.add(cone);
    return { p, cone };
  });

  let dev = null, running = false, started = false, ended = false, raf = 0;
  let t = 0, timeLeft = Number(new URLSearchParams(location.search).get("t")) || 120, // 개발용: ?t=5 로 시험 시간 단축
    progress = 0, susp = 0, using = false;

  ui.innerHTML = `<div class="hud examinee"><div class="hud-center"><b id="e-time">120</b><span>${E.timeLeft}</span></div>
    <div class="gauges">
      <div class="gauge"><label>${E.progress}</label><i><u id="e-prog"></u></i></div>
      <div class="gauge warn"><label>${E.suspicion}</label><i><u id="e-susp"></u></i></div></div>
    <ul class="keys">${E.keys.map(([k, v]) => `<li><kbd>${k}</kbd>${v}</li>`).join('')}</ul>
    <div id="e-use" class="usefx" hidden>${E.using}</div><div class="cross"></div>
    <div id="e-ov" class="overlay"></div></div>`;
  const $ = (id) => ui.querySelector('#' + id);
  const ov = $('e-ov');
  const panel = (title, lines, extra, btn) => {
    ov.hidden = false;
    ov.innerHTML = `<div class="panel"><h2>${title}</h2>${lines.map((l) => `<p>${l}</p>`).join('')}${extra}${btn ? `<p class="cta">${btn}</p>` : ''}</div>`;
  };
  panel(E.pickTitle, [E.pickDesc], `<div class="choices">${Object.keys(E.devices).map((k) => {
    const d = E.devices[k];
    return `<button data-d="${k}"><b>${C.deviceNames[k]}</b><span>${E.speed}: ${d.speed}</span><span>${E.risk}: ${d.risk}</span></button>`;
  }).join('')}</div>`, '');
  ov.onclick = (ev) => {
    const b = ev.target.closest('button[data-d]');
    if (b) {
      dev = b.dataset.d;
      panel(C.deviceNames[dev], E.startLines, '', E.clickStart);
    } else if (dev) controls.lock();
  };

  const setRun = (v) => {
    running = v; started = true; ov.hidden = v;
    if (!v && !ended) panel(E.paused, [], '', E.clickResume);
  };
  const onLockErr = () => { if (!ended && dev) setRun(true); };
  controls.addEventListener('lock', () => setRun(true));
  controls.addEventListener('unlock', () => { if (!ended && started) setRun(false); });
  document.addEventListener('pointerlockerror', onLockErr);

  const down = (ev) => { if (ev.code === 'Space') { using = true; ev.preventDefault(); } };
  const up = (ev) => { if (ev.code === 'Space') using = false; };
  addEventListener('keydown', down); addEventListener('keyup', up);

  function finish(id) {
    ended = true; running = false; controls.unlock();
    const d = E.devices[dev];
    onEnd({
      ending: { ...E.endings[id], id }, 
      stats: [
        `${E.stats.device}: ${C.deviceNames[dev]}`,
        `${E.stats.progress}: ${Math.floor(progress)}%`,
        `${E.stats.suspicion}: ${Math.floor(susp)}%`,
      ],
      news: id === 'pass' ? E.endings.pass.news : null,
      speed: d.speed,
    });
  }

  const clock = new THREE.Clock();
  const me = new THREE.Vector2();
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (running && !ended) update(dt);
    for (const p of people) if (p) animatePerson(p, t, dt);
    for (const n of npcs) {
      animatePerson(n.p, t, dt);
      n.cone.position.x = n.p.group.position.x; n.cone.position.z = n.p.group.position.z;
      n.cone.rotation.y = n.p.group.rotation.y;
    }
    renderer.render(scene, camera);
  }

  function update(dt) {
    t += dt; timeLeft -= dt;
    me.set(camera.position.x, camera.position.z);
    let seen = false, near = RANGE;
    for (const n of npcs) {
      const g = n.p.group, dx = me.x - g.position.x, dz = me.y - g.position.z, d = Math.hypot(dx, dz);
      if (d > RANGE) continue;
      const fx = -Math.sin(g.rotation.y), fz = -Math.cos(g.rotation.y);
      if (Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d))) < HALF) { seen = true; near = Math.min(near, d); }
    }
    const D = E.devices[dev];
    if (using) {
      progress += D.rate * dt;
      susp += (seen ? D.risk_in * (1 + (RANGE - near) / RANGE) : 2) * dt;
    } else susp -= 6 * dt;
    progress = Math.min(100, progress); susp = Math.max(0, susp);
    $('e-use').hidden = !using;
    $('e-time').textContent = Math.max(0, Math.ceil(timeLeft));
    $('e-prog').style.width = progress + '%';
    $('e-susp').style.width = Math.min(100, susp) + '%';
    if (susp >= 100) finish('caught');
    else if (progress >= 100) finish('pass');
    else if (timeLeft <= 0) finish('fail');
  }
  frame();

  return {
    stop() {
      cancelAnimationFrame(raf); ended = true; stopResize();
      controls.unlock(); controls.dispose();
      removeEventListener('keydown', down); removeEventListener('keyup', up);
      document.removeEventListener('pointerlockerror', onLockErr);
      ui.innerHTML = '';
    },
  };
}
