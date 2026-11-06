// 단어 데이터: [그림 파일 이름, 영어, 한글]
// 출처: 앱/씽씽바깥세상/기획서.md 3장 (테마와 단어), 5장 (테마별 게임 배정)
// 한 줄이 묶음 하나(5개)다. 주제 하나에 단어 5의 배수를 넣는 것이 원칙이다. 지금은 주제 6개 × 20개 = 120개.
// games: 모든 주제가 같은 게임 8개를 같은 순서로 쓴다 (기획서 5장).
// mission: 놀이 끝에 보여 주는 화면 밖 미션 (기획서 6장).
window.A = window.A || {};

// 모든 주제가 같은 게임 8개를 같은 순서로 쓴다 (카드는 맨 위, 묻고 답하기는 맨 아래 가로 한 줄)
const ALL_GAMES = [
  ['card', 1], ['pick', 1], ['balloon', 1], ['match', 1],
  ['ox', 2], ['scratch', 2], ['maze', 3], ['qa', 3],
];

// 복수형 단어: "These are ..." 로 말한다 (기획서 4-3장)
const PLURAL_IDS = new Set(['goggles', 'sparkles']);

// 관사(a/an)를 붙이지 않는 단어: 셀 수 없는 말 ("This is rain.")
const NO_ART_IDS = new Set(['rain', 'snow', 'ice', 'lightning', 'wind']);
// 관사 대신 다른 말을 붙이는 단어 ("This is the earth.")
const ART_OVERRIDE = { earth: 'the' };

const TRANSPORT_MISSION = '오늘 밖에서 본 탈것 이름을 영어로 말해 보기';
const WEATHER_MISSION = '오늘 본 날씨를 영어로 말해 보기';
const NATURE_MISSION = '오늘 밖에서 본 나무나 꽃 이름을 영어로 말해 보기';
const JOBS_MISSION = '오늘 본 사람이 하는 일을 영어로 말해 보기';
const TOWN_MISSION = '오늘 간 곳 이름을 영어로 말해 보기';

