export default async function run(page, ui) {
  const BASE = "http://localhost:3000";
  const routes = ["/tools", "/tools/developer", "/tools/developer/json"];
  const widths = [1280, 768, 360];
  const report = [];

  const collect = async () => await page.evaluate(() => {
    const out = { overflow: null, tinted: [], gutters: [], lists: {}, fonts: null, notes: [] };
    const doc = document.scrollingElement;
    out.overflow = { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, horizontalScroll: doc.scrollWidth > window.innerWidth + 1 };

    const props = ["color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor", "textDecorationColor"];
    const seen = new Set();
    for (const el of document.querySelectorAll("body *")) {
      const inlineTint = el.style && (el.style.color || el.style.backgroundColor);
      if (inlineTint) continue;
      const s = getComputedStyle(el);
      for (const p of props) {
        const v = s[p];
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v);
        if (!m) continue;
        const r = +m[1], g = +m[2], b = +m[3];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max - min > 6) {
          const key = `${v}|${el.tagName}.${String(el.className).slice(0, 40)}|${p}`;
          if (!seen.has(key)) { seen.add(key); out.tinted.push({ el: `${el.tagName}.${String(el.className).slice(0, 60)}`, p, v }); }
        }
      }
    }

    const gs = [...document.querySelectorAll(".page-gutter")];
    out.gutters = gs.map((g) => { const s = getComputedStyle(g); return { display: s.display, width: Math.round(g.getBoundingClientRect().width) }; });

    const listSelectors = [".tool-list", ".popular-grid", ".categories-grid", ".tool-grid", ".difference-grid", ".search-results"];
    for (const sel of listSelectors) {
      const nodes = [...document.querySelectorAll(`${sel} a[href]`)];
      if (!nodes.length) continue;
      const hrefs = nodes.map((a) => a.getAttribute("href"));
      const dupes = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
      out.lists[sel] = { count: hrefs.length, dupes: [...new Set(dupes)] };
    }

    out.fonts = {
      instrumentSans600: document.fonts.check('600 16px "Instrument Sans"'),
      instrumentSans400: document.fonts.check('400 16px "Instrument Sans"'),
      dmMono400: document.fonts.check('400 12px "DM Mono"'),
      bodyFamily: getComputedStyle(document.body).fontFamily,
      h1Family: document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).fontFamily : null,
    };
    return out;
  });

  for (const route of routes) {
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(BASE + route, { waitUntil: "load" });
      await page.waitForTimeout(400);
      const r = await collect();
      report.push({ route, w, ...r });
    }
  }

  // Homepage specifics
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + "/tools", { waitUntil: "load" });
  const home = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const soonCells = [...document.querySelectorAll(".category-soon")];
    return {
      countTag: q(".home-hero .tag")?.textContent,
      browseAll: q(".browse-all-cell h3")?.textContent,
      popularChildren: q(".popular-grid")?.children.length,
      soonCount: soonCells.length,
      soonAreLinks: soonCells.some((c) => c.tagName === "A"),
      soonLabels: soonCells.map((c) => c.lastElementChild?.textContent),
      toolListCount: document.querySelectorAll(".tool-list a").length,
      toolListUnique: new Set([...document.querySelectorAll(".tool-list a")].map((a) => a.getAttribute("href"))).size,
      h1SpanColor: getComputedStyle(q(".home-hero h1 span")).color,
      headerHeight: Math.round(q(".site-header").getBoundingClientRect().height),
      headerLogoBg: getComputedStyle(q(".brand")).backgroundColor,
      footerLinks: [...document.querySelectorAll(".footer-links a")].map((a) => a.textContent),
      searchBtnBg: getComputedStyle(q(".search-submit")).backgroundColor,
      cellCount: document.querySelectorAll(".difference-grid .cell").length,
      dotShapes: [...document.querySelectorAll(".dot-shape")].map((d) => d.className),
      hatchBandH: Math.round(q(".hatch-band")?.getBoundingClientRect().height || 0),
    };
  });

  // Search behaviour: type, check cells, Enter opens top result
  await page.click("#tool-search");
  await page.type("#tool-search", "base64", { delay: 20 });
  await page.waitForTimeout(300);
  const searchOpen = await page.evaluate(() => {
    const results = [...document.querySelectorAll(".search-results .search-result")];
    return {
      count: results.length,
      hrefs: results.map((r) => r.getAttribute("href")),
      dupes: results.map((r) => r.getAttribute("href")).filter((h, i, a) => a.indexOf(h) !== i),
      bg: results[0] ? getComputedStyle(results[0]).backgroundColor : null,
      fieldBorder: getComputedStyle(document.querySelector(".search-box")).borderColor,
    };
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const enterUrl = page.url();

  await page.goto(BASE + "/tools", { waitUntil: "load" });
  await page.click("#tool-search");
  await page.type("#tool-search", "zzzznothing", { delay: 20 });
  await page.waitForTimeout(300);
  const emptyMsg = await page.textContent(".search-empty").catch(() => null);

  return { report, home, searchOpen, enterUrl, emptyMsg };
}
