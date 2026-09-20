(() => {
  "use strict";

  const USERNAME = "fantuanmtf";
  const API_USER = "https://api.github.com/users/" + USERNAME;
  const API_REPOS = "https://api.github.com/users/" + USERNAME + "/repos?per_page=100&sort=pushed";
  const CACHE_KEY = "fantuanmtf.home.cache.v1";
  const TTL = 10 * 60 * 1000;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const RING_RADIUS = 38;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LANG_COLORS = {
    Rust: "#d99a63",
    Python: "#5b8fc9",
    C: "#8f8f8f",
    "C++": "#e07a9a",
    Shell: "#8bc98b",
    JavaScript: "#e3cf62",
    TypeScript: "#6f9fdc",
    HTML: "#e09a72",
    Makefile: "#c9a1e0"
  };

  const PHRASES = [
    "今天在摸鱼",
    "正在研究 Tor",
    "在 I2P 里迷路了",
    "正在编译 Gentoo",
    "给内核打补丁中",
    "香香软软地写 Rust",
    "正在翻匿名网络论文",
    "又在折腾 Arch",
    "正在和 C 指针搏斗",
    "随机播放中",
    "Gentoo被Freenet OOM了",
    "被 Tor 从I2P带走了",
    "不小心用Rust写了个内存泄漏",
    "被Ubuntu Server恶心到了",
    "正在和对象亲亲抱抱",
    "正在变成女生",
    "正在看尼古喵喵",
    "正在刷视频摸鱼"
  ];

  const FALLBACK = {
    at: 0,
    user: { public_repos: 4, followers: 7, following: 3 },
    repos: [
      {
        name: "fantuan-kernel",
        url: "https://github.com/" + USERNAME + "/fantuan-kernel",
        description: "A kernel that looks like a kernel.",
        language: "Rust",
        stars: 2,
        pushedAt: 0
      },
      {
        name: "Chrono-shift",
        url: "https://github.com/" + USERNAME + "/Chrono-shift",
        description: "一个 DC-Net 的小工具",
        language: "Rust",
        stars: 0,
        pushedAt: 0
      },
      {
        name: "Draft-of-an-Anonymity-Breaking-Toy-for-Anonymous-Networks",
        url: "https://github.com/" + USERNAME + "/Draft-of-an-Anonymity-Breaking-Toy-for-Anonymous-Networks",
        description: "匿名网络相关的随手项目",
        language: "Python",
        stars: 0,
        pushedAt: 0
      },
      {
        name: "fantuanmtf",
        url: "https://github.com/" + USERNAME + "/fantuanmtf",
        description: "个人主页与资料",
        language: "",
        stars: 0,
        pushedAt: 0
      }
    ]
  };

  const $ = (selector) => document.querySelector(selector);

  function mapRepo(repo) {
    return {
      name: repo.name,
      url: repo.html_url,
      description: repo.description || "",
      language: repo.language || "",
      stars: repo.stargazers_count || 0,
      pushedAt: repo.pushed_at ? Date.parse(repo.pushed_at) : 0
    };
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function relTime(ts) {
    if (!ts) return "—";
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return "刚刚";
    if (s < 3600) return Math.floor(s / 60) + " 分钟前";
    if (s < 86400) return Math.floor(s / 3600) + " 小时前";
    if (s < 86400 * 30) return Math.floor(s / 86400) + " 天前";
    if (s < 86400 * 365) return Math.floor(s / (86400 * 30)) + " 个月前";
    return Math.floor(s / (86400 * 365)) + " 年前";
  }

  function elapsed(ts) {
    if (!ts) return "暂无记录";
    const total = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (d) parts.push(d + " 天");
    if (d || h) parts.push(h + " 小时");
    parts.push(m + " 分");
    parts.push(s + " 秒");
    return parts.join(" ");
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.repos)) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      /* 存储不可用时忽略 */
    }
  }

  function tick() {
    document.querySelectorAll("[data-ts]").forEach((el) => {
      const ts = Number(el.dataset.ts) || 0;
      const fmt = el.dataset.fmt;
      if (fmt === "full") el.textContent = elapsed(ts);
      else if (fmt === "rel") el.textContent = relTime(ts);
      else if (fmt === "date") el.textContent = formatDate(ts);
    });
  }

  function setSince(ts, repoName) {
    const big = $("#since-last");
    const hint = $("#since-hint");
    if (big) {
      big.dataset.ts = String(ts || 0);
      big.dataset.fmt = "full";
      big.textContent = elapsed(ts);
    }
    if (hint) {
      hint.textContent = ts
        ? "最后一次提交：" + formatDate(ts) + (repoName ? " · " + repoName : "")
        : "还没有读到提交记录";
    }
  }

  function countUp(el, to, duration, suffix) {
    if (!el) return;
    const tail = suffix || "";
    const target = Number(to);
    if (!isFinite(target)) {
      el.textContent = "—";
      return;
    }
    const from = Number(el.dataset.value || 0);
    el.dataset.value = String(target);
    if (REDUCE_MOTION || from === target) {
      el.textContent = target + tail;
      return;
    }
    const start = performance.now();
    const dur = duration || 1300;
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (target - from) * eased) + tail;
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function renderOverview(data) {
    const user = data.user || {};
    const repos = data.repos || [];
    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);

    countUp($("#stat-repos"), user.public_repos != null ? user.public_repos : repos.length);
    countUp($("#stat-stars"), totalStars);

    const followerEl = $("#stat-followers");
    if (user.followers == null) {
      if (followerEl) followerEl.textContent = "—";
    } else {
      countUp(followerEl, user.followers);
    }
  }

  let ringTargets = [];
  let ringsObserver = null;

  function animateRings() {
    ringTargets.forEach((item) => {
      item.circle.style.strokeDashoffset = String(item.offset);
      countUp(item.valueEl, item.pct, 1500, "%");
    });
    ringTargets = [];
  }

  function observeRings() {
    const list = $("#langs");
    if (!list) return;
    if (!ringTargets.length) return;
    if (REDUCE_MOTION) {
      animateRings();
      return;
    }
    if (!ringsObserver) {
      ringsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateRings();
            if (ringsObserver) {
              ringsObserver.disconnect();
              ringsObserver = null;
            }
          }
        });
      }, { threshold: 0.3 });
    }
    ringsObserver.observe(list);
  }

  function renderLangs(repos) {
    const list = $("#langs");
    if (!list) return;
    list.textContent = "";
    ringTargets = [];
    if (ringsObserver) {
      ringsObserver.disconnect();
      ringsObserver = null;
    }

    const counts = new Map();
    repos.forEach((repo) => {
      if (!repo.language) return;
      counts.set(repo.language, (counts.get(repo.language) || 0) + 1);
    });

    const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
    if (!total) {
      const li = document.createElement("li");
      li.className = "lang-empty";
      li.textContent = "暂时没有语言数据";
      list.appendChild(li);
      return;
    }

    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        const pct = Math.round((count / total) * 100);
        const li = document.createElement("li");
        li.className = "lang-ring";

        const wrap = document.createElement("div");
        wrap.className = "ring-wrap";

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 90 90");
        svg.setAttribute("class", "ring");
        svg.setAttribute("aria-hidden", "true");

        const track = document.createElementNS(SVG_NS, "circle");
        track.setAttribute("cx", "45");
        track.setAttribute("cy", "45");
        track.setAttribute("r", String(RING_RADIUS));
        track.setAttribute("class", "ring-track");

        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", "45");
        circle.setAttribute("cy", "45");
        circle.setAttribute("r", String(RING_RADIUS));
        circle.setAttribute("class", "ring-progress");
        circle.setAttribute("stroke", LANG_COLORS[lang] || "#b79ce8");
        circle.setAttribute("stroke-dasharray", String(RING_CIRCUMFERENCE));
        circle.setAttribute("stroke-dashoffset", String(RING_CIRCUMFERENCE));

        svg.append(track, circle);

        const value = document.createElement("div");
        value.className = "ring-value";
        value.textContent = "0%";

        wrap.append(svg, value);

        const label = document.createElement("span");
        label.className = "ring-lang";
        label.textContent = lang;

        li.append(wrap, label);
        list.appendChild(li);

        ringTargets.push({
          circle,
          valueEl: value,
          offset: RING_CIRCUMFERENCE * (1 - pct / 100),
          pct
        });
      });

    observeRings();
  }

  function renderTable(repos) {
    const tbody = $("#repo-table");
    if (!tbody) return;
    tbody.textContent = "";

    if (!repos.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "table-empty";
      td.textContent = "暂时没有仓库数据";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    repos.forEach((repo) => {
      const tr = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.className = "repo-name";
      const link = document.createElement("a");
      link.href = repo.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = repo.name;
      if (repo.description) link.title = repo.description;
      nameCell.appendChild(link);

      const langCell = document.createElement("td");
      if (repo.language) {
        const dot = document.createElement("span");
        dot.className = "lang-dot";
        dot.style.background = LANG_COLORS[repo.language] || "#c9b2f0";
        langCell.append(dot, document.createTextNode(repo.language));
      } else {
        langCell.textContent = "—";
      }

      const starCell = document.createElement("td");
      starCell.textContent = repo.stars;

      const dateCell = document.createElement("td");
      dateCell.dataset.ts = String(repo.pushedAt || 0);
      dateCell.dataset.fmt = "date";
      dateCell.textContent = formatDate(repo.pushedAt);

      const relCell = document.createElement("td");
      relCell.dataset.ts = String(repo.pushedAt || 0);
      relCell.dataset.fmt = "rel";
      relCell.textContent = relTime(repo.pushedAt);

      tr.append(nameCell, langCell, starCell, dateCell, relCell);
      tbody.appendChild(tr);
    });
  }

  function render(data, offline) {
    renderOverview(data);
    renderLangs(data.repos || []);
    renderTable(data.repos || []);

    const latest = (data.repos || []).reduce(
      (best, repo) => (repo.pushedAt > best.pushedAt ? repo : best),
      { pushedAt: 0, name: "" }
    );
    setSince(latest.pushedAt, latest.name);

    const stamp = $("#updated-at");
    if (stamp) {
      if (data.at) {
        const time = new Date(data.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        stamp.textContent = "更新于 " + time + (offline ? " · 离线数据" : "");
      } else {
        stamp.textContent = offline ? "离线数据" : "";
      }
    }
    tick();
  }

  function setNote(text) {
    const note = $("#data-note");
    if (note) note.textContent = text || "";
  }

  function fetchJSON(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
  }

  async function load(force) {
    const button = $("#refresh");
    const cached = readCache();

    if (!force && cached && Date.now() - cached.at < TTL) {
      render(cached, false);
      setNote("");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "刷新中";
    }

    try {
      const responses = await Promise.all([fetchJSON(API_USER), fetchJSON(API_REPOS)]);
      if (!responses[0].ok) throw new Error("user " + responses[0].status);
      if (!responses[1].ok) throw new Error("repos " + responses[1].status);

      const user = await responses[0].json();
      const repos = await responses[1].json();
      if (!Array.isArray(repos)) throw new Error("bad repos payload");

      const data = {
        at: Date.now(),
        user: {
          public_repos: user.public_repos,
          followers: user.followers,
          following: user.following
        },
        repos: repos
          .filter((repo) => !repo.fork)
          .map(mapRepo)
          .sort((a, b) => b.pushedAt - a.pushedAt)
      };

      writeCache(data);
      render(data, false);
      setNote("");
    } catch (err) {
      if (cached) {
        render(cached, true);
        setNote("GitHub API 暂时不可用，显示的是最近一次缓存。");
      } else {
        render(FALLBACK, true);
        setNote("GitHub API 暂时不可用，当前显示的是内置数据。");
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "刷新";
      }
    }
  }

  function startTyping() {
    const el = $("#typing");
    if (!el) return;

    let last = "";
    const pick = () => {
      let phrase = PHRASES[0];
      do {
        phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
      } while (PHRASES.length > 1 && phrase === last);
      last = phrase;
      return phrase;
    };

    if (REDUCE_MOTION) {
      el.textContent = pick();
      return;
    }

    let target = pick();
    let index = 0;
    let deleting = false;

    const step = () => {
      if (!deleting) {
        index += 1;
        el.textContent = target.slice(0, index);
        if (index >= target.length) {
          deleting = true;
          setTimeout(step, 2200);
          return;
        }
        setTimeout(step, 90 + Math.random() * 60);
        return;
      }
      index -= 1;
      el.textContent = target.slice(0, index);
      if (index <= 0) {
        deleting = false;
        target = pick();
        setTimeout(step, 420);
        return;
      }
      setTimeout(step, 40);
    };

    setTimeout(step, 500);
  }

  function setupNavigation() {
    const sections = Array.from(document.querySelectorAll("[data-section]"));
    const segButtons = Array.from(document.querySelectorAll(".seg-btn"));
    const arcItems = Array.from(document.querySelectorAll(".arc-item"));
    const thumb = document.querySelector(".segmented-thumb");
    const ARC_STEP = 27;
    let activeId = "";

    function setActive(id) {
      if (!id || id === activeId) return;
      activeId = id;

      const activeBtn = segButtons.find((btn) => btn.dataset.target === id);
      segButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === id));
      if (thumb && activeBtn) {
        thumb.style.width = activeBtn.offsetWidth + "px";
        thumb.style.transform = "translateX(" + activeBtn.offsetLeft + "px)";
      }

      const index = arcItems.findIndex((item) => item.dataset.target === id);
      const center = index < 0 ? 0 : index;
      arcItems.forEach((item, i) => {
        const angle = (i - center) * ARC_STEP;
        item.classList.toggle("active", i === center);
        item.style.transform = "rotate(" + angle + "deg) translateX(-150px) rotate(" + -angle + "deg)";
      });
    }

    function updateFromScroll() {
      const probe = window.scrollY + window.innerHeight * 0.32;
      let current = sections.length ? sections[0].id : "";
      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top + window.scrollY;
        if (top <= probe) current = section.id;
      });
      setActive(current);
    }

    document.querySelectorAll("[data-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        if (!target) return;
        target.scrollIntoView({ behavior: REDUCE_MOTION ? "auto" : "smooth", block: "start" });
      });
    });

    let scheduled = false;
    window.addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        updateFromScroll();
      });
    }, { passive: true });

    window.addEventListener("resize", () => {
      const current = activeId;
      activeId = "";
      setActive(current || (sections[0] ? sections[0].id : ""));
    });

    setActive(sections.length ? sections[0].id : "");
    updateFromScroll();
  }

  function setupReveal() {
    const cards = Array.from(document.querySelectorAll(".card"));
    if (!cards.length || REDUCE_MOTION) return;

    cards.forEach((card, i) => {
      card.classList.add("reveal");
      card.style.setProperty("--d", Math.min(i * 55, 320) + "ms");
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

    cards.forEach((card) => observer.observe(card));
  }

  const refreshButton = $("#refresh");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => load(true));
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load(false);
  });

  setInterval(() => load(false), TTL);
  setInterval(tick, 1000);

  setupNavigation();
  setupReveal();
  startTyping();
  load(false);
})();
