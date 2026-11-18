// HUD 공용 그리기 함수. 문자열을 돌려주는 순수 함수라 DOM 에 닿지 않는다. 화면 문구는 인자로 받는다(문구는 content.js).
import './hudkit.css';

// 키보드 그림 좌표는 960x340 고정. 실제 자판의 줄 어긋남(Q 1.5칸, A 1.75칸)을 그대로 따른다
const KEYS = [['Esc', 300, 70], ['Q', 396, 166], ['W', 460, 166], ['E', 524, 166], ['A', 412, 230], ['S', 476, 230], ['D', 540, 230], ['F', 604, 230, 'irrev']];
// k: labels 키, r: 오른쪽 정렬(선 왼쪽에 놓는다), c: 가운데 정렬
const SLOTS = [
  { k: 'esc', r: 1, x: 284, y: 82, line: '290,98 300,98' },
  { k: 'emp', r: 1, x: 380, y: 170, line: '386,194 396,194' },
  { k: 'inspect', x: 708, y: 118, line: '580,182 640,134 700,134' },
  { k: 'arrest', x: 708, y: 242, line: '660,258 700,258' },
  { k: 'move', c: 1, x: 404, y: 306, line: '412,290 412,296 596,296 596,290' },
  { k: 'look', x: 722, y: 38, line: '706,56 716,56', dot: [706, 56] }, // labels.look 이 있을 때만 마우스와 함께 그린다
];
const DOTS = [[300, 98], [396, 194], [580, 182], [660, 258]];

// labels: { esc, emp, inspect, arrest, move, look? } 각 { t, c?, d?: [줄...] }. compact 는 제목만, 도감용
export function kbd(labels, { compact = false } = {}) {
  const lab = ({ k, r, c, x, y }) => {
    const { t = '', c: cond = '', d = [] } = labels[k] || {};
    const pos = r ? `right:${960 - x}px` : c ? `left:${x}px;width:200px;text-align:center` : `left:${x}px`;
    const i = cond ? `<i>${cond}</i>` : '';
    return `<div class="hk-l${r ? ' r' : ''}" style="${pos};top:${y}px">${r ? i : ''}<b>${t}</b>${r ? '' : i}${compact ? '' : d.map((s) => `<span>${s}</span>`).join('')}</div>`;
  };
  const slots = SLOTS.filter((s) => s.k !== 'look' || labels.look), dots = [...DOTS, ...(labels.look ? [SLOTS.at(-1).dot] : [])];
  const fig = `<div class="hk-kf"><svg viewBox="0 0 960 340">${slots.map((s) => `<polyline points="${s.line}"/>`).join('')}<polyline points="504,296 504,304"/>${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</svg>
    ${KEYS.map(([k, x, y, c]) => `<kbd class="${c || ''}" style="left:${x}px;top:${y}px">${k}</kbd>`).join('')}
    ${labels.look ? '<div class="hk-mouse" style="left:650px;top:10px"></div>' : ''}
    ${slots.map(lab).join('')}
  </div>`;
  return `<div class="hk-kfw">${compact ? `<div class="hk-kfc">${fig}</div>` : fig}</div>`;
}

