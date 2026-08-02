/* hb.js —— 手册交互层：清单打勾、夜读模式、本册目录、回到顶部、册间导航。
   无依赖、无网络请求；StatiCrypt 解密后随册正常运行。 */
(function () {
  "use strict";

  /* localStorage 安全封装（隐私模式下可能抛错） */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* 夜读模式尽早置位，减少解密后首帧闪白 */
  if (lsGet("hb:theme") === "dark") document.documentElement.dataset.theme = "dark";

  var ORDER = [
    ["index.html", "封面"],
    ["roadtrip.html", "1 · 行程"],
    ["hotels.html", "2 · 住宿"],
    ["bookings.html", "3 · 预订与电话"],
    ["backup.html", "4 · 备用方案"],
    ["aurora.html", "5 · 极光"],
    ["budget.html", "6 · 预算"],
    ["knowledge.html", "7 · 自然读物"],
    ["culture.html", "8 · 人文读物"],
    ["fieldguide.html", "9 · 野外图鉴"],
    ["parks.html", "10 · 公园与城市"],
    ["map.html", "11 · 地图"]
  ];

  function pageName() {
    var seg = location.pathname.split("/").pop() || "index.html";
    return seg.replace(/\.html?$/i, "") || "index";
  }

  /* djb2 → 8 位十六进制：给清单项内容做指纹，内容改动或重排后旧勾自动失效 */
  function hash8(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return ("0000000" + h.toString(16)).slice(-8);
  }

  function init() {
    var page = pageName();
    var root = document.documentElement;

    /* ---------- a. 清单打勾 ---------- */
    var lists = document.querySelectorAll("ul.todo, ul.check, .spots");
    Array.prototype.forEach.call(lists, function (ul, listIdx) {
      Array.prototype.forEach.call(ul.children, function (li, liIdx) {
        if (li.tagName !== "LI" && !(li.classList && li.classList.contains("spot"))) return;
        var key = "hb:" + page + ":" + listIdx + ":" + liIdx + ":" +
                  hash8(li.textContent.trim());
        if (lsGet(key) === "1") li.classList.add("hb-done");
        li.addEventListener("click", function (e) {
          if (e.target.closest("a")) return; /* 项内链接照常工作 */
          if (li.classList.toggle("hb-done")) lsSet(key, "1");
          else lsDel(key);
        });
      });
    });

    /* ---------- b. 夜读模式开关 ---------- */
    var navIn = document.querySelector(".nav-in");
    if (navIn) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hb-theme";
      btn.setAttribute("aria-label", "夜读模式");
      var themeMeta = document.querySelector('meta[name="theme-color"]');
      var paint = function () {
        var dark = root.dataset.theme === "dark";
        btn.textContent = dark ? "☀" : "☾";
        /* 浏览器工具条跟着正文底色走，别停在密码页的夜空色上 */
        if (themeMeta) themeMeta.setAttribute("content", dark ? "#121b1e" : "#FAFCFC");
      };
      btn.addEventListener("click", function () {
        if (root.dataset.theme === "dark") {
          delete root.dataset.theme;
          lsSet("hb:theme", "light");
        } else {
          root.dataset.theme = "dark";
          lsSet("hb:theme", "dark");
        }
        paint();
      });
      paint();
      navIn.appendChild(btn);

      /* 当前册滚进视野中央：导航单行，窄屏时超出部分横向滚动 */
      var cur = navIn.querySelector("a.on");
      if (cur) {
        cur.setAttribute("aria-current", "page");
        if (navIn.scrollWidth > navIn.clientWidth) {
          navIn.scrollLeft = cur.offsetLeft - (navIn.clientWidth - cur.offsetWidth) / 2;
        }
      }
    }

    /* ---------- c. 本册目录 ---------- */
    var wrap = document.querySelector(".wrap");
    var header = wrap && wrap.querySelector("header");
    if (wrap && header) {
      var heads = wrap.querySelectorAll("h2");
      if (heads.length < 3) heads = wrap.querySelectorAll("h3");
      if (heads.length >= 3) {
        var det = document.createElement("details");
        det.className = "hb-toc";
        var sum = document.createElement("summary");
        sum.textContent = "本册目录";
        det.appendChild(sum);
        var tocNav = document.createElement("nav");
        Array.prototype.forEach.call(heads, function (h, i) {
          if (!h.id) h.id = "hb-s" + i;
          var a = document.createElement("a");
          a.href = "#" + h.id;
          a.textContent = h.textContent.trim();
          a.addEventListener("click", function (e) {
            e.preventDefault();
            det.open = false; /* 先收起再滚，落点才准 */
            h.scrollIntoView({ behavior: "smooth", block: "start" });
          });
          tocNav.appendChild(a);
        });
        det.appendChild(tocNav);
        header.insertAdjacentElement("afterend", det);
      }
    }

    /* ---------- d. 回到顶部 ---------- */
    var topBtn = document.createElement("button");
    topBtn.type = "button";
    topBtn.className = "hb-top";
    topBtn.textContent = "↑";
    topBtn.setAttribute("aria-label", "回到顶部");
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(topBtn);
    var onScroll = function () {
      topBtn.classList.toggle("show", window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ---------- e. 册间导航 ---------- */
    var footer = document.querySelector(".wrap footer") || document.querySelector("footer");
    var idx = -1;
    for (var i = 0; i < ORDER.length; i++) {
      if (ORDER[i][0] === page + ".html") { idx = i; break; }
    }
    if (footer && idx !== -1) {
      var bn = document.createElement("div");
      bn.className = "hb-booknav";
      var mk = function (vol, isPrev) {
        if (!vol) return document.createElement("span"); /* 占位，保持两端对齐 */
        var a = document.createElement("a");
        a.href = vol[0];
        a.textContent = isPrev ? "← 上一册 · " + vol[1] : "下一册 · " + vol[1] + " →";
        return a;
      };
      bn.appendChild(mk(idx > 0 ? ORDER[idx - 1] : null, true));
      bn.appendChild(mk(idx < ORDER.length - 1 ? ORDER[idx + 1] : null, false));
      footer.insertAdjacentElement("afterend", bn);
    }

    /* ---------- f. 地点反链：正文锚点（.loc[id]）→ 第十一册地图同一个点
       id 与 scripts/places.py 的 key 一一对应；map.html 收到 #key 会选中该点。 */
    var locs = document.querySelectorAll(".loc[id]");
    Array.prototype.forEach.call(locs, function (el) {
      var host = el;
      if (el.matches(".sched > div")) host = el.querySelector("span:last-of-type") || el;
      else if (el.matches("ul.check > li")) host = el.querySelector("span") || el;
      else if (el.querySelector("h3")) host = el.querySelector("h3");
      var a = document.createElement("a");
      a.className = "hb-loc";
      a.href = "map.html#" + el.id;
      a.textContent = "地图";
      a.setAttribute("aria-label", "在第十一册地图上看这个点");
      host.appendChild(a);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
/* Service Worker 注册 —— 仅 https 或 localhost；本地模板未填充时静默失败 */
if ("serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(function () {});
}
