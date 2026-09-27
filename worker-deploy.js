// thinkwithfinance — intelligent finance publisher (launch Worker)
// Methodology mirrors devinfo-publisher: KV queue + monotonic index + dedup + daily cron.
// fetch() serves the site (read-only); scheduled() publishes one queued post/day (idempotent).
// The cron trigger is held OFF at launch; publishing is testable via guarded /dry and /run.
// No-lockout: a publish fault in scheduled() cannot affect the fetch() serving path.

const TZ = "America/Edmonton";
const SITE = {
  name: "Think With Finance",
  domain: "blog.thinkwithfinance.com",
  tagline: "Evidence-grounded notes on markets, money, and fintech.",
};
const DISCLAIMER =
  "Educational and informational only. Not investment advice. Do your own research.";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function edmontonDate(d) {
  // YYYY-MM-DD in America/Edmonton (en-CA yields ISO-ordered parts)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d || new Date());
}

async function getJSON(kv, key, fallback) {
  const v = await kv.get(key, "json");
  return v == null ? fallback : v;
}

const CSS = `
:root{--bg:#0b0f14;--fg:#e6edf3;--mut:#9aa7b4;--acc:#4ea1ff;--card:#121821;--bd:#1e2a36}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);
font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
header.site,footer.site{max-width:760px;margin:0 auto;padding:20px 20px}
header.site{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--bd)}
.brand{font-weight:700;font-size:1.15rem;color:var(--fg)}
header.site nav a{margin-left:16px;color:var(--mut);font-size:.95rem}
main{max-width:760px;margin:0 auto;padding:8px 20px 40px}
h1{font-size:1.7rem;line-height:1.25;margin:.6em 0 .2em}
h2{font-size:1.25rem;margin:1.6em 0 .4em}
.dek{color:var(--mut);font-size:1.05rem;margin:.2em 0 1em}
.meta{color:var(--mut);font-size:.85rem;margin-bottom:1.2em}
.tags{margin:.4em 0}.tag{display:inline-block;background:var(--card);border:1px solid var(--bd);
border-radius:999px;padding:2px 10px;margin:2px 6px 2px 0;font-size:.78rem;color:var(--mut)}
article .post-body p{margin:1em 0}
ul.posts{list-style:none;padding:0}ul.posts li{padding:16px 0;border-bottom:1px solid var(--bd)}
ul.posts .t{font-size:1.15rem;font-weight:600}
.refs{margin-top:2em;padding-top:1em;border-top:1px solid var(--bd)}
.refs ol{padding-left:1.2em}.refs li{margin:.4em 0;font-size:.92rem;color:var(--mut)}
.refs li a{color:var(--acc)}
footer.site{border-top:1px solid var(--bd);color:var(--mut);font-size:.85rem;margin-top:40px}
footer.site .disc{color:#c9922e;font-weight:600}
.empty{color:var(--mut);padding:40px 0}
code{background:var(--card);border:1px solid var(--bd);border-radius:4px;padding:1px 5px}
/* --- design-system subset (Phase 0): mirrors design/tokens.css +
   design/components.css for the /sources page. Keep in sync with design/. --- */
.twf-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:1.2em 0}
.twf-stat{background:#121821;border:1px solid #1e2a36;border-radius:8px;padding:16px}
.twf-stat .twf-stat-num{font-size:1.25rem;font-weight:700;color:#e6edf3}
.twf-stat .twf-stat-label{font-size:.85rem;color:#9aa7b4;margin-top:4px}
.twf-source-card{background:#121821;border:1px solid #1e2a36;border-radius:8px;padding:16px 20px;margin:16px 0}
.twf-source-card h3{margin:0 0 4px;font-size:1.15rem}
.twf-source-card h3 a{color:#e6edf3;text-decoration:none}
.twf-source-card h3 a:hover{color:#7db9ff;text-decoration:underline}
.twf-source-meta{color:#9aa7b4;font-size:.85rem;margin:4px 0 8px}
.twf-tier{display:inline-block;font-size:.78rem;font-weight:700;border:1px solid #2c3d50;border-radius:4px;padding:1px 8px;margin-right:8px;letter-spacing:.04em}
.twf-tier-a{color:#57b98a;border-color:#57b98a}
.twf-tier-b{color:#4ea1ff;border-color:#4ea1ff}
.twf-tier-c{color:#b39ddb;border-color:#b39ddb}
.twf-tier-d{color:#9aa7b4;border-color:#9aa7b4}
.twf-tier-e{color:#6b7684;border-color:#6b7684}
.twf-tier-legend{font-size:.85rem;color:#9aa7b4;background:#121821;border:1px solid #1e2a36;border-radius:8px;padding:12px 16px;margin:1.2em 0}
.twf-tier-legend dt{font-weight:700;color:#e6edf3;display:inline}
.twf-tier-legend dd{display:inline;margin:0 16px 0 4px}
.twf-source-cites{font-size:.85rem;color:#9aa7b4}
.twf-source-cites ul{margin:4px 0 0;padding-left:1.2em}
.twf-source-cites li{margin:.25em 0}
.twf-source-cites a{color:#4ea1ff}
.twf-source-empty{color:#6b7684;font-style:italic}
.twf-hold{max-width:640px;margin:12vh auto;text-align:center;padding:0 1rem}
.twf-hold h1{font-size:1.6rem;margin-bottom:.5rem}
.twf-hold p{color:#9aa7b4}
.twf-hold .pill{display:inline-block;border:1px solid #2a3441;border-radius:999px;padding:.25rem .9rem;font-size:.8rem;color:#9aa7b4;margin-bottom:1rem}
`;

