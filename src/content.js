// 화면에 보이는 한국어 문구는 전부 여기에 둔다.

// 가상 이름. 다른 파일에 하드코딩하지 않는다.
export const EXAM = '대학수박능력시험';
export const EXAM_SHORT = '수능';
export const ORG = '한국교육과일평가원';
export const MINISTRY = '교육부';
const SHORT_ORG = '평가원';
const SOFT = '목격 기록 있음, 판정은 시험 후';

export const C = {
  rotate: '가로로 돌려 주세요',
  menu: {
    title: '수능냥이를 잡아라',
    subtitle: `${EXAM} · 제2교시`,
    proctor: '감독관',
    proctorDesc: '부정행위자를 찾아 적발한다',
    examinee: '수험생',
    examineeDesc: '기기로 답안을 완성한다',
    ticket: '수 험 표',
    seal: SHORT_ORG,
    cam: '제2교시',
    proctorTag: '180초',
    examineeTag: '120초',
    examineeLocked: '준비 중', // 수험생 모드를 잠가 둔 동안 시간 대신 보이는 표시
    notice: '※ 실제 보도를 모티프로 한 풍자 게임입니다. 등장하는 인물과 상황은 가상입니다.',
  },
  board: [ORG, `20XX학년도 ${EXAM}`, '제2교시', '수험번호 확인 / 휴대전화·전자기기 소지 금지'],
  deviceNames: {
    paper: '커닝페이퍼',
    watch: '스마트워치',
    earbud: '무선이어폰',
    camai: '초소형카메라+AI',
    set: '카메라+이어폰 세트',
    glasses: 'AI안경',
  },
  // 감독관 모드
  proctor: {
    guide: {
      clues: [
        { h: '단서 1', t: '범인은 수상한 행동이 많다', d: '단추·귀·안경테를 자주 만진다' },
        { h: '단서 2', t: '기기는 쓸수록 티가 난다', d: '만진 뒤 단추·귀·렌즈에서 빛이 샌다' },
      ],
      who: [
        { o: { glow: 'btn' }, tag: '용의자', t: '맨 위 단추가 붉게 깜빡임', d: '정면에서 보임' },
        { o: { glow: 'ear' }, tag: '용의자', t: '귀에 파란 점, 웅얼거리는 소리', d: '오른쪽·뒤에서 보임' },
        { o: { glow: 'lens', glasses: true }, tag: '용의자', t: '렌즈 아래가 초록으로 비침', d: '비스듬히 봐야 보임' },
        { o: { hand: 'ear', blush: 1 }, tag: '무혐의', t: '만지기만 하고 빛은 없음', d: '그냥 귀 가려운 청년', no: true },
      ],
      keys: {
        esc: { t: '일시정지 · 도감' },
        emp: { t: 'EMP', c: '충전이 다 차면', d: ['반경 4m 안의 기기를 고장 낸다'] },
        inspect: { t: '검사', c: '꾹 누른다 · 2m 안', d: ['많이 목격할수록, 빛을 본 직후면 확률 UP'] },
        arrest: { t: '적발', c: '2m 안 · 되돌릴 수 없다', d: ['기기가 있으면 검거', '무고면 <em class="bad">학부모 리스크 +50</em>'] },
        move: { t: '이동' },
        look: { t: '시점 이동' },
      },
      co: '부감독관이 의심 정황을 목격한 학생',
      // 터치 기기용 조작 안내(touchPad 라벨)
      touch: {
        move: { t: '이동', c: '왼쪽 화면 밀기' },
        look: { t: '시점 이동', c: '화면 문지르기' },
        inspect: { t: '검사', c: '길게 누르기' },
        arrest: { t: '적발', d: ['기기가 있으면 검거', '무고면 <em class="bad">학부모 리스크 +50</em>'] },
        emp: { t: 'EMP', c: '충전이 다 차면' },
        pause: { t: '일시정지 · 도감' },
      },
    },
    clickStart: '클릭하여 시작',
    tapStart: '화면을 눌러 시작',
    paused: '일시정지',
    clickResume: '클릭하여 계속',
    timeLeft: '남은 시간',
    emp: 'EMP',
    empReady: 'EMP (Q 발사)',
    tickerTag: '속보',
    // 학생 말풍선 대사. empty 는 범인·무고 같은 풀이어야 정체가 새지 않는다
    say: {
      caught: ['줴줴이야~'],
      wrong: ['아뇨아뇨아뇨아뇨'],
      empty: ['엄..', '예?'],
      emp: ['예?'],
      meltdown: ['엄..........'],
    },
    actHint: { inspect: '검사', arrest: '적발', cool: (s) => `검사 ${s}초 뒤` },
    stamp: { caught: '검거', wrong: '오적발' },
    mini: { esc: '도감', q: 'EMP', e: '검사', f: '적발', used: 'EMP 사용' },
    risk: '학부모 리스크',
    heat: '교실 경계도',
    replaceLine: '교체',
    heatBold: '대담해짐',
    heatCalm: (s, max) => `조용함 ${s}/${max}초`,
    heatWatch: '눈치 봄',
    heatShy: '잔뜩 소극적',
    dialLabels: { bold: '대담', shy: '소극적' },
    counts: (n, total) => `검거 ${n} / ${total}`,
    levels: { calm: '평온', tense: '긴장', high: '위험', meltdown: '멘붕' },
    inspected: { none: '안 함', empty: '못 찾음', found: '기기 발견', emp: 'EMP 반응' },
    // 관찰 카드 머리글. face: 긴장 4단계(0~3). 정체(범인 여부)는 절대 싣지 않는다
    aimHead: (id, face, level, seen, insp) => `<b>${id}번</b><i class="face f${face}"></i>${level}<span>목격 ${seen}</span><span>검사 ${insp}</span>`,
    aimFar: (id, seen) => `<b>${id}번</b><span>목격 ${seen}</span>`,
    hotHint: (s) => `포착! 지금 검사하면 확률 UP (${s}초)`,
    journal: '감독 일지',
    journalEmpty: '(아직 기록 없음)',
    // 목격: 진짜 신호가 보였을 때만(수상 표시). like: 닮은꼴·보이지 않은 신호의 중립 문구
    signs: {
      sight: {
        glasses: '렌즈에 초록빛이 비친다',
        camai: '맨 위 단추가 붉게 깜빡인다',
        earbud: '귀에 파란 점이 보인다',
      },
      like: {
        frame: '안경테를 만진다 · 빛 없음',
        scratch: '귀 뒤를 긁는다',
        button: '단추를 만지작거린다 · 빛 없음',
        tilt: '귀에 손을 댄다 · 소리 없음',
        cock: '고개를 갸웃한다 · 소리 없음',
        look: '두리번거린다',
        stretch: '기지개를 켠다',
        pen: '펜을 굴린다',
      },
      emp: '전자기기 반응',
    },
    log: (id, text) => `${id}번: ${text}`,
    coLog: (id) => `부감독관: ${id}번 쪽이 수상합니다`,
    whisperChip: '웅얼웅얼… 소리가 새어 나온다',
    allCaught: '전원 검거',
    gameOverCap: '학부모 항의 폭주 → 평가원, 감독관 교체',
    // 행동 → 결과 토스트 { head, chips: [{ t, k }] }. k: bad(빨강) · key(키캡) · mute(회색)
    cap: {
      empty: (id, risk, heat, n) => ({ head: `${id}번 증거를 찾지 못했어요`, chips: [{ t: `학부모 리스크 +${risk}`, k: 'bad' }, { t: `경계도 +${heat}` }, n && { t: `주변 ${n}명 긴장` }] }),
      found: (id, dev) => `증거 발견! ${id}번 ${dev}, 바로 검거합니다`,
      meltdown: (id, risk) => ({ head: `${id}번 멘붕`, chips: [{ t: `학부모 리스크 +${risk}`, k: 'bad' }] }),
      bold: { head: '교실이 조용하다', chips: [{ t: '범인이 대담해진다' }] },
      caughtRight: (id, heat, n, evidence) => ({ head: `${id}번 검거`, chips: [{ t: 'EMP +25' }, { t: `경계도 +${heat}` }, n && { t: `주변 ${n}명 긴장` },
        evidence !== 'hard' && { t: evidence === 'soft' ? SOFT : '증거 없음, 판정은 시험 후', k: 'mute' }] }),
      caughtWrong: (id, risk, heat, n) => ({ head: `${id}번은 무고했다`, chips: [{ t: `학부모 리스크 +${risk}`, k: 'bad' }, { t: `경계도 +${heat}` }, n && { t: `주변 ${n}명 긴장` }] }),
      emp: (kind, heat, n) => ({ head: `EMP 발사 · ${n}명이 움찔`, chips: [{ t: `경계도 +${heat}` }, kind === 'hearing' && { t: '보청기 손상', k: 'bad' }] }),
      codex: (name) => ({ head: `도감에 ${name} 추가`, chips: [{ t: 'Esc', k: 'key' }] }),
      co: (id) => ({ head: `부감독관이 ${id}번을 가리킨다`, chips: [], sm: 1 }),
    },
    // 일시정지 도감
    codex: {
      title: '수사 자료',
      sub: '바깥을 눌러도 계속된다',
      stamp: '목격',
      unseen: '미목격',
      resume: '계속',
      real: '용의자',
      like: '무혐의',
      // evidence: 증거 3단계. ok 가 확정
      evidence: { title: '증거', rows: [{ t: '기기 발견 · EMP 반응', s: '확정', ok: 1 }, { t: '빛만 목격', s: '시험 뒤 판정' }, { t: '아무것도 없음', s: '풀려나기 쉽다' }] },
      keys: '조작',
      gaugesTitle: '게이지 읽는 법',
      cards: {
        glasses: { name: 'AI 안경', sub: '렌즈에 답이 뜸', real: '렌즈 아래가 초록', like: '테만 만짐', dir: '비스듬히 봐야 보임', parts: ['평범한 뿔테와 똑같다', '렌즈 아래가 은은한 초록', '다리 안쪽 프로젝터'] },
        set: { name: '카메라 + 이어폰 세트', sub: '찍어 보내고 답을 들음', real: '단추 빨강, 귀 파랑', like: '단추·귀를 만짐', dir: '단추는 정면, 귀는 오른쪽·뒤', parts: ['구멍 하나가 렌즈', '귓속에 들어간다', '옷 안에 숨긴다'] },
      },
      gauges: {
        risk: ['학부모 리스크', '증거 못 찾은 검사 +15, 멘붕 +20, 오적발 +50. 100이 되면 바로 감독관 교체'],
        heat: ['교실 경계도', '20초 조용하면 대담해지고, 건드리면 소극적이 된다'],
        emp: ['EMP', '조준점 둘레 링. 2번 쏘면 징계'],
        tense: ['학생 긴장', '붉을수록 멘붕이 가깝다'],
        lv: { risk: ['20', '60', '95'], heat: ['조용 27초', '검사 직후', 'EMP 직후'], emp: ['충전 중', 'Q로 발사'] },
      },
    },
    ticker: [
      `${EXAM_SHORT} 전국 수석, 영상 올려 "AI로 풀었다" 자수... 경찰 수사 착수`,
      `${ORG} "고사실마다 감독관 2명 배치, 규정상 문제 없었다"`,
      `${ORG} "감독관 확인 결과 특이사항 없음"... 이틀 뒤 수석 자수`,
      `${MINISTRY} 장관, 부정행위 100% 적발 질문에 "자신 없다" 취지 답변... 부처 "감독관 고충에 공감한 것" 해명`,
      `${MINISTRY} 오전 "전파 차단 검토" → 오후 "검토하고 있지 않다" 공지`,
      `${EXAM_SHORT} 유의사항 "스마트안경, 착용만 해도 사용으로 간주"... 시험 열흘 전 발표`,
      '감독관 설문 "287분 부동자세가 고충" 97%... "보호받을 수 있다" 4%',
      '전문가 "시험장 안 감독만으론 한계... 시험 방식 자체를 되돌아봐야"',
      `${ORG} "전자기기 탐지기 도입은 예산 심의 이후 검토"`,
      '수험생 커뮤니티 "원래 다들 하던 거 아니냐" 논란 확산',
    ],
  },
  // 엔딩 (감독관)
  endings: {
    replaced: {
      stamp: '교체',
      title: '감독관 교체',
      realityCard: null, // 아래에서 lawsuit_risk 카드를 재사용
      body: [
        '항의 전화가 시험 중에 평가원 교환대로 몰렸다. {wrongLine} {meltdownLine}',
        '평가원은 "공정한 시험 관리를 위한 조치"라며 시험 도중 감독관을 교체했다.',
      ],
    },
    lawsuit: {
      stamp: '피소',
      title: '학부모 고소',
      realityCard: {
        text: '2023년 수능에서 부정행위를 적발한 감독 교사의 학교에 수험생과 학부모가 찾아가 1인 시위를 벌이며 위협했고, 교육부 장관과 서울시교육감이 학부모를 공동 고발했다. 이듬해 교사 설문에서 "수능 업무 중 인권 침해를 당하면 보호받을 수 있다"고 답한 비율은 4%였다. 이 엔딩의 오적발 상황은 실제 사례가 아니라 풍자적 가정이다.',
        source: '뉴시스 2023-11-24, 뉴시스 2024-11-11',
      },
      body: [
        '적발한 수험생은 부정행위를 하지 않았다. 긴장해서 두리번거렸을 뿐이다. 퇴실한 수험생의 부모는 다음 날 평가원 앞에서 기자회견을 열었다.',
        '부모는 감독관이 아이를 범인 취급했다고 주장했다. 영상은 하루 만에 조회수 백만을 넘었고, 평가원은 "감독관 개인의 판단"이라고 밝혔다. 감독관은 경위서를 제출했다.',
      ],
    },
    lawsuit_risk: {
      stamp: '피소',
      title: '"우리 아이 시험 망쳤습니다"',
      realityCard: {
        text: '2023년 수능에서 부정행위를 적발한 감독 교사의 학교에 수험생과 학부모가 찾아가 1인 시위를 벌이며 위협했고, 교육부 장관과 서울시교육감이 학부모를 공동 고발했다. 이듬해 교사 설문에서 "수능 업무 중 인권 침해를 당하면 보호받을 수 있다"고 답한 비율은 4%였다. 이 엔딩의 고소 상황은 실제 사례가 아니라 풍자적 가정이다.',
        source: '뉴시스 2023-11-24, 뉴시스 2024-11-11',
      },
      body: [
        '감독관은 빈 가방을 여러 번 열었고, 한 수험생 옆에서 오래 지켜봤다. 그 수험생은 시험을 망쳤고, 부모는 며칠 뒤 감독관이 아이를 몰아붙였다며 고소했다.',
        '평가원은 "감독관 개인의 판단"이라고 답했다.',
      ],
    },
    medical: {
      stamp: '징계',
      title: '의료기기 손상',
      realityCard: {
        text: '현실에서 시험장 전파 차단은 "현행법상 국가안보와 직접적으로 관련된 사안들 이외에는" 불가하다(교육부 대입정책과장). 같은 날 장관은 국회에서 "시험 시간 일부라도 가능한지 알아보겠다"고 했고, 교육부는 반나절 만에 "전파 차단은 검토하고 있지 않다"고 공지했다. 게임의 EMP와 의료기기 손상은 가상 설정이다.',
        source: '경향신문 2026-11-16, 서울신문 2026-11-17',
      },
      body: [
        'EMP 펄스가 퍼지자 고사실 한쪽에서 짧은 소리가 났다. 한 수험생의 보청기가 손상됐고, 그 수험생은 남은 시간 동안 안내 방송과 종료령을 듣지 못했다.',
        '평가원은 "해당 장비의 사용은 매뉴얼에 없었다"고 밝혔다.',
      ],
    },
    stalemate: {
      stamp: '미완',
      title: '끝까지 못 채운 답안지',
      realityCard: null, // 아래에서 perfect 카드를 그대로 재사용
      body: [
        '부정행위자는 있었지만 종이 울렸을 때 어느 답안지도 끝까지 채워지지 않았다.',
        '{meltdownLine} 시험은 그대로 종료됐다.',
      ],
    },
    topscorer: {
      stamp: '수사',
      title: '전국 수석의 자수',
      realityCard: {
        text: '2026년 11월, 제63회 세무사 시험 수석 합격자가 "초소형 카메라를 이용해 시험 문제를 찍고, AI로 전송을 해서 스마트폰으로 답을 확인하는 방법"으로 부정행위를 했다고 자수했다. 2차 시험에선 교단 바로 맨 앞줄에 앉아 있었다. 나흘 전까지는 "찍는 것도 기술이라고 생각한다"며 의혹을 부인했다. 감독이 아니라 본인의 자백으로 드러난 사건이다.',
        source: 'MBC 뉴스데스크 2026-11-15',
      },
      body: [
        '놓친 부정행위자는 몇 주 뒤 수능 전국 수석이 되어 신문 1면에 올랐다.',
        '이후 본인이 영상을 올려 시험 중 기기를 썼다고 밝혔고, 경찰이 수사에 들어갔다.',
      ],
    },
    perfect: {
      stamp: '이상 없음',
      title: '완벽한 감독',
      realityCard: {
        text: '수능 감독관 수당은 17만 원 수준이다. 교사 설문에서 97%가 "하루 287분 가량을 부동자세로 서 있는 게 고충"이라고 답했다. 시험이 끝나면 감독관 관련 민원이 매년 1,000여 건 들어오고, 대부분은 "감독관의 행동이 거슬렸다"는 내용이다.',
        source: '세계일보 2025-10-18, 뉴시스 2024-11-11',
      },
      body: [
        '부정행위자를 모두 적발했고 오적발은 없었다.',
        '감독관 수당은 17만 원이었다. 시험이 끝난 뒤 "감독관이 자꾸 쳐다봐서 집중이 안 됐다"는 민원이 한 건 접수됐다.',
      ],
    },
    complaint: {
      stamp: '민원',
      title: '억울한 퇴실',
      realityCard: {
        text: '2027학년도 수능 유의사항은 스마트안경·스마트워치를 "시험 시간 중 단순히 착용만 하고 있더라도 사용한 것으로 간주"한다. 그런데 숨긴 기기를 두고 교육부 장관은 "현재로서는 우리 기술력이 그것을 따라가지 못하는 부분도 있는 게 사실"이라고 말했다. 판정은 결국 감독관의 눈에 달려 있다.',
        source: '경북매일 2026-11-09, 경향신문 2026-11-16',
      },
      body: [
        '부정행위자는 모두 적발했지만, 부정행위를 하지 않은 수험생 한 명도 함께 퇴실했다.',
        '그 수험생은 복도에서 한참 서 있었고, 그날 밤 평가원 민원 게시판에 글이 올라왔다.',
      ],
    },
  },
  empPenalty: {
    title: '전파법 위반 징계',
    body: '감사 결과 고사실에서 허가받지 않은 전파 억제 장치를 두 번 이상 사용한 사실이 확인되어, 감독관은 감봉 1개월 처분을 받았다.',
  },
  endingUi: {
    stats: '감독 결과',
    caught: '적발',
    wrong: '오적발',
    missed: '놓침',
    missedList: '놓친 부정행위자',
    none: '없음',
    riskPct: '학부모 리스크',
    meltdownCount: '멘붕',
    emptyCount: '증거 못 찾은 검사',
    released: (n) => `증거 불충분 석방 ${n}명`,
    wrongLine: (n) => (n ? `오적발로 내보낸 수험생은 ${n}명이었다.` : '오적발은 없었지만 빈 가방 검사에 대한 항의가 쌓였다.'),
    meltdownLine: (n) => (n ? `멘붕한 수험생은 ${n}명이었다.` : '멘붕한 수험생은 없었다.'),
    probTitle: '소지품 검사 발견 확률',
    probLine: '목격 없음 20% · 목격 1회 55% · 2회 이상 75% · 빛을 본 직후 90%',
    // 결과 첫 문장: 몇 명 잡았고, 증거 없이 잡은 범인이 어떻게 빠져나갔는지
    verdict: ({ total, nabbed, released, missed, wrong }) => [
      nabbed ? `당신은 범인 ${total}명 중 ${nabbed}명을 잡았${released ? `지만, 증거 없이 잡은 ${released}명이 퇴실하는 길에 기기를 파기해 무혐의로 풀려났습니다.` : '습니다.'}` : '당신은 범인을 한 명도 잡지 못했습니다.',
      nabbed && missed ? `${missed}명은 끝까지 잡지 못했습니다.` : '',
      wrong ? `무고한 수험생 ${wrong}명을 퇴실시켰습니다.` : '',
    ].filter(Boolean).join(' '),
    reality: '현실 사례',
    seatTitle: '좌석 배치도 (감독관 시점)',
    board: '칠판',
    seatStatus: { caught: '검거', released: '석방', missed: '놓침', wrong: '오적발', meltdown: '멘붕' },
    hearingTag: '보청기',
    seatLegend: '교실 앞에서 학생들을 마주 본 방향이다. 범인 칸은 기기와 결과, 붉은 X는 오적발, 멘붕과 보청기 학생도 표시했다.',
    portraitTitle: '범인 초상',
    portrait: (id, dev, st) => `${id}번 · ${dev} · ${st}`,
    memo: '경 위 서',
    newsTag: '속보',
    devShort: { set: '세트', glasses: '안경' },
    headline: { clear: '검거 완료!', failed: (n) => `${n}명 검거 실패!`, replaced: '감독관 교체!', examinee: { caught: '적발!', pass: '합격!', fail: '불합격!' } },
    again: '다시하기',
    menu: '메뉴로',
  },
  // 수험생 모드
  examinee: {
    pickTitle: '기기를 고르세요',
    pickDesc: '답안 진척 속도와 들킬 위험이 다릅니다.',
    speed: '진척',
    risk: '위험',
    devices: {
      paper: { speed: '느림', risk: '높음', rate: 1.0, risk_in: 45 },
      watch: { speed: '보통', risk: '보통', rate: 1.6, risk_in: 32 },
      camai: { speed: '매우 빠름', risk: '낮음', rate: 3.2, risk_in: 22 },
      glasses: { speed: '가장 빠름', risk: '매우 낮음', rate: 4.2, risk_in: 14 },
    },
    startLines: [
      '마우스로 둘러볼 수 있습니다. Space 를 누르고 있으면 기기를 사용합니다.',
      '바닥의 반투명 원뿔은 감독관의 시야입니다. 그 안에서 기기를 쓰면 의심 게이지가 오릅니다.',
    ],
    inView: '감독관 시야 안',
    outView: '시야 밖',
    startLinesTouch: [
      '화면을 문질러 둘러볼 수 있습니다. 기기 버튼을 누르고 있으면 기기를 사용합니다.',
      '바닥의 반투명 원뿔은 감독관의 시야입니다. 그 안에서 기기를 쓰면 의심 게이지가 오릅니다.',
    ],
    clickStart: '클릭하여 시작',
    tapStart: '화면을 눌러 시작',
    paused: '일시정지',
    clickResume: '클릭하여 계속',
    tapResume: '화면을 눌러 계속',
    useBtn: '기기',
    pauseBtn: '정지',
    timeLeft: '남은 시간',
    progress: '답안 진척',
    suspicion: '의심',
    using: '기기 사용 중...',
    keys: [['마우스', '둘러보기'], ['Space 홀드', '기기 사용'], ['Esc', '일시정지']],
    endings: {
      caught: {
        stamp: '적발',
        title: '부정행위 적발',
        realityCard: {
          text: '2020~2024학년도 수능 부정행위 적발 1,174건 가운데 가장 많은 유형은 "종료령 이후 답안 작성"으로 376건(32%)이었다. 첨단 기기보다 종이 친 뒤의 펜 한 획이 더 많이 걸렸다.',
          source: '뉴시스 2024-11-13 (교육부 자료)',
        },
        body: [
          '감독관이 시험지를 가리켰고, 수험생은 그 자리에서 퇴실했다.',
          '성적 무효와 응시 제한 기간이 통지되었다.',
        ],
      },
      pass: {
        stamp: '합격',
        title: '수능 만점·전국 수석',
        realityCard: {
          text: '홍콩과기대 연구진의 통제 실험에서 AI 안경으로 만든 답안이 학부 시험에서 92.5%를 받아 100여 명 가운데 상위 5위 안에 들었다. 2026년 11월에는 세무사 시험 수석 합격자가 초소형 카메라와 생성형 AI로 부정행위를 했다고 자수했다.',
          source: 'Times Higher Education 2026-09-05, MBC 뉴스데스크 2026-11-15',
        },
        news: `[속보] ${EXAM_SHORT} 만점자 탄생... 올해 전국 수석 "믿기지 않는다"`,
        body: [
          '성적 발표에서 전국 1위로 확인되었다. 가족과 인터뷰 요청이 이어졌다.',
          '이후 "수능 부정행위 의혹 수사 착수"라는 기사가 올라왔다.',
        ],
      },
      fail: {
        stamp: '불합격',
        title: '불합격',
        realityCard: {
          text: '국회에서 "초소형 카메라와 이어폰 등을 활용한 부정행위를 100% 잡아낼 자신 있느냐"는 질문에 교육부 장관은 "전 못 할 것 같다"고 답했다. 교육부는 "현장 감독관들의 어려움에 공감을 표현한 것"이라고 해명했다.',
          source: '이투데이 2026-11-16',
        },
        body: [
          '종이 울렸을 때 답안지는 반쯤 비어 있었다. 아무도 의심하지 않았다.',
          '발표 날 옆자리 응시자가 수석 합격했다는 소식이 나왔다.',
        ],
      },
    },
    stats: { progress: '최종 진척', suspicion: '최종 의심', device: '사용 기기' },
  },
  common: { realityTitle: '현실 사례' },
};

// 교착 엔딩은 완벽한 감독 엔딩의 현실 카드를 그대로 쓴다
C.endings.stalemate.realityCard = C.endings.perfect.realityCard;
C.endings.replaced.realityCard = { ...C.endings.lawsuit_risk.realityCard, text: C.endings.lawsuit_risk.realityCard.text.replace('이 엔딩의 고소 상황은', '이 엔딩의 감독관 교체는') };
