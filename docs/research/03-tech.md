# 03. 기술 조사 (현실 기술 근거 + 3D 웹게임 스택)

조사 기준일: 2026-11-17. 출처 옆 표기는 다음 뜻이다.
- 확인: 원문(또는 공식 페이지)을 열어 봤다.
- 2차: 검색 요약이나 해설 자료로만 봤다. 원문은 열지 못했다.
- 미확인: 근거를 못 찾았다.

> 이 문서는 게임 설정의 근거를 모으는 용도다. 부정행위 기기의 제품명·구매처·세팅법은 일부러 적지 않았다.

---

## A. 현실의 부정행위·대응 기술

### A-1. 부정행위 기기 계열과 감독관 눈에 보일 수 있는 징후 (원리 수준)

| 계열 | 원리 | 눈에 보일 수 있는 징후 (게임 단서 후보) |
|---|---|---|
| 초소형 카메라 | 문제지를 촬영해 밖으로 전송 | 옷깃·단추·안경테 같은 곳이 자꾸 문제지 쪽을 향함, 부자연스러운 자세 고정 |
| 무선 이어폰·골전도 | 밖의 조력자가 소리로 답을 전달 | 귀를 자주 만짐, 머리카락·모자로 귀를 가림, 혼잣말처럼 입술이 움직임 |
| AI 안경 | 안경에 카메라·마이크·소형 디스플레이나 스피커가 들어 있음 | 일반 안경과 육안 구분이 거의 안 됨. 안경다리를 만지는 습관, 시선이 문제지와 허공을 번갈아 봄 |
| 스마트워치 | 시계 모양 단말로 정보를 받음 | 손목을 자주 들여다봄. 시험장에선 시계 자체가 반입 금지 |
| 원격 조력 | 밖의 사람이나 AI가 영상·음성을 받아 답을 보냄 | 위 기기들의 결과로 나타나는 "일정한 리듬의 답안 작성", 어려운 문제에서 풀이 속도가 갑자기 빨라짐 |