function layout(title, bodyHtml, opts) {
  opts = opts || {};
  const y = new Date().getFullYear();
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(opts.desc || SITE.tagline)}">
<style>${CSS}</style></head><body>
<header class="site"><a class="brand" href="/">${esc(SITE.name)}</a>
<nav><a href="/">Home</a><a href="/academy">Academy</a><a href="/tools">Tools</a><a href="/sources">Sources</a><a href="/changelog">Changelog</a><a href="/log">Build log</a></nav></header>
<main>${bodyHtml}</main>
<footer class="site"><p class="disc">${esc(DISCLAIMER)}</p>
<p>Content licensed <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener nofollow">CC BY-NC 4.0</a> &middot; free to share with attribution, non-commercial &middot; code <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener nofollow">MIT</a>.</p>
<p>&copy; ${y} ${esc(SITE.name)} &middot; part of <a href="https://devinfo.dev">devinfo.dev</a></p></footer>
</body></html>`;
}

function renderRefs(refs) {
  if (!refs || !refs.length) return "";
  const items = refs.map((r) => {
    const who = [r.author_or_publisher, r.year].filter(Boolean).join(", ");
    const label = `${esc(r.title)}${who ? " — " + esc(who) : ""}`;
    return r.url ? `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`
                : `<li>${label}</li>`;
  }).join("");
  return `<section class="refs"><h2>References</h2><ol>${items}</ol></section>`;
}

function renderTags(tags) {
  if (!tags || !tags.length) return "";
  return `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`;
}

// ---------- public source map (/sources) ----------
// Reads sources:registry (list of {name,domain,tier,region,topics,access})
// and refs:registry ({built, refs:[{url,citedBy:[{slug,title,id}]}]}).
// A ref belongs to a source when its URL hostname matches the source domain.
// Refs with empty citedBy are new registry entries nothing cites yet —
// that is correct data, not a rendering bug.
const TIER_INFO = {
  A: "Regulators, central banks & primary sources",
  B: "Reference & education",
  C: "Scholars & research authors",
  D: "Research portals & statistics",
  E: "Gated providers — background research only",
};
const TIER_ORDER = ["A", "B", "C", "D", "E"];

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function sourceMatchesDomain(refUrl, domain) {
  const h = hostOf(refUrl);
  const d = String(domain || "").toLowerCase().replace(/^www\./, "");
  return !!h && !!d && (h === d || h.endsWith("." + d));
}

function asSourceList(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.sources)) return v.sources;
  return [];
}

function asRefList(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.refs)) return v.refs;
  return [];
}

// ---- LAUNCH HOLD (TWF Pro): the ONLY thing standing between the hold page
// and the live Academy/Toolkit is this flag. Flip academy/tools to false
// (once content is built and entitlements are wired) and redeploy - nothing
// else to rewire. Safe default: unknown slugs keep showing the hold page.
const HOLDS = { academy: true, tools: true };

const HOLD_COPY = {
  academy: {
    title: "TWF Academy",
    body: "Ten course modules on how money actually works - from tax-aware sequencing to reading financial statements like a skeptic. Built from the same evidence-grounded source library as the blog. Educational content only: we explain, we never advise.",
  },
  tools: {
    title: "TWF Toolkit",
    body: "Ten practical tools - a plain-language money translator, a fee-bleed detector, a cooling-off calculator, and more. Educational tools: they explain, they never decide for you.",
  },
};

function renderComingSoon(section) {
  const c = HOLD_COPY[section] || HOLD_COPY.academy;
  return layout(c.title + " \u2014 coming soon \u2014 " + SITE.name,
    `<div class="twf-hold"><span class="pill">Coming soon</span><h1>${esc(c.title)}</h1>` +
    `<p>${esc(c.body)}</p><p>The blog stays free forever. <a href="/">Back to the blog</a> &middot; <a href="/sources">Browse the sources</a></p></div>`);
}

function renderSourcesPage(sourcesVal, refsVal) {
  const sources = asSourceList(sourcesVal).filter((s) => s && s.name);
  const refs = asRefList(refsVal);
  const refCount = new Array(sources.length).fill(0);
  const cites = sources.map(() => new Map()); // slug -> {slug,title,id}
  refs.forEach((r) => {
    if (!r || !r.url) return;
    sources.forEach((s, i) => {
      if (sourceMatchesDomain(r.url, s.domain)) {
        refCount[i] += 1;
        (r.citedBy || []).forEach((c) => {
          if (c && c.slug && !cites[i].has(c.slug)) cites[i].set(c.slug, c);
        });
      }
    });
  });
  const rank = new Map(TIER_ORDER.map((t, i) => [t, i]));
  const sorted = sources
    .map((s, i) => ({ s, i }))
    .sort(
      (a, b) =>
        (rank.has(a.s.tier) ? rank.get(a.s.tier) : 9) - (rank.has(b.s.tier) ? rank.get(b.s.tier) : 9) ||
        String(a.s.name).localeCompare(String(b.s.name))
    );
  const totalCites = cites.reduce((n, m) => n + m.size, 0);

  let body = `<h1>Sources</h1>
