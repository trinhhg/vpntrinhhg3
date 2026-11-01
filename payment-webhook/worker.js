// v3.2 - Payment webhook D1 (xÃ³a giao dá»ch tháº­t sá»±, nÃ¢ng gÃ³i khÃ¡c phÆ°Æ¡ng thá»©c ÄÆ¡n gá»c, nháº­n ÄÆ¡n tá»« KV ÄÃºng tráº¡ng thÃ¡i)
// Secret CHá» Äá»c tá»« env (Settings > Variables > Secret): WEB_API_SECRET, WEB_API_SECRET2, MB_WEBHOOK_SECRET, ADMIN_DELETE_SECRET
// Biáº¿n thÆ°á»ng: WEBSITE_WORKER_URL (worker máº·c Äá»nh), WORKER_URLS (danh sÃ¡ch worker 3 web, cÃ¡ch nhau dáº¥u pháº©y - dÃ¹ng Äá» tÃ¬m ÄÆ¡n khi D1 chÆ°a cÃ³)
// Cron Trigger: thÃªm "*/2 * * * *" cho worker nÃ y (quÃ©t khá»p láº¡i giao dá»ch + thá»­ láº¡i cáº¥p link)

// Há» thá»ng khÃ´ng fix cá»©ng báº£ng giÃ¡ gÃ³i cÆ°á»c. Má»i sá» tiá»n vÃ  mÃ£ gÃ³i Äá»u ÄÆ°á»£c nháº­n vÃ  so khá»p Äá»ng tá»« há» thá»ng.
const normalizePkgCode = (v) => String(v || "").trim().toLowerCase();
function extractPkgCodeFromContent(text) {
  if (!text) return null;
  const m = String(text).toUpperCase().match(/\b(T1|T2|C1|C2|C3|C4|C5|C6|D1|D2|D3|CUSTOM)\b/);
  return m ? m[1].toLowerCase() : null;
}

const normalizeOrderId = (v) => String(v || "").trim().toUpperCase().replace(/[-_.\s]/g, "");
const isValidOrderId = (v) => /^DH[A-Z0-9]{10}$/.test(normalizeOrderId(v));
const NOW = "datetime('now', '+7 hours')";

function getConfig(env) {
  const sec = env.WEB_API_SECRET || env.WEB_API_SECRET2 || env.D1_SECRET || "";
  return {
    WEBSITE_WORKER_URL: String(env.WEBSITE_WORKER_URL || "").replace(/\/$/, ""),
    WORKER_URLS: String(env.WORKER_URLS || env.WEBSITE_WORKER_URL || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
    WEB_API_SECRET: env.WEB_API_SECRET || sec, WEB_API_SECRET2: env.WEB_API_SECRET2 || sec, D1_SECRET: env.D1_SECRET || sec,
    MB_WEBHOOK_SECRET: env.MB_WEBHOOK_SECRET || "", ADMIN_DELETE_SECRET: env.ADMIN_DELETE_SECRET || "",
    SUPABASE_URL: env.SUPABASE_URL || "", SUPABASE_KEY: env.SUPABASE_KEY || ""
  };
}
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE", "Access-Control-Allow-Headers": "Content-Type, Authorization" };
const JH = { "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store", ...CORS };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: JH });
const authed = (req, secret) => !!secret && req.headers.get("Authorization") === `Bearer ${secret}`;

// ------------------------------------------------------------ bank parser
function parseAmount(str) {
  let s = String(str).replace(/[^\d.,]/g, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/[,.]/g, "");
  return Number(s);
}
function parseBankNotification(notification) {
  const raw = String(notification || "").trim();
  if (!raw) return { amount: null, content: null, orderId: null, raw };
  const am = raw.match(/GD\s*:\s*\+?\s*([\d,.]+)/i) || raw.match(/\+\s*([\d,.]+)\s*(?:VND|VNÄ|Ä)/i) || raw.match(/\+\s*([\d,.]+)/);
  let amount = null;
  if (am) { const n = parseAmount(am[1]); if (Number.isSafeInteger(n) && n > 0) amount = n; }
  const cm = raw.match(/ND\s*[:|]\s*(.*)$/is) || raw.match(/\|ND\s*(.*)$/is);
  const om = raw.replace(/[-_.\s]/g, "").toUpperCase().match(/(DH[A-Z0-9]{10})/);
  return { amount, content: cm ? cm[1].trim() : raw, orderId: om ? normalizeOrderId(om[1]) : null, raw };
}

