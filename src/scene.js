import * as THREE from 'three';
import { C } from './content.js';
import { mulberry32 } from './logic.js';

export const ROOM = { x: 6, zMin: -8, zMax: 8 };
export const DOOR = { x: 5.2, z: 7.6 };
export const deskPos = (i) => ({ x: ((i % 6) - 2.5) * 1.8, z: -3.5 + Math.floor(i / 6) * 2.2 });
// 앉은 수험생의 몸 위치(책상 뒤)
export const seatPos = (i) => { const d = deskPos(i); return { x: d.x, z: d.z + 0.75 }; };

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setSize(innerWidth, innerHeight);
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
  scene.background = new THREE.Color(0x2a2620);

  // 방 (안쪽 면만 보이는 박스) + 바닥
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM.x * 2, 3.2, ROOM.zMax * 2),
    new THREE.MeshStandardMaterial({ color: 0xd8ceb8, side: THREE.BackSide, roughness: 1 }),
  );
  wall.position.y = 1.59; // 아랫면을 바닥(y=0)보다 살짝 내린다. 같은 높이면 z-fighting으로 바닥이 지지직거린다
  scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.x * 2, ROOM.zMax * 2), mat(0x9c8a6c));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

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

  // 벽시계
  const clockTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#f2eee2'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
    g.strokeStyle = '#333'; g.lineWidth = 8; g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.lineWidth = 6; g.beginPath();
      g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100);
      g.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); g.stroke();
    }
    g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(1.0) * 60, 128 - Math.cos(1.0) * 60); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(3.6) * 90, 128 - Math.cos(3.6) * 90); g.stroke();
  });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), new THREE.MeshBasicMaterial({ map: clockTex }));
  clock.position.set(4.2, 2.5, ROOM.zMin + 0.02);
  scene.add(clock);

  // 뒷문
  const door = box(1.0, 2.1, 0.05, mat(0x6e5a44));
  door.position.set(DOOR.x, 1.05, ROOM.zMax - 0.03);
  scene.add(door);

  // 교탁
  const podium = box(2, 0.9, 0.8, mat(0x8a6b45));
  podium.position.set(0, 0.45, -6.6);
  scene.add(podium);

  // 책상 24개 + 수험번호
  const deskMat = mat(0xb39467);
  const legMat = mat(0x5d5448);
  for (let i = 0; i < 24; i++) {
    const { x, z } = deskPos(i);
    const top = box(1.2, 0.05, 0.6, deskMat);
    top.position.set(x, 0.75, z);
    scene.add(top);
    for (const sx of [-0.55, 0.55]) {
      const leg = box(0.05, 0.75, 0.5, legMat);
      leg.position.set(x + sx, 0.375, z);
      scene.add(leg);
    }
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.14),
      new THREE.MeshBasicMaterial({
        map: canvasTex(128, 64, (g, w, h) => {
          g.fillStyle = '#f4f0e4'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#222'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center';
          g.fillText(String(i + 1), w / 2, 48);
        }),
      }),
    );
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(x, 0.78, z - 0.12);
    scene.add(tag);
  }

  // 조명: 형광등 6개(발광 박스) + 점광원 4개
  const lights = [];
  const panelMat = new THREE.MeshBasicMaterial({ color: 0xf6f3e4 });
  for (const lx of [-3, 3]) for (const lz of [-5, 0, 5]) {
    const p = box(1.8, 0.06, 0.35, panelMat);
    p.position.set(lx, 3.15, lz);
    scene.add(p);
  }
  scene.add(new THREE.HemisphereLight(0xfff1d8, 0x8a7a64, 1.1));
  for (const lx of [-3, 3]) for (const lz of [-3, 3]) {
    const l = new THREE.PointLight(0xfff0d0, 8, 14, 1.4);
    l.position.set(lx, 2.9, lz);
    l.userData.base = 14;
    scene.add(l);
    lights.push(l);
  }
  // on=false 면 형광등이 깜빡인다
  const flicker = (on) => {
    for (const l of lights) l.intensity = on ? l.userData.base : l.userData.base * (Math.random() > 0.5 ? 0.15 : 0.9);
    panelMat.color.setHex(on ? 0xf6f3e4 : Math.random() > 0.5 ? 0x777060 : 0xf6f3e4);
  };
  return { scene, flicker };
}

