export default async function run(page, ui) {
  const BASE = "http://localhost:3000";
  const widths = [1280, 768, 360];
  const routes = ["/tools", "/tools/developer", "/tools/developer/json"];
  const report = [];
  for (const route of routes) {
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(BASE + route, { waitUntil: "load" });
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const out = { overflow: null, fontsOk: false, toolListDups: [], headerH: 0, bodyF: "", gutters: [] };
        const doc = document.scrollingElement;
        out.overflow = { sw: doc.scrollWidth, iw: window.innerWidth, hor: doc.scrollWidth > window.innerWidth + 1 };
        out.fontsOk = document.fonts.check('600 16px "Instrument Sans"') && document.fonts.check('400 12px "DM Mono"');
        out.bodyF = getComputedStyle(document.body).fontFamily;
        const hdr = document.querySelector(".site-header");
        if (hdr) out.headerH = Math.round(hdr.getBoundingClientRect().height);
        for (const g of document.querySelectorAll(".page-gutter")) {
          const s = getComputedStyle(g);
          out.gutters.push({ d: s.display, w: Math.round(g.getBoundingClientRect().width) });
        }
        const tl = [...document.querySelectorAll(".tool-list a[href]")].map((a) => a.getAttribute("href"));
        out.toolListDups = [...new Set(tl.filter((h, i) => tl.indexOf(h) !== i))];
        return out;
      });
      report.push({ route, w, ...r });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(BASE + "/tools", { waitUntil: "load" });
  const home = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      newTag: q(".home-hero .tag")?.textContent,
      browseAll: q(".browse-all-cell h3")?.textContent,
      toolListUnique: new Set([...document.querySelectorAll(".tool-list a")].map((a) => a.getAttribute("href"))).size,
      toolListTotal: document.querySelectorAll(".tool-list a").length,
      soonCount: document.querySelectorAll(".category-soon").length,
      soonAreLinks: [...document.querySelectorAll(".category-soon")].some((c) => c.tagName === "A"),
      headerH: Math.round(q(".site-header").getBoundingClientRect().height),
      searchBtnBg: getComputedStyle(q(".search-submit")).backgroundColor,
      cellCount: document.querySelectorAll(".difference-grid .cell").length,
      hatchBandH: Math.round(q(".hatch-band")?.getBoundingClientRect().height || 0),
      h1Span: q(".home-hero h1 span")?.textContent,
      h1SpanColor: getComputedStyle(q(".home-hero h1 span")).color,
    };
  });
  await page.click("#tool-search"); await page.type("#tool-search", "json", { delay: 15 });
  await page.waitForTimeout(250);
  const s1 = await page.evaluate(() => ({ count: document.querySelectorAll(".search-results .search-result").length, firstHref: document.querySelector(".search-results .search-result")?.getAttribute("href") }));
  await page.keyboard.press("Enter"); await page.waitForTimeout(600);
  const enterUrl = page.url();
  await page.goto(BASE + "/tools", { waitUntil: "load" });
  await page.click("#tool-search"); await page.type("#tool-search", "zzzzno", { delay: 15 }); await page.waitForTimeout(200);
  const empty = await page.textContent(".search-empty").catch(() => null);
  return { report, home, s1, enterUrl, empty };
}