<p class="dek">Every source this site may cite, grouped by tier. A source appears here
because it passed the registry's curation policy — not every source is cited yet.</p>
<div class="twf-stat-grid">
<div class="twf-stat"><div class="twf-stat-num">${sources.length}</div><div class="twf-stat-label">sources in registry</div></div>
<div class="twf-stat"><div class="twf-stat-num">${refs.length}</div><div class="twf-stat-label">references in registry</div></div>
<div class="twf-stat"><div class="twf-stat-num">${totalCites}</div><div class="twf-stat-label">source-to-post citations</div></div>
</div>
<dl class="twf-tier-legend">
${TIER_ORDER.map((t) => `<dt><span class="twf-tier twf-tier-${t.toLowerCase()}">Tier ${t}</span></dt><dd>${esc(TIER_INFO[t])}</dd>`).join("")}
</dl>`;

  if (!sorted.length) {
    body += `<p class="empty">The source registry is empty.</p>`;
  } else {
    body += sorted
      .map(({ s, i }) => {
        const tier = TIER_ORDER.includes(s.tier) ? s.tier : null;
        const meta = [
          s.domain ? esc(s.domain) : null,
          s.region ? esc(s.region) : null,
          s.access ? esc(s.access) : null,
          Array.isArray(s.topics) && s.topics.length ? esc(s.topics.join(", ")) : null,
          `${refCount[i]} reference${refCount[i] === 1 ? "" : "s"}`,
        ]
          .filter(Boolean)
          .join(" · ");
        const name = s.domain
          ? `<a href="https://${esc(s.domain)}" target="_blank" rel="noopener">${esc(s.name)}</a>`
          : esc(s.name);
        const posts = [...cites[i].values()].sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""))
        );
        const citesHtml = posts.length
          ? `<div class="twf-source-cites">Cited by:<ul>${posts
              .map((c) => `<li><a href="/p/${esc(c.slug)}">${esc(c.title || c.slug)}</a></li>`)
              .join("")}</ul></div>`
          : `<div class="twf-source-cites twf-source-empty">Not yet cited in published posts.</div>`;
        return `<article class="twf-source-card">