// 인물 흉상. glow: 'btn' | 'ear' | 'lens' | null, hand: 손이 가리는 부위, blush: 0~3
const SKINS = ['#e2b99a', '#dfa07f', '#dc7858', '#d8402e'];
export function bust({ glow = null, glasses = false, hand = null, blush = 0, w = 120, slump = false } = {}) {
  const skin = SKINS[blush], id = 'hg' + Math.random().toString(36).slice(2, 7); // 같은 화면에 여럿 떠도 id 가 안 겹치게
  const col = { btn: '#ff5a3c', ear: '#5aa8ff', lens: '#6fdc95' }[glow] || '#fff';
  return `<svg class="hk-bust" width="${w}" height="${w * 110 / 120}" viewBox="0 0 120 110">
    <defs><radialGradient id="${id}"><stop offset="0" stop-color="${col}"/><stop offset=".35" stop-color="${col}" stop-opacity=".8"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset=".25" stop-color="#6fdc95" stop-opacity="0"/><stop offset="1" stop-color="#6fdc95" stop-opacity=".95"/></linearGradient></defs>
    <g transform="${slump ? 'rotate(14 60 100) translate(0 8)' : ''}">
    <path d="M22 110 L28 74 L92 74 L98 110Z" fill="#5b6675"/><path d="M52 74 L60 84 L68 74Z" fill="#7d8896"/>
    ${[82, 94, 106].map((y) => `<rect x="58" y="${y}" width="4" height="4" fill="#2c333d"/>`).join('')}
    <rect x="${blush > 2 ? 37 : 38}" y="22" width="44" height="46" rx="12" fill="${skin}"/><rect x="33" y="40" width="6" height="12" rx="3" fill="${skin}"/><rect x="81" y="40" width="6" height="12" rx="3" fill="${skin}"/>
    <path d="M36 38 Q36 14 60 14 Q84 14 84 38 L84 30 L36 30Z" fill="#2a211c"/>
    <rect x="46" y="44" width="8" height="2.5" fill="#2a211c"/><rect x="66" y="44" width="8" height="2.5" fill="#2a211c"/><rect x="54" y="58" width="12" height="2.5" fill="#8a3b30"/>
    ${glasses ? `<g fill="none" stroke="#1B1F24" stroke-width="2.2"><rect x="41" y="38" width="16" height="13" rx="2" fill="#aac4d433"/><rect x="63" y="38" width="16" height="13" rx="2" fill="#aac4d433"/><path d="M57 43 H63 M41 42 H35 M79 42 H85"/></g>` : ''}
    ${glow === 'lens' ? `<g class="glow soft"><rect x="42.5" y="39.5" width="13" height="10" rx="1" fill="url(#${id}l)"/><rect x="64.5" y="39.5" width="13" height="10" rx="1" fill="url(#${id}l)"/></g>` : ''}
    ${glow === 'btn' ? `<circle class="glow" cx="60" cy="84" r="16" fill="url(#${id})"/>` : ''}
    ${glow === 'ear' ? `<circle class="glow" cx="35" cy="46" r="16" fill="url(#${id})"/><path d="M18 36 q-5 10 0 20 M11 32 q-8 14 0 28" stroke="#cfe3ff" stroke-width="1.6" fill="none" opacity=".8"/>` : ''}
    ${hand === 'btn' ? `<path d="M30 110 L48 88 L62 80 L66 88 L54 96 L44 110Z" fill="#5b6675"/><rect x="56" y="78" width="12" height="11" rx="3" fill="${skin}"/>` : ''}
    ${hand === 'ear' ? `<path d="M22 110 L18 66 L30 44 L38 50 L32 70 L36 110Z" fill="#5b6675"/><rect x="26" y="38" width="12" height="13" rx="3" fill="${skin}"/>` : ''}
    </g></svg>`;
}

// 학부모 리스크 서류 더미: 10장 = 100. 9장째부터 붉다. fresh: 방금 떨어진 장 수. label: 점선(교체선) 글자
export function stack(v, fresh = 0, label = '교체') {
  const n = Math.ceil(v / 10), off = [0, 2, -1, 3, -2, 1, -3, 2, 0, -2];
  return `<div class="hk-stk${v >= 90 ? ' danger' : ''}" data-label="${label}">${off.map((o, i) => `<s class="${i < n ? 'on' : ''}${i >= 8 ? ' hot' : ''}${i < n && i >= n - fresh ? ' new' : ''}" style="margin-left:${3 + o}px;margin-right:${3 - o}px;transform:rotate(${o / 2}deg)"></s>`).join('')}</div>`;
}

// 눈치 다이얼: x = 경계도(0~100), 조용하면 음수(-조용한 초, -35 까지). -15 아래가 "대담". 오른쪽 끝 글자는 소극적
export function dial(heat, calm = 0, w = 120, labels = { bold: '대담', shy: '소극적' }) {
  const x = heat > 0 ? heat : -Math.min(35, calm), cx = 60, cy = 62, R = 46;
  const ang = (v) => (-90 + (v + 35) / 135 * 180) * Math.PI / 180;
  const pt = (v, r = R) => `${(cx + r * Math.sin(ang(v))).toFixed(1)} ${(cy - r * Math.cos(ang(v))).toFixed(1)}`;
  const arc = (a, b, stroke, sw) => `<path d="M${pt(a)} A${R} ${R} 0 0 1 ${pt(b)}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>`;
  return `<svg class="hk-dial" width="${w}" height="${w * 72 / 120}" viewBox="0 0 120 72">
    ${arc(-35, -15, '#e8c24a', 7)}${arc(-14, 0, '#efe6d255', 4)}${arc(1, 50, '#efe6d299', 4)}${arc(51, 100, '#F4F1E6', 4)}
    <path d="M${pt(0, R - 7)} L${pt(0, R + 5)}" stroke="#F4F1E6" stroke-width="2"/>
    <text x="2" y="71">${labels.bold}</text><text x="118" y="71" text-anchor="end">${labels.shy}</text>
    <path d="M${cx} ${cy} L${pt(x, R - 9)}" stroke="${x <= -15 ? '#e8c24a' : '#F4F1E6'}" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="#F4F1E6"/></svg>`;
}

