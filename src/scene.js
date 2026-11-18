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
  r.shadowMap.type = THREE.PCFSoftShadowMap;
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
const REST = { rs: 0.5, re: 1.1, ls: 0.5, le: 1.1, rz: 0, lz: 0, hx: -0.3, hy: 0,
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
  const glasses = box(0.26, 0.05, 0.02, mat(0x222222)); glasses.position.set(0, 0.03, -0.19); head.add(glasses);
  glasses.visible = false;
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x9fe0ff }));
  glint.position.set(0.1, 0.03, -0.2); glint.visible = false; head.add(glint);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: 0x9fe0ff, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(0.3); glint.add(halo); // 빛 번짐(PointLight 아님)

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

  const p = {
    group: g, head, R, L, RL, LL, mouth, glasses, glint, sparks,
    pose: { ...REST },
    stress: 0,
    gesture: null, // {name, start, end}
    walk: null,    // {pts, i, onDone}
    phase: rand() * 10,
    setGesture(name, now, dur) { p.gesture = { name, start: now, end: now + dur }; },
    // 긴장 홍조: 머리 피부색을 원래 색에서 붉은색으로 보간(Color 재사용, 할당 없음)
    setStress(v) {
      p.stress = v;
      const r = Math.max(0, Math.min(1, v / 100));
      skin.color.copy(skin0).lerp(BLUSH, r);
      skin.emissive.copy(BLUSH).multiplyScalar(0.45 * r);
    },
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
  const tgt = { ...REST };
  let jitter = 0, mouth = 1, sparks = false, glint = false;
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
        case 'ear': Object.assign(tgt, { rs: 1.6, re: 1.8, rz: -0.5, hy: -0.15 }); break;
        case 'lips': mouth = 0.5 + Math.abs(Math.sin(k * 14)) * 4; tgt.hx = -0.1; break;
        case 'freeze': tgt.hx = -0.75; tgt.hy = 0; break;
        case 'glint': glint = Math.sin(k * 16) > 0; tgt.hx = -0.1; break;
        case 'wrist': Object.assign(tgt, { ls: 0.8, le: 1.9, lz: 0.4, hx: -0.55, hy: 0.25 }); break;
        case 'sleeve': Object.assign(tgt, { hy: 0.8, hx: -0.35, ls: 0.7, le: 1.6, lz: 0.2 }); break;
        case 'look': tgt.hy = Math.sin(k * 4) * 0.9; tgt.hx = 0; break;
        case 'stretch': Object.assign(tgt, { rs: 3.0, ls: 3.0, re: 0.1, le: 0.1, hx: 0.25 }); break;
        case 'slump': { // 책상에 엎드려 흐느낌
          const sob = Math.max(0, Math.sin(k * 7)) * Math.max(0, Math.sin(k * 0.9));
          Object.assign(tgt, { hx: -1.1, hy: 0, rs: 1.4, ls: 1.4, re: 1.6, le: 1.6, by: SEAT_Y + sob * 0.03 });
          break;
        }
        case 'pen': tgt.re = 1.1 + Math.sin(k * 10) * 0.3; break;
        case 'spark': Object.assign(tgt, { rs: 1.5, ls: 1.5, re: 1.2, le: 1.2, hx: 0.3 }); jitter = 0.03; sparks = Math.random() > 0.3; break;
      }
    }
  }
  const f = Math.min(1, dt * 10), ps = p.pose;
  for (const k in tgt) ps[k] += (tgt[k] - ps[k]) * f;
  p.R.sh.rotation.set(ps.rs, 0, ps.rz); p.R.el.rotation.x = ps.re;
  p.L.sh.rotation.set(ps.ls, 0, ps.lz); p.L.el.rotation.x = ps.le;
  p.RL.sh.rotation.x = ps.rh; p.RL.el.rotation.x = ps.rk;
  p.LL.sh.rotation.x = ps.lh; p.LL.el.rotation.x = ps.lk;
  p.head.rotation.set(ps.hx, ps.hy, 0);
  p.group.position.y = ps.by;
  p.mouth.scale.y = mouth;
  p.glint.visible = glint;
  p.sparks.visible = sparks;
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