// ------------------------------------------------------------ schema (khá»p 100% vá»i SQL táº¡o báº£ng trong HUONG_DAN)
let schemaPromise = null;
async function ensureSchema(env) {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    const run = (sql) => env.DB.prepare(sql).run();
    await run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL UNIQUE, total_vnd INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT, paid_at TEXT, reviewed_at TEXT, review_note TEXT, fulfillment_status TEXT DEFAULT 'pending', fulfill_at TEXT, fulfill_tries INTEGER DEFAULT 0, email TEXT, target_web TEXT, worker_url TEXT, order_type TEXT DEFAULT 'new', pkg_id TEXT)`);
    await run(`CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, amount INTEGER, payment_method TEXT, content TEXT, notification TEXT, status TEXT, kind TEXT DEFAULT 'new', created_at TEXT, updated_at TEXT, reviewed_at TEXT, review_note TEXT)`);
    await run(`CREATE TABLE IF NOT EXISTS order_upgrades (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, from_price_vnd INTEGER NOT NULL, target_package_id TEXT NOT NULL, target_price_vnd INTEGER NOT NULL, upgrade_amount_vnd INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', transaction_id INTEGER, created_at TEXT NOT NULL, paid_at TEXT, review_note TEXT, fulfillment_status TEXT DEFAULT 'pending', fulfill_at TEXT, fulfill_tries INTEGER DEFAULT 0)`);
    await run(`CREATE TABLE IF NOT EXISTS sys_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, level TEXT, action TEXT, details TEXT, ref TEXT, created_at TEXT)`);
    // Táº¡o chá» má»¥c SQLite tÄng tá»c truy váº¥n D1 tá»©c thÃ¬
    await run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_orders_pending_amt ON orders(status, total_vnd)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_tx_order_id ON transactions(order_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_upgrades_order ON order_upgrades(order_id, status)`);
    // bÃ¹ cá»t cho DB cÅ©
    const addCol = async (t, c, d) => { const cols = (await env.DB.prepare(`PRAGMA table_info(${t})`).all()).results || []; if (!cols.some((x) => x.name === c)) { try { await run(`ALTER TABLE ${t} ADD COLUMN ${c} ${d}`); } catch {} } };
    for (const [t, c, d] of [["orders", "fulfill_at", "TEXT"], ["orders", "fulfill_tries", "INTEGER DEFAULT 0"], ["orders", "email", "TEXT"], ["orders", "target_web", "TEXT"], ["orders", "worker_url", "TEXT"], ["orders", "order_type", "TEXT DEFAULT 'new'"], ["orders", "pkg_id", "TEXT"], ["transactions", "kind", "TEXT DEFAULT 'new'"], ["transactions", "updated_at", "TEXT"], ["order_upgrades", "fulfill_at", "TEXT"], ["order_upgrades", "fulfill_tries", "INTEGER DEFAULT 0"]]) await addCol(t, c, d);
    return true;
  })().catch((e) => { schemaPromise = null; throw e; });
  return schemaPromise;
}

async function logSys(env, level, action, details, ref = null) {
  try { await env.DB.prepare(`INSERT INTO sys_logs (level, action, details, ref, created_at) VALUES (?, ?, ?, ?, ${NOW})`).bind(level, action, String(details || "").slice(0, 400), ref).run(); } catch {}
}

// ------------------------------------------------------------ helpers DB
async function insertTransaction(env, { orderId = null, amount, paymentMethod = "unknown", content = null, notification, status, kind = "new" }) {
  const r = await env.DB.prepare(`INSERT INTO transactions (order_id, amount, payment_method, content, notification, status, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ${NOW}, ${NOW})`).bind(orderId, amount, paymentMethod, content, notification, status, kind).run();
  return r.meta.last_row_id;
}
async function updateTx(env, txId, status, note = null, orderId = null, kind = null) {
  let q = `UPDATE transactions SET status = ?, updated_at = ${NOW}`; const p = [status];
  if (kind !== null) { q += `, kind = ?`; p.push(kind); }
  if (note !== null) { q += `, reviewed_at = ${NOW}, review_note = ?`; p.push(note); }
  if (orderId !== null) { q += `, order_id = ?`; p.push(orderId); }
  await env.DB.prepare(q + ` WHERE id = ?`).bind(...p, txId).run();
}
const getOrder = (env, id) => env.DB.prepare(`SELECT * FROM orders WHERE order_id = ? LIMIT 1`).bind(id).first();
const pendingUpgradeOf = (env, id) => env.DB.prepare(`SELECT * FROM order_upgrades WHERE order_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1`).bind(id).first();
async function markOrderSuccess(env, orderId, note = null) {
  await env.DB.prepare(`UPDATE orders SET status = 'success', paid_at = ${NOW}, fulfillment_status = 'pending', fulfill_at = ${NOW}, fulfill_tries = 0, reviewed_at = CASE WHEN ? IS NOT NULL THEN ${NOW} ELSE reviewed_at END, review_note = CASE WHEN ? IS NOT NULL THEN ? ELSE review_note END WHERE order_id = ?`).bind(note, note, note, orderId).run();
}
// giao dá»ch tiá»n vÃ o trÆ°á»c, ÄÆ¡n tá»i sau
async function reconcileOrderAfterCreation(env, orderId, totalVnd) {
  const direct = await env.DB.prepare(`SELECT id FROM transactions WHERE status = 'unmatched' AND order_id = ? AND ABS(amount - ?) <= 1 ORDER BY id ASC LIMIT 1`).bind(orderId, totalVnd).first();
  if (direct) {
    const r = await env.DB.prepare(`UPDATE transactions SET status = 'success', kind = COALESCE((SELECT order_type FROM orders WHERE order_id = ?), 'new'), updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = 'Khá»p tá»± Äá»ng - tiá»n vÃ o trÆ°á»c' WHERE id = ? AND status = 'unmatched'`).bind(orderId, direct.id).run();
    if (r.meta.changes > 0) { await markOrderSuccess(env, orderId, "Khá»p tá»± Äá»ng - tiá»n vÃ o trÆ°á»c"); return { matched: true, transactionId: direct.id, matchedBy: "order_id_and_amount" }; }
  }
  const pend = (await env.DB.prepare(`SELECT id, pkg_id FROM orders WHERE status = 'pending' AND ABS(total_vnd - ?) <= 1 AND datetime(created_at) >= datetime('now', '+7 hours', '-60 minutes')`).bind(totalVnd).all()).results || [];
  if (pend.length === 1) {
    const un = await env.DB.prepare(`SELECT id, content FROM transactions WHERE status = 'unmatched' AND ABS(amount - ?) <= 1 AND (order_id IS NULL OR order_id = '') AND datetime(created_at) >= datetime('now', '+7 hours', '-60 minutes') ORDER BY id ASC LIMIT 1`).bind(totalVnd).first();
    if (un) {
      const pkgInContent = extractPkgCodeFromContent(un.content);
      if (!pkgInContent || !pend[0].pkg_id || pkgInContent === normalizePkgCode(pend[0].pkg_id)) {
        const r = await env.DB.prepare(`UPDATE transactions SET order_id = ?, status = 'success', kind = COALESCE((SELECT order_type FROM orders WHERE order_id = ?), 'new'), updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = 'Khá»p tá»± Äá»ng - tiá»n vÃ o trÆ°á»c - khá»p duy nháº¥t theo sá» tiá»n trong 60 phÃºt' WHERE id = ? AND status = 'unmatched'`).bind(orderId, orderId, un.id).run();
        if (r.meta.changes > 0) { await markOrderSuccess(env, orderId, "Khá»p tá»± Äá»ng - khá»p duy nháº¥t theo sá» tiá»n"); return { matched: true, transactionId: un.id, matchedBy: "unique_pending_order_and_amount" }; }
      }
    }
  }
  return { matched: false };
}
async function upgradeSuccess(env, upgradeId, txId) {
  const r = await env.DB.prepare(`UPDATE order_upgrades SET status = 'success', transaction_id = ?, paid_at = ${NOW}, fulfillment_status = 'pending', fulfill_at = ${NOW}, fulfill_tries = 0 WHERE id = ? AND status = 'pending'`).bind(txId, upgradeId).run();
  return r.meta.changes > 0;
}

// ------------------------------------------------------------ cáº¥p link: gá»i ÄÃºng worker cá»§a ÄÆ¡n
async function setOrderFulfill(env, id, status) { await env.DB.prepare(`UPDATE orders SET fulfillment_status = ?, fulfill_at = ${NOW} WHERE order_id = ? AND fulfillment_status != 'fulfilled'`).bind(status, id).run(); }
async function setUpgradeFulfill(env, id, status) { await env.DB.prepare(`UPDATE order_upgrades SET fulfillment_status = ?, fulfill_at = ${NOW} WHERE id = ? AND fulfillment_status != 'fulfilled'`).bind(status, id).run(); }

async function triggerFulfillment(env, cfg, { orderIds = [], upgradeIds = [] }) {
  const ups = [];
  for (const id of upgradeIds) { const u = await env.DB.prepare(`SELECT * FROM order_upgrades WHERE id = ?`).bind(id).first(); if (u && u.status === "success") ups.push(u); }
  const all = [...new Set([...orderIds, ...ups.map((u) => u.order_id)].map(normalizeOrderId))];
  const groups = {};
  for (const oid of all) {
    const r = await getOrder(env, oid);
    // CHáº¶N Cá»¨NG (SPEC #1): chá» cho fulfillment náº¿u D1 ÄÃ£ xÃ¡c nháº­n order.status = 'success'
    // (tá»©c ÄÃ£ khá»p amountPaid === totalVnd qua cÃ¡c bÆ°á»c UPDATE ... WHERE status='pending'/'success' trÆ°á»c ÄÃ³).
    // KHÃNG bao giá» tin orderId truyá»n vÃ o mÃ  khÃ´ng tá»± kiá»m tra láº¡i tráº¡ng thÃ¡i tháº­t trong DB ngay táº¡i Äiá»m ná»i nÃ y.
    if (!r || r.status !== "success") { await logSys(env, "warn", "Cháº·n fulfillment - ÄÆ¡n chÆ°a xÃ¡c nháº­n thanh toÃ¡n há»£p lá» (unmatched/thiáº¿u tiá»n/khÃ´ng tá»n táº¡i)", oid, oid); continue; }
    const w = String(r.worker_url || cfg.WEBSITE_WORKER_URL || "").replace(/\/$/, "");
    if (!w) { await logSys(env, "error", "KhÃ´ng biáº¿t worker nÃ o cáº¥p link", oid, oid); await setOrderFulfill(env, oid, "retry"); continue; }
    (groups[w] = groups[w] || { orderIds: [], upgrades: [] }).orderIds.push(oid);
  }
  for (const u of ups) { const r = await getOrder(env, u.order_id); if (!r || r.status !== "success") continue; const w = String(r.worker_url || cfg.WEBSITE_WORKER_URL || "").replace(/\/$/, ""); if (groups[w]) groups[w].upgrades.push({ id: u.id, orderId: u.order_id }); }

  for (const [worker, g] of Object.entries(groups)) {
    for (const oid of g.orderIds) await setOrderFulfill(env, oid, "processing");
    for (const u of g.upgrades) await setUpgradeFulfill(env, u.id, "processing");
    const fail = async (why) => {
      for (const oid of g.orderIds) await env.DB.prepare(`UPDATE orders SET fulfillment_status = 'retry', fulfill_at = ${NOW} WHERE order_id = ? AND fulfillment_status = 'processing'`).bind(oid).run();
      for (const u of g.upgrades) await env.DB.prepare(`UPDATE order_upgrades SET fulfillment_status = 'retry', fulfill_at = ${NOW} WHERE id = ? AND fulfillment_status = 'processing'`).bind(u.id).run();
      await logSys(env, "warn", "Gá»i worker cáº¥p link lá»i", `${worker} Â· ${why}`, g.orderIds[0]);
    };
    let resp;
    try { resp = await fetch(`${worker}/api/internal/auto_fulfill`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.WEB_API_SECRET2}` }, body: JSON.stringify({ orderIds: g.orderIds, upgrades: g.upgrades }) }); }
    catch (e) { await fail(String(e && e.message || e)); continue; }
    if (!resp.ok) { await fail("HTTP " + resp.status); continue; }
    let data; try { data = await resp.json(); } catch { await fail("pháº£n há»i khÃ´ng pháº£i JSON"); continue; }
    const r = data.results || {}, done = new Set([...(r.fulfilled || []), ...(r.already_fulfilled || [])].map(normalizeOrderId));
    for (const oid of done) await setOrderFulfill(env, oid, "fulfilled");
    for (const oid of r.missing || []) await setOrderFulfill(env, normalizeOrderId(oid), "waiting_metadata");
    for (const oid of r.errors || []) await setOrderFulfill(env, normalizeOrderId(oid), "retry");
    for (const u of g.upgrades) await setUpgradeFulfill(env, u.id, done.has(normalizeOrderId(u.orderId)) ? "fulfilled" : (r.missing || []).includes(u.orderId) ? "waiting_metadata" : "retry");
    await logSys(env, (r.errors || []).length || (r.missing || []).length ? "warn" : "ok", "Cáº¥p link", `ok ${done.size} Â· thiáº¿u ${(r.missing || []).length} Â· lá»i ${(r.errors || []).length}`, g.orderIds[0]);
  }
}
async function notifyFulfillmentReady(env, cfg, ctx, args) {
  if (!args.orderIds?.length && !args.upgradeIds?.length) return { skipped: true };
  ctx.waitUntil((async () => {
    try {
      await triggerFulfillment(env, cfg, args);
    } catch (e) {
      await logSys(env, "error", "Lá»i triggerFulfillment ngáº§m", String(e && e.message || e), args.orderIds ? args.orderIds[0] : null);
    }
  })());
  return { triggered: true };
}

