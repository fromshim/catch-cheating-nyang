import './style.css';
import { C } from './content.js';
import { makeRenderer } from './scene.js';
import { startProctor } from './proctor.js';
import { startExaminee } from './examinee.js';

const ui = document.getElementById('ui');
const renderer = makeRenderer(document.getElementById('c'));
let mode = null;

const para = (a) => a.map((p) => `<p>${p}</p>`).join('');
const reality = (rc) => `<div class="reality"><h4>${C.endingUi.reality}</h4><p>${rc.text}</p><small>${rc.source}</small></div>`;

function menu() {
  mode?.stop(); mode = null;
  const M = C.menu;
  ui.innerHTML = `<div class="screen menu"><h1>${M.title}</h1><p class="sub">${M.subtitle}</p>
    <div class="modes">
      <button id="m-p"><b>${M.proctor}</b><span>${M.proctorDesc}</span></button>
      <button id="m-e"><b>${M.examinee}</b><span>${M.examineeDesc}</span></button></div>
    <p class="notice">${M.notice}</p></div>`;
  ui.querySelector('#m-p').onclick = playProctor;
  ui.querySelector('#m-e').onclick = playExaminee;
}

function endScreen(html, again) {
  const U = C.endingUi;
  ui.innerHTML = `<div class="screen end">${html}<div class="btns"><button id="b-again">${U.again}</button><button id="b-menu">${U.menu}</button></div></div>`;
  ui.querySelector('#b-again').onclick = again;
  ui.querySelector('#b-menu').onclick = menu;
}

function playProctor() {
  mode?.stop();
  mode = startProctor({
    renderer, ui,
    onEnd({ ending, state, complaint }) {
      const U = C.endingUi, e = C.endings[ending.id];
      const list = (a, f) => (a.length ? a.map(f).join(', ') : U.none);
      mode.stop(); mode = null;
      endScreen(`<h2>${e.title}</h2>${para(e.body)}
        ${ending.emp ? `<h3>${C.empPenalty.title}</h3><p>${C.empPenalty.body}</p>` : ''}
        <div class="stats"><h4>${U.stats}</h4>
          <p>${U.caught} ${state.caught.length} · ${U.wrong} ${state.wrongCaught.length} · ${U.missed} ${state.missed.length} · ${U.complaintCount} ${Math.round(complaint)}%</p>
          <p>${U.missedList}: ${list(state.missed, (m) => `${m.id}번(${C.deviceNames[m.device]})`)}</p></div>
        ${reality(e.realityCard)}`, playProctor);
    },
  });
}

function playExaminee() {
  mode?.stop();
  mode = startExaminee({
    renderer, ui,
    onEnd({ ending, stats, news }) {
      mode.stop(); mode = null;
      endScreen(`${news ? `<div class="news">${news}</div>` : ''}<h2>${ending.title}</h2>${para(ending.body)}
        <div class="stats">${stats.map((s) => `<p>${s}</p>`).join('')}</div>${reality(ending.realityCard)}`, playExaminee);
    },
  });
}

menu();