// ---------- 인물 ----------
// 구 머리 + 박스 몸통 + 어깨·팔꿈치·엉덩이·무릎 피벗(Group). 기본은 앉은 자세.
const SKIN = [0xe2b99a, 0xd8a883, 0xeac3a4];
const CLOTH = [0x7d8a8f, 0x8c7b6b, 0x6f7f6a, 0x94806a, 0x7a7488, 0x8a6f68, 0x6b7a8c];
const SEAT_Y = -0.4; // 앉으면 몸 전체가 내려간다(엉덩이 높이 0.4)
const REST = { rs: 0.5, re: 1.1, ls: 0.5, le: 1.1, rz: 0, lz: 0, hx: -0.3, hy: 0,
  rh: Math.PI / 2, lh: Math.PI / 2, rk: -Math.PI / 2, lk: -Math.PI / 2, by: SEAT_Y };

const BLUSH = new THREE.Color(0xd8402e);

export function createPerson(rand, { color, proctor = false } = {}) {
  const g = new THREE.Group();
  const cloth = mat(color ?? CLOTH[Math.floor(rand() * CLOTH.length)]);
  const skin = mat(SKIN[Math.floor(rand() * SKIN.length)]);
  const skin0 = skin.color.clone();
  skin.emissive.setHex(0);
  const pants = mat(proctor ? 0x2d2d33 : 0x4a4a52);
  const torso = box(0.5, 0.65, 0.28, cloth); torso.position.y = 1.12; g.add(torso);

  const head = new THREE.Group(); head.position.y = 1.65; g.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), skin));
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x2b2420));
  hair.position.y = 0.01; head.add(hair);
  const mouth = box(0.07, 0.015, 0.01, mat(0x6b3a36)); mouth.position.set(0, -0.06, -0.145); head.add(mouth);
  const glasses = box(0.2, 0.04, 0.02, mat(0x222222)); glasses.position.set(0, 0.02, -0.145); head.add(glasses);
  glasses.visible = false;
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), new THREE.MeshBasicMaterial({ color: 0x66ccff }));
  glint.position.set(0.09, 0.02, -0.16); glint.visible = false; head.add(glint);

  // 팔: 어깨 피벗 > 위팔 > 팔꿈치 피벗 > 아래팔
  const limb = (parent, x, y, len, m, w) => {
    const sh = new THREE.Group(); sh.position.set(x, y, 0); parent.add(sh);
    const up = box(w, len, w, m); up.position.y = -len / 2; sh.add(up);
    const el = new THREE.Group(); el.position.y = -len; sh.add(el);
    const lo = box(w * 0.9, len, w * 0.9, m); lo.position.y = -len / 2; el.add(lo);
    return { sh, el };
  };
  const R = limb(g, 0.32, 1.42, 0.28, cloth, 0.1), L = limb(g, -0.32, 1.42, 0.28, cloth, 0.1);
  const RL = limb(g, 0.13, 0.8, 0.4, pants, 0.14), LL = limb(g, -0.13, 0.8, 0.4, pants, 0.14);

  const sparks = new THREE.Group(); sparks.visible = false; g.add(sparks);
  const sm = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  for (let i = 0; i < 5; i++) {
    const sp = box(0.04, 0.04, 0.04, sm); sp.position.set((rand() - 0.5) * 0.7, 1.1 + rand() * 0.6, (rand() - 0.5) * 0.4 - 0.2); sparks.add(sp);
  }

  const p = {
    group: g, head, R, L, RL, LL, mouth, glasses, glint, sparks,
    pose: { ...REST },
    gesture: null, // {name, start, end}
    walk: null,    // {pts, i, onDone}
    phase: rand() * 10,
    setGesture(name, now, dur) { p.gesture = { name, start: now, end: now + dur }; },
    // 긴장 홍조: 머리 피부색을 원래 색에서 붉은색으로 보간(Color 재사용, 할당 없음)
    setStress(v) {
      const r = Math.max(0, Math.min(1, v / 100));
      skin.color.copy(skin0).lerp(BLUSH, r);
      skin.emissive.copy(BLUSH).multiplyScalar(0.25 * r);
    },
    leave(pts, onDone) { p.gesture = null; p.walk = { pts, i: 0, onDone }; },
  };
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
  p.head.position.x = jitter ? (Math.random() - 0.5) * jitter : 0;
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