// ------------------------------------------------------------ tÃ¬m ÄÆ¡n tháº³ng tá»« Supabase (Fallback worker cÅ©)
async function fetchOrderFromSource(env, cfg, orderId) {
  if (cfg.SUPABASE_URL && cfg.SUPABASE_KEY) {
    try {
      const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/ALL_ORDERS?id=eq.${encodeURIComponent(orderId)}&select=*`, {
        headers: { apikey: cfg.SUPABASE_KEY, Authorization: "Bearer " + cfg.SUPABASE_KEY }
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length) {
          const o = list[0];
          return { ...o, worker_url: o.workerUrl || cfg.WEBSITE_WORKER_URL };
        }
      }
    } catch {}
  }
  for (const w of cfg.WORKER_URLS) {
    try {
      const r = await fetch(`${w}/api/internal/order?id=${orderId}`, { headers: { Authorization: `Bearer ${cfg.WEB_API_SECRET2}` } });
      if (r.ok) { const j = await r.json(); if (j.order) return { ...j.order, worker_url: w }; }
    } catch {}
  }
  return null;
}

// D1 chÆ°a cÃ³ ÄÆ¡n nhÆ°ng Supabase cÃ³: nháº­n vá» ÄÃNG tráº¡ng thÃ¡i ÄÆ¡n
async function adoptOrderFromSource(env, ko, orderId, amount) {
  const done = ko.status === "success";
  await env.DB.prepare(`INSERT OR IGNORE INTO orders (order_id, total_vnd, status, created_at, paid_at, fulfillment_status, email, worker_url, order_type, pkg_id) VALUES (?, ?, ?, ${NOW}, ${done ? NOW : "NULL"}, ?, ?, ?, ?, ?)`).bind(orderId, Number(ko.totalVnd) || amount, done ? "success" : "pending", done ? "fulfilled" : "pending", ko.email || null, ko.worker_url || ko.workerUrl || null, ko.orderType || "new", ko.pkgId || null).run();
  const pu = ko.pendingUpgrade;
  if (done && pu && Number(pu.amount) > 0 && !(await pendingUpgradeOf(env, orderId))) {
    const targetPkgId = String(pu.targetPackageId || pu.targetPkgId || "unknown");
    await env.DB.prepare(`INSERT INTO order_upgrades (order_id, from_price_vnd, target_package_id, target_price_vnd, upgrade_amount_vnd, status, created_at, fulfillment_status) VALUES (?, ?, ?, 0, ?, 'pending', ${NOW}, 'pending')`).bind(orderId, Number(ko.totalVnd) || 0, targetPkgId, Number(pu.amount)).run();
  }
  return getOrder(env, orderId);
}

export default {
  async fetch(request, env, ctx) {
    env.DB = env.DB || env["payment-db"] || env.payment_db;
    const url = new URL(request.url), CONFIG = getConfig(env), m = request.method, p = url.pathname;
    if (m === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (m === "GET" && p === "/") return new Response("PAYMENT WEBHOOK ONLINE - HANOI UTC+7", { status: 200, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store", ...CORS } });
    if (!env.DB) return json({ ok: false, error: "D1 binding DB is missing" }, 500);
    if (!CONFIG.WEB_API_SECRET && !CONFIG.WEB_API_SECRET2 && !CONFIG.D1_SECRET) return json({ ok: false, error: "Thiếu biến môi trường API secret (WEB_API_SECRET / WEB_API_SECRET2 / D1_SECRET)" }, 500);
    try { await ensureSchema(env); } catch (e) { return json({ ok: false, error: "Schema init failed", details: String(e && e.message || e) }, 500); }

    const A = () => authed(request, CONFIG.WEB_API_SECRET) || authed(request, CONFIG.WEB_API_SECRET2) || (CONFIG.D1_SECRET && authed(request, CONFIG.D1_SECRET));
    const A2 = () => authed(request, CONFIG.WEB_API_SECRET2) || A();
    const body = async () => { try { return await request.json(); } catch { return null; } };

    if (!p.startsWith("/api/") && p !== "/") {
      return new Response("Not Found", { status: 404, headers: CORS });
    }

    if (m === "POST" && p === "/api/admin/init-db") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      schemaPromise = null;
      await ensureSchema(env);
      return json({ ok: true, message: "D1 Schema initialized successfully" });
    }

    if (m === "POST" && p === "/api/test") {
      if (!authed(request, CONFIG.MB_WEBHOOK_SECRET)) return json({ ok: false, error: "Unauthorized" }, 401);
      return json({ ok: true, message: "Authenticated POST received", received: await body() });
    }

    // ---- POST /api/orders : worker website ÄÄng kÃ½ ÄÆ¡n (idempotent & lÆ°u mÃ£ gÃ³i)
    if (m === "POST" && p === "/api/orders") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = await body(); if (!b) return json({ ok: false, error: "Invalid JSON" }, 400);
      const orderId = normalizeOrderId(b.orderId), totalVnd = Number(b.totalVnd);
      const email = b.email || null, targetWeb = b.targetWeb || null, workerUrl = String(b.workerUrl || "").replace(/\/$/, "") || null, orderType = b.orderType === "renew" ? "renew" : "new";
      const pkgId = b.pkgId || b.pkg_id || null;
      if (!isValidOrderId(orderId)) return json({ ok: false, error: "Invalid orderId format" }, 400);
      if (!Number.isSafeInteger(totalVnd) || totalVnd <= 0) return json({ ok: false, error: "Invalid totalVnd" }, 400);
      const ex = await getOrder(env, orderId);
      if (ex) {
        await env.DB.prepare(`UPDATE orders SET email = COALESCE(email, ?), target_web = COALESCE(target_web, ?), worker_url = COALESCE(?, worker_url), pkg_id = COALESCE(pkg_id, ?) WHERE order_id = ?`).bind(email, targetWeb, workerUrl, pkgId, orderId).run();
        if (ex.status === "pending") {
          const rc = await reconcileOrderAfterCreation(env, orderId, Number(ex.total_vnd));
          if (rc.matched) { await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId] }); return json({ ok: true, status: "reconciled", orderId, transactionId: rc.transactionId }); }
        }
        return json({ ok: true, status: "exists", order: ex });
      }
      await env.DB.prepare(`INSERT INTO orders (order_id, total_vnd, status, created_at, fulfillment_status, email, target_web, worker_url, order_type, pkg_id) VALUES (?, ?, 'pending', ${NOW}, 'pending', ?, ?, ?, ?, ?)`).bind(orderId, totalVnd, email, targetWeb, workerUrl, orderType, pkgId).run();
      const rc = await reconcileOrderAfterCreation(env, orderId, totalVnd);
      await logSys(env, "info", "Nháº­n ÄÆ¡n tá»« website", `${orderId} Â· ${totalVnd}${pkgId ? " Â· " + pkgId : ""}`, orderId);
      if (rc.matched) { await logSys(env, "ok", "Khá»p tá»± Äá»ng (tiá»n vÃ o trÆ°á»c)", orderId, orderId); await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId] }); }
      return json({ ok: true, status: "created", orderId, orderStatus: rc.matched ? "success" : "pending", transactionId: rc.transactionId || null });
    }

    // ---- POST /api/upgrades : worker ÄÄng kÃ½ nÃ¢ng gÃ³i (hoÃ n toÃ n Äá»ng, khÃ´ng báº£ng giÃ¡ fix cá»©ng)
    if (m === "POST" && p === "/api/upgrades") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = await body(); if (!b) return json({ ok: false, error: "Invalid JSON" }, 400);
      const orderId = normalizeOrderId(b.orderId), targetPackageId = String(b.targetPackageId || b.targetPkgId || "").trim(), amount = Number(b.amount);
      if (!isValidOrderId(orderId)) return json({ ok: false, error: "Invalid orderId format" }, 400);
      if (!targetPackageId) return json({ ok: false, error: "Missing targetPackageId" }, 400);
      if (!Number.isSafeInteger(amount) || amount <= 0) return json({ ok: false, error: "Invalid amount" }, 400);
      let order = await getOrder(env, orderId);
      if (!order && b.baseOrder) {
        const bo = b.baseOrder;
        await env.DB.prepare(`INSERT OR IGNORE INTO orders (order_id, total_vnd, status, created_at, paid_at, fulfillment_status, email, target_web, worker_url, order_type, pkg_id) VALUES (?, ?, 'success', ${NOW}, ${NOW}, 'fulfilled', ?, ?, ?, ?, ?)`).bind(orderId, Math.max(1, Number(bo.totalVnd) || 1), bo.email || null, bo.targetWeb || null, String(bo.workerUrl || "").replace(/\/$/, "") || null, bo.orderType === "renew" ? "renew" : "new", bo.pkgId || null).run();
        order = await getOrder(env, orderId);
      }
      if (!order) return json({ ok: false, error: "Order not found in D1 (chÆ°a ÄÄng kÃ½)", orderId }, 404);
      if (order.status !== "success") return json({ ok: false, error: "Order is not eligible for upgrade", currentOrderStatus: order.status }, 409);
      const pend = await pendingUpgradeOf(env, orderId);
      if (pend) return json({ ok: true, status: "upgrade_already_pending", upgrade: pend });
      const r = await env.DB.prepare(`INSERT INTO order_upgrades (order_id, from_price_vnd, target_package_id, target_price_vnd, upgrade_amount_vnd, status, created_at, fulfillment_status) VALUES (?, ?, ?, 0, ?, 'pending', ${NOW}, 'pending')`).bind(orderId, Number(order.total_vnd), targetPackageId, amount).run();
      const upgradeId = r.meta.last_row_id;
      await logSys(env, "info", "Nháº­n yÃªu cáº§u nÃ¢ng gÃ³i", `${orderId} â ${targetPackageId} Â· ${amount}`, orderId);
      const early = await env.DB.prepare(`SELECT id FROM transactions WHERE order_id = ? AND status = 'unmatched' AND ABS(amount - ?) <= 1 ORDER BY id ASC LIMIT 1`).bind(orderId, amount).first();
      if (early) {
        const tr = await env.DB.prepare(`UPDATE transactions SET status = 'success', kind = 'upgrade', updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = 'Khá»p tá»± Äá»ng - tiá»n nÃ¢ng gÃ³i vÃ o trÆ°á»c' WHERE id = ? AND status = 'unmatched'`).bind(early.id).run();
        if (tr.meta.changes > 0 && (await upgradeSuccess(env, upgradeId, early.id))) {
          await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId], upgradeIds: [upgradeId] });
          return json({ ok: true, status: "upgrade_success", upgradeId, orderId });
        }
      }
      return json({ ok: true, status: "upgrade_pending", upgradeId, orderId, upgradeAmountVnd: amount });
    }
    if (m === "POST" && p === "/api/admin/upgrades/resolve") { // admin xá»­ lÃ½ tay: success | cancelled
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = (await body()) || {}, st = b.status === "success" ? "success" : "cancelled";
      await env.DB.prepare(`UPDATE order_upgrades SET status = ?, paid_at = ${NOW}, fulfillment_status = 'fulfilled', review_note = 'Admin xá»­ lÃ½ tay' WHERE order_id = ? AND status = 'pending'`).bind(st, normalizeOrderId(b.orderId)).run();
      await logSys(env, "info", "Admin xá»­ lÃ½ nÃ¢ng gÃ³i", `${b.orderId} â ${st}`, b.orderId);
      return json({ ok: true });
    }

    if (m === "GET" && p.startsWith("/api/orders/")) {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const o = await getOrder(env, normalizeOrderId(decodeURIComponent(p.replace("/api/orders/", ""))));
      return o ? json({ ok: true, order: o }) : json({ ok: false, error: "Order not found" }, 404);
    }
    if (m === "GET" && p.startsWith("/api/upgrades/")) {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const id = normalizeOrderId(decodeURIComponent(p.replace("/api/upgrades/", "")));
      const ups = await env.DB.prepare(`SELECT * FROM order_upgrades WHERE order_id = ? ORDER BY id DESC`).bind(id).all();
      return json({ ok: true, orderId: id, upgrades: ups.results || [] });
    }

    // ---- GET /api/admin/transactions (1 cÃ¢u JOIN, há» trá»£ updated_since Äá» admin tháº¥y dÃ²ng cÅ© Äá»i tráº¡ng thÃ¡i)
    if (m === "GET" && p === "/api/admin/transactions") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const status = url.searchParams.get("status"), limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
      const afterId = Number(url.searchParams.get("after_id")), beforeId = Number(url.searchParams.get("before_id")), since = url.searchParams.get("updated_since");
      const cond = [], prm = []; let order = "t.id DESC";
      if (status && status !== "all") { if (status === "review_required" || status === "success_review") cond.push(`t.status IN ('success_review','review_required')`); else { cond.push(`t.status = ?`); prm.push(status); } }
      if (since) { cond.push(`t.updated_at > ?`); prm.push(since); order = "t.updated_at ASC, t.id ASC"; }
      else if (afterId) { cond.push(`t.id > ?`); prm.push(afterId); order = "t.id ASC"; }
      else if (beforeId) { cond.push(`t.id < ?`); prm.push(beforeId); }
      const sql = `SELECT t.*, o.email AS o_email, o.target_web AS o_target_web, o.status AS o_status, o.total_vnd AS o_total, o.created_at AS o_created_at, o.fulfillment_status AS o_fulfill, o.order_type AS o_type, o.worker_url AS o_worker_url FROM transactions t LEFT JOIN orders o ON t.order_id = o.order_id ${cond.length ? "WHERE " + cond.join(" AND ") : ""} ORDER BY ${order} LIMIT ?`;
      const rows = (await env.DB.prepare(sql).bind(...prm, limit).all()).results || [];
      const list = [];
      for (const r of rows) {
        let candidateOrders = [];
        if (r.status === "review_required" || r.status === "success_review") candidateOrders = (await env.DB.prepare(`SELECT order_id, total_vnd, status, created_at FROM orders WHERE status = 'pending' AND ABS(total_vnd - ?) <= 1 ORDER BY id DESC`).bind(r.amount).all()).results || [];
        const tx = { id: r.id, order_id: r.order_id, amount: r.amount, payment_method: r.payment_method, content: r.content, notification: r.notification, status: r.status, kind: r.kind || "new", created_at: r.created_at, updated_at: r.updated_at, reviewed_at: r.reviewed_at, review_note: r.review_note };
        list.push({ ...tx, candidateOrders, matchedOrder: r.order_id && r.o_status ? { order_id: r.order_id, email: r.o_email, target_web: r.o_target_web, status: r.o_status, total_vnd: r.o_total, created_at: r.o_created_at, fulfillment_status: r.o_fulfill, order_type: r.o_type, worker_url: r.o_worker_url } : null });
      }
      return json({ ok: true, count: list.length, transactions: list, serverTime: new Date().toISOString() });
    }
    if (m === "GET" && p === "/api/admin/logs") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const rows = (await env.DB.prepare(`SELECT * FROM sys_logs ORDER BY id DESC LIMIT ?`).bind(Math.min(Number(url.searchParams.get("limit")) || 100, 300)).all()).results || [];
      return json({ ok: true, logs: rows });
    }

    // ---- fulfill helpers (giá»¯ tÆ°Æ¡ng thÃ­ch)
    if (m === "GET" && p === "/api/admin/ready_to_fulfill") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const o = await env.DB.prepare(`SELECT order_id, total_vnd, status, paid_at, fulfillment_status, worker_url FROM orders WHERE status = 'success' AND (fulfillment_status IS NULL OR fulfillment_status != 'fulfilled') ORDER BY paid_at ASC`).all();
      const u = await env.DB.prepare(`SELECT id, order_id, status, fulfillment_status FROM order_upgrades WHERE status = 'success' AND (fulfillment_status IS NULL OR fulfillment_status != 'fulfilled')`).all();
      return json({ ok: true, newOrders: o.results || [], upgrades: u.results || [] });
    }
    if (m === "POST" && p === "/api/admin/reset_fulfillment") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = (await body()) || {};
      for (const id of b.orderIds || []) await env.DB.prepare(`UPDATE orders SET fulfillment_status = 'pending', fulfill_tries = 0 WHERE order_id = ? AND status = 'success' AND fulfillment_status != 'fulfilled'`).bind(normalizeOrderId(id)).run();
      return json({ ok: true });
    }
    if (m === "POST" && p === "/api/admin/push_fulfillment") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = (await body()) || {};
      return json({ ok: true, notification: await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: (b.orderIds || []).map(normalizeOrderId), upgradeIds: b.upgradeIds || [] }) });
    }
    if (m === "POST" && p === "/api/admin/transactions/delete") {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = (await body()) || {}, ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(Number).filter((x) => Number.isSafeInteger(x) && x > 0);
      if (!ids.length || ids.length > 200) return json({ ok: false, error: "ids pháº£i lÃ  máº£ng 1-200 sá»" }, 400);
      const r = await env.DB.prepare(`DELETE FROM transactions WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).run();
      await logSys(env, "warn", "Admin xÃ³a giao dá»ch", `${ids.join(",")} (${r.meta.changes} dÃ²ng)`);
      return json({ ok: true, requested: ids.length, deleted: r.meta.changes });
    }
    if (m === "POST" && p === "/api/admin/transactions/delete_batch") {
      if (!authed(request, CONFIG.ADMIN_DELETE_SECRET)) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = await body(), ids = (b && b.ids) || [];
      if (!Array.isArray(ids) || !ids.length || ids.length > 500) return json({ ok: false, error: "ids pháº£i lÃ  máº£ng 1-500 pháº§n tá»­" }, 400);
      const valid = ids.map(Number).filter((x) => Number.isSafeInteger(x) && x > 0);
      if (!valid.length) return json({ ok: false, error: "KhÃ´ng cÃ³ ID há»£p lá»" }, 400);
      const r = await env.DB.prepare(`DELETE FROM transactions WHERE id IN (${valid.map(() => "?").join(",")}) AND (order_id IS NULL OR order_id = '') AND datetime(created_at) <= datetime('now', '+7 hours', '-24 hours')`).bind(...valid).run();
      return json({ ok: true, requested: valid.length, deleted: r.meta.changes, blocked: valid.length - r.meta.changes });
    }
    if (m === "POST" && p === "/api/internal/fulfillment_callback") { // giá»¯ Äá» tÆ°Æ¡ng thÃ­ch, D1 tá»± cáº­p nháº­t tráº¡ng thÃ¡i rá»i
      if (!A2()) return json({ ok: false, error: "Unauthorized" }, 401);
      return json({ ok: true });
    }

    // ---- POST /api/mbbank (MacroDroid)
    if (m === "POST" && p === "/api/mbbank") {
      if (!CONFIG.MB_WEBHOOK_SECRET) return json({ ok: false, error: "Thiếu biến môi trường MB_WEBHOOK_SECRET" }, 500);
      if (!authed(request, CONFIG.MB_WEBHOOK_SECRET)) return json({ ok: false, error: "Unauthorized" }, 401);
      const b = await body(); if (!b) return json({ ok: false, error: "Invalid JSON" }, 400);
      const notification = String(b.notification || "").trim();
      if (!notification) return json({ ok: false, error: "Missing notification" }, 400);
      const { amount, content, orderId } = parseBankNotification(notification), paymentMethod = String(b.paymentMethod || "MBBank").trim();
      if (!Number.isSafeInteger(amount) || amount <= 0) return json({ ok: false, error: "Amount not found or invalid" }, 400);

      const txId = await insertTransaction(env, { orderId, amount, paymentMethod, content, notification, status: "received" });
      await logSys(env, "info", "Nháº­n biáº¿n Äá»ng sá» dÆ°", `+${amount} Â· ${orderId || "khÃ´ng cÃ³ mÃ£ ÄÆ¡n"}`, orderId);
      const dup = await env.DB.prepare(`SELECT id FROM transactions WHERE notification = ? AND id != ? LIMIT 1`).bind(notification, txId).first();
      if (dup) { await updateTx(env, txId, "duplicate_payment", "TrÃ¹ng thÃ´ng bÃ¡o tá»« webhook/app Äiá»n thoáº¡i"); return json({ ok: true, status: "duplicate_payment", transactionId: txId }); }

      if (orderId) {
        let order = await getOrder(env, orderId);
        if (!order) { // D1 chÆ°a cÃ³ ÄÆ¡n -> chá»c tháº³ng Supabase láº¥y ÄÆ¡n
          const ko = await fetchOrderFromSource(env, CONFIG, orderId);
          if (ko) order = await adoptOrderFromSource(env, ko, orderId, amount);
        }
        if (!order) { await updateTx(env, txId, "unmatched", "ChÆ°a cÃ³ mÃ£ ÄÆ¡n - chá» ÄÆ¡n tá»i rá»i tá»± khá»p"); return json({ ok: true, status: "unmatched", transactionId: txId, orderId, amount }); }

        if (order.status === "success") {
          let up = await pendingUpgradeOf(env, orderId);
          if (!up) { const ko2 = await fetchOrderFromSource(env, CONFIG, orderId); if (ko2 && ko2.pendingUpgrade) { await adoptOrderFromSource(env, ko2, orderId, amount); up = await pendingUpgradeOf(env, orderId); } }
          if (up) {
            const exp = Number(up.upgrade_amount_vnd);
            if (Math.abs(amount - exp) > 1) { await updateTx(env, txId, "amount_mismatch", `Sai sá» tiá»n nÃ¢ng gÃ³i (cáº§n ${exp}, nháº­n ${amount})`, orderId, "upgrade"); return json({ ok: true, status: "upgrade_amount_mismatch", transactionId: txId, expected: exp, received: amount }); }
            await updateTx(env, txId, "success", "Khá»p thanh toÃ¡n nÃ¢ng gÃ³i", orderId, "upgrade");
            if (!(await upgradeSuccess(env, up.id, txId))) { await updateTx(env, txId, "already_processed", "Upgrade ÄÃ£ ÄÆ°á»£c xá»­ lÃ½"); return json({ ok: true, status: "already_processed", transactionId: txId }); }
            await logSys(env, "ok", "Khá»p nÃ¢ng gÃ³i", `${orderId} Â· ${amount}`, orderId);
            await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId], upgradeIds: [up.id] });
            return json({ ok: true, status: "upgrade_success", transactionId: txId, orderId, amount });
          }
          await updateTx(env, txId, "unmatched", "ÄÆ¡n ÄÃ£ thanh toÃ¡n tá»« trÆ°á»c. Khoáº£n má»i chÆ°a rÃµ má»¥c ÄÃ­ch (cÃ³ thá» lÃ  nÃ¢ng gÃ³i chÆ°a táº¡o trÃªn web) - sáº½ tá»± khá»p khi khÃ¡ch táº¡o yÃªu cáº§u nÃ¢ng gÃ³i", orderId, "upgrade");
          return json({ ok: true, status: "unmatched", reason: "possible_upgrade", transactionId: txId, orderId, amount });
        }
        if (order.status === "failed") { await updateTx(env, txId, "invalid_order_status", "ÄÆ¡n hÃ ng ÄÃ£ bá» tá»« chá»i", orderId); return json({ ok: true, status: "invalid_order_status", transactionId: txId }); }
        if (Math.abs(amount - Number(order.total_vnd)) > 1) { await updateTx(env, txId, "amount_mismatch", `Sai sá» tiá»n (ÄÆ¡n: ${order.total_vnd}, Nháº­n: ${amount})`, orderId); return json({ ok: true, status: "amount_mismatch", transactionId: txId, expected: Number(order.total_vnd), received: amount }); }

        // Kiá»m tra Äá»i chiáº¿u mÃ£ gÃ³i tá»« ná»i dung chuyá»n khoáº£n náº¿u cÃ³
        const pkgInContent = extractPkgCodeFromContent(content);
        if (pkgInContent && order.pkg_id && pkgInContent !== normalizePkgCode(order.pkg_id)) {
          await updateTx(env, txId, "review_required", `TrÃ¹ng mÃ£ ÄÆ¡n nhÆ°ng sai mÃ£ gÃ³i (Ná»i dung: ${pkgInContent}, ÄÆ¡n: ${order.pkg_id})`, orderId);
          return json({ ok: true, status: "review_required", reason: "pkg_mismatch", transactionId: txId, orderId });
        }

        await updateTx(env, txId, "success", "Khá»p thanh toÃ¡n thÃ nh cÃ´ng", orderId, order.order_type === "renew" ? "renew" : "new");
        const ur = await env.DB.prepare(`UPDATE orders SET status = 'success', paid_at = ${NOW}, fulfillment_status = 'pending', fulfill_at = ${NOW}, fulfill_tries = 0 WHERE order_id = ? AND status = 'pending'`).bind(orderId).run();
        if (ur.meta.changes === 0) { await updateTx(env, txId, "already_processed", "ÄÆ¡n vá»«a ÄÆ°á»£c xá»­ lÃ½ trÆ°á»c ÄÃ³"); return json({ ok: true, status: "already_processed", transactionId: txId }); }
        await logSys(env, "ok", "Khá»p thanh toÃ¡n", `${orderId} Â· ${amount}`, orderId);
        await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId] });
        return json({ ok: true, status: "success", transactionId: txId, orderId, amount });
      }

      // khÃ´ng cÃ³ mÃ£ ÄÆ¡n: dÃ² theo sá» tiá»n + time-window 60 phÃºt
      const cands = (await env.DB.prepare(`SELECT order_id, total_vnd, pkg_id, status, created_at FROM orders WHERE status = 'pending' AND ABS(total_vnd - ?) <= 1 AND datetime(created_at) >= datetime('now', '+7 hours', '-60 minutes') ORDER BY id ASC`).bind(amount).all()).results || [];
      if (!cands.length) {
        const older = await env.DB.prepare(`SELECT id FROM orders WHERE status = 'pending' AND ABS(total_vnd - ?) <= 1 LIMIT 1`).bind(amount).first();
        if (older) {
          await updateTx(env, txId, "review_required", "CÃ³ ÄÆ¡n chá» cÃ¹ng sá» tiá»n nhÆ°ng ÄÃ£ quÃ¡ 60 phÃºt - cáº§n Admin kiá»m tra trÃ¡nh gÃ¡n nháº§m");
          return json({ ok: true, status: "review_required", reason: "expired_time_window", transactionId: txId, amount });
        }
        await updateTx(env, txId, "unmatched", "KhÃ´ng cÃ³ mÃ£ ÄÆ¡n vÃ  khÃ´ng ÄÆ¡n chá» nÃ o trong vÃ²ng 60 phÃºt trÃ¹ng sá» tiá»n");
        return json({ ok: true, status: "unmatched", transactionId: txId, amount });
      }
      if (cands.length > 1) {
        // Nhiá»u ÄÆ¡n cÃ¹ng sá» tiá»n: kiá»m tra xem ná»i dung CK cÃ³ mÃ£ gÃ³i Äá» nháº­n diá»n chÃ­nh xÃ¡c khÃ´ng
        const pkgInContent = extractPkgCodeFromContent(content);
        if (pkgInContent) {
          const matchedByPkg = cands.filter(c => c.pkg_id && normalizePkgCode(c.pkg_id) === pkgInContent);
          if (matchedByPkg.length === 1) {
            await updateTx(env, txId, "success_review", `Khá»p theo sá» tiá»n + mÃ£ gÃ³i (${pkgInContent}) trong 60 phÃºt - chá» duyá»t`, matchedByPkg[0].order_id);
            return json({ ok: true, status: "success_review", transactionId: txId, orderId: matchedByPkg[0].order_id });
          }
        }
        await updateTx(env, txId, "review_required", "Nhiá»u ÄÆ¡n cÃ¹ng sá» tiá»n trong 60 phÃºt - cáº§n Admin xem");
        return json({ ok: true, status: "review_required", transactionId: txId, candidates: cands.length });
      }
      
      // 1 ÄÆ¡n duy nháº¥t trong 60 phÃºt: kiá»m tra chÃ©o mÃ£ gÃ³i náº¿u cÃ³
      const singleOrder = cands[0];
      const pkgInContent = extractPkgCodeFromContent(content);
      if (pkgInContent && singleOrder.pkg_id && pkgInContent !== normalizePkgCode(singleOrder.pkg_id)) {
        await updateTx(env, txId, "review_required", `TrÃ¹ng sá» tiá»n nhÆ°ng sai mÃ£ gÃ³i (Ná»i dung: ${pkgInContent}, ÄÆ¡n: ${singleOrder.pkg_id})`, singleOrder.order_id);
        return json({ ok: true, status: "review_required", reason: "pkg_mismatch", transactionId: txId, orderId: singleOrder.order_id });
      }

      await updateTx(env, txId, "success_review", "1 ÄÆ¡n duy nháº¥t trÃ¹ng sá» tiá»n trong 60 phÃºt - chá» Admin kiá»m tra", singleOrder.order_id);
      return json({ ok: true, status: "success_review", transactionId: txId, orderId: singleOrder.order_id });
    }

    // ---- Admin Ã©p khá»p / tá»« chá»i
    let mt = p.match(/^\/api\/admin\/reviews\/(\d+)\/approve$/);
    if (m === "POST" && mt) {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const rid = Number(mt[1]), b = (await body()) || {};
      const tx = await env.DB.prepare(`SELECT * FROM transactions WHERE id = ?`).bind(rid).first();
      if (!tx) return json({ ok: false, error: "KhÃ´ng tÃ¬m tháº¥y giao dá»ch" }, 404);
      const orderId = normalizeOrderId(b.orderId || tx.order_id || "");
      if (!isValidOrderId(orderId)) return json({ ok: false, error: "MÃ£ ÄÆ¡n pháº£i dáº¡ng DH + 10 kÃ½ tá»±" }, 400);
      const note = String(b.note || "ÄÆ°á»£c Duyá»t Ãp bá»i Admin").trim();
      let order = await getOrder(env, orderId);
      if (!order) { await env.DB.prepare(`INSERT INTO orders (order_id, total_vnd, status, created_at, fulfillment_status, worker_url, order_type) VALUES (?, ?, 'pending', ${NOW}, 'pending', ?, 'new')`).bind(orderId, Number(tx.amount), CONFIG.WEBSITE_WORKER_URL || null).run(); order = await getOrder(env, orderId); }
      const up = order.status === "success" ? await pendingUpgradeOf(env, orderId) : null;
      if (up) {
        await env.DB.prepare(`UPDATE transactions SET order_id = ?, status = 'success', kind = 'upgrade', updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = ? WHERE id = ?`).bind(orderId, note, rid).run();
        await upgradeSuccess(env, up.id, rid);
        await logSys(env, "ok", "Admin Ã©p khá»p nÃ¢ng gÃ³i", `#${rid} â ${orderId}`, orderId);
        await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId], upgradeIds: [up.id] });
        return json({ ok: true, status: "approved_upgrade", orderId });
      }
      await env.DB.prepare(`UPDATE transactions SET order_id = ?, status = 'success', kind = ?, updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = ? WHERE id = ?`).bind(orderId, order.order_type === "renew" ? "renew" : "new", note, rid).run();
      await markOrderSuccess(env, orderId, note);
      await logSys(env, "ok", "Admin Ã©p khá»p", `#${rid} â ${orderId}`, orderId);
      await notifyFulfillmentReady(env, CONFIG, ctx, { orderIds: [orderId] });
      return json({ ok: true, status: "approved", transactionId: rid, orderId });
    }
    mt = p.match(/^\/api\/admin\/reviews\/(\d+)\/reject$/);
    if (m === "POST" && mt) {
      if (!A()) return json({ ok: false, error: "Unauthorized" }, 401);
      const rid = Number(mt[1]), b = (await body()) || {}, note = String(b.note || "Bá» Ãp Tá»« Chá»i bá»i Admin").trim();
      const tx = await env.DB.prepare(`SELECT * FROM transactions WHERE id = ?`).bind(rid).first();
      if (!tx) return json({ ok: false, error: "KhÃ´ng tÃ¬m tháº¥y giao dá»ch" }, 404);
      await env.DB.prepare(`UPDATE transactions SET status = 'rejected', updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = ? WHERE id = ?`).bind(note, rid).run();
      if (tx.order_id) await env.DB.prepare(`UPDATE orders SET status = 'failed', reviewed_at = ${NOW}, review_note = ? WHERE order_id = ? AND status = 'pending'`).bind(note, normalizeOrderId(tx.order_id)).run();
      await logSys(env, "warn", "Admin tá»« chá»i giao dá»ch", `#${rid}`, tx.order_id);
      return json({ ok: true, status: "rejected", transactionId: rid });
    }

    return json({ ok: false, error: "Not found", path: p }, 404);
  },

  // Cron má»i 2 phÃºt: khá»p láº¡i giao dá»ch unmatched + thá»­ láº¡i cáº¥p link (Tá»i Æ°u CPU cá»±c tháº¥p)
  async scheduled(event, env, ctx) {
    env.DB = env.DB || env["payment-db"] || env.payment_db;
    const CONFIG = getConfig(env);
    if (!env.DB || !CONFIG.WEB_API_SECRET2) return;
    let matched = 0, retried = 0;

    // 1. Khá»p tá»± Äá»ng ÄÆ¡n pending báº±ng 1 cÃ¢u INNER JOIN duy nháº¥t (khÃ´ng láº·p SELECT)
    const matchedPending = (await env.DB.prepare(`
      SELECT t.id AS tx_id, o.order_id, o.order_type
      FROM transactions t
      INNER JOIN orders o ON t.order_id = o.order_id
      WHERE t.status = 'unmatched' AND o.status = 'pending' AND ABS(t.amount - o.total_vnd) <= 1
      LIMIT 20
    `).all()).results || [];

    for (const row of matchedPending) {
      const r = await env.DB.prepare(`UPDATE transactions SET status = 'success', kind = ?, updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = 'Khá»p tá»± Äá»ng (cron)' WHERE id = ? AND status = 'unmatched'`).bind(row.order_type === "renew" ? "renew" : "new", row.tx_id).run();
      if (r.meta.changes > 0) {
        await markOrderSuccess(env, row.order_id, "Khá»p tá»± Äá»ng (cron)");
        await triggerFulfillment(env, CONFIG, { orderIds: [row.order_id] });
        matched++;
        await logSys(env, "ok", "Cron khá»p láº¡i giao dá»ch", `#${row.tx_id} â ${row.order_id}`, row.order_id);
      }
    }

    // 2. Khá»p tá»± Äá»ng nÃ¢ng gÃ³i pending báº±ng 1 cÃ¢u INNER JOIN duy nháº¥t
    const matchedUpgrades = (await env.DB.prepare(`
      SELECT t.id AS tx_id, u.id AS upgrade_id, u.order_id
      FROM transactions t
      INNER JOIN order_upgrades u ON t.order_id = u.order_id
      WHERE t.status = 'unmatched' AND u.status = 'pending' AND ABS(t.amount - u.upgrade_amount_vnd) <= 1
      LIMIT 10
    `).all()).results || [];

    for (const row of matchedUpgrades) {
      const r = await env.DB.prepare(`UPDATE transactions SET status = 'success', kind = 'upgrade', updated_at = ${NOW}, reviewed_at = ${NOW}, review_note = 'Khá»p nÃ¢ng gÃ³i tá»± Äá»ng (cron)' WHERE id = ? AND status = 'unmatched'`).bind(row.tx_id).run();
      if (r.meta.changes > 0 && (await upgradeSuccess(env, row.upgrade_id, row.tx_id))) {
        await triggerFulfillment(env, CONFIG, { orderIds: [row.order_id], upgradeIds: [row.upgrade_id] });
        matched++;
        await logSys(env, "ok", "Cron khá»p láº¡i nÃ¢ng gÃ³i", `#${row.tx_id} â ${row.order_id}`, row.order_id);
      }
    }

    // 3. Thá»­ láº¡i cáº¥p link cho ÄÆ¡n thÃ nh cÃ´ng
    const retry = `(fulfillment_status IN ('retry','waiting_metadata','pending') OR (fulfillment_status = 'processing' AND fulfill_at < datetime('now','+7 hours','-10 minutes'))) AND (fulfill_at IS NULL OR fulfill_at < datetime('now','+7 hours','-1 minutes')) AND fulfill_tries < 20`;
    const os = (await env.DB.prepare(`SELECT order_id FROM orders WHERE status = 'success' AND ${retry} LIMIT 15`).all()).results || [];
    const us = (await env.DB.prepare(`SELECT id FROM order_upgrades WHERE status = 'success' AND ${retry} LIMIT 10`).all()).results || [];
    for (const o of os) await env.DB.prepare(`UPDATE orders SET fulfill_tries = COALESCE(fulfill_tries,0) + 1 WHERE order_id = ?`).bind(o.order_id).run();
    for (const u of us) await env.DB.prepare(`UPDATE order_upgrades SET fulfill_tries = COALESCE(fulfill_tries,0) + 1 WHERE id = ?`).bind(u.id).run();
    if (os.length || us.length) { retried = os.length + us.length; await triggerFulfillment(env, CONFIG, { orderIds: os.map((o) => o.order_id), upgradeIds: us.map((u) => u.id) }); }

    // 4. Dá»n dáº¹p log: Chá» cháº¡y ngáº«u nhiÃªn 5% (khoáº£ng 40 phÃºt má»i cháº¡y 1 láº§n Äá» tiáº¿t kiá»m CPU)
    if (Math.random() < 0.05) {
      await env.DB.prepare(`DELETE FROM sys_logs WHERE id < (SELECT COALESCE(MAX(id), 0) - 1500 FROM sys_logs)`).run();
    }
    if (matched || retried) await logSys(env, "info", "Cron D1", `khá»p láº¡i ${matched} Â· thá»­ láº¡i cáº¥p link ${retried}`);
  }
};