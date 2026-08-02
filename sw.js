/* Service Worker 模板 —— 由 scripts/publish_pages.sh 生成最终文件：
   20260801200819 替换为发布时间戳，["./","./index.html","./roadtrip.html","./hotels.html","./bookings.html","./backup.html","./aurora.html","./budget.html","./knowledge.html","./style.css","./hb.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./img/alaska-purchase-check.jpg","./img/aurora-alaska-range.jpg","./img/aurora-red-green.jpg","./img/bald-eagle-fishing.jpg","./img/beluga-pod.jpg","./img/bull-moose.jpg","./img/caribou-denali.jpg","./img/columbia-glacier-aerial.jpg","./img/dall-sheep.jpg","./img/denali-highway.jpg","./img/denali-wonder-lake-reflection.jpg","./img/earthquake-fourth-ave-1964.jpg","./img/exit-glacier-harding-icefield.jpg","./img/grizzly-denali.jpg","./img/harding-icefield.jpg","./img/harding-presidential-train.jpg","./img/humpback-breach.jpg","./img/independence-mine.jpg","./img/keystone-canyon-horsetail-falls.jpg","./img/king-crab-dish.jpg","./img/matanuska-blue-ice.jpg","./img/matanuska-glacier.jpg","./img/prince-william-sound-iceberg.jpg","./img/reindeer-sausage.jpg","./img/resurrection-bay-seward.jpg","./img/ruth-glacier-aerial.jpg","./img/savage-river-autumn-tundra.jpg","./img/sea-otter.jpg","./img/sockeye-fillet.jpg","./img/sockeye-spawning-run.jpg","./img/talkeetna-main-street.jpg","./img/thompson-pass.jpg","./img/trans-alaska-pipeline.jpg","./img/turnagain-arm.jpg","./img/valdez-harbor.jpg","./img/willow-ptarmigan.jpg","./img/worthington-glacier.jpg"] 替换为预缓存清单（JSON 数组）。
   策略：同源 GET 缓存优先，网络回填；导航请求双双落空时回退到缓存的封面。 */
const VERSION = "20260801200819";
const CACHE = "alaska-handbook-" + VERSION;
const ASSETS = ["./","./index.html","./roadtrip.html","./hotels.html","./bookings.html","./backup.html","./aurora.html","./budget.html","./knowledge.html","./style.css","./hb.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./img/alaska-purchase-check.jpg","./img/aurora-alaska-range.jpg","./img/aurora-red-green.jpg","./img/bald-eagle-fishing.jpg","./img/beluga-pod.jpg","./img/bull-moose.jpg","./img/caribou-denali.jpg","./img/columbia-glacier-aerial.jpg","./img/dall-sheep.jpg","./img/denali-highway.jpg","./img/denali-wonder-lake-reflection.jpg","./img/earthquake-fourth-ave-1964.jpg","./img/exit-glacier-harding-icefield.jpg","./img/grizzly-denali.jpg","./img/harding-icefield.jpg","./img/harding-presidential-train.jpg","./img/humpback-breach.jpg","./img/independence-mine.jpg","./img/keystone-canyon-horsetail-falls.jpg","./img/king-crab-dish.jpg","./img/matanuska-blue-ice.jpg","./img/matanuska-glacier.jpg","./img/prince-william-sound-iceberg.jpg","./img/reindeer-sausage.jpg","./img/resurrection-bay-seward.jpg","./img/ruth-glacier-aerial.jpg","./img/savage-river-autumn-tundra.jpg","./img/sea-otter.jpg","./img/sockeye-fillet.jpg","./img/sockeye-spawning-run.jpg","./img/talkeetna-main-street.jpg","./img/thompson-pass.jpg","./img/trans-alaska-pipeline.jpg","./img/turnagain-arm.jpg","./img/valdez-harbor.jpg","./img/willow-ptarmigan.jpg","./img/worthington-glacier.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll 一票否决：任何一项失败整批失败。失败时退回逐个抓取，
      // 容忍个别资源缺席，保证手册主体照常离线可用。
      cache.addAll(ASSETS).catch(() =>
        Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // 运行时缓存：网络成功的响应顺手存起来，下次离线也有
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch((err) => {
        // 完全离线且缓存未命中：页面导航退回封面，其余资源照常失败
        if (req.mode === "navigate") {
          return caches.match("./index.html").then((page) => {
            if (page) return page;
            throw err;
          });
        }
        throw err;
      });
    })
  );
});