// 조준점 링: 바깥 = EMP 충전(종이색), 안쪽 = 검사 진행(호박색, 누르는 동안만)
export function ring(emp, insp = 0, w = 64) {
  const c = (r, p, col, sw, o = 1) => `<circle cx="32" cy="32" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-opacity="${o}" stroke-dasharray="${(p * 2 * Math.PI * r).toFixed(1)} 999" transform="rotate(-90 32 32)" stroke-linecap="butt"/>`;
  const full = emp >= 100;
  return `<svg class="hk-ring" width="${w}" height="${w}" viewBox="0 0 64 64">${c(24, 1, '#000', 5, .35)}${c(24, emp / 100, '#F4F1E6', full ? 4 : 3, full ? 1 : .6)}${insp ? c(15, insp, '#e8c24a', 4) : ''}<circle cx="32" cy="32" r="3" fill="#fff" fill-opacity=".85"/>
    ${full ? '<rect x="44" y="44" width="18" height="18" rx="4" fill="#F4F1E6"/><text x="53" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#1B1F24">Q</text>' : ''}</svg>`;
}

// 터치 안내 그림(가로 휴대폰). 좌표 960x340 고정, 라벨 스타일은 kbd 와 같다.
// labels: { move, look, inspect, arrest, emp, pause } 각 { t, c?, d?: [줄...] }
const TSLOTS = [
  { k: 'look', r: 1, x: 234, y: 98, line: '500,130 500,110 240,110' },
  { k: 'move', r: 1, x: 234, y: 214, line: '290,236 240,236' },
  { k: 'pause', x: 728, y: 92, line: '690,103 720,103' },
  { k: 'emp', x: 728, y: 152, line: '696,164 720,164' },
  { k: 'arrest', x: 728, y: 208, line: '668,220 720,220' },
  { k: 'inspect', x: 728, y: 290, line: '584,272 584,300 720,300' },
];
const TCIRC = [['ring', 290, 206, 60, ''], ['', 560, 224, 48, '◎'], ['seal', 620, 196, 48, '!'], ['', 648, 140, 48, 'EMP'], ['', 656, 86, 34, '||']];
export function touchPad(labels) {
  const lab = ({ k, r, x, y }) => {
    const { t = '', c: cond = '', d = [] } = labels[k] || {};
    const i = cond ? `<i>${cond}</i>` : '';
    return `<div class="hk-l${r ? ' r' : ''}" style="${r ? `right:${960 - x}px` : `left:${x}px`};top:${y}px">${r ? i : ''}<b>${t}</b>${r ? '' : i}${d.map((s) => `<span>${s}</span>`).join('')}</div>`;
  };
  const dots = TSLOTS.map((s) => s.line.split(' ')[0].split(',').map(Number));
  return `<div class="hk-kfw"><div class="hk-kf"><div class="hk-tp" style="left:250px;top:70px;width:460px;height:212px"></div>
    <svg viewBox="0 0 960 340">${TSLOTS.map((s) => `<polyline points="${s.line}"/>`).join('')}${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}
    <path d="M500 130 H604 M592 118 L606 130 L592 142" fill="none" stroke="#F4F1E6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="500" cy="130" r="9"/></svg>
    ${TCIRC.map(([c, x, y, s, g]) => `<div class="hk-tp-c ${c}" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;font-size:${g.length > 1 ? 13 : 22}px">${c === 'ring' ? '<i style="width:24px;height:24px;border-radius:50%;background:#F4F1E6"></i>' : g}</div>`).join('')}
    ${TSLOTS.map(lab).join('')}</div></div>`;
}
