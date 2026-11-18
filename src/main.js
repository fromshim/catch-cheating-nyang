import './style.css';
import './screens.css';
import * as THREE from 'three';
import { C, ORG } from './content.js';
import { makeRenderer, buildClassroom, seatExaminees, animatePerson, autoResize } from './scene.js';
import { startProctor } from './proctor.js';
import { INSPECT_PROB } from './logic.js';
import { startExaminee } from './examinee.js';

const ui = document.getElementById('ui');
const renderer = makeRenderer(document.getElementById('c'));
let mode = null;

const para = (a) => a.map((p) => `<p>${p}</p>`).join('');
const reality = (rc) => `<aside class="reality"><h4>${C.endingUi.reality}</h4><p>${rc.text}</p><small>${rc.source}</small></aside>`;

// 메뉴 배경: CCTV 각도로 교실을 천천히 훑는다. 반환값은 정리 함수.
function menuBg() {
  const { scene } = buildClassroom();
  const people = seatExaminees(scene, (Math.random() * 1e9) | 0);
  const cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 60);
  cam.position.set(5, 3, 7.5);
  const stopResize = autoResize(renderer, cam);
  let raf; const t0 = performance.now();
  const frame = (ms) => {
    raf = requestAnimationFrame(frame);
    const now = (ms - t0) / 1000;
    cam.lookAt(Math.sin(now * 0.12) * 4 - 1, 1, -3);
    people.forEach((p) => animatePerson(p, now, 0.016));
    renderer.render(scene, cam);
  };
  frame(t0);
  return () => { cancelAnimationFrame(raf); stopResize(); };
}

function menu() {
  mode?.stop(); mode = { stop: menuBg() };
  const M = C.menu;
  ui.innerHTML = `<div class="screen menu"><div class="rec"><i></i> REC CAM-03 ${M.cam}</div>
    <div class="ticket"><span class="seal">${M.seal}</span><h5>${M.ticket}</h5><p class="org">${ORG}</p>
      <h1>${M.title}</h1><p class="sub">${M.subtitle}</p>
      <div class="modes">
        <button id="m-p"><small>${M.proctor}</small><b>${M.proctorTag}</b><span>${M.proctorDesc}</span></button>
        <button id="m-e"><small>${M.examinee}</small><b>${M.examineeTag}</b><span>${M.examineeDesc}</span></button></div>
      <p class="notice">${M.notice}</p></div></div>`;
  ui.querySelector('#m-p').onclick = playProctor;
  ui.querySelector('#m-e').onclick = playExaminee;
}

// memo: 경위서 안쪽 HTML, card: 현실 카드. 엔딩 종류와 무관하게 같은 틀을 쓴다.
function endScreen({ news = '', title, stamp, body, stats, card }, again) {
  const U = C.endingUi;
  ui.innerHTML = `<div class="screen end">${news ? `<div class="news">${news}</div>` : ''}
    <div class="end-wrap"><section class="memo"><h5>${U.memo}</h5>
      <h2>${title}<span class="stamp">${stamp}</span></h2>${body}${stats}</section>${card}</div>
    <div class="btns"><button id="b-again">${U.again}</button><button id="b-menu">${U.menu}</button></div></div>`;
  ui.querySelector('#b-again').onclick = again;
  ui.querySelector('#b-menu').onclick = menu;
}

const grid = (pairs) => `<div class="grid">${pairs.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;

function playProctor() {
  mode?.stop();
  mode = startProctor({
    renderer, ui,
    onEnd({ ending, state, risk, meltdowns, emptyInspects }) {
      const U = C.endingUi, e = C.endings[ending.id];
      const list = (a, f) => (a.length ? a.map(f).join(', ') : U.none);
      mode.stop(); mode = null;
      endScreen({
        title: e.title, stamp: e.stamp,
        body: para(e.body).replace('{wrongLine}', U.wrongLine(state.wrongCaught.length)).replace('{meltdownLine}', U.meltdownLine(meltdowns)) +
          (ending.emp ? `<h3>${C.empPenalty.title}</h3><p>${C.empPenalty.body}</p>` : ''),
        stats: grid([[U.caught, state.caught.length], [U.wrong, state.wrongCaught.length], [U.missed, state.missed.length],
          [U.riskPct, `${Math.round(risk)}%`], [U.meltdownCount, meltdowns], [U.emptyCount, emptyInspects]]) +
          `<div class="more"><p>${U.released(state.released.length)}${state.directive ? ` · ${state.directive === 'followed' ? U.directiveFollowed(state.directiveCount) : U.directiveIgnored}` : ''}</p>
          <p>${U.probTitle}: ${Object.entries(INSPECT_PROB).map(([d, p]) => `${C.deviceNames[d]} ${Math.round(p * 100)}%`).join(' · ')} (${U.probNote})</p>
          <p>${U.missedList}: ${list(state.missed, (m) => `${m.id}번(${C.deviceNames[m.device]})`)}</p></div>`,
        card: reality(e.realityCard),
      }, playProctor);
    },
  });
}

function playExaminee() {
  mode?.stop();
  mode = startExaminee({
    renderer, ui,
    onEnd({ ending, stats, news }) {
      mode.stop(); mode = null;
      endScreen({
        news, title: ending.title, stamp: ending.stamp, body: para(ending.body),
        stats: grid(stats.map((x) => x.split(': '))), card: reality(ending.realityCard),
      }, playExaminee);
    },
  });
}

menu();