근거로 확인한 내용:
- 한국 2027학년도 수능(2026-11-19 시행 예정) 앞두고 AI 안경이 일반 안경과 구별하기 어렵다는 보도가 이어진다. 교육부는 AI 안경을 반입 금지 물품에 넣었고, 소지만으로도 시험이 무효가 되며 다음 해 응시자격이 정지된다. 감독관은 안경 착용자를 시험 시작 전에 확인해야 하고, 요구를 받으면 안경을 벗어 책상에 놓아야 한다. [Korea Times, 2026-10-16](https://www.koreatimes.co.kr/southkorea/education/20261016/ai-glasses-raise-cheating-fears-ahead-of-csat-putting-teachers-under-pressure) (확인), [supple.kr 보도](https://supple.kr/news/cmv93ss5q003zzab4cm59ir0d) (확인)
- 같은 Korea Times 기사에서 전파(RF) 탐지기는 "이번 시험엔 준비가 어렵다"는 취지로 나온다. 시험장 환경 차이 때문에 오탐이 생길 수 있다는 이유다. (확인)
- 교육부가 시험장마다 AI 안경 판별 전담 인력을 1명씩 배치하고 감독관 배상책임보험을 넓힌다는 보도가 있다. 교육부 공식 발표문은 열지 못했다. [검색 결과 요약](https://www.koreadaily.com/article/20260801140031638) (2차)
- 수능 반입 금지 적발은 2022학년도 65건에서 2026학년도 84건으로 늘었다는 보도. (2차, 위 검색 요약)
- 감독관 입장의 어려움: 징후를 명시한 공식 자료는 못 찾았다. 기사들도 "관찰하고 판단하라"는 수준이다. 게임에서는 징후를 확정 증거가 아닌 "의심 단서"로만 설계하는 게 현실에 맞는다.

### A-2. 대응 기술

| 대응 | 현실 | 게임에서의 쓰임 |
|---|---|---|
| 금속탐지기 | 한국 기사에선 중국 화난농업대학이 AI 안경 단속에 금속탐지기를 동원한 사례만 확인됨(2차). 한국 수능에서 쓴다는 근거는 못 찾음. | "검사" 도구. 플라스틱·소형 부품은 놓칠 수 있다는 한계를 둔다 |
| 전파(RF) 탐지기 | 한국 교육부는 도입을 검토 단계로 봄(Korea Times, 확인). 오탐 우려가 있다. | 게이지·레이더 같은 보조 단서. 단독으로 적발 못 하게 한다 |
| 휴대전화 전파차단기 | 아래 별도 정리 | EMP와 대비되는 "현실의 한계" 설명 |
| 시험장 CCTV | 한국 수능 시험장 CCTV 운용 근거는 이번에 확인 못 함 | 미확인. 게임에선 사후 리뷰(증거 재생) 요소로 쓸 수 있음 |
| AI 감독(온라인 프록터링) | Pearson VUE가 시선·소리·얼굴 인식 등 여러 AI 센서를 쓴다고 소개함. [Pearson VUE](https://www.pearsonvue.com/kr/ko/about/news/highlights/five-ways-ai-online-testing.html) (2차, 검색 요약만) | "AI 감독 vs 사람 감독" 풍자 소재 |
| 중국 가오카오 | 2025·2026년 모두 중국 AI 업체들이 시험 시간대에 문제 촬영·풀이 기능을 일시 제한. 시험 중 속삭임·곁눈질 같은 이상 행동을 AI가 표시하고 시험 후 영상을 검토한다는 보도. [세계일보 2026-05-29](https://www.segye.com/newsView/20260529508806) (2차), [AACRAO](https://www.aacrao.org/edge/emergent-news/china-temporarily-shuts-down-ai-apps-to-stop-cheating-during-national-exams/) (403으로 못 열음, 검색 요약만), [Gizmodo](https://gizmodo.com/china-takes-on-student-cheating-by-shutting-off-ai-nationwide-during-exams-2000613172) (원문 미확인) | 가오카오 시험장 전파 차단·드론·안면인식은 이번 조사에서 근거를 못 찾음(미확인). 게임 설정에 쓰려면 별도 확인 필요 |

#### 휴대전화 전파차단기와 한국 전파법

확인한 것과 못 한 것을 분리해 적는다.

- 현행 조문 원문은 국가법령정보센터(law.go.kr)가 본문을 주지 않아 열지 못했다. 제목 줄에서 현행 전파법이 "시행 2026. 10. 22. 법률 제21553호"임만 확인했다. [law.go.kr 전파법](https://www.law.go.kr/법령/전파법) (본문 미확인)
- 2013년판 위키문헌에서 다음 조문을 확인했다. 지금은 번호·내용이 바뀌었을 수 있다. [위키문헌 전파법](https://ko.wikisource.org/wiki/대한민국_전파법) (구판 확인)
  - 제29조: 무선국은 다른 무선국 운용을 저해할 혼신이나 그 밖의 방해를 하지 않도록 운용해야 한다.
  - 제58조: 산업·과학·의료용 전파응용설비 등은 장관 허가가 필요하다.
  - 제82조: 무선설비를 손괴하거나 기능에 장해를 주어 무선통신을 방해하면 최대 10년 이하 징역 또는 5천만 원 이하 벌금(대상 업무에 따라 형량이 다름).
  - 제84조: 제58조 제1항 허가 없이 통신설비를 설치·운용하면 3년 이하 징역 등. (구판은 벌금 2천만 원이고, 한 검색 요약은 3천만 원으로 전한다. 현행 액수는 미확인.)
- 검색 요약(2차)에 따르면 전파차단장치는 제조·수입·판매에도 인가가 필요하고 무단이면 처벌된다는 설명이 있다. 정확한 조문 번호는 확정하지 못했다. [검색 요약](https://wikidocs.net/275477) (2차, 수험서 성격)
- 과기정통부 입법예고 자료에 따르면 2024-07-24 시행 전파법 개정에서 "전파차단장치 사용으로 생길 수 있는 민사피해"에 대한 손실보상 기준을 시행령에 두게 됐다. 현행 시행령 별표 5의2가 "전파차단장치 사용으로 인한 손실의 보상기준"이라는 정보도 있다. [입법예고 파일](https://opinion.lawmaking.go.kr/file/download/9506726/BXDKOGYWAAVMFQH564TD) (PDF 본문 추출 실패, 검색 요약만), [nepla.ai 시행령](https://www.nepla.ai/law/전파관리법시행령) (2차)
- 허용 범위: 국가안보 목적의 군사활동·대테러활동 등 공공안전상 불가피한 경우에 한해 예외적으로 허용되어 왔다는 설명. [의안정보](https://opinion.lawmaking.go.kr/gcom/nsmLmSts/out/2203413/detailRP) (2차)
- 정리: 민간이 시험장에서 마음대로 전파를 차단하는 건 허용되지 않는다는 쪽이 유력하다. 다만 이 결론의 현행 조문 번호와 형량은 **미확인**이다. 게임 안에서는 "허가 없는 전파 방해는 형사처벌 대상"까지만 말하고, 조문 번호는 본문에 넣지 말자.
- 부작용: 차단 전파가 건물 밖으로 새어 주변 통화까지 막을 수 있다는 1999년 보도가 있다. [서울신문 1999](https://www.seoul.co.kr/news/1999/03/25/19990325006002) (2차, 오래됨)

### A-3. EMP의 현실

확인된 것:
- EMP는 근처 도체에 전압·전류를 유도해 전자회로에 잡음을 일으키거나 고장을 낸다. 전력선 서지는 수 kV에 이를 수 있고, 강한 EMP는 자기 매체 데이터를 손상시킬 수 있다. 비핵 EMP는 에너지가 핵 EMP의 100만분의 1 수준이고 사거리가 짧다. 보호 수단은 패러데이 차폐다. [Wikipedia EMP](https://en.wikipedia.org/wiki/Electromagnetic_pulse) (확인, 의료 이식기기 언급은 없음)
- 이 장비를 "교실에서 쓰는 소형 장치"로 만드는 것은 현실에 없는 판타지다. 교실 크기에서 선택적으로 몇 개 기기만 끄는 EMP는 근거를 못 찾았다(미확인). 게임에서 "판타지 요소"로 처리한 것이 맞다.

의료기기 위험(근거가 약한 부분을 구분):
- FDA의 휴대전화·심박조율기 안내: 디지털 휴대전화 전파가 가까이 있으면 조율기 펄스가 멈추거나 불규칙해지거나 고정 속도로 뛸 수 있다. 조율기 의존 환자가 주로 위험하다. 대부분 약 15cm(6인치) 밖에선 영향이 없다. 이 글의 기준일은 1995-11-01이고 2017-12-02까지 갱신됐다. [FDA](https://www.fda.gov/radiation-emitting-products/electromagnetic-compatibility-emc/electromagnetic-compatibility-cellular-phone-interference) (확인, 단 구형·휴대전화 한정)
- FDA는 휴대전화·스마트워치의 자석이 일부 이식기기를 "자석 모드"로 바꿀 수 있다고도 경고했다. 약 15cm 이격을 권고. [Healthcare IT News](https://www.healthcareitnews.com/news/some-phones-and-smartwatches-may-interfere-pacemakers-fda-warns) (2차)
- 미군 Harry Diamond 연구소 1991 보고서(HDL-TR-2197)가 EMP 시뮬레이터로 조율기를 시험했고, 손상 가능성은 낮다는 결론이라는 **2차 요약**이 있다. 원문 PDF는 403이라 못 열었다. [DTIC](https://apps.dtic.mil/sti/pdfs/ADA242990.pdf) (원문 미확인)
- 인슐린 펌프·보청기에 대한 EMP 시험 자료는 신뢰할 만한 출처에서 못 찾았다. "위험이 높다"는 글은 생존주의 사이트뿐이고 시험 데이터가 없다. **미확인**.
- 정리: "EMP가 의료기기를 반드시 해친다"는 과학적으로 확정된 사실이 아니다. 오히려 연구에선 조율기 피해 가능성이 낮다는 쪽이다. 그래서 게임의 풍자는 "의료기기가 실제로 죽는다"가 아니라 **"감독관이 확인도 없이 쏴 놓고 책임을 진다/전파 방해로 징계받는다"**는 절차 책임 쪽으로 잡는 게 안전하고 정직하다. 보청기·인슐린 펌프를 쓰는 수험생이 "오작동 의심 신고"를 하는 정도가 적당하다.
- 한국법상 EMP 장비의 취급: 전파법은 허가 없는 전파 방해를 처벌 대상으로 다루고(위 A-2), 의도적 EMP 발생기는 별도 규정을 못 찾았다. **미확인**. 게임에서는 "전파법 위반 감사"를 풍자 설정으로만 쓰고 현실의 법 조항처럼 보이게 하지 않는다.

---

### A-4. 추가 조사 (2026-11-18): 시계 규정, 위장 스마트워치, AI 안경 빛샘

플레이테스트 뒤 범인 신호를 다시 설계하면서 확인한 내용이다. 원문을 열어 확인한 것은 `[원문]`, 검색 요약만 본 것은 `[검색요약]`으로 표시했다.

**수능 시계 규정과 스마트워치**
- 허용 시계는 "결제·통신기능(블루투스 등) 및 전자식 화면표시기(LCD, LED 등)가 모두 없는 시침, 분침(초침)이 있는 아날로그 시계"뿐이다. 스마트워치 등 웨어러블은 금지 목록에 있다. [원문] https://www.moe.go.kr/sub/infoRenew.do?m=011301
- 2016학년도 수능부터 통신기능·전자식 화면이 있는 시계를 모두 금지했다. [원문] https://www.ajunews.com/view/20161114124439395 (2016-11-14)
- 1·3교시 시작 전 시계를 신분증·수험표와 함께 책상 위에 올려놓게 하고 감독관이 뒷면까지 점검한다. [원문] 위 교육부 안내문, ajunews 기사
- 2022~2026학년도 미제출 전자기기 적발은 휴대전화 113건, 전자시계 107건이다. 스마트워치를 따로 센 수치는 없다. [원문] https://www.imaeil.com/page/view/2026101006511731022 (2026-10-10)
- 아날로그로 위장한 커닝 시계(평소 바늘 시계 화면, 버튼을 누르면 저장한 텍스트 표시, 감독관 접근 시 시간만 표시하는 비상 버튼)는 해외 제품 보도가 있다. [원문] https://www.infopackets.com/news/10337/exams-plagued-cheater-wristwatches (2018-05-17), https://www.sciencealert.com/students-are-using-smart-spy-technology-to-cheat-in-exams (2016-05-17)
- 태국 랑싯대 의대 입시(2016-05)에서 안경 카메라로 문제를 찍고 스마트워치로 답을 받은 사건이 있었다. [검색요약] https://www.upi.com/Odd_News/2016/05/10/High-tech-cheating-scandal-leads-Thai-university-to-cancel-exams/7701462902472/
- 국내에서 위장 스마트워치를 시험 중 사용하다 적발된 사례는 찾지 못했다(미확인).
- 게임 반영: 국내 근거가 없고 현실의 적발 지점이 시험 전 점검이라, 감독관 모드 기기에서 스마트워치를 뺐다.

**AI 안경 렌즈 빛샘**
- 회절 도파관식 AR 안경은 영상광 일부가 렌즈 앞면으로 샌다(eye glow, front light leakage). 제조사 지원 문서는 시판 도파관 안경 거의 전부가 정도만 다르게 겪는다고 설명한다. [검색요약] https://support.evenrealities.com/hc/en-us/articles/15299939850511-Visible-green-glow-on-the-front-of-the-lenses
- Even Realities G1은 정면에서는 빛샘이 거의 없고, 착용자가 머리를 젖히거나 관찰자가 비스듬히 볼 때 보인다. [원문] https://kguttag.com/2024/08/18/even-realities-g1-minimalist-ar-glasses-with-integrated-prescription-lenses/ (2024-08-18)
- 고급 모델은 빛샘을 줄였다. Meta Ray-Ban Display는 외부 누광 약 2%로 밝힌다. [원문] https://roadtovr.com/hands-on-meta-ray-ban-display-glasses-neural-band-offer-a-glimpse-of-future-ar-glasses/ (2025-09-17)
- 도파관이 다른 각도에서 만드는 빛샘·반사로 스마트 안경을 탐지하는 연구가 있다(Duke, HotMobile 2026). [원문] https://comphealth.duke.edu/publications/no-guide-no-cheat-detecting-smart-glasses-via-ar-optical-signatures/
- 중국 화난농업대 시험에서 감독관이 2~3분 지켜본 뒤 렌즈가 특정 각도에서 초록빛을 내는 것을 보고 퇴장시켰다. [원문] https://global.hk01.com/大国小事/60367882/ai眼镜侵入内地考场-碰镜腿即拍照搜题-考生镜片透绿光被逮 (2026-07-08)
- 한국 소방설비기사 시험(광주)에서 감독관이 렌즈에 비친 이상한 빛을 알아채 AI 안경 부정행위 첫 형사 고발로 이어졌다(연도 미표기). [원문] https://www.koreajoongangdaily.com/korea/korea-files-first-criminal-charge-over-cheating-using-ai-smart-glassesnbsp/12771828
- 2026년 내신 AI 안경 적발 4건 중 3건은 안경테를 계속 만지는 행동이 계기였다. [원문] https://www.wikitree.co.kr/articles/1173044 (2026-11-09)
- 촬영 표시등(Ray-Ban Meta 계열)은 흰색이고, 이를 스티커로 가린다는 증언이 있다. [원문] https://meta.com/smart-glasses/privacy/ , 위 HK01 기사
- 게임 반영: AI 안경 신호는 깜빡이는 LED가 아니라 비스듬한 각도에서만 렌즈에 은은하게 비치는 초록빛으로 둔다. 도감에는 "기기 모델과 보는 각도에 따라 안 보일 수 있다"를 적는다.
- 미확인: 단색 녹색 microLED만의 특이성, Xreal·INMO의 외부 가시성, 리뷰 기사(CNET, The Verge, Engadget의 Rokid·Meta 평) 원문과 날짜.

## B. 3D 웹게임 기술 선택

### B-1. 엔진 선택

실측 버전 (`npm view`, 2026-11-17):

| 패키지 | 최신 버전 | 라이선스 | 설치 크기(unpackedSize) |
|---|---|---|---|
| three | 0.187.0 | MIT | 약 21MB |
| @babylonjs/core | 9.37.0 | Apache-2.0 | 약 74MB |
| @react-three/fiber | 9.8.2 | (미확인) | react >=19 <19.4, three >=0.156 필요 |
| @react-three/drei | 10.7.9 | (미확인) | |
| vite | 8.3.8 | | |

three 라이선스는 [GitHub LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE)에서 MIT를 확인했다. 크기는 설치 용량이지 번들 크기가 아니다(번들 크기는 트리 셰이킹 후 별도 측정 필요).

권장: **vanilla three.js 유지**. 이유는 다음과 같다.
- 교실 한 칸에 NPC 20~30명이면 상태(시야, 게이지, 부정행위 FSM)는 게임 루프에서 매 프레임 돌리는 쪽이 자연스럽다. React 상태·리렌더 모델에 얹으면 매 프레임 갱신이 오히려 불편하다.
- R3F는 React 앱 안에 3D를 끼울 때 이점이 크다. HUD·메뉴가 많은 게임이면 가치가 있지만, MVP는 DOM HUD 몇 개면 충분하다.
- Babylon.js는 충돌·물리·GUI·인스펙터가 내장된 올인원이라 더 큰 게임에 맞는다. 이 규모엔 과하고 의존성이 크다.
- 이미 MVP가 `package.json` 기준 three ^0.187.0 + vite로 짜여 있다(확인). 갈아탈 이유가 없다.
- 단, 0.x 버전이라 마이너 업데이트마다 API가 바뀔 수 있다. 버전은 고정(`~`)하는 편이 안전하다. (일반 경험칙, 근거 URL 없음)

### B-2. NPC가 많을 때 성능

- `InstancedMesh`는 같은 지오메트리·재질로 많은 객체를 한 번에 그려 드로우콜을 줄인다. 인스턴스별 행렬(`setMatrixAt`)과 색(`setColorAt`)을 지원하고, 바운딩 스피어는 인스턴스 전체를 감싸므로 흩어져 있으면 컬링 효율이 떨어진다. [three.js InstancedMesh 문서](https://threejs.org/docs/pages/InstancedMesh.html) (확인)
- 30명 규모면 **인스턴싱이 필수는 아니다**. 저폴리 캐릭터 30개를 개별 Mesh로 그려도 데스크톱에선 충분하다(경험칙, 실측 안 함). 인스턴싱은 "책상·의자·같은 소품"에 먼저 쓰고, 애니메이션이 필요한 NPC는 스킨드 메시를 개별로 쓰는 게 단순하다. 스킨드 메시를 인스턴싱하려면 morph/텍스처 기반 애니메이션이 필요해 복잡도가 오른다.
- 그림자는 비용이 큰 편이다. 방향광 하나 + 얕은 shadow map(1024 안팎)에 NPC만 그림자 캐스트, 바닥·책상은 수신만 하는 식으로 줄인다. 교실이 작으면 베이킹 대체도 가능하다(경험칙).
- 모바일: 이 게임은 1인칭 PointerLock 마우스 조작이 기본이라 모바일 대응은 MVP 범위 밖으로 두는 게 맞다. 필요하면 터치 조이스틱 + 시점 드래그를 별도로 만든다. 모바일 성능은 실측 안 함(미확인).

### B-3. 무료 CC0 3D 에셋 출처

| 출처 | 라이선스 | 교실·책상·사람 | 링크 |
|---|---|---|---|
| Kenney | Furniture Kit 페이지에서 CC0 확인. 다른 Kenney 팩도 같은 정책인지는 팩마다 확인 필요 | Furniture Kit(의자·테이블·침대 등, 파일 140개로 표기, 책상은 명시 안 됨). 3D 사람은 Mini Characters 팩만 확인. 교실 전용 팩은 못 찾음 | [Furniture Kit](https://kenney.nl/assets/furniture-kit) (확인), [3D 카테고리](https://kenney.nl/assets/category:3D) (확인) |
| Quaternius | FAQ에서 모든 모델이 CC0, 상업 이용 가능, 출처 표기 불필요, 수정·결합 가능이라고 확인 | 홈페이지 팩 목록에 Ultimate Furniture Pack, Furniture Pack, Ultimate House Interior Pack, Universal Base Characters, Animated Men/Women Pack, Modular Men/Women Pack 등이 있음. 교실 전용 팩은 못 찾음 | [홈](https://quaternius.com/) (확인), [FAQ](https://quaternius.com/faq.html) (확인) |
| Poly Pizza | 홈에서 "10,700+ 무료 모델"까지만 확인. 라이선스는 모델별로 다르고 CC-BY가 많다는 설명은 2차 자료. 약관 `/docs/tos`는 열지 못함 | 검색으로 개별 모델 찾기 | [poly.pizza](https://poly.pizza/) (라이선스 미확인) |
| OpenGameArt | 모델마다 다름 | Kenney 팩 미러 등 | 라이선스 모델별 확인 필요 |

주의:
- Poly Pizza 모델은 쓰기 전에 모델 페이지에서 라이선스(CC0 / CC-BY)를 개별 확인하고, CC-BY면 크레딧을 표기한다.
- 이 게임은 비배포지만, 에셋 출처와 라이선스를 `docs/` 또는 `public/credits` 같은 곳에 목록으로 남겨 두면 나중에 공개할 때 편하다.
- 교실 책상·의자 + 사람 조합은 Quaternius의 Ultimate Furniture Pack + Universal Base Characters(또는 Animated Men/Women Pack)가 가장 가까워 보인다. 실제 파일 내용(책상 유무, 포맷)은 내려받아 확인하지 않았다(미확인).

### B-4. 1인칭 조작·시선 판정 구현 포인트

- PointerLockControls: `three/addons/controls/PointerLockControls.js`에서 import, `new PointerLockControls(camera, domElement)`, `lock()`은 사용자 제스처(클릭) 안에서만 가능, `lock`/`unlock` 이벤트, `moveForward`/`moveRight`로 이동. 아래 API 요약은 공식 문서 본문이 아니라 도구가 일반 지식으로 보충한 것이므로 **0.187.0 기준 문서에서 서명을 다시 확인**할 것. [three.js docs](https://threejs.org/docs/) (API 상세 원문 미확인)
- 시선 판정(플레이어가 무엇을 보고 있나): 카메라 정중앙에서 `Raycaster.setFromCamera(new Vector2(0,0), camera)`로 쏘고 `intersectObjects`로 NPC·책상 충돌을 본다. 가까운 거리 제한(예: 3~4m)을 둔다.
- 시야 원뿔 판정(NPC가 감독관을 보나 / 감독관 시야 안에 수험생이 있나):
  1. 방향 벡터 `dir`(정규화)와 대상까지 벡터 `to`(정규화)의 내적 `dir.dot(to)`를 구한다.
  2. 임계값 `cos(halfAngle)`보다 크면 각도 안이다(예: 반각 40~50도).
  3. 거리 제한(최대 시야 거리)을 함께 둔다.
  4. 각도와 거리를 통과하면 마지막으로 Raycaster로 가림(책상·사람)이 있는지 확인한다.
  - `acos`를 쓰지 않고 내적과 `cos` 임계값만 비교하면 매 프레임 30명 계산도 부담이 없다.
- 연속 감시 게이지: "시야 원뿔 안에 있고 + 가림이 없고 + 의심 동작 중"인 시간을 누적하는 게이지로 만든다. 순간 판정보다 읽기 쉽고 오판이 줄어든다.
- 충돌: 교실 한 칸은 월드 경계를 AABB 몇 개로 막으면 충분하다. 물리 엔진은 불필요(경험칙).
- 대규모 레이캐스트가 필요하면 `three-mesh-bvh`(npm 최신 0.9.18 실측)가 있으나 이 규모엔 불필요하다.

### B-5. 사운드·한글 폰트

사운드:
- Web Audio API로 `AudioContext`를 만들어 효과음(적발음, 게이지 경고, EMP 충전/발사)을 재생한다. 브라우저 자동재생 정책 때문에 첫 클릭 후 `resume()`한다(일반 지식). three의 `AudioListener`/`PositionalAudio`로 위치 음향도 가능(원문 미확인).
- Freesound: CC0 / CC-BY / CC-BY-NC 세 가지 중 하나를 쓰고, 다운로드는 계정이 필요하다. CC-BY는 표기 필수, NC는 상업적 이용 불가. 비배포라도 CC0 위주로 고르면 편하다. [Freesound FAQ](https://freesound.org/help/faq/) (확인)
- Kenney 오디오 팩도 CC0일 가능성이 높지만 이번에 팩 페이지를 열어 보지 않았다(미확인).
- 소리 자체를 합성(oscillator + gain 엔벨로프)하면 외부 파일 없이 삑·펄스 계열을 만들 수 있다. EMP 효과음에 어울린다.

한글 폰트:
- Pretendard: SIL Open Font License 아래 배포되고 상업 이용·수정·재배포가 가능하다. 폰트 단독 판매만 금지. CDN은 jsDelivr 권장, 버전 v1.3.9 고정 예시, 가변 폰트는 `"Pretendard Variable"`, 다이내믹 서브셋도 있다. [GitHub](https://github.com/orioncactus/pretendard) (확인, OFL 버전 번호는 페이지에 없음). npm 패키지 `pretendard` 1.3.9, license `OFL-1.1` (npm view 실측).
- 오프라인·번들 대비로는 npm 패키지를 쓰고 woff2 서브셋만 로드하는 방식이 좋다.
- 3D 안의 한글 텍스트(칠판, 시험지)는 CanvasTexture로 그리거나 DOM 오버레이를 쓰는 편이 간단하다. 폰트 로딩은 `document.fonts.load()`로 기다린 뒤 텍스처를 만든다(일반 지식).

### B-6. 게임 디자인 참고: 관찰 → 증거 → 판단 루프

참고작에서 확인한 것:
- Papers, Please: 서류를 규칙집과 교차 확인하는 검사 루프가 중심이다. 하루 처리량으로 돈을 벌어 가족을 부양하고, 규정은 일일 공지로 늘어난다. 스크립트 사건과 무작위 만남을 섞고, 선택을 선·악으로 갈리지 않게 설계했으며 엔딩이 20개다. 오판 페널티(경고·벌금)의 구체 설계는 이번 조사에서 근거를 못 찾았다(미확인). [Game Developer](https://www.gamedeveloper.com/design/designing-the-bleak-genius-of-i-papers-please-i-) (확인)
- Return of the Obra Dinn: 이름·사인을 추측해 입력하고, 맞는 운명이 세 개 모이면 한꺼번에 확정해 준다(마지막 여섯은 둘씩). 이 방식은 "추측 찍기를 막기 위한 장치"로 소개된다. 오답 자체에 대한 벌칙은 기사에 없다. [Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn) (확인)
- Hitman: 변장은 같은 직군 NPC에게 가까이서 들킬 수 있고, Instinct 게이지로 "블렌드"해 넘기는 설계(Absolution). Blood Money는 목격자·카메라가 쌓는 평판 수치가 100이 되면 경비가 즉시 발포한다. 검색 결과 대부분이 플레이어 가이드와 포럼이라 세부 규칙은 신뢰도가 낮다. [검색 요약](https://www.techbloat.com/how-hitman-absolutions-disguises-instinct-and-notoriety-systems-work.html) (2차)

이 게임에 적용하는 제안 (설계 의견이며 위 자료에서 직접 나온 결론은 아님):
1. 루프: 관찰(시야 안 의심 동작 포착) → 증거 수집(단서 2~3개 쌓기, 하나는 약하고 둘 이상이면 강함) → 검사(금속·전파·질문) → 판단(적발/보류/통과).
2. 증거는 확정 단서와 의심 단서로 나눈다. 안경다리를 만지는 습관은 의심 단서, 검사에서 기기가 나오면 확정이다. 의심 단서만으로 적발하면 오판 위험이 올라간다.
3. 오판 페널티: 무고한 수험생을 적발하면 신뢰도·평판 감소, 반복되면 "민원 → 감사" 이벤트. 이 게임의 풍자 포인트(현실의 감독관 부담·배상책임 논의, A-1)와 맞는다.
4. 놓친 부정행위 페널티: 시험 끝에 사후 공개(CCTV 재생)로 "놓친 단서"를 보여 주어 배움이 생기게 한다.
5. EMP 남용: 게이지가 차면 쏠 수 있지만, 쏘면 범위 안의 의료기기 수험생이 영향을 받는 위험을 둔다. 앞의 A-3 결론에 따라 "다친다"보다 "신고·감사"를 기본 결과로 하는 것을 권한다.
6. 수험생 역할: 감독관 시야 원뿔(B-4)을 피해 행동하되, 고위험 행동일수록 의심 게이지가 빨리 찬다. 감독관과 같은 판정 코드를 재사용할 수 있다.
7. 힌트·피드백은 Obra Dinn식으로 묶어서 확정해 주면 찍기가 줄지만, 이 게임에서는 라운드 종료 시 일괄 결과 공개가 비슷한 효과를 낸다.

---

## 미확인·열지 못한 것 모음

- 전파법 현행 조문 원문(제29조·제58조·제82조·제84조의 현행 번호와 형량), 전파차단장치 인가 조문 번호
- 한국 수능 시험장 CCTV·금속탐지기 운용 근거
- 가오카오 시험장의 전파 차단·드론·안면인식
- EMP의 인슐린 펌프·보청기 영향, HDL-TR-2197 원문
- Poly Pizza 약관, Kenney 3D 사람 팩(Mini Characters)의 개별 라이선스, 각 팩의 실제 포맷·구성
- PointerLockControls 0.187.0 API 상세
- Papers, Please의 오판 페널티 설계 근거, Hitman 의심 게이지 공식 문서

## MVP 이후 기술 로드맵 제안

1. 에셋 교체: Quaternius Ultimate Furniture Pack + Universal Base Characters를 내려받아 실제 파일 구성을 확인하고, 박스 기반 임시 모델을 glTF로 바꾼다. 출처·라이선스 표를 함께 남긴다.
2. 판정 코드 분리: 시야 원뿔·가림 레이캐스트·게이지 누적을 하나의 모듈로 빼서 감독관 모드와 수험생 모드가 공유하게 한다. 순수 함수로 두면 `node --test`로 검증하기 쉽다.
3. 증거 시스템: 단서를 확정/의심으로 나누고, 판단 결과(적발/보류/통과)와 사후 리플레이(놓친 단서 공개)를 붙인다.
4. EMP 풍자 규칙: 의료기기 수험생 NPC를 몇 명 두고, 남용 시 "신고→감사" 이벤트가 나오게 한다. 현실 법 조문은 화면에 넣지 않는다.
5. 성능: 책상·의자부터 InstancedMesh로 바꾸고, 그림자 맵 크기와 NPC 수를 바꿔 가며 프레임을 실측한다. 목표 프레임은 팀이 정한다.
6. 사운드: Web Audio 합성음으로 게이지·EMP 효과음을 먼저 만들고, 필요한 것만 Freesound CC0로 보충한다.
7. 폰트: Pretendard를 npm 패키지로 번들하고 woff2 서브셋을 쓴다.
8. 조사 보강: 위 "미확인" 목록 중 전파법 현행 조문은 law.go.kr에서 텍스트를 직접 내려받아 확인한 뒤 이 문서를 고친다.