<h3>${name}</h3>
<div class="twf-source-meta">${tier ? `<span class="twf-tier twf-tier-${tier.toLowerCase()}">Tier ${tier}</span>` : ""}${meta}</div>
${citesHtml}</article>`;
      })
      .join("");
  }
  return layout("Sources — " + SITE.name, body, {
    desc: "The public source map for Think With Finance: every curated source, its tier, and which posts cite it.",
  });
}

// ---------- agent-friendly discovery ----------
const LLMS_TXT = `# Think With Finance — llms.txt

Think With Finance publishes evidence-grounded notes on markets, money, and
fintech. All content is educational and informational only — not investment
advice. Content: CC BY-NC 4.0. Code: MIT.

## Routes
- / — homepage, reverse-chronological post index
- /p/<slug> — a single post, with its references
- /sources — public source map: every curated source, its tier (A–E), and
  which published posts cite it
- /health — JSON status (post count, queue depth, last publish)
- /changelog — site changelog
- /log — build log
- /llms.txt — this file
- /.well-known/twf.json — machine-readable site discovery document
- /academy — TWF Academy course catalog (currently: coming soon)
- /tools — TWF Toolkit (currently: coming soon)

## Citation model
- sources:registry — curated sources, each with a tier:
  A regulators/central banks/primary, B reference/education, C scholars,
  D research portals/statistics, E gated providers (background only).
- refs:registry — individually catalogued reference URLs, each with a
  citedBy map linking it to the posts that cite it.
- Posts cite only registry references that returned HTTP 200 when verified.

## Educational boundary
Nothing on this site outputs buy/sell/hold calls, price targets, predicted
returns, trade execution, copy trading, or individualized portfolio
recommendations. Material informs; it does not enforce or drive decisions.
`;

function wellKnown() {
  return {
    name: SITE.name,
    domain: SITE.domain,
    tagline: SITE.tagline,
    license_content: "CC BY-NC 4.0",
    license_code: "MIT",
    educational_use_only: true,
    routes: ["/", "/p/<slug>", "/sources", "/health", "/changelog", "/log", "/llms.txt", "/.well-known/twf.json"],
    academy: "coming soon",
    tools: "coming soon",
    registries: {
      "sources:registry": "curated sources with tiers A–E",
      "refs:registry": "catalogued reference URLs with citedBy post links",
    },
  };
}

function renderPost(p) {
  const body = `<article><h1>${esc(p.title)}</h1>${p.dek ? `<p class="dek">${esc(p.dek)}</p>` : ""}
