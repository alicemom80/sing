// 한 번 열면 인터넷 없이도 열리도록 파일을 저장해 두는 서비스 워커
const CACHE = 'sing-outside-v10';
const CACHE_PREFIX = 'sing-outside-';   // 같은 주소의 다른 앱 캐시는 건드리지 않는다
const FILES = [
  './', 'index.html', 'manifest.json', 'css/style.css', 'fonts/Jua.woff2', 'libs/confetti.js',
  'js/app.config.js', 'js/data.js', 'js/scenes.js', 'js/core.js', 'js/games1.js', 'js/games2.js',
  'js/games3.js', 'js/stickers.js', 'js/parent.js', 'js/start.js', 'js/app.js', 'sounds/correct.mp3',
  'sounds/pop.mp3', 'sounds/sparkle.mp3', 'sounds/tap.mp3', 'sounds/try-again.mp3', 'sounds/win.mp3', 'icons/icon-192.png',
  'icons/icon-512.png', 'images/bg/beach.webp', 'images/bg/farm.webp', 'images/bg/forest.webp', 'images/bg/home.webp', 'images/bg/jobs.webp',
  'images/bg/land.webp', 'images/bg/nature.webp', 'images/bg/night.webp', 'images/bg/savanna.webp', 'images/bg/skywater.webp', 'images/bg/town.webp',
  'images/bg/weather.webp', 'images/airplane.webp', 'images/ambulance.webp', 'images/anchor.webp', 'images/artist.webp', 'images/bank.webp',
  'images/beach.webp', 'images/bicycle.webp', 'images/bigtruck.webp', 'images/builder.webp', 'images/bus.webp', 'images/busstop.webp',
  'images/butterfly.webp', 'images/cablecar.webp', 'images/cactus.webp', 'images/canoe.webp', 'images/car.webp', 'images/cart.webp',
  'images/castle.webp', 'images/church.webp', 'images/circustent.webp', 'images/cleaner.webp', 'images/cloud.webp', 'images/comet.webp',
  'images/cook.webp', 'images/delivery.webp', 'images/departmentstore.webp', 'images/detective.webp', 'images/doctor.webp', 'images/droplet.webp',
  'images/earth.webp', 'images/elephant.webp', 'images/factory.webp', 'images/factoryworker.webp', 'images/farmer.webp', 'images/ferry.webp',
  'images/firefighter.webp', 'images/firetruck.webp', 'images/fishingpole.webp', 'images/flower.webp', 'images/flyingsaucer.webp', 'images/fountain.webp',
  'images/fourleafclover.webp', 'images/frog.webp', 'images/gasstation.webp', 'images/girl.webp', 'images/goggles.webp', 'images/guard.webp',
  'images/hairdresser.webp', 'images/helicopter.webp', 'images/hospital.webp', 'images/hotel.webp', 'images/house.webp', 'images/ice.webp',
  'images/island.webp', 'images/kickscooter.webp', 'images/kite.webp', 'images/ladybug.webp', 'images/leaf.webp', 'images/lightning.webp',
  'images/mage.webp', 'images/mechanic.webp', 'images/metro.webp', 'images/minibus.webp', 'images/monorail.webp', 'images/moon.webp',
  'images/motorcycle.webp', 'images/mountain.webp', 'images/mountainrailway.webp', 'images/palmtree.webp', 'images/parachute.webp', 'images/photographer.webp',
  'images/pickuptruck.webp', 'images/pilot.webp', 'images/planet.webp', 'images/playground.webp', 'images/policecar.webp', 'images/policeofficer.webp',
  'images/postoffice.webp', 'images/racingcar.webp', 'images/rain.webp', 'images/rainbow.webp', 'images/rock.webp', 'images/rocket.webp',
  'images/rose.webp', 'images/sailboat.webp', 'images/satellite.webp', 'images/school.webp', 'images/scientist.webp', 'images/seedling.webp',
  'images/shell.webp', 'images/ship.webp', 'images/singer.webp', 'images/skateboard.webp', 'images/smallairplane.webp', 'images/snail.webp',
  'images/snow.webp', 'images/snowcloud.webp', 'images/snowman.webp', 'images/sparkles.webp', 'images/speedboat.webp', 'images/stadium.webp',
  'images/station.webp', 'images/store.webp', 'images/submarine.webp', 'images/sun.webp', 'images/sunflower.webp', 'images/taxi.webp',
  'images/teacher.webp', 'images/telescope.webp', 'images/tent.webp', 'images/thermometer.webp', 'images/tornado.webp', 'images/tractor.webp',
  'images/trafficlight.webp', 'images/train.webp', 'images/tree.webp', 'images/truck.webp', 'images/tulip.webp', 'images/turtle.webp',
  'images/volcano.webp', 'images/waterwave.webp', 'images/wind.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // 인터넷이 되면 최신 파일, 안 되면 저장해 둔 파일을 쓴다
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {   // 브라우저가 저장해 둔 옛 파일 대신 늘 새 파일을 확인한다
    if (res.ok && new URL(e.request.url).origin === location.origin) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match(e.request)));
});
