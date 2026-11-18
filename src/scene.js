import * as THREE from 'three';
import { C } from './content.js';
import { mulberry32 } from './logic.js';

export const ROOM = { x: 6, zMin: -8, zMax: 8 };
export const DOOR = { x: 5.2, z: 7.6 };
export const deskPos = (i) => ({ x: ((i % 6) - 2.5) * 1.8, z: -3.5 + Math.floor(i / 6) * 2.2 });
// 앉은 수험생의 몸 위치(책상 뒤)
export const seatPos = (i) => { const d = deskPos(i); return { x: d.x, z: d.z + 0.75 }; };

export const SEAT_RADIUS = 0.45; // 감독관 카메라가 앉은 인물에 파고들지 않게 하는 충돌 반경

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setSize(innerWidth, innerHeight);
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  return r;
}

export function autoResize(renderer, camera) {
  const f = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', f);
  return () => removeEventListener('resize', f);
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

export function buildClassroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe5e0);
  scene.fog = new THREE.Fog(0xdfe5e0, 10, 26);

  // 방 (안쪽 면만 보이는 박스) + 바닥
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.x * 2, 3.2, ROOM.zMax * 2),
    new THREE.MeshStandardMaterial({ color: 0xe9ede6, side: THREE.BackSide, roughness: 1 }),
  );
  wall.position.y = 1.59; // 아랫면을 바닥(y=0)보다 살짝 내린다. 같은 높이면 z-fighting으로 바닥이 지지직거린다
  scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.zMax * 2), mat(0x8c9490));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 허리 높이 옥색 페인트 띠(1.1m), 벽 안쪽에 얇은 박스 4면
  const bandMat = mat(0x9db8a8);
  for (const sx of [-1, 1]) {
    const b = box(0.02, 1.1, ROOM.zMax * 2, bandMat); b.position.set(sx * (ROOM.x - 0.01), 0.55, 0); scene.add(b);
  }
  for (const sz of [-1, 1]) {
    const b = box(ROOM.x * 2, 1.1, 0.02, bandMat); b.position.set(0, 0.55, sz * (ROOM.zMax - 0.01)); scene.add(b);
  }

  // 칠판
  const boardTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#2f4a3f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e6da'; g.textAlign = 'center';
    g.font = 'bold 54px sans-serif'; g.fillText(C.board[1], w / 2, 100);
    g.font = '32px sans-serif'; g.fillText(C.board[0], w / 2, 50);
    g.fillText(C.board[2], w / 2, 160);
    g.fillText(C.board[3], w / 2, 210);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(0, 1.8, ROOM.zMin + 0.02);
  scene.add(board);

  // 벽시계: 문자판 + 시침·분침 별도 메시
  const clockTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#f2f4ee'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
    g.strokeStyle = '#333'; g.lineWidth = 8; g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.lineWidth = 6; g.beginPath();
      g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100);
      g.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); g.stroke();
    }
  });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), new THREE.MeshBasicMaterial({ map: clockTex }));
  clock.position.set(4.2, 2.5, ROOM.zMin + 0.02);
  scene.add(clock);
  const handMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const hand = (len, w, z) => {
    const pv = new THREE.Group(); pv.position.set(4.2, 2.5, ROOM.zMin + 0.02 + z); scene.add(pv);
    const m = box(w, len, 0.005, handMat); m.position.y = len / 2; pv.add(m);
    return pv;
  };
  const hourHand = hand(0.17, 0.025, 0.004), minHand = hand(0.27, 0.016, 0.008);
  // frac = 남은 시간 비율(1→0). 분침은 한 바퀴, 시침은 1/12 바퀴. 시계 방향 = -z 회전
  const setClock = (frac) => {
    const e = 1 - Math.max(0, Math.min(1, frac));
    minHand.rotation.z = -e * Math.PI * 2;
    hourHand.rotation.z = -(1.0 + e * Math.PI / 6);
  };
  setClock(1);

  // 뒷문
  const door = box(1.0, 2.1, 0.05, mat(0x7d8a84));
  door.position.set(DOOR.x, 1.05, ROOM.zMax - 0.03);
  scene.add(door);

  // 교탁
  const podium = box(2, 0.9, 0.8, mat(0x9a917c));
  podium.position.set(0, 0.45, -6.6);
  podium.castShadow = podium.receiveShadow = true;
  scene.add(podium);

  // 책상 24개 + 의자 + 번호판 + 시험지
  const deskMat = mat(0xd9c9a3);
  const legMat = mat(0x4a5257);
  const chairMat = mat(0x4a5257);
  const paperMat = mat(0xf4f1e6);
  const shadowed = (m) => { m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  for (let i = 0; i < 24; i++) {
    const { x, z } = deskPos(i);
    shadowed(box(1.2, 0.05, 0.6, deskMat)).position.set(x, 0.75, z);
    for (const sx of [-0.55, 0.55]) shadowed(box(0.05, 0.75, 0.5, legMat)).position.set(x + sx, 0.375, z);
    shadowed(box(1.1, 0.35, 0.02, deskMat)).position.set(x, 0.55, z - 0.28); // 앞 가림판

    const numMat = new THREE.MeshBasicMaterial({
      map: canvasTex(128, 64, (g, w, h) => {
        g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#222'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
        g.fillText(String(i + 1), w / 2, 48);
      }),
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), numMat);
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(x, 0.78, z - 0.12);
    scene.add(tag);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), numMat);
    plate.rotation.y = Math.PI; // 칠판(-z) 쪽을 본다
    plate.position.set(x, 0.56, z - 0.292);
    scene.add(plate);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), paperMat);
    paper.rotation.x = -Math.PI / 2;
    paper.position.set(x + 0.3, 0.777, z + 0.02);
    paper.receiveShadow = true;
    scene.add(paper);

    const s = seatPos(i);
    shadowed(box(0.42, 0.04, 0.42, chairMat)).position.set(s.x, 0.42, s.z);
    shadowed(box(0.42, 0.3, 0.04, chairMat)).position.set(s.x, 0.59, s.z + 0.21);
    shadowed(box(0.04, 0.4, 0.04, chairMat)).position.set(s.x, 0.2, s.z);
  }

  // 조명: 형광등 패널 6개 + 같은 좌표의 점광원 6개 + 반구광 + 그림자용 방향광
  const lights = [];
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xf2f8f0 });
  for (const lx of [-3, 3]) for (const lz of [-5, 0, 5]) {
    const p = box(1.8, 0.06, 0.35, panelMat);
    p.position.set(lx, 3.15, lz);
    scene.add(p);
    const l = new THREE.PointLight(0xe8f3ea, 6, 12, 2);
    l.position.set(lx, 2.6, lz);
    l.userData.base = 6;
    scene.add(l);
    lights.push(l);
  }
  const hemi = new THREE.HemisphereLight(0xeaf2ee, 0x6f7a74, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(2, 6, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 20 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 3;
  scene.add(sun);
  // on=false 면 형광등이 깜빡인다
  const flicker = (on) => {
    for (const l of lights) l.intensity = on ? l.userData.base : l.userData.base * (Math.random() > 0.5 ? 0.15 : 0.9);
    hemi.intensity = on ? 0.9 : 0.25;
    panelMat.color.setHex(on ? 0xf2f8f0 : Math.random() > 0.5 ? 0x777f78 : 0xf2f8f0);
  };

  // EMP 링: pulse = 0.3초 확산 후 소멸, preview = 반경 표시(매 프레임 호출)
  const ringMat = (opacity) => new THREE.MeshBasicMaterial({
    color: 0x9fe8ff, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const flat = (geo, m) => { const r = new THREE.Mesh(geo, m); r.rotation.x = -Math.PI / 2; r.position.y = 0.02; scene.add(r); return r; };
  const pulseGeo = new THREE.RingGeometry(0.9, 1, 64);
  const prevMesh = flat(new THREE.RingGeometry(0.97, 1, 64), ringMat(0.5));
  prevMesh.visible = false;
  const pulses = [];
  const ring = {
    pulse(x, z, r) {
      const m = flat(pulseGeo, ringMat(1));
      m.position.set(x, 0.02, z); m.scale.setScalar(0.001);
      pulses.push({ m, r, t: 0 });
    },
    preview(x, z, r, on) {
      prevMesh.visible = !!on;
      if (on) { prevMesh.position.set(x, 0.02, z); prevMesh.scale.setScalar(r); }
    },
    update(dt) {
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += dt / 0.3;
        if (p.t >= 1) { scene.remove(p.m); p.m.material.dispose(); pulses.splice(i, 1); continue; }
        p.m.scale.setScalar(Math.max(0.001, p.r * p.t));
        p.m.material.opacity = 1 - p.t;
      }
    },
  };
  return { scene, flicker, setClock, ring };
}

// ---------- 인물 ----------
// 구 머리 + 박스 몸통 + 어깨·팔꿈치·엉덩이·무릎 피벗(Group). 기본은 앉은 자세.
const SKIN = [0xe2b99a, 0xd8a883, 0xeac3a4];
const CLOTH = [0x8a93a0, 0x9ca4aa, 0x7c8796, 0xb0b5b2, 0x919ba6]; // 회청색. 정면이 그늘지므로 한 단계 밝게 잡는다
const SEAT_Y = -0.4; // 앉으면 몸 전체가 내려간다(엉덩이 높이 0.4)
const REST = { rs: 0.5, re: 1.1, ls: 0.5, le: 1.1, rz: 0, lz: 0, hx: -0.3, hy: 0, hz: 0,
  rh: Math.PI / 2, lh: Math.PI / 2, rk: -Math.PI / 2, lk: -Math.PI / 2, by: SEAT_Y };

const haloTex = (() => {
  let t;
  return () => t ??= canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
})();
const BLUSH = new THREE.Color(0xd8402e);

export function createPerson(rand, { color, proctor = false } = {}) {
  const g = new THREE.Group();
  const cloth = mat(color ?? CLOTH[Math.floor(rand() * CLOTH.length)]);
  const skin = mat(SKIN[Math.floor(rand() * SKIN.length)]);
  const skin0 = skin.color.clone();
  skin.emissive.setHex(0);
  const pants = mat(proctor ? 0x2d2d33 : 0x4a4a52);
  const torso = box(0.5, 0.65, 0.28, cloth); torso.position.y = 1.12; g.add(torso);

  const head = new THREE.Group(); head.position.y = 1.67; g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin));
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.196, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.38), mat(0x2b2420));
  hair.position.y = 0.012; hair.rotation.x = 0.35; head.add(hair); // 뒤(+z)로 젖혀 이마가 드러난다
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const ex of [-0.07, 0.07]) { const e = box(0.025, 0.025, 0.01, eyeMat); e.position.set(ex, 0.03, -0.185); head.add(e); }
  const mouth = box(0.1, 0.03, 0.01, mat(0x6b3a36)); mouth.position.set(0, -0.08, -0.183); head.add(mouth);
  const brows = [-0.07, 0.07].map((bx) => { const b = box(0.06, 0.012, 0.01, eyeMat); b.position.set(bx, 0.07, -0.185); head.add(b); return b; });
  // 안경: 얇은 윗테 + 브리지 + 반투명 렌즈 두 장(다리 없음). 렌즈 앞면에 가산 초록 빛샘 평면
  const glasses = new THREE.Group(); glasses.visible = false; head.add(glasses);
  const frameMat = mat(0x222222);
  const fr = box(0.25, 0.012, 0.012, frameMat); fr.position.set(0, 0.067, -0.2); glasses.add(fr);
  const br = box(0.03, 0.012, 0.012, frameMat); br.position.set(0, 0.03, -0.2); glasses.add(br);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xaac4d4, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
  const additive = (c, map) => new THREE.MeshBasicMaterial({ color: c, ...(map && { map }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const lensGlowMat = additive(0x6fdc95), buttonGlowMat = additive(0xff5a3c, haloTex()), earGlowMat = additive(0x5aa8ff, haloTex());
  const lensGlow = [], lensGlowGeo = new THREE.PlaneGeometry(0.06, 0.042); // 렌즈의 60%, 아래쪽으로 치우침
  for (const lx of [-0.07, 0.07]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), lensMat); l.position.set(lx, 0.03, -0.198); glasses.add(l);
    const lg = new THREE.Mesh(lensGlowGeo, lensGlowMat); lg.position.set(lx, 0.012, -0.202); lg.visible = false; glasses.add(lg); lensGlow.push(lg);
  }
  // 오른쪽 귀(머리 +x 옆면) 이어폰 신호 점
  const earGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13), earGlowMat);
  earGlow.position.set(0.2, 0, 0); earGlow.rotation.y = Math.PI / 2; earGlow.visible = false; head.add(earGlow);
  // 가슴 단추 3개(세로). 맨 위 단추(칼라 쪽, 책상에 안 가림) 위에 초소형 카메라 신호 점
  const btnMat = mat(new THREE.Color(cloth.color).multiplyScalar(0.55).getHex());
  for (const by of [1.3, 1.18, 1.06]) { const b = box(0.03, 0.03, 0.01, btnMat); b.position.set(0, by, -0.143); g.add(b); }
  const btnGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), buttonGlowMat);
  btnGlow.position.set(0, 1.3, -0.152); btnGlow.visible = false; g.add(btnGlow);
  const glows = { lens: { mat: lensGlowMat, objs: lensGlow, c: 0x6fdc95 }, button: { mat: buttonGlowMat, objs: [btnGlow], c: 0xff5a3c }, ear: { mat: earGlowMat, objs: [earGlow], c: 0x5aa8ff } };
  for (const k in glows) Object.assign(glows[k], { v: 0, flash: 0 });

  // 팔: 어깨 피벗 > 위팔 > 팔꿈치 피벗 > 아래팔
  const limb = (parent, x, y, len, m, w, handM) => {
    const sh = new THREE.Group(); sh.position.set(x, y, 0); parent.add(sh);
    const up = box(w, len, w, m); up.position.y = -len / 2; sh.add(up);
    const el = new THREE.Group(); el.position.y = -len; sh.add(el);
    const lo = box(w * 0.9, len, w * 0.9, m); lo.position.y = -len / 2; el.add(lo);
    if (handM) { const h = box(0.09, 0.09, 0.09, handM); h.position.y = -len - 0.03; el.add(h); }
    return { sh, el };
  };
  const R = limb(g, 0.32, 1.42, 0.28, cloth, 0.1, skin), L = limb(g, -0.32, 1.42, 0.28, cloth, 0.1, skin);
  const RL = limb(g, 0.13, 0.8, 0.4, pants, 0.14), LL = limb(g, -0.13, 0.8, 0.4, pants, 0.14);

  const sparks = new THREE.Group(); sparks.visible = false; g.add(sparks);
  const sm = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  for (let i = 0; i < 5; i++) {
    const sp = box(0.04, 0.04, 0.04, sm); sp.position.set((rand() - 0.5) * 0.7, 1.1 + rand() * 0.6, (rand() - 0.5) * 0.4 - 0.2); sparks.add(sp);
  }

  // EMP 고장 표시: 기기 발광 위치마다 노란 가산 점 + 지지직 불꽃 3개. fault() 동안만 보인다
  const faultHaloMat = additive(0xffd23a, haloTex()); faultHaloMat.opacity = 1;
  const faultSparkMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false });
  const faultMark = (parent, x, y, z, ry = 0) => {
    const m = new THREE.Group(); m.position.set(x, y, z); m.visible = false; m.rotation.y = ry; parent.add(m);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.14), faultHaloMat); m.add(h);
    const sp = [0, 1, 2].map(() => { const s = box(0.012, 0.012, 0.012, faultSparkMat); m.add(s); return s; });
    return { m, sp };
  };
  const faultMarks = {
    button: [faultMark(g, 0, 1.3, -0.155)],
    ear: [faultMark(head, 0.2, 0, 0, Math.PI / 2)],
    lens: [-0.07, 0.07].map((lx) => faultMark(glasses, lx, 0.012, -0.205)),
  };

  const p = {
    group: g, head, faultMarks, faultEnd: -Infinity, faultKinds: [], R, L, RL, LL, mouth, brows, face: null, glasses, sparks, glows,
    pose: { ...REST },
    stress: 0,
    gesture: null, // {name, start, end}
    walk: null,    // {pts, i, onDone}
    phase: rand() * 10,
    now: 0,
    setGesture(name, now, dur) { p.gesture = { name, start: now, end: now + dur }; },
    // 긴장 홍조: 머리 피부색을 원래 색에서 붉은색으로 보간(Color 재사용, 할당 없음)
    setStress(v) {
      p.stress = v;
      const r = Math.max(0, Math.min(1, v / 100));
      skin.color.copy(skin0).lerp(BLUSH, r);
      skin.emissive.copy(BLUSH).multiplyScalar(0.45 * r);
    },
    // name: 'neutral' | 'panic'. panic 은 dur 초 뒤 animatePerson 이 neutral 로 되돌린다(now 기준 end)
    setFace(name, dur = 0) { p.face = name === 'panic' ? { end: p.now + dur } : null; },
    // kinds: ['button','ear','lens'] 중 일부. dur 초 동안 해당 기기 위치에 노란 고장 표시
    fault(kinds, dur) { p.faultKinds = kinds; p.faultEnd = p.now + dur; },
    setGlow(kind, v) { glows[kind].v = v; },
    flashGlow(kind) { glows[kind].flash = 0.25; },
    setHighlight(on) { cloth.emissive.setHex(on ? 0x333333 : 0); },
    leave(pts, onDone) { p.gesture = null; p.walk = { pts, i: 0, onDone }; },
  };
  g.traverse((o) => { if (o.isMesh && o.parent !== sparks) o.castShadow = true; });
  g.position.y = SEAT_Y;
  return p;
}

