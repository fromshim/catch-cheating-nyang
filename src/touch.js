// 모바일 터치 입력. 진짜 키보드 이벤트를 window 에 합성해 게임의 기존 keydown/keyup 처리를 그대로 쓴다.
// 시점 이동만 카메라를 직접 돌린다. 스타일은 hudkit.css(hk-t 접두사)이고 hudkit.js 가 불러온다.
import { Euler } from 'three';

export const isTouch = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

const LOOK = Math.PI;      // 화면 너비만큼 끌면 돌아가는 각도(rad). 약 180도
const DEAD = 12, REACH = 50; // 조이스틱 데드존과 손잡이 최대 거리(px)
const PITCH = 85 * Math.PI / 180;
const eul = new Euler(0, 0, 0, 'YXZ');

const press = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup',
  { code, key: code === 'Space' ? ' ' : code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true }));

export function mountTouch(root, { camera, buttons = [], onLook } = {}) {
  const el = document.createElement('div');
  el.className = 'hk-t';
  const div = (cls, parent = el) => parent.appendChild(Object.assign(document.createElement('div'), { className: cls }));
  const held = new Set(), offs = [];
  const on = (t, ev, fn) => { t.addEventListener(ev, fn); offs.push(() => t.removeEventListener(ev, fn)); };
  const key = (code, down) => { if (down === held.has(code)) return; down ? held.add(code) : held.delete(code); press(code, down); };

  // 시점 이동: 오른쪽 절반
  const lookZone = div('hk-t-zone hk-t-look'), looks = new Map();
  const end = (m) => (e) => m.delete(e.pointerId);
  on(lookZone, 'pointerdown', (e) => { lookZone.setPointerCapture(e.pointerId); looks.set(e.pointerId, e); });
  on(lookZone, 'pointermove', (e) => {
    const p = looks.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.clientX, dy = e.clientY - p.clientY;
    looks.set(e.pointerId, e);
    if (camera) {
      eul.setFromQuaternion(camera.quaternion);
      eul.y -= dx * LOOK / innerWidth; eul.x = Math.max(-PITCH, Math.min(PITCH, eul.x - dy * LOOK / innerWidth));
      camera.quaternion.setFromEuler(eul);
    }
    onLook?.(dx, dy);
  });
  on(lookZone, 'pointerup', end(looks)); on(lookZone, 'pointercancel', end(looks));

  // 이동: 왼쪽 아래, 떠다니는 조이스틱
  const moveZone = div('hk-t-zone hk-t-move'), base = div('hk-t-base'), knob = div('hk-t-knob', base);
  let mid = null, ox = 0, oy = 0;
  const release = (e) => {
    if (e.pointerId !== mid) return;
    mid = null; base.style.display = 'none';
    ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach((c) => key(c, false));
  };
  on(moveZone, 'pointerdown', (e) => {
    if (mid !== null) return;
    mid = e.pointerId; moveZone.setPointerCapture(mid); ox = e.clientX; oy = e.clientY;
    const r = el.getBoundingClientRect();
    Object.assign(base.style, { display: 'block', left: ox - r.left + 'px', top: oy - r.top + 'px' });
    knob.style.transform = '';
  });
  on(moveZone, 'pointermove', (e) => {
    if (e.pointerId !== mid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy), k = d > REACH ? REACH / d : 1;
    knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    key('KeyW', dy < -DEAD); key('KeyS', dy > DEAD); key('KeyA', dx < -DEAD); key('KeyD', dx > DEAD);
  });
  on(moveZone, 'pointerup', release); on(moveZone, 'pointercancel', release);

  // 버튼: 코드 버튼은 오른쪽 아래 원호, onTap 만 있는 버튼은 오른쪽 위
  const els = {}, arc = buttons.filter((b) => b.code), top = buttons.filter((b) => !b.code);
  buttons.forEach((b) => {
    const i = b.code ? arc.indexOf(b) : top.indexOf(b), n = arc.length;
    const btn = div('hk-t-btn' + (b.code ? '' : ' hk-t-small')), lab = div('hk-t-lab', btn), bad = div('hk-t-badge', btn);
    lab.textContent = b.label || ''; els[b.id] = { btn, lab, bad };
    if (b.code) {
      const a = (n > 1 ? 8 + i * 74 / (n - 1) : 45) * Math.PI / 180;
      btn.style.right = 24 + 118 * (1 - Math.cos(a)) + 'px'; btn.style.bottom = 24 + 118 * Math.sin(a) + 'px';
    } else { btn.style.top = '16px'; btn.style.right = 16 + i * 64 + 'px'; }
    const up = (e) => {
      if (!btn.classList.contains('on')) return;
      btn.classList.remove('on');
      if (b.code && b.hold) key(b.code, false);
      else if (e.type === 'pointerup' && !btn.classList.contains('off')) b.code ? (press(b.code, true), press(b.code, false)) : b.onTap?.();
    };
    on(btn, 'pointerdown', (e) => {
      e.preventDefault(); btn.setPointerCapture(e.pointerId);
      if (btn.classList.contains('off')) return;
      btn.classList.add('on');
      if (b.code && b.hold) key(b.code, true);
    });
    on(btn, 'pointerup', up); on(btn, 'pointercancel', up);
  });

  root.appendChild(el);
  return {
    el,
    set(id, { disabled, label, badge } = {}) {
      const o = els[id]; if (!o) return;
      if (disabled !== undefined) o.btn.classList.toggle('off', !!disabled);
      if (label !== undefined) o.lab.textContent = label;
      if (badge !== undefined) o.bad.textContent = badge ?? '';
    },
    dispose() {
      offs.forEach((f) => f()); [...held].forEach((c) => key(c, false)); el.remove();
    },
  };
}
