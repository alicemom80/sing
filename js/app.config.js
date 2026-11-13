// 앱마다 달라지는 값은 모두 여기 모은다. 새 앱을 만들 때 이 파일과 data.js, images/ 만 바꾼다.
// (index.html 의 제목, manifest.json 의 이름, sw.js 의 CACHE 이름은 따로 고친다)
window.A = window.A || {};

A.CONFIG = {
  // 화면에 보이는 앱 이름
  title: { ko: '씽씽 바깥세상 영어 놀이', en: 'Outside World', icon: '🚌' },
  // 기기에 저장하는 값의 이름표. 앱마다 달라야 서로 섞이지 않는다
  storagePrefix: 'sing-outside',
  // 시작 화면 (주인공은 기준그림 코끼리)
  start: {
    greeting: "Hello! Let's go outside!",   // ▶를 누르면 들려주는 인사
    hero: { id: 'elephant', en: 'elephant' },  // 가운데 주인공 그림 (images/<id>.webp)
  },
  // 하루 시간이 끝났을 때 잠드는 주인공 그림, 안내 문구
  lock: {
    image: 'images/elephant.webp',
    imageAlt: '잠든 코끼리',
    title: '오늘은 여기까지!',
    sub: '내일 또 만나요<br>See you tomorrow! Good night!',
    speech: 'See you tomorrow! Good night!',
    unlockSpeech: 'Welcome back!',
  },
  // 하루 놀이 시간 (분)
  playMinutes: { default: 15, more: 15 },
  // 보상 규칙 (기획서 6장): 게임 1회 별 1~3개, 별 10개마다 스티커 1장
  rewards: { maxStars: 3, starsPerSticker: 10 },
  // 모든 주제를 끝냈을 때 받는 특별 스티커
  special: { id: 'elephant', en: 'Super friend' },
  // 화면별 배경 그림 (images/bg/<이름>.webp). 주제 id 를 키로 쓴다
  // (임시: 지금은 기존 배경 5장을 재사용한다. 전용 배경이 생기면 이름만 바꾼다)
  backgrounds: {
    home: 'home', start: 'savanna',
    land: 'land', skywater: 'skywater', weather: 'weather', nature: 'nature', jobs: 'jobs', town: 'town',
  },
};

A.logoHtml = () => `${A.CONFIG.title.icon} ${A.CONFIG.title.ko} <small>${A.CONFIG.title.en}</small>`;
A.storageKey = (name) => `${A.CONFIG.storagePrefix}-${name}-v1`;
