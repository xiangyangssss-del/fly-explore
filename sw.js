// 离线缓存:同源文件“先给缓存(秒开、断网也能开),同时去网上拿新的更新缓存”;Google 字体拿到一次就一直用缓存。
// a9e1681917 由 build_explore.py 按内容哈希填,内容一变就是新缓存,旧的在 activate 时删掉。
const CACHE = "fly-a9e1681917", FONTS = "fonts-v1", LIBS = "libs-v1";
// 3D 画面用的 three.js(cdnjs,网址里钉死了版本 ⇒ 内容永远不变,缓存一次就一直用)。装 App 时顺手存一份,失败也不影响安装
const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
              "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png"];
// 装新版时绕过浏览器的 HTTP 缓存(GitHub Pages 会让文件缓存 10 分钟,不绕开的话新版缓存里可能装进旧文件)
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
  e.waitUntil(caches.open(LIBS).then(async c => { if (!(await c.match(THREE_URL))){ const r = await fetch(THREE_URL, { mode: "cors" }); if (r.ok) await c.put(THREE_URL, r); } }).catch(() => {})); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k.startsWith("fly-") && k !== CACHE).map(k => caches.delete(k))))
  .then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin){
    e.respondWith(caches.open(CACHE).then(async c => {
      const key = req.mode === "navigate" ? "./index.html" : req;
      const hit = await c.match(key, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
      if (hit){ e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    }));
  } else if (url.hostname === "cdnjs.cloudflare.com"){
    e.respondWith(caches.open(LIBS).then(async c => { const hit = await c.match(req.url); if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req.url, r.clone()); return r; } catch (err) { return Response.error(); } }));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(caches.open(FONTS).then(async c => { const hit = await c.match(req); if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; } catch (err) { return Response.error(); } }));
  }
});