export function animatePerson(p, now, dt) {
  if (!p.group.visible) return;
  const t = now + p.phase;
  p.now = now;
  if (p.face && now > p.face.end) p.face = null;
  const tgt = { ...REST };
  let jitter = 0, mouth = 1, sparks = false, brow = 0, ps_f = 10;
  tgt.hx += Math.sin(t * 0.8) * 0.04;
  tgt.hy = Math.sin(t * 0.3) * 0.08;

  if (p.walk) {
    const w = p.walk, [x, z] = w.pts[w.i];
    const dx = x - p.group.position.x, dz = z - p.group.position.z, d = Math.hypot(dx, dz);
    if (d < 0.1) {
      if (++w.i >= w.pts.length) {
        if (w.loop) w.i = 0;
        else { p.group.visible = false; p.walk = null; w.onDone?.(); return; }
      }
    } else {
      const sp = 1.6 * dt;
      p.group.position.x += (dx / d) * Math.min(sp, d);
      p.group.position.z += (dz / d) * Math.min(sp, d);
      const want = Math.atan2(-dx, -dz);
      let da = want - p.group.rotation.y;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      p.group.rotation.y += da * Math.min(1, dt * 8);
    }
    const sw = Math.sin(t * 6);
    Object.assign(tgt, { by: 0, hx: 0, hy: 0, rs: sw * 0.5, ls: -sw * 0.5, re: 0.2, le: 0.2, rh: -sw * 0.5, lh: sw * 0.5, rk: 0, lk: 0 });
  } else if (p.gesture) {
    const gs = p.gesture;
    if (now > gs.end) p.gesture = null;
    else {
      const k = now - gs.start;
      switch (gs.name) {
        // 손 위치(어깨 기준 IK 격자탐색, 손 중심 월드좌표 x,y,z): 값 옆 주석. 오른손 rz<0 이 몸 안쪽
        case 'button': Object.assign(tgt, { rs: 0, re: 1.05, rz: -0.9, hx: -0.5 }); break; // 손 (-0.02,1.15,-0.27) 가슴 가운데
        case 'frame': Object.assign(tgt, { rs: 1.45, re: 1.55, rz: -0.7, hx: 0, hy: 0 }); break; // 손 (0.14,1.70,-0.25) 오른 관자놀이 앞
        case 'tilt': Object.assign(tgt, { rs: 1.7, re: 2.25, rz: -0.9, hy: 0, hz: -0.4 }); break; // 손 (0.25,1.67,-0.02) 귀 덮기, 오른쪽 어깨로 기움
        case 'cock': Object.assign(tgt, { hy: 0.15, hz: -0.4 }); break; // 손 없이 고개만 오른쪽으로 갸웃
        case 'scratch': Object.assign(tgt, { rs: 1.9, re: 2.05 + Math.sin(k * 18) * 0.12, rz: -0.5 }); break; // 손 (0.25,1.72,-0.02) 귀 근처 왕복
        case 'emp_ear': Object.assign(tgt, { rs: 1.6, re: 2.3, rz: -1.2, hz: -0.2, by: SEAT_Y + Math.abs(Math.sin(k * 30)) * 0.03 }); jitter = 0.05; ps_f = 30; break;
        case 'emp_aid': Object.assign(tgt, { rs: 1.9, re: 2.05, rz: -0.5, hy: 0.1, hz: -0.25 }); break; // 손 귀 근처, 고개 갸웃(움찔 없음)
        case 'emp_lens': Object.assign(tgt, { rs: 1.45, re: 1.55, rz: -0.75, ls: 1.55, le: 1.45, lz: 0.55, hx: 0.1 }); jitter = 0.03; ps_f = 30; break; // 양손 (±0.13,1.70,-0.25)
        case 'emp_button': Object.assign(tgt, { rs: 0, re: 1.25, rz: -0.7, ls: 0, le: 1.25, lz: 0.55, hx: -0.6 }); jitter = 0.03; ps_f = 30; break; // 양손 (±0.1,1.12,-0.29)
        case 'look': tgt.hy = Math.sin(k * 4) * 0.9; tgt.hx = 0; break;
        case 'stretch': Object.assign(tgt, { rs: 3.0, ls: 3.0, re: 0.1, le: 0.1, hx: 0.25 }); break;
        case 'slump': { // 책상에 엎드려 흐느낌
          const sob = Math.max(0, Math.sin(k * 7)) * Math.max(0, Math.sin(k * 0.9));
          brow = -0.45; // 눈썹 처짐
          Object.assign(tgt, { hx: -1.1, hy: 0, rs: 1.4, ls: 1.4, re: 1.6, le: 1.6, by: SEAT_Y + sob * 0.03 });
          break;
        }
        case 'pen': tgt.re = 1.1 + Math.sin(k * 10) * 0.3; break;
        case 'spark': Object.assign(tgt, { rs: 1.5, ls: 1.5, re: 1.2, le: 1.2, hx: 0.3 }); jitter = 0.03; sparks = Math.random() > 0.3; break;
      }
    }
  }
  if (p.face) { // 당황: 八자 눈썹, 입 크게 벌림+떨림, 머리 떨림
    brow = 0.5; mouth = 3.5 + Math.sin(now * 40) * 0.4; jitter = Math.max(jitter, 0.04);
  }
  const f = Math.min(1, dt * ps_f), ps = p.pose;
  for (const k in tgt) ps[k] += (tgt[k] - ps[k]) * f;
  p.R.sh.rotation.set(ps.rs, 0, ps.rz); p.R.el.rotation.x = ps.re;
  p.L.sh.rotation.set(ps.ls, 0, ps.lz); p.L.el.rotation.x = ps.le;
  p.RL.sh.rotation.x = ps.rh; p.RL.el.rotation.x = ps.rk;
  p.LL.sh.rotation.x = ps.lh; p.LL.el.rotation.x = ps.lk;
  p.head.rotation.set(ps.hx, ps.hy, ps.hz);
  p.group.position.y = ps.by;
  p.mouth.scale.y = mouth;
  p.brows[0].rotation.z = brow; p.brows[1].rotation.z = -brow; // 안쪽 끝이 위(+)면 八자
  p.brows[0].position.y = p.brows[1].position.y = 0.07 + brow * 0.03;
  for (const k in p.glows) { // 발광: 평소 v, EMP 맞으면 0.25초 하얗고 크게 번쩍
    const o = p.glows[k], fl = o.flash > 0;
    if (fl) o.flash -= dt;
    o.mat.opacity = fl ? 1 : o.v; o.mat.color.setHex(fl ? 0xffffff : o.c);
    const vis = fl || o.v > 0, sc = fl ? 2.5 : 1;
    for (const m of o.objs) { m.visible = vis; m.scale.setScalar(sc); }
  }
  p.sparks.visible = sparks;
  const fon = now < p.faultEnd;
  for (const k in p.faultMarks) for (const { m, sp } of p.faultMarks[k]) {
    m.visible = fon && p.faultKinds.includes(k) && (k !== 'lens' || p.glasses.visible);
    if (m.visible) for (const s of sp) s.position.set((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, 0.01 + Math.random() * 0.03), s.visible = Math.random() > 0.35;
  }
  const jit = Math.max(jitter, p.stress >= 60 ? 0.02 : 0); // 긴장 60 이상이면 ±0.01 떨림
  p.head.position.x = jit ? (Math.random() - 0.5) * jit : 0;
}

// 수험생 24명을 책상에 앉힌다. skip = 플레이어가 앉는 자리 인덱스
export function seatExaminees(scene, seed, skip = -1) {
  const rand = mulberry32(seed + 99);
  const people = [];
  for (let i = 0; i < 24; i++) {
    if (i === skip) { people.push(null); continue; }
    const p = createPerson(rand);
    const s = seatPos(i);
    p.group.position.set(s.x, 0, s.z);
    scene.add(p.group);
    people.push(p);
  }
  return people;
}

export const exitPath = (i) => {
  const s = seatPos(i);
  return [[s.x, s.z + 0.5], [DOOR.x, s.z + 0.5], [DOOR.x, DOOR.z]];
};

// 엔딩용 범인 초상. list: [{color, device:'set'|'glasses'}] -> dataURL 배열. 오프스크린 렌더러를 따로 만들어 쓰고 정리한다
export function renderPortraits(list, size = 220) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(size, size, false); r.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-1.5, 3, -4); scene.add(sun);
  const desk = box(1.4, 0.05, 0.7, mat(0xb89b72)); desk.position.set(0, 0.72, -0.55); scene.add(desk);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  const a = 35 * Math.PI / 180;
  cam.position.set(Math.sin(a) * 2.3, 1.45, -Math.cos(a) * 2.3); cam.lookAt(0, 1.0, 0);
  const rand = mulberry32(7), urls = [];
  for (const { color, device } of list) {
    const p = createPerson(rand, { color });
    p.group.position.set(0, 0, 0); scene.add(p.group);
    if (device === 'glasses') { p.glasses.visible = true; p.setGlow('lens', 1); }
    else { p.setGlow('button', 1); p.setGlow('ear', 1); p.setGesture('cock', 0, 99); }
    animatePerson(p, 0.1, 1); // dt=1 이라 포즈가 즉시 붙는다
    r.render(scene, cam);
    urls.push(r.domElement.toDataURL('image/png'));
    scene.remove(p.group);
    p.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  desk.geometry.dispose(); desk.material.dispose();
  r.dispose(); r.forceContextLoss();
  return urls;
}