<div class="meta">${esc(p.id || "")}${p.date ? " &middot; " + esc(p.date) : ""}${p.type ? " &middot; " + esc(p.type) : ""}</div>
${renderTags(p.tags)}<div class="post-body">${p.body || ""}</div>${renderRefs(p.references)}</article>`;
  return layout(p.title + " — " + SITE.name, body, { desc: p.dek });
}

function renderIndex(index) {
  let list;
  if (!index || !index.length) {
    list = `<p class="empty">The first article is being prepared. Check back shortly.</p>`;
  } else {
    list = `<ul class="posts">${index.map((e) =>
      `<li><a class="t" href="/p/${esc(e.slug)}">${esc(e.title)}</a>
<div class="meta">${esc(e.id || "")}${e.date ? " &middot; " + esc(e.date) : ""}</div>${renderTags(e.tags)}</li>`
    ).join("")}</ul>`;
  }
  const body = `<h1>${esc(SITE.name)}</h1><p class="dek">${esc(SITE.tagline)}</p>${list}`;
  return layout(SITE.name, body);
}

function renderLogPage(title, entries, kind) {
  let body = `<h1>${esc(title)}</h1>`;
  if (!entries || !entries.length) {
    body += `<p class="empty">No entries yet.</p>`;
  } else {
    body += `<ul class="posts">${entries.map((e) => {
      if (kind === "changelog") {
        return `<li><div class="meta">${esc(e.date || "")}${e.version ? " &middot; " + esc(e.version) : ""}</div><div>${esc(e.note || "")}</div></li>`;
      }
      return `<li><div class="meta">${esc(e.date || "")}</div><div>${esc(e.note || e.ts || "")}</div></li>`;
    }).join("")}</ul>`;
  }
  return layout(title + " — " + SITE.name, body);
}

// ---------- publish algorithm (identical methodology to devinfo) ----------
async function publishOne(env, opts) {
  opts = opts || {};
  const kv = env.POSTS;
  const index = await getJSON(kv, "posts:index", []);
  const queue = await getJSON(kv, "queue:pending", []);
  const today = edmontonDate();

  if (index.length && index[0].date === today && !opts.force) {
    return { published: false, reason: "already-published-today", date: today };
  }
  if (!queue.length) {
    await kv.put("status:queue-empty", new Date().toISOString());
    return { published: false, reason: "queue-empty" };
  }

  const draft = queue[0];
  // monotonic id: max existing 2026.NNNN + 1
  let maxN = 0;
  for (const e of index) {
    const m = /^(\d{4})\.(\d{4})$/.exec(e.id || "");
    if (m) maxN = Math.max(maxN, parseInt(m[2], 10));
  }
  const year = today.slice(0, 4);
  const id = `${year}.${String(maxN + 1).padStart(4, "0")}`;

  const published = await getJSON(kv, "queue:published", []);
  if (published.includes(draft.slug) || index.some((e) => e.slug === draft.slug)) {
    // dedup guard: drop the duplicate draft, do not republish
    await kv.put("queue:pending", JSON.stringify(queue.slice(1)));
    return { published: false, reason: "duplicate-slug-dropped", slug: draft.slug };
  }

  const record = {
    id, slug: draft.slug, title: draft.title, type: draft.type || "note",
    dek: draft.dek || "", tags: draft.tags || [], body: draft.body || "",
    references: draft.references || [], date: today,
  };

  if (opts.dry) {
    return { published: false, dry: true, wouldAssign: id, title: record.title, slug: record.slug, queueLen: queue.length };
  }

  const newIndex = [{ id, slug: record.slug, title: record.title, date: today, tags: record.tags }, ...index];
  await kv.put(`post:${record.slug}`, JSON.stringify(record));
  await kv.put(`docid:${id}`, record.slug);
  await kv.put("posts:index", JSON.stringify(newIndex));
  await kv.put("queue:pending", JSON.stringify(queue.slice(1)));
  await kv.put("queue:published", JSON.stringify([...published, record.slug]));
  await kv.put("status:last-run", JSON.stringify({ at: new Date().toISOString(), id, slug: record.slug }));

  const log = await getJSON(kv, "site:buildlog", []);
  log.unshift({ date: today, note: `Published ${id}: ${record.title}` });
  await kv.put("site:buildlog", JSON.stringify(log.slice(0, 200)));

  return { published: true, id, slug: record.slug, title: record.title };
}

function guard(url, env) {
  const key = url.searchParams.get("key");
  return env.RUN_KEY && key === env.RUN_KEY;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const kv = env.POSTS;
    const host = url.hostname;
    if (host === "thinkwithfinance.com" || host === "www.thinkwithfinance.com") {
      return Response.redirect("https://blog.thinkwithfinance.com" + url.pathname + url.search, 301);
    }
    try {
      if (path === "/") {
        const index = await getJSON(kv, "posts:index", []);
        return html(renderIndex(index));
      }
      if (path === "/health") {
        const index = await getJSON(kv, "posts:index", []);
        const queue = await getJSON(kv, "queue:pending", []);
        const last = await getJSON(kv, "status:last-run", null);
        return json({ status: "ok", site: SITE.domain, posts: index.length, queue: queue.length, last });
      }
      if (path === "/changelog") {
        const cl = await getJSON(kv, "site:changelog", []);
        return html(renderLogPage("Changelog", cl, "changelog"));
      }
      if (path === "/log") {
        const bl = await getJSON(kv, "site:buildlog", []);
        return html(renderLogPage("Build log", bl, "buildlog"));
      }
      if (path === "/sources") {
        const sources = await getJSON(kv, "sources:registry", []);
        const refs = await getJSON(kv, "refs:registry", { refs: [] });
        return html(renderSourcesPage(sources, refs));
      }
      if (path === "/llms.txt") {
        return new Response(LLMS_TXT, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      }
      if (path === "/.well-known/twf.json") {
        return json(wellKnown());
      }
      if (path === "/dry") {
        if (!guard(url, env)) return json({ error: "forbidden" }, 403);
        return json(await publishOne(env, { dry: true }));
      }
      if (path === "/run") {
        if (!guard(url, env)) return json({ error: "forbidden" }, 403);
        return json(await publishOne(env, { force: url.searchParams.get("force") === "1" }));
      }
      if (path === "/academy" || path.startsWith("/academy/")) {
        if (!HOLDS.academy && typeof renderAcademy === "function") {
          const out = await renderAcademy(path, kv, env);
          if (out) return html(out);
        }
        return html(renderComingSoon("academy"));
      }
      if (path === "/tools" || path.startsWith("/tools/")) {
        if (!HOLDS.tools && typeof renderTools === "function") {
          const out = await renderTools(path, kv, env);
          if (out) return html(out);
        }
        return html(renderComingSoon("tools"));
      }
      if (path.startsWith("/p/")) {
        const slug = decodeURIComponent(path.slice(3));
        const post = await getJSON(kv, `post:${slug}`, null);
        if (!post) return html(layout("Not found — " + SITE.name, `<h1>Not found</h1><p><a href="/">Back home</a></p>`), 404);
        return html(renderPost(post));
      }
      return html(layout("Not found — " + SITE.name, `<h1>Not found</h1><p><a href="/">Back home</a></p>`), 404);
    } catch (e) {
      return html(layout("Error — " + SITE.name, `<h1>Temporary error</h1><p><a href="/">Back home</a></p>`), 500);
    }
  },

  async scheduled(event, env) {
    // Publishes one/day at 09:30 America/Edmonton. Cron fires 15:30 and 16:30 UTC;
    // gate on local hour so it lands at 09:30 year-round across MST/MDT (DST-proof).
    const h = parseInt(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()), 10);
    if (h === 9) { await publishOne(env, {}); }
  },
};

function html(body, status) {
  return new Response(body, { status: status || 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), { status: status || 200, headers: { "content-type": "application/json; charset=utf-8" } });
}

// Named exports for unit tests (node --test). The default export above is the
// Worker's entrypoint; these pure helpers are safe to import in Node.
export { esc, hostOf, sourceMatchesDomain, renderSourcesPage, TIER_INFO, wellKnown };