A.THEMES = [
  { id: 'land', ko: '땅 위 탈것', en: 'Land Vehicles', icon: '🚗', cover: 'car', color: '#ffe3a3',
    games: ALL_GAMES,
    mission: TRANSPORT_MISSION,
    words: [
      ['car', 'car', '자동차'], ['bus', 'bus', '버스'], ['train', 'train', '기차'], ['bicycle', 'bicycle', '자전거'], ['firetruck', 'fire truck', '소방차'],
      ['ambulance', 'ambulance', '구급차'], ['truck', 'truck', '트럭'], ['taxi', 'taxi', '택시'], ['policecar', 'police car', '경찰차'], ['tractor', 'tractor', '트랙터'],
      ['motorcycle', 'motorcycle', '오토바이'], ['skateboard', 'skateboard', '스케이트보드'], ['kickscooter', 'kick scooter', '킥보드'], ['pickuptruck', 'pickup truck', '픽업트럭'], ['racingcar', 'racing car', '레이싱카'],
      ['minibus', 'minibus', '미니버스'], ['metro', 'metro', '지하철'], ['monorail', 'monorail', '모노레일'], ['mountainrailway', 'cog train', '산악열차'], ['bigtruck', 'big truck', '큰 트럭'],
    ] },
  { id: 'skywater', ko: '하늘·물 탈것', en: 'Sky & Water', icon: '✈️', cover: 'airplane', color: '#c9dcff',
    games: ALL_GAMES,
    mission: TRANSPORT_MISSION,
    words: [
      ['airplane', 'airplane', '비행기'], ['helicopter', 'helicopter', '헬리콥터'], ['rocket', 'rocket', '로켓'], ['ship', 'ship', '큰 배'], ['sailboat', 'sailboat', '요트'],
      ['anchor', 'anchor', '닻'], ['canoe', 'canoe', '카누'], ['parachute', 'parachute', '낙하산'], ['kite', 'kite', '연'], ['satellite', 'satellite', '인공위성'],
      ['flyingsaucer', 'flying saucer', '비행접시'], ['submarine', 'submarine', '잠수함'], ['goggles', 'goggles', '물안경'], ['fishingpole', 'fishing pole', '낚싯대'], ['speedboat', 'speedboat', '스피드보트'],
      ['ferry', 'ferry', '여객선'], ['smallairplane', 'small airplane', '경비행기'], ['cablecar', 'cable car', '케이블카'], ['shell', 'shell', '조개'], ['beach', 'beach', '바닷가'],
    ] },
  { id: 'weather', ko: '하늘·날씨', en: 'Sky & Weather', icon: '☀️', cover: 'sun', color: '#e3d1ff',
    games: ALL_GAMES,
    mission: WEATHER_MISSION,
    words: [
      ['sun', 'sun', '해'], ['moon', 'moon', '달'], ['cloud', 'cloud', '구름'], ['rain', 'rain', '비'], ['snow', 'snow', '눈송이'],
      ['snowman', 'snowman', '눈사람'], ['rainbow', 'rainbow', '무지개'], ['thermometer', 'thermometer', '온도계'], ['waterwave', 'water wave', '파도'], ['lightning', 'lightning', '번개'],
      ['droplet', 'water drop', '물방울'], ['planet', 'planet', '행성'], ['ice', 'ice', '얼음'], ['tornado', 'tornado', '회오리바람'], ['comet', 'comet', '혜성'],
      ['snowcloud', 'snow cloud', '눈구름'], ['wind', 'wind', '바람'], ['earth', 'earth', '지구'], ['telescope', 'telescope', '망원경'], ['sparkles', 'sparkles', '반짝임'],
    ] },
  { id: 'nature', ko: '자연·식물', en: 'Nature & Plants', icon: '🌳', cover: 'tree', color: '#c9ebc3',
    games: ALL_GAMES,
    mission: NATURE_MISSION,
    words: [
      ['tree', 'tree', '나무'], ['palmtree', 'palm tree', '야자나무'], ['cactus', 'cactus', '선인장'], ['rose', 'rose', '장미'], ['sunflower', 'sunflower', '해바라기'],
      ['tulip', 'tulip', '튤립'], ['flower', 'flower', '꽃'], ['leaf', 'leaf', '잎'], ['mountain', 'mountain', '산'], ['fourleafclover', 'clover', '네잎클로버'],
      ['island', 'island', '섬'], ['rock', 'rock', '돌'], ['tent', 'tent', '텐트'], ['butterfly', 'butterfly', '나비'], ['frog', 'frog', '개구리'],
      ['turtle', 'turtle', '거북이'], ['snail', 'snail', '달팽이'], ['seedling', 'seedling', '모종'], ['volcano', 'volcano', '화산'], ['ladybug', 'ladybug', '무당벌레'],
    ] },
  { id: 'jobs', ko: '직업', en: 'Jobs', icon: '👩‍🏫', cover: 'teacher', color: '#ffd1d1',
    games: ALL_GAMES,
    mission: JOBS_MISSION,
    words: [
      ['teacher', 'teacher', '선생님'], ['doctor', 'doctor', '의사'], ['firefighter', 'firefighter', '소방관'], ['policeofficer', 'police officer', '경찰'], ['cook', 'cook', '요리사'],
      ['pilot', 'pilot', '조종사'], ['farmer', 'farmer', '농부'], ['scientist', 'scientist', '과학자'], ['detective', 'detective', '탐정'], ['builder', 'builder', '공사 일꾼'],
      ['singer', 'singer', '가수'], ['guard', 'guard', '경비원'], ['factoryworker', 'worker', '공장 일꾼'], ['artist', 'artist', '화가'], ['cleaner', 'cleaner', '청소부'],
      ['hairdresser', 'hairdresser', '미용사'], ['mechanic', 'mechanic', '정비공'], ['delivery', 'delivery', '배달원'], ['photographer', 'photographer', '사진작가'], ['mage', 'mage', '마법사'],
    ] },
  { id: 'town', ko: '동네 장소', en: 'Town Places', icon: '🏠', cover: 'house', color: '#ffd3b0',
    games: ALL_GAMES,
    mission: TOWN_MISSION,
    words: [
      ['house', 'house', '집'], ['school', 'school', '학교'], ['hospital', 'hospital', '병원'], ['store', 'store', '가게'], ['departmentstore', 'big store', '백화점'],
      ['postoffice', 'post office', '우체국'], ['hotel', 'hotel', '호텔'], ['factory', 'factory', '공장'], ['castle', 'castle', '성'], ['station', 'station', '기차역'],
      ['trafficlight', 'traffic light', '신호등'], ['circustent', 'circus tent', '서커스 천막'], ['busstop', 'bus stop', '버스 정류장'], ['gasstation', 'gas station', '주유소'], ['stadium', 'stadium', '경기장'],
      ['church', 'church', '교회'], ['playground', 'playground', '놀이터'], ['fountain', 'fountain', '분수'], ['bank', 'bank', '은행'], ['cart', 'cart', '카트'],
    ] },
];

// 5개씩 묶음으로 나누기 (기획서: 주제 하나는 묶음 4개)
A.GROUP_SIZE = 5;
A.THEMES.forEach(t => {
  t.words = t.words.map(([id, en, ko]) => ({
    id, en, ko, say: en,
    art: NO_ART_IDS.has(id) ? '' : (ART_OVERRIDE[id] ?? (/^[aeiou]/i.test(en) ? 'an' : 'a')),
    plural: PLURAL_IDS.has(id),
  }));
  t.groups = [];
  for (let i = 0; i < t.words.length; i += A.GROUP_SIZE) {
    t.groups.push(t.words.slice(i, i + A.GROUP_SIZE));
  }
});
