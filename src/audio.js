// 합성 전용 오디오. 샘플 없이 Web Audio 노드만 쓴다.
let ctx = null, master = null, noiseBuf = null;
let humNodes = null;
let beat = { next: 0, rate: 0 };

const ok = () => ctx && ctx.state !== 'closed';

// 일회성 노드 체인: 마지막 노드가 끝나면 전부 disconnect
function done(src, nodes) {
  src.onended = () => nodes.forEach((n) => n.disconnect());
}

function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

// 오실레이터 + 게인 엔벨로프(감쇠) 한 번 재생
function blip(type, f0, f1, dur, vol, t = ctx.currentTime, dest = master) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
  done(o, [o, g]);
}

// 필터 걸린 노이즈 버스트
function burst(type, freq, dur, vol, t = ctx.currentTime) {
  const s = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  s.stop(t + dur + 0.02);
  done(s, [s, f, g]);
}

function stopHum() {
  if (!humNodes) return;
  const { o, lfo, g, all } = humNodes;
  humNodes = null;
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setTargetAtTime(0, t, 0.05);
  o.stop(t + 0.3);
  lfo.stop(t + 0.3);
  done(o, all);
}

export const audio = {
  // 사용자 클릭 시 호출. 여러 번 불러도 안전
  init() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!ctx && AC) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ok() && ctx.state === 'suspended') ctx.resume();
  },

  // 형광등 험: 120Hz 톱니파 + 저역 필터 + 느린 진폭 흔들림
  hum(on) {
    if (!ok()) return;
    if (!on) return stopHum();
    if (humNodes) return;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 120;
    f.type = 'lowpass';
    f.frequency.value = 400;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.015, t + 0.2);
    lfo.frequency.value = 7;
    lg.gain.value = 0.003;
    lfo.connect(lg).connect(g.gain);
    o.connect(f).connect(g).connect(master);
    o.start();
    lfo.start();
    humNodes = { o, lfo, g, all: [o, lfo, f, g, lg] };
  },

  // 초침 1회. loud 0~1
  tick(loud = 0.3) {
    if (!ok()) return;
    burst('highpass', 3000, 0.03, 0.05 + 0.25 * Math.min(1, Math.max(0, loud)));
  },

  // 도장 쿵
  stamp() {
    if (!ok()) return;
    blip('sine', 120, 50, 0.15, 0.9);
    burst('lowpass', 1200, 0.06, 0.5);
  },

  // EMP: 노이즈 + 하강 톱니 + 워블 왜곡
  emp() {
    if (!ok()) return;
    const t = ctx.currentTime;
    const ws = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    // 계단형 곡선으로 비트크러시 느낌
    for (let i = 0; i < 256; i++) curve[i] = Math.round(((i / 255) * 2 - 1) * 4) / 4;
    ws.curve = curve;
    ws.connect(master);
    blip('sawtooth', 1800, 60, 0.6, 0.35, t, ws);
    const s = noise(), g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.6);
    s.connect(g).connect(ws);
    s.start(t);
    s.stop(t + 0.62);
    s.onended = () => [s, g, ws].forEach((n) => n.disconnect());
  },

  // 방송 차임: 하강 3음 G5-E5-C5, 사인 + 2배음
  chime() {
    if (!ok()) return;
    const t = ctx.currentTime;
    [784, 659.25, 523.25].forEach((f, i) => {
      blip('sine', f, f, 0.35, 0.3, t + i * 0.35);
      blip('sine', f * 2, f * 2, 0.35, 0.06, t + i * 0.35);
    });
  },

  // 심박. 0이면 끔. 매 프레임 호출 가능: 박동 시각에만 노드 생성
  heartbeat(rate) {
    if (!ok()) return;
    if (!rate) { beat.rate = 0; return; }
    const r = Math.min(1, rate);
    const t = ctx.currentTime;
    if (!beat.rate || beat.next === 0) beat.next = t; // 막 켜진 경우 즉시 시작
    beat.rate = r;
    if (t < beat.next) return;
    const vol = 0.3 + 0.6 * r;
    blip('sine', 62, 45, 0.14, vol, beat.next);
    blip('sine', 56, 42, 0.16, vol * 0.7, beat.next + 0.14);
    beat.next += 1.0 - 0.55 * r;
    if (beat.next < t) beat.next = t + 0.1; // 탭 전환 등으로 밀렸을 때 따라잡기 방지
  },

  stopAll() {
    beat = { next: 0, rate: 0 };
    if (ok()) stopHum();
  },
};
