import * as THREE from 'three';
import { audio } from './audio.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { buildClassroom, seatExaminees, createPerson, animatePerson, seatPos, exitPath, autoResize, renderPortraits, renderDeviceCards, ROOM, SEAT_RADIUS } from './scene.js';
import { allCaught, assignExaminees, evaluateEnding, inspectChance, signalVisibility, mulberry32, TUNE, stressStep, stressLevel, heatStep, calmStep, cheaterMul, innocentTellMul, parentRisk, nervousSignProb, releaseNoEvidence, coSpots } from './logic.js';
import { C } from './content.js';
import { kbd, bust, stack, dial, ring as aimRing, touchPad } from './hudkit.js';
import { isTouch, mountTouch } from './touch.js';

const P = C.proctor;
const GLOW = { camai: 'button', earbud: 'ear', glasses: 'lens' }; // 신호 kind → 발광 부위
// 진짜 신호는 두 단계: 1단계 = 부위를 만지는 몸짓(빛 없음, 무고와 같다), 2단계 = 손을 내린 뒤 발광
const HAND = { camai: 'button', earbud: 'tilt', glasses: 'frame' };
const REAL_GESTURE = { camai: () => null, earbud: () => 'cock', glasses: () => null };
const pick = (r, a) => a[Math.floor(r() * a.length)];
const SIG = { camai: '#ff5a3c', earbud: '#5aa8ff', glasses: '#6fdc95' }; // 신호색: 목격한 빛을 가리킬 때만 쓴다
const FACE = { calm: 0, tense: 1, high: 2, meltdown: 3 };
let deviceCards; // 도감 확대 모델 이미지. 처음 일시정지할 때 한 번만 그린다(null = 실패, 대역 그림)
// 위에서 본 방향도. 0도 = 학생 정면(위), +90 = 학생의 오른쪽
const wedge = (a0, a1, col, o = 0.75) => { const p = (a) => `${(43 + 38 * Math.sin(a * Math.PI / 180)).toFixed(1)} ${(43 - 38 * Math.cos(a * Math.PI / 180)).toFixed(1)}`; return `<path d="M43 43 L${p(a0)} A38 38 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}Z" fill="${col}" fill-opacity="${o}"/>`; };
const compass = (w) => `<svg width="86" height="86" viewBox="0 0 86 86"><circle cx="43" cy="43" r="38" fill="none" stroke="#1b1f2444" stroke-dasharray="2 3"/>${w}<rect x="34" y="35" width="18" height="16" rx="5" fill="#1B1F24"/><path d="M39 35 L43 28 L47 35Z" fill="#1B1F24"/></svg>`;
const DEV = { // 도감 카드 정의: 흉상 모양, 방향도, 확대 모델의 부품 이름 순서(scene.js anchors 키)
  glasses: { real: { glow: 'lens', glasses: true }, like: { glasses: true, hand: 'ear' }, dir: wedge(32, 105, '#3fae68') + wedge(-105, -32, '#3fae68'), parts: ['frame', 'lens', 'projector'] },
  set: { real: { glow: 'btn' }, like: { hand: 'btn' }, dir: wedge(-57, 57, '#ff5a3c', 0.7) + wedge(20, 210, '#5aa8ff', 0.6), parts: ['button', 'earbud', 'relay'] },
};

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
  const says = []; // 학생 머리 위 말풍선 {e, el, life}
  let coMarkUntil = 0;
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
  let ringKey = '', stkKey = '', dialKey = '', whisperE = null, overTimer = 0, risk = 0, pulse = 0, aimKey = '', aimPrev = null, lastTick = 0, lastJ = null;
  const totalCheaters = ex.filter((e) => e.type === 'cheater').length;
  const riskOf = () => parentRisk({ emptyInspects, meltdowns, wrongArrests: state.wrongCaught.length });
  let running = false, started = false, ended = false, raf = 0;
  const keys = {};
  // 일시정지 버튼을 뗀 뒤 따라오는 합성 click 이 방금 뜬 일시정지 화면을 곧바로 닫지 않게 삼킨다
  const pauseTap = () => {
    const eat = (e) => e.stopPropagation();
    addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, true), 1500);
    setRun(false);
  };
  let touch = null; // 터치 기기의 가상 조작. setRun 이 보임을 관리한다

  // HUD
  ui.innerHTML = `
    <div class="hud proctor">
      <div class="vignette" id="p-vig"></div><div class="emp-flash" id="p-flash"></div>
      <div class="hud-center"><b id="p-time">${Math.floor(timeLeft / 60)}:${String(Math.floor(timeLeft % 60)).padStart(2, '0')}</b><span id="p-counts"></span></div>
      <div id="p-banner" class="banner" hidden></div>
      <div class="gauges">
        <div class="g" id="p-g-risk"><div class="row"><span id="p-stk"></span><span class="num" id="p-risk-n">0</span></div><label>${P.risk}</label><b class="up" id="p-pl-risk"></b></div>
        <div class="g" id="p-g-heat"><div class="row col"><span id="p-dial"></span><span class="st" id="p-heat-n"></span></div><label>${P.heat}</label><b class="up" id="p-pl-heat"></b></div>
      </div>
      <div class="journal"><h3>${P.journal}</h3><ul id="p-log"><li class="empty">${P.journalEmpty}</li></ul></div>
      <div class="cross" id="p-ring"></div>
      <div class="mini">
        ${[['Esc', P.mini.esc, 8, 6], ['Q', P.mini.q, 32, 46], ['W', '', 70, 46], ['E', P.mini.e, 108, 46], ['A', '', 42, 84], ['S', '', 80, 84], ['D', '', 118, 84], ['F', P.mini.f, 156, 84]]
          .map(([k, l, x, y]) => `<kbd data-k="${k}" style="left:${x}px;top:${y}px">${k}${l ? `<small>${l}</small>` : ''}</kbd>`).join('')}
        <div class="used">${P.mini.used}<span><i></i><i class="seal"></i></span></div>
      </div>
      <div id="p-aim" class="aim obs" hidden></div>
      <div id="p-wh" class="aim wh" hidden>${P.whisperChip}</div>
      <div id="p-marks"></div><div id="p-comark" class="comark" hidden>[!]</div>
      <div id="p-act" class="act" hidden><div id="p-act-e"><kbd>E</kbd><span>${P.actHint.inspect}</span><em id="p-hot"></em></div><div><kbd>F</kbd>${P.actHint.arrest}</div></div>
      <div id="p-stamp" class="bigstamp" hidden></div>
      <div id="p-caps" class="caps"></div>
      <div class="ticker"><b class="ticker-tag">${P.tickerTag}</b><div class="ticker-in">${P.ticker.join('　　●　　')}　　●　　${P.ticker.join('　　●　　')}</div></div>
      <div id="p-ov" class="overlay"></div>
    </div>`;
  const $ = (id) => ui.querySelector('#' + id);
  const hotSec = (e) => (e.lastSight !== null && t - e.lastSight <= TUNE.redHandedWindow ? Math.ceil(TUNE.redHandedWindow - (t - e.lastSight)) : 0);
  const ov = $('p-ov');
  // 시작 안내: 잡을 사람 4명 + 키보드 그림. 창이 낮으면 키보드 그림만 줄인다
  const showStart = () => {
    const G = P.guide, sc = Math.min(0.92, innerWidth / 1100, (innerHeight - 490) / 340);
    ov.hidden = false; ui.querySelector('.hud').classList.add('cover');
    ov.innerHTML = `<div class="panel start"><div class="clues">${G.clues.map((c, k) => `${k ? '<i class="arr">→</i>' : ''}<div class="plate"><small>${c.h}</small><b>${c.t}</b><span>${c.d}</span></div>`).join('')}</div>
      <div class="who">${G.who.map((w, k) => `${k === 3 ? '<div class="sep"></div>' : ''}<figure class="${w.no ? 'no' : ''}">${bust({ ...w.o, w: 124 })}<em>${w.tag}</em><b>${w.t}</b><span>${w.d}</span></figure>`).join('')}</div>
      <p class="co"><b>[!]</b>${G.co}</p>
      <div class="kwrap" style="--hk-scale:${isTouch ? 0.85 : Math.max(0.5, sc)}">${isTouch ? touchPad(G.touch) : kbd(G.keys)}</div>
      <p class="cta">${isTouch ? P.tapStart : P.clickStart}</p></div>`;
  };
  showStart();
  if (isTouch) {
    touch = mountTouch(ui.querySelector('.hud'), { camera, buttons: [
      { id: 'inspect', label: P.mini.e, code: 'KeyE', hold: true },
      { id: 'arrest', label: P.mini.f, code: 'KeyF' },
      { id: 'emp', label: P.mini.q, code: 'KeyQ' },
      { id: 'pause', label: P.mini.esc, onTap: pauseTap },
    ] });
    touch.el.hidden = true; touch.set('emp', { disabled: true });
  }
  ov.onclick = () => { audio.init(); audio.hum(true); isTouch ? setRun(true) : controls.lock(); };

  // 포인터락이 안 되는 환경(헤드리스 등)이면 락 없이 그냥 진행한다.
  const onLockErr = () => { if (!ended) setRun(true); };
  const setRun = (v) => {
    running = v; started = true;
    ov.hidden = v; ui.querySelector('.hud').classList.toggle('cover', !v);
    if (touch) touch.el.hidden = !v; // 안내·일시정지 화면의 탭을 가리지 않게
    audio.hum(v); if (!v) audio.heartbeat(0);
    if (!v) audio.whisper(0);
    if (!v && !ended) showPause();
  };
  // 게임 중 폰을 세로로 돌리면 입력이 막히니 시간도 멈춘다
  const portrait = matchMedia('(orientation: portrait)');
  const onRotate = (ev) => { if (isTouch && ev.matches && running && !ended) setRun(false); };
  portrait.addEventListener('change', onRotate);
  // 확대 모델 창: on·off 두 장을 겹쳐 위 장을 깜빡인다. 부품 이름과 리더 라인은 SVG 층(좌표는 anchors 비율)
  const deviceWin = (d, c) => {
    const imgs = deviceCards?.[d], anc = renderDeviceCards.anchors?.[d], W = 232, H = 206;
    if (!imgs) return `<div class="win fb">${bust({ ...DEV[d].real, w: 150 })}</div>`;
    const lab = DEV[d].parts.map((k, i) => {
      const [ax, ay] = anc[k].map((r, n) => r * (n ? H : W)), lx = [6, W / 2, W - 6][i], ly = 16 + (i === 1 ? 15 : 0);
      return `<path class="ll" d="M${lx} ${ly + 4} L${ax} ${ay}"/><circle cx="${ax}" cy="${ay}" r="2.5"/><text x="${lx}" y="${ly}" text-anchor="${['start', 'middle', 'end'][i]}">${c.parts[i]}</text>`;
    }).join('');
    return `<div class="win"><img class="off" src="${imgs.off}" alt=""><img class="on" src="${imgs.on}" alt=""><svg viewBox="0 0 ${W} ${H}">${lab}</svg></div>`;
  };
  // 일시정지 패널 = 기기 신호 도감. 패널 안 클릭은 계속되지 않고, 계속 버튼·바깥 클릭만 계속한다
  function showPause() {
    const X = P.codex, GL = X.gauges, labels = Object.fromEntries(Object.entries(isTouch ? P.guide.touch : P.guide.keys).map(([k, v]) => [k, { t: v.t }]));
    if (deviceCards === undefined) { try { deviceCards = renderDeviceCards(); } catch (err) { deviceCards = null; console.warn('device cards', err); } }
    const fig = (h, t) => `<div>${h}<span>${t}</span></div>`;
    const card = ([d, c]) => `<div class="card">${deviceWin(d, c)}<div class="info"><h3>${c.name}<small>${c.sub}</small></h3>${seenDev.has(d) ? `<span class="stamp">${X.stamp}</span>` : `<span class="slot">${X.unseen}</span>`}
        <div class="vs"><figure class="real">${bust({ ...DEV[d].real, w: 78 })}<b>${X.real}</b><span>${c.real}</span></figure><figure>${bust({ ...DEV[d].like, w: 78 })}<b>${X.like}</b><span>${c.like}</span></figure></div>
        <div class="dir">${compass(DEV[d].dir)}<b>${c.dir}</b></div></div></div>`;
    ov.hidden = false;
    ov.innerHTML = `<div class="panel codex"><header><h2>${P.paused}</h2><span>${X.title} · ${X.sub}</span><button class="resume">${X.resume}</button></header>
      <div class="cards">${Object.entries(X.cards).map(card).join('')}</div>
      <div class="ev"><b>${X.evidence.title}</b>${X.evidence.rows.map((r) => `<span class="${r.ok ? 'ok' : ''}">${r.t}<em>${r.s}</em></span>`).join('')}</div>
      <div class="row2"><section class="kk"><h4>${X.keys}</h4>${isTouch ? touchPad(labels) : kbd(labels, { compact: true })}</section>
      <section class="gz"><h4>${X.gaugesTitle}</h4>
        <div>${`<div class="lv">${GL.lv.risk.map((n) => fig(stack(+n, 0, P.replaceLine), n)).join('')}</div>`}<h5>${GL.risk[0]}</h5><p>${GL.risk[1]}</p></div>
        <div><div class="lv">${fig(dial(0, 22, 84, P.dialLabels), GL.lv.heat[0])}${fig(dial(25, 0, 84, P.dialLabels), GL.lv.heat[1])}${fig(dial(80, 0, 84, P.dialLabels), GL.lv.heat[2])}</div><h5>${GL.heat[0]}</h5><p>${GL.heat[1]}</p></div>
        <div><div class="lv">${fig(aimRing(40, 0, 52), GL.lv.emp[0])}${fig(aimRing(100, 0, 52), GL.lv.emp[1])}</div><h5>${GL.emp[0]}</h5><p>${GL.emp[1]}</p></div>
        <div><div class="lv">${Object.entries(P.levels).map(([k, n]) => fig(bust({ blush: FACE[k], slump: k === 'meltdown', w: 62 }), n)).join('')}</div><h5>${GL.tense[0]}</h5><p>${GL.tense[1]}</p></div>
      </section></div></div>`;
    ov.querySelector('.panel').onclick = (ev) => ev.stopPropagation();
    ov.querySelector('.resume').onclick = ov.onclick;
  }
  controls.addEventListener('lock', () => setRun(true));
  controls.addEventListener('unlock', () => { if (!ended && started) setRun(false); });
  document.addEventListener('pointerlockerror', onLockErr);

  const capsEl = $('p-caps'); const caps = [];
  // 결과 토스트. m: 문자열 또는 { head, chips: [{ t, k }], sm, stamp }
  const cap = (m) => {
    if (typeof m === 'string') m = { head: m, sm: 1 };
    const el = document.createElement('div');
    el.className = m.sm ? 'sm' : '';
    const h = document.createElement('b'); h.textContent = m.head; el.append(h);
    const chips = (m.chips || []).filter(Boolean);
    if (chips.length) {
      const row = document.createElement('div'); row.className = 'chips';
      for (const c of chips) { const s = document.createElement(c.k === 'key' ? 'kbd' : 'span'); s.className = c.k || ''; s.textContent = c.t; row.append(s); }
      el.append(row);
    }
    capsEl.append(el); caps.push({ el, life: 5 });
    if (caps.length > 2) caps.shift().el.remove();
    if (m.stamp) { const st = $('p-stamp'); st.hidden = false; st.textContent = m.stamp; st.classList.toggle('wrong', m.stamp === P.stamp.wrong); restart(st, 'go'); }
  };
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const flash = (k, d) => {
    const pl = $('p-pl-' + k); pl.textContent = '+' + Math.round(d); restart(pl, 'up');
  };
  const addHeat = (x) => { const d = Math.min(100, heat + x) - heat; heat += d; if (d > 0) flash('heat', d); return Math.round(d); };
  // 리스크가 오른 만큼 알리고(게이지 번쩍·비네트 펄스), 오른 정수 폭을 돌려준다
  const syncRisk = () => {
    const nr = riskOf(), d = nr - risk; risk = nr;
    if (d > 0) { flash('risk', d); pulse = 1; }
    return Math.round(d);
  };
  const miniK = (k) => ui.querySelector(`.mini kbd[data-k="${k}"]`);
  const eK = miniK('E'), qK = miniK('Q'), usedI = ui.querySelectorAll('.mini .used i');
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
    while (logEl.children.length > 5) logEl.lastChild.remove();
  };
  // 관찰 카드 둘째 줄(목격 안내). kind: real(신호색 점) · like(닮은꼴) · emp. until: 사라지는 시각
  const witness = (e, text, kind, until, sig) => { e.wit = { text, kind, until, sig }; };

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
  // 진짜는 1단계(손, lookalikeDur) 뒤 tickSignals 가 2단계(발광, name 몸짓)로 넘긴다
  function start(e, name, real, kind) {
    const first = real ? HAND[kind] : name;
    if (first) e.person.setGesture(first, t, TUNE.lookalikeDur);
    e.sig = { name: first, kind, until: t + TUNE.lookalikeDur, real, phase: 1, then: name, sighted: false, neutral: false, ph: rand() * 6 };
  }
  // 부감독관 시야: 플레이어와 같은 방위각 공식, 관찰자만 다르다. 가리킬 뿐 목격·포착 기록은 건드리지 않는다
  function coLook(e, kind) {
    const c = co.group.position, dx = c.x - e.pos.x, dz = c.z - e.pos.z;
    if (!coSpots(kind, Math.atan2(dx, -dz) * 180 / Math.PI, Math.hypot(dx, dz), rand())) return;
    coMarkUntil = t + 1; // 부감독관 머리 위 [!] 1초
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
      e.next = t + TUNE.lookalikeDur + TUNE.signalDur.earbud + cycleGap(e);
      return;
    }
    if (cheating && rand() > 0.25) {
      if (e.device === 'set') {
        const [g0, g1] = TUNE.setGap;
        start(e, null, true, 'camai'); e.followup = true;
        e.next = t + TUNE.lookalikeDur + TUNE.signalDur.camai + g0 + rand() * (g1 - g0);
      } else {
        start(e, REAL_GESTURE.glasses(rand), true, 'glasses');
        e.next = t + TUNE.lookalikeDur + TUNE.signalDur.glasses + cycleGap(e);
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
      if (sg && t >= sg.until) {
        if (sg.real && sg.phase === 1) { // 손을 내리고 발광 시작
          sg.phase = 2; sg.until = t + TUNE.signalDur[sg.kind]; sg.name = sg.then; sg.neutral = false;
          if (sg.then) e.person.setGesture(sg.then, t, TUNE.signalDur[sg.kind]);
          coLook(e, sg.kind);
        } else { e.sig = null; if (sg.real) e.person.setGlow(kind, 0); continue; }
      }
      if (!sg) continue;
      const lit = sg.real && sg.phase === 2; // 1단계 몸짓은 무고와 구분되지 않는다
      const dx = camera.position.x - e.pos.x, dz = camera.position.z - e.pos.z, d = camera.position.distanceTo(e.pos);
      const vis = lit ? signalVisibility(sg.kind, Math.atan2(dx, -dz) * 180 / Math.PI) : 0;
      if (lit) {
        const att = d > TUNE.glowDist ? 0 : 1 - d / TUNE.glowDist * 0.5;
        const blink = sg.kind === 'glasses' ? 1 : 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t + sg.ph) * 12));
        e.person.setGlow(kind, vis * att * blink * (sg.kind === 'glasses' ? TUNE.lensGlowMax : sg.kind === 'camai' ? TUNE.buttonGlowMax : 1));
        if (sg.kind === 'earbud' && d <= 2 && 1 - d / 2 > whisper) { whisper = 1 - d / 2; whisperE = e; }
      }
      if (aimNow !== e || d > TUNE.sightDist) continue;
      if (lit && vis >= 0.35 && !sg.sighted) {
        sg.sighted = true; e.seen++; e.lastSight = t;
        journal(e.id, P.signs.sight[sg.kind], `sus sg-${sg.kind}`);
        witness(e, P.signs.sight[sg.kind], 'real', sg.until + 2, sg.kind);
        if (!seenDev.has(e.device)) { seenDev.add(e.device); cap(P.cap.codex(P.codex.cards[e.device].name)); }
      } else if (!sg.neutral && !sg.sighted && P.signs.like[sg.name]) {
        sg.neutral = true; journal(e.id, P.signs.like[sg.name], false);
        witness(e, P.signs.like[sg.name], 'like', t + 2.5);
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
  function say(e, key) {
    const el = document.createElement('div');
    el.className = 'say'; el.textContent = pick(rand, P.say[key]);
    $('p-marks').append(el); says.push({ e, el, life: 1.8 });
  }
  function arrest(e, head) { // head: 검사 성공으로 검거될 때 토스트 제목(토스트를 하나로 합친다)
    const n = stirNeighbors(e);
    if (e.type === 'cheater') {
      state.caught.push(e.id);
      if (allCaught(ex, state.caught)) allClear();
      emp = Math.min(100, emp + 25);
      const ev = evidenceOf(e);
      cap({ ...P.cap.caughtRight(e.id, addHeat(TUNE.heatArrest), n, ev), ...(head && { head }), stamp: P.stamp.caught });
      say(e, 'caught');
    } else {
      state.wrongCaught.push({ id: e.id, type: e.type });
      const h = addHeat(TUNE.heatArrest);
      cap({ ...P.cap.caughtWrong(e.id, syncRisk(), h, n), stamp: P.stamp.wrong });
      say(e, 'wrong');
    }
    remove(e);
    // 퇴실한 학생은 긴장 루프에서 빠지니 멘붕 판정 없이 얼굴만 빨개진다
    if (e.type !== 'cheater') e.person.setStress(95);
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
      arrest(e, P.cap.found(e.id, C.deviceNames[e.device])); // 검사 성공 = 자동 검거(증거 hard)
    } else {
      // 범인이든 무고든 증거를 못 찾으면 똑같이 처리한다(결과로 정체가 새면 안 된다)
      e.inspected = e.found ? 'found' : 'empty';
      emptyInspects++; e.stress = Math.min(100, e.stress + TUNE.stressEmptyInspect);
      cap(P.cap.empty(e.id, syncRisk(), h, n));
      say(e, 'empty');
    }
  }

  function fireEmp() {
    emp = 0; state.empCount++; flick = 1.2;
    ring.pulse(camera.position.x, camera.position.z, TUNE.empRadius);
    restart($('p-flash'), 'go'); audio.emp();
    usedI.forEach((el, k) => el.classList.toggle('on', state.empCount > k));
    let n = 0;
    const target = aimed(8);
    for (const e of ex) {
      if (e.removed) continue;
      if (Math.hypot(e.pos.x - camera.position.x, e.pos.z - camera.position.z) > TUNE.empRadius) continue;
      n++;
      if (e.type === 'cheater' && !e.deviceDead) {
        const set = e.device === 'set';
        e.deviceDead = true; e.sig = null; e.followup = false;
        const kinds = set ? ['button', 'ear'] : ['lens'];
        for (const k of kinds) { e.person.setGlow(k, 0); e.person.flashGlow(k); }
        e.person.fault(kinds, 3);
        e.person.setGesture(set ? 'emp_ear' : 'emp_lens', t, 3); e.person.setFace('panic', 3);
        e.stress = Math.min(100, e.stress + TUNE.stressEmpCheater);
        say(e, 'emp');
        if (target === e) { e.empFlag = true; e.seen++; journal(e.id, P.signs.emp, 'sus sg-emp'); witness(e, P.signs.emp, 'emp', t + 3); }
      } else {
        e.stress = Math.min(100, e.stress + TUNE.stressEmpInnocent);
        if (!e.meltdown) e.person.setGesture('look', t, 1.5);
        if (e.type === 'hearing') {
          state.hearingDamaged = true;
          e.person.setFace('panic', 3); e.person.setGesture('emp_aid', t, 3); e.person.fault(['ear'], 3);
          say(e, 'emp');
        }
      }
    }
    cap(P.cap.emp(state.hearingDamaged ? 'hearing' : 'none', addHeat(TUNE.heatEmp), n));
  }

  const onKey = (down) => (ev) => {
    keys[ev.code] = down;
    if (!down || !running || ended || ev.repeat) return;
    if (ev.code === 'KeyF') {
      const e = reach();
      if (e) arrest(e);
    }
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
          say(e, 'meltdown');
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

    // 소지품 검사: E 홀드 (쿨타임 중엔 불가)
    inspectCd = Math.max(0, inspectCd - dt);
    const near = inspectCd > 0 ? null : reach();
    if (keys.KeyE && near && near.id === inspectId) {
      inspectT += dt;
      if (inspectT >= TUNE.inspectHold) { inspect(near); inspectT = 0; keys.KeyE = false; }
    } else { inspectT = 0; inspectId = keys.KeyE && near ? near.id : null; }
    // 조준점 링: 바깥 EMP 충전, 안쪽 검사 진행. 값이 눈에 띄게 바뀔 때만 다시 그린다
    const rk = `${Math.round(emp)}|${Math.round(inspectT / TUNE.inspectHold * 40)}`;
    if (rk !== ringKey) { ringKey = rk; $('p-ring').innerHTML = aimRing(emp, inspectT / TUNE.inspectHold, 64); }

    if (flick > 0) { flick -= dt; flicker(false); } else flicker(true);

    // 관찰 카드: 조준한 학생 머리 위. 정체(범인 여부)는 절대 싣지 않는다
    const a = aimed(8), aim = $('p-aim');
    if (a) {
      v.copy(a.pos).add(new THREE.Vector3(0, 0.25, 0)).project(camera);
      aim.hidden = false;
      aim.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
      aim.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
      const w = a.wit && t < a.wit.until ? a.wit : null, hs = hotSec(a);
      const head = camera.position.distanceTo(a.pos) <= 3
        ? P.aimHead(a.id, FACE[a.meltdown ? 'meltdown' : stressLevel(a.stress)], P.levels[a.meltdown ? 'meltdown' : stressLevel(a.stress)], a.seen, P.inspected[a.inspected === 'found' ? 'found' : a.empFlag ? 'emp' : a.inspected ?? 'none'])
        : P.aimFar(a.id, a.seen);
      const key = head + (w ? w.kind + w.text : '');
      if (key !== aimKey) {
        aimKey = key;
        aim.innerHTML = `<div class="head">${head}</div>${w ? `<div class="saw ${w.kind}">${w.kind === 'like' ? '' : `<i class="dot" style="color:${w.sig ? SIG[w.sig] : '#F4F1E6'}"></i>`}${w.text}</div>` : ''}<i class="hot"></i>`;
      }
      const hotBar = aim.querySelector('.hot');
      hotBar.hidden = !hs; if (hs) hotBar.style.width = Math.max(0, 1 - (t - a.lastSight) / TUNE.redHandedWindow) * 100 + '%';
    } else aim.hidden = true;
    if (a !== aimPrev) { aimPrev?.person.setHighlight(false); a?.person.setHighlight(true); aimPrev = a; }
    const act = $('p-act'), hotEl = $('p-hot');
    const rc = reach();
    act.hidden = !rc;
    hotEl.textContent = rc && hotSec(rc) ? P.hotHint(hotSec(rc)) : '';
    $('p-act-e').classList.toggle('cool', inspectCd > 0);
    $('p-act-e').querySelector('span').textContent = inspectCd > 0 ? P.actHint.cool(Math.ceil(inspectCd)) : P.actHint.inspect;

    // 이어폰 소리 자막(무음 대응)과 부감독관 [!] 마커: 3D 위치를 화면에 투영
    const proj = (el, pos, up, dx = 0) => {
      v.copy(pos).add(new THREE.Vector3(0, up, 0)).project(camera);
      el.hidden = v.z > 1;
      el.style.left = ((v.x + 1) / 2) * innerWidth + dx + 'px';
      el.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
    };
    const wh = $('p-wh'); wh.hidden = !whisperE;
    if (whisperE) proj(wh, whisperE.pos, 0.45, -90);
    const cm = $('p-comark'); cm.hidden = t >= coMarkUntil;
    if (!cm.hidden) proj(cm, co.group.position, 2.05);
    for (let k = marks.length - 1; k >= 0; k--) {
      const m = marks[k];
      if (t >= m.until || m.e.removed) { m.el.remove(); marks.splice(k, 1); } else proj(m.el, m.e.pos, 0.5, 40);
    }
    for (let k = says.length - 1; k >= 0; k--) {
      const m = says[k];
      if ((m.life -= dt) <= 0) { m.el.remove(); says.splice(k, 1); continue; }
      proj(m.el, m.e.person.group.position, 1.7); // 앉으면 group 이 내려가므로 머리 위까지 넉넉히
      m.el.hidden = m.el.hidden || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      if (m.e === a) { m.el.style.left = aim.style.left; m.el.style.top = parseFloat(aim.style.top) - aim.offsetHeight - 8 + 'px'; } // 관찰 카드 위로 쌓는다
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
    if (eK.dataset.cd !== (cdS > 0 ? String(cdS) : '')) { eK.dataset.cd = cdS > 0 ? cdS : ''; eK.classList.toggle('cd', cdS > 0); touch?.set('inspect', { disabled: cdS > 0, badge: cdS > 0 ? cdS : '' }); }
    const rn = Math.round(risk);
    if ($('p-risk-n').textContent !== String(rn)) $('p-risk-n').textContent = rn;
    const sk = Math.ceil(risk / 10);
    if (sk !== stkKey) { $('p-stk').innerHTML = stack(risk, Math.max(0, sk - Math.max(0, stkKey || 0)), P.replaceLine); stkKey = sk; }
    const dk = `${Math.round(heat)}|${Math.floor(calmTime)}`;
    if (dk !== dialKey) { dialKey = dk; $('p-dial').innerHTML = dial(heat, calmTime, 116, P.dialLabels); }
    const hn = calmTime > TUNE.boldAfter ? P.heatBold : calmTime > 0 ? P.heatCalm(Math.floor(calmTime), TUNE.boldAfter) : heat >= 50 ? P.heatShy : heat > 0 ? P.heatWatch : '';
    if ($('p-heat-n').textContent !== hn) $('p-heat-n').textContent = hn;
    qK.classList.toggle('rdy', emp >= 100); touch?.set('emp', { disabled: emp < 100 });
    $('p-g-risk').classList.toggle('danger', risk >= 90);
    ring.preview(camera.position.x, camera.position.z, TUNE.empRadius, emp >= 100);
    setClock(Math.max(0, timeLeft / T0));
    if (t >= 30) ui.querySelector('.mini').classList.add('dim');
    if (low && sec !== lastTick && sec > 0) { lastTick = sec; audio.tick(1 - sec / 31); }
    audio.heartbeat(inspectT > 0 ? 0.6 + 0.4 * (inspectT / TUNE.inspectHold) : risk < 40 ? 0 : ((risk - 40) / 60) * 0.5);
    if (risk >= TUNE.riskGameOver) return gameOver();
    if (timeLeft <= 0) finish();
  }
  // 범인 전원 검거: 도장 소리와 캡션 뒤 바로 엔딩(석방 판정은 finish 에서)
  function allClear() {
    ended = true; audio.stopAll(); audio.stamp();
    capsEl.innerHTML = ''; cap(P.allCaught);
    overTimer = setTimeout(finish, 1500);
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
      stopResize(); controls.unlock(); controls.dispose(); touch?.dispose();
      portrait.removeEventListener('change', onRotate);
      removeEventListener('keydown', kd); removeEventListener('keyup', ku);
      document.removeEventListener('pointerlockerror', onLockErr);
      ui.innerHTML = '';
    },
  };
}
