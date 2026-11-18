import './style.css';
import './screens.css';
import * as THREE from 'three';
import { C, ORG } from './content.js';
import { makeRenderer, buildClassroom, seatExaminees, animatePerson, autoResize } from './scene.js';
import { startProctor } from './proctor.js';
import { INSPECT_PROB } from './logic.js';
import { startExaminee } from './examinee.js';

const ui = document.getElementById('ui');
// 터치 기기 세로 화면 안내. 보임·숨김은 style.css 의 미디어 쿼리가 맡는다
document.body.insertAdjacentHTML('beforeend', `<div id="rotate"><i></i><p>${C.rotate}</p></div>`);
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

// headline: 맨 위 결과, title/body: 뉴스, memo: 경위서 안쪽 HTML, card: 현실 사례. 엔딩 종류와 무관하게 같은 틀을 쓴다.
function endScreen({ news = '', headline, bad, title, stamp, body, stats, card, extra = '' }, again) {
  const U = C.endingUi;
  ui.innerHTML = `<div class="screen end"><h1 class="headline ${bad ? 'bad' : 'good'}">${headline}</h1>
    ${news ? `<div class="news">${news}</div>` : ''}
    <div class="end-wrap"><div class="end-main"><section class="paper newsbox"><h2><span class="flash">${U.newsTag}</span>${title}<span class="stamp">${stamp}</span></h2>${body}</section>
      <section class="paper memo"><h5>${U.memo}</h5>${stats}${extra}</section></div>${card}</div>
    <div class="btns"><button id="b-again">${U.again}</button><button id="b-menu">${U.menu}</button></div></div>`;
  ui.querySelector('#b-again').onclick = again;
  ui.querySelector('#b-menu').onclick = menu;
}

// 좌석 배치도(감독관 시점: 칠판이 아래, 0행이 맨 아래, 좌우 반전. 6열×4행, 번호 = 인덱스+1)와 범인 초상 카드
function seatMap(seats, portraits) {
  const U = C.endingUi, ST = U.seatStatus;
  const cell = (s) => `<div class="seat ${s.type === 'cheater' ? 'cheater' : ''} ${s.status ?? ''}"><b>${s.id}</b>${
    s.device ? `<i class="chip">${U.devShort[s.device]}</i>` : ''}${s.type === 'hearing' ? `<i class="chip hear">${U.hearingTag}</i>` : ''}${
    s.status ? `<span class="mark">${ST[s.status]}</span>` : ''}</div>`;
  const cheaters = seats.filter((s) => s.type === 'cheater');
  return `<section class="seatmap"><h4>${U.seatTitle}</h4><div class="seats">${[...seats].reverse().map(cell).join('')}</div><div class="board">${U.board}</div><p class="legend">${U.seatLegend}</p>
    <h4>${U.portraitTitle}</h4><div class="portraits">${cheaters.map((s, k) => `<figure>${portraits[k] ? `<img src="${portraits[k]}" alt="" width="220" height="220">` : ''}<figcaption>${U.portrait(s.id, C.deviceNames[s.device], ST[s.status])}</figcaption></figure>`).join('')}</div></section>`;
}

const grid = (pairs) => `<div class="grid">${pairs.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;

function playProctor() {
  mode?.stop();
  mode = startProctor({
    renderer, ui,
    onEnd({ ending, state, risk, meltdowns, emptyInspects, seats, portraits }) {
      const U = C.endingUi, e = C.endings[ending.id];
      const list = (a, f) => (a.length ? a.map(f).join(', ') : U.none);
      mode.stop(); mode = null;
      const lost = state.missed.length; // 석방된 범인은 이미 missed 에 들어 있다
      endScreen({
        headline: ending.id === 'replaced' ? U.headline.replaced : lost ? U.headline.failed(lost) : U.headline.clear,
        bad: ending.id === 'replaced' || lost > 0,
        title: e.title, stamp: e.stamp,
        body: para(e.body).replace('{wrongLine}', U.wrongLine(state.wrongCaught.length)).replace('{meltdownLine}', U.meltdownLine(meltdowns)) +
          (ending.emp ? `<h3>${C.empPenalty.title}</h3><p>${C.empPenalty.body}</p>` : ''),
        stats: grid([[U.caught, state.caught.length], [U.wrong, state.wrongCaught.length], [U.missed, state.missed.length],
          [U.riskPct, `${Math.round(risk)}%`], [U.meltdownCount, meltdowns], [U.emptyCount, emptyInspects]]) +
          `<div class="more"><p>${U.released(state.released.length)}</p>
          <p>${U.probTitle}: ${Object.entries(INSPECT_PROB).map(([d, p]) => `${C.deviceNames[d]} ${Math.round(p * 100)}%`).join(' · ')} (${U.probNote})</p>
          <p>${U.missedList}: ${list(state.missed, (m) => `${m.id}번(${C.deviceNames[m.device]})`)}</p></div>`,
        card: reality(e.realityCard),
        extra: seatMap(seats, portraits),
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
        news, headline: C.endingUi.headline.examinee[ending.id], bad: ending.id !== 'pass', title: ending.title, stamp: ending.stamp, body: para(ending.body),
        stats: grid(stats.map((x) => x.split(': '))), card: reality(ending.realityCard),
      }, playExaminee);
    },
  });
}

menu();