// 도감 카드용 확대 모델. 반환 { glasses:{on,off}, set:{on,off} } (PNG dataURL). 카메라 구도는 고정이고
// 부품 화면 좌표(이미지 크기 대비 0~1)는 renderDeviceCards.anchors 에 있다. 이름·리더 라인은 호출 쪽이 SVG 로 얹는다.
const DEV_P = { // 월드 좌표 상수(단위는 대략 cm). anchors 계산과 모델 배치가 같이 쓴다
  glasses: { target: [0.3, 0, -0.5], dist: 5.6, fov: 30, az: 35, el: 8, frame: [-0.65, 0.4, 0.02], lens: [0.65, 0, 0.02], projector: [-1.2, 0.15, -0.55] },
  set: { target: [0, 0.2, 0], dist: 11, fov: 30, az: 0, el: 38, button: [-2.4, 0.07, 0], earbud: [0, 0.15, 0.3], relay: [2.3, 0.16, 0] },
};
const devCam = (k, aspect) => {
  const p = DEV_P[k], cam = new THREE.PerspectiveCamera(p.fov, aspect, 0.1, 50);
  const az = p.az * Math.PI / 180, el = p.el * Math.PI / 180, t = new THREE.Vector3(...p.target);
  cam.position.set(t.x + Math.sin(az) * Math.cos(el) * p.dist, t.y + Math.sin(el) * p.dist, t.z + Math.cos(az) * Math.cos(el) * p.dist);
  cam.lookAt(t); cam.updateMatrixWorld(); return cam;
};
const devAnchor = (k, name, aspect) => {
  const v = new THREE.Vector3(...DEV_P[k][name]).project(devCam(k, aspect));
  return [+((v.x + 1) / 2).toFixed(3), +((1 - v.y) / 2).toFixed(3)];
};
export function renderDeviceCards(size = [620, 552]) {
  const [W, H] = size, aspect = W / H;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(W, H, false); r.setPixelRatio(1);
  const scene = new THREE.Scene(), own = []; // own: 끝나면 dispose 할 재질·지오메트리(haloTex 는 공유라 제외)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(-2, 5, 6); scene.add(sun);
  const M = (c, extra) => { const m = mat(c, extra); own.push(m); return m; };
  const B = (w, h, d, m, x = 0, y = 0, z = 0, parent = scene) => { const o = box(w, h, d, m); o.position.set(x, y, z); parent.add(o); own.push(o.geometry); return o; };
  const G = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); own.push(geo); return o; };
  const glow = (c, map, op) => { const m = new THREE.MeshBasicMaterial({ color: c, ...(map && { map }), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }); own.push(m); return m; };
  const shot = (cam) => { r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
  const out = {};

  // ---- 안경 ----
  const gl = new THREE.Group(); scene.add(gl);
  const frameM = M(0x2a3038, { roughness: 0.45 });
  const lensM = new THREE.MeshBasicMaterial({ color: 0xaac4d4, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }); own.push(lensM);
  for (const sx of [-1, 1]) {
    const cx = sx * 0.65, LW = 1.0, LH = 0.7, t = 0.07; // 렌즈 1.0x0.7 (인게임 0.1x0.07 의 10배)
    B(LW + 2 * t, t, 0.1, frameM, cx, LH / 2 + t / 2, 0, gl); B(LW + 2 * t, t, 0.1, frameM, cx, -LH / 2 - t / 2, 0, gl); // 윗·아랫테
    B(t, LH, 0.1, frameM, cx - LW / 2 - t / 2, 0, 0, gl); B(t, LH, 0.1, frameM, cx + LW / 2 + t / 2, 0, 0, gl);
    G(new THREE.PlaneGeometry(LW, LH), lensM, cx, 0, 0.01, gl);
    const tmp = B(0.06, 0.08, 1.9, frameM, sx * 1.27, 0.25, -0.95, gl); // 다리: 뒤로 뻗고 살짝 바깥으로 벌어진다
    tmp.position.x = sx * 1.28; tmp.rotation.y = -sx * 0.1;
    B(0.07, 0.07, 0.2, frameM, sx * 1.34, 0.2, -1.95, gl).rotation.y = -sx * 0.1; // 다리 끝 꺾임
  }
  B(0.26, 0.07, 0.1, frameM, 0, 0.25, 0, gl); // 코걸이(브리지)
  const nose = G(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), frameM, 0, -0.1, 0.1, gl); nose.rotation.z = 0.0;
  const projM = M(0x15181c, { roughness: 0.4 });
  B(0.1, 0.12, 0.5, projM, -1.2, 0.2, -0.55, gl); // 왼 다리 안쪽 프로젝터 상자
  const lensGlow = [], glowG = new THREE.PlaneGeometry(0.6, 0.42); own.push(glowG);
  const projDot = G(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6fdc95 }), -1.14, 0.2, -0.3, gl); own.push(projDot.material);
  for (const sx of [-1, 1]) { const g = new THREE.Mesh(glowG, glow(0x6fdc95, undefined, 0.4)); g.position.set(sx * 0.65, -0.18, 0.04); gl.add(g); lensGlow.push(g); }
  const gcam = devCam('glasses', aspect);
  const setGlass = (on) => { lensGlow.forEach((g) => { g.visible = on; }); projDot.visible = on; };
  setGlass(true); out.glasses = { on: shot(gcam) }; setGlass(false); out.glasses.off = shot(gcam);
  scene.remove(gl);

  // ---- 세트 ----
  const st = new THREE.Group(); scene.add(st);
  const [bx, , bz] = DEV_P.set.button;
  const btn = G(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 40), M(0x8a93a0, { roughness: 0.6 }), bx, 0, bz, st);
  const rim = G(new THREE.TorusGeometry(0.5, 0.025, 8, 40), M(0x6f7783), bx, 0.065, bz, st); rim.rotation.x = Math.PI / 2;
  const holeM = M(0x30343a), lensDark = new THREE.MeshBasicMaterial({ color: 0x050607 }); own.push(lensDark);
  const hg = new THREE.CircleGeometry(0.075, 16);
  [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(([hx, hz], i) => {
    const h = G(hg, i === 3 ? lensDark : holeM, bx + hx, 0.068, bz + hz, st); h.rotation.x = -Math.PI / 2;
  });
  const hal = haloTex(), btnHalo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), glow(0xff5a3c, hal, 0.95));
  btnHalo.position.set(bx + 0.17, 0.09, bz + 0.17); btnHalo.rotation.x = -Math.PI / 2; st.add(btnHalo); own.push(btnHalo.geometry);
  const [ex, ey, ez] = DEV_P.set.earbud;
  const ear = G(new THREE.CapsuleGeometry(0.17, 0.3, 6, 12), M(0xe8c4a8, { roughness: 0.5 }), ex, ey, ez, st); ear.rotation.z = Math.PI / 2.6;
  const earTip = G(new THREE.SphereGeometry(0.08, 10, 8), M(0x9aa0a8), ex - 0.23, ey + 0.14, ez, st);
  const earHalo = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), glow(0x5aa8ff, hal, 0.95)); earHalo.position.set(ex, ey + 0.1, ez + 0.2); st.add(earHalo); own.push(earHalo.geometry);
  const [rx, , rz] = DEV_P.set.relay, relM = M(0x3d434c, { roughness: 0.55 });
  B(0.9, 0.32, 0.5, relM, rx, 0.16, rz, st); // 중계기도 손바닥보다 작다
  const screen = G(new THREE.PlaneGeometry(0.42, 0.12), new THREE.MeshBasicMaterial({ color: 0x0e1114 }), rx + 0.15, 0.16, rz + 0.252, st); own.push(screen.material);
  for (const kx of [-0.32, -0.2]) { const k = G(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), M(0x8a93a0), rx + kx, 0.16, rz + 0.255, st); k.rotation.x = Math.PI / 2; }
  G(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), M(0x20242a), rx - 0.32, 0.57, rz - 0.15, st);
  const scam = devCam('set', aspect); earHalo.lookAt(scam.position);
  const setHalos = (on) => { btnHalo.visible = earHalo.visible = on; };
  setHalos(true); out.set = { on: shot(scam) }; setHalos(false); out.set.off = shot(scam);

  scene.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); own.forEach((o) => o.dispose());
  r.dispose(); r.forceContextLoss();
  return out;
}
renderDeviceCards.anchors = {
  glasses: Object.fromEntries(['frame', 'lens', 'projector'].map((n) => [n, devAnchor('glasses', n, 620 / 552)])),
  set: Object.fromEntries(['button', 'earbud', 'relay'].map((n) => [n, devAnchor('set', n, 620 / 552)])),
};
