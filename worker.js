// v4 — 2026-11-04 17:50 (UTC+7) — Quản lý Gift Rules quà tặng theo gói, đồng bộ snapshot HSD & hoàn thiện vòng đời Link Sub đa đơn
//   link lifecycle chống "link đã xóa quay lại" (tombstone DELETED_LINKS + /api/admin/link/delete atomic + Cron persist sớm), Rà quét & Map lại (fields, email+hạn, cả 3 Info qua vệ tinh), quota mail trả lỗi rõ (không còn Unexpected token '<'), dock ảnh.
// CÁCH DÁN: trong file worker hiện tại, XÓA toàn bộ từ dòng đầu tiên đến ngay TRƯỚC dòng chú thích "// YAML"
// (gồm cả dòng "// =====" nằm liền trên chữ "// YAML"), rồi dán toàn bộ file này vào chỗ đó. GIỮ NGUYÊN mọi thứ từ "// YAML" trở xuống.
// Biến môi trường (Settings > Variables > Secret): ADMIN_PASSWORD, WEB_API_SECRET2, D1_URL, D1_SECRET, GH_PAT, CF_API_TOKEN
// Biến thường: WEB_INDEX = 1 | 2 | 3, ADMIN_EMAIL (không bắt buộc), PUBLIC_WORKER_URL, CF_ACCOUNT_ID, KV_NAMESPACE_ID, WORKER_SCRIPT_NAME, D1_DATABASE_ID
// Cron Trigger: */15 * * * *
const getKV = (env) => env && (env.VPN_KV3 || env.VPN_KV || env.KV);

// ====================================================================
// SUPABASE CLIENT ĐẦY ĐỦ TÍNH NĂNG (RPC QUOTA & DATABASE)
// ====================================================================
function cleanOrderForSupabase(o) {
  if (!o || typeof o !== "object") return o;
  const c = { ...o };
  // Chuẩn hóa kiểu tiền tệ: Tránh gửi chuỗi rỗng "" vào cột BIGINT / NUMERIC
  if (c.totalVnd === "" || c.totalVnd === undefined || c.totalVnd === null || isNaN(Number(c.totalVnd))) {
    c.totalVnd = null;
  } else {
    c.totalVnd = Math.round(Number(c.totalVnd));
  }
  if (c.totalCny === "" || c.totalCny === undefined || c.totalCny === null || isNaN(Number(c.totalCny))) {
    c.totalCny = null;
  } else {
    c.totalCny = Math.round(Number(c.totalCny) * 100) / 100;
  }
  if (typeof c.lockInfo === "object" && c.lockInfo !== null) {
    c.lockInfo = JSON.stringify(c.lockInfo);
  }
  if (typeof c.expFinal === "boolean") {
    c.expFinal = c.expFinal ? "true" : "false";
  }
  // Loại bỏ các trường tính giá nội bộ không có trong bảng ALL_ORDERS của Supabase để tránh lỗi PGRST204
  delete c.originalVnd;
  delete c.discountVnd;
  delete c.couponCode;
  return c;
}

function getSupabase(env, isTest = false) {
  // Chuẩn hóa URL: chấp nhận cả URL gốc lẫn URL đã có /rest/v1
  const rawUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || (env.SUPABASE_PROJECT_REF ? `https://${env.SUPABASE_PROJECT_REF}.supabase.co` : "");

  const baseUrl = String(rawUrl)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");

  const url = baseUrl ? `${baseUrl}/rest/v1` : "";

  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || "";

  if (!url || !key) return null;

  // isTest=true chỉ thao tác bảng test
  const table = isTest ? "ALL_ORDERS_TEST" : "ALL_ORDERS";

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  async function readError(res, fallback = "Supabase request failed") {
    const body = await res.text().catch(() => "");
    return `HTTP ${res.status}: ${body.slice(0, 500) || fallback}`;
  }

  return {
    async getAll() {
      const res = await fetch(`${url}/${table}?select=*&order=createdTs.desc&limit=5000`, { headers });

      if (!res.ok) {
        throw new Error(`Supabase getAll: ${await readError(res, "Không lấy được dữ liệu")}`);
      }

      return await res.json();
    },
    async getOrdersByEmail(email, limit = 50) {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
      const em = encodeURIComponent(String(email || "").trim());
      const res = await fetch(`${url}/${table}?select=*&email=ilike.${em}&order=createdTs.desc&limit=${safeLimit}`, { headers });

      if (!res.ok) {
        throw new Error(`Supabase getOrdersByEmail: ${await readError(res, "Không lấy được đơn theo email")}`);
      }

      return await res.json();
    },
    async listOrders({ status, search, limit = 50, offset = 0 } = {}) {
      const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 500));
      const safeOffset = Math.max(0, Number(offset) || 0);

      let query = `${url}/${table}?select=*&order=createdTs.desc` + `&limit=${safeLimit}&offset=${safeOffset}`;

      if (status && status !== "all") {
        query += `&status=eq.${encodeURIComponent(status)}`;
      }

      if (search) {
        const s = encodeURIComponent(`*${search}*`);
        query += `&or=(id.ilike.${s},email.ilike.${s},nickname.ilike.${s},zalo.ilike.${s})`;
      }

      const res = await fetch(query, { headers: { ...headers, Prefer: "count=exact" } });

      if (!res.ok) {
        throw new Error(`Supabase listOrders: ${await readError(res, "Không lấy được danh sách đơn")}`);
      }

      const contentRange = res.headers.get("content-range") || "";
      const totalPart = contentRange.split("/")[1];
      const count = totalPart && totalPart !== "*" ? Number(totalPart) : null;

      return {
        data: await res.json(),
        count,
        limit: safeLimit,
        offset: safeOffset
      };
    },
    async getOrder(id) {
      const res = await fetch(`${url}/${table}?id=eq.${encodeURIComponent(id)}&limit=1`, { headers });

      if (!res.ok) {
        throw new Error(`Supabase getOrder: ${await readError(res, "Không tìm được đơn")}`);
      }

      const items = await res.json();
      return Array.isArray(items) && items.length ? items[0] : null;
    },
    async upsert(order) {
      const cleaned = cleanOrderForSupabase(order);

      const res = await fetch(`${url}/${table}`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify(cleaned)
      });

      // Không được trả null khi ghi thất bại:
      // lỗi phải được ném ra để giao diện không báo thành công giả.
      if (!res.ok) {
        throw new Error(`Supabase upsert: ${await readError(res, "Ghi dữ liệu thất bại")}`);
      }

      const result = await res.json().catch(() => []);
      return Array.isArray(result) ? (result[0] || cleaned) : cleaned;
    },
    async delete (id, rawId) {
      const query = rawId && rawId !== id ? `or=(id.eq.${encodeURIComponent(rawId)},id.eq.${encodeURIComponent(id)})` : `id=eq.${encodeURIComponent(id)}`;

      const res = await fetch(`${url}/${table}?${query}`, { method: "DELETE", headers });

      if (!res.ok) {
        throw new Error(`Supabase delete: ${await readError(res, "Xóa dữ liệu thất bại")}`);
      }

      return true;
    },
    async ping() {
      const startedAt = Date.now();

      try {
        const res = await fetch(`${url}/${table}?select=id&limit=1`, { headers });

        if (!res.ok) {
          return {
            ok: false,
            status: res.status,
            error: await readError(res, "Không kết nối được bảng")
          };
        }

        const countRes = await fetch(`${url}/${table}?select=count`, { headers: { ...headers, Prefer: "count=exact" } });

        let count = null;

        if (countRes.ok) {
          const contentRange = countRes.headers.get("content-range") || "";
          const totalPart = contentRange.split("/")[1];

          if (totalPart && totalPart !== "*") {
            count = Number(totalPart);
          }
        }

        return {
          ok: true,
          ms: Date.now() - startedAt,
          count,
          table,
          url: `${url}/${table}`
        };
      } catch (e) {
        return { ok: false, status: 0, error: e?.message || String(e) };
      }
    },
    async getRpcQuota() {
      const res = await fetch(`${url}/rpc/get_db_quota`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" }
      });

      if (!res.ok) {
        throw new Error(`Supabase getRpcQuota: ${await readError(res, "RPC quota thất bại")}`);
      }

      return await res.json();
    },
    async cloneProdToTest() {
      // Chỉ xóa dữ liệu trong bảng TEST.
      const clearRes = await fetch(`${url}/ALL_ORDERS_TEST?id=not.is.null`, { method: "DELETE", headers });

      if (!clearRes.ok) {
        throw new Error(`Clone: không xóa được kho TEST: ${
            await readError(clearRes, "Xóa kho test thất bại")
          }`);
      }

      // Đọc dữ liệu từ kho PROD.
      const prodRes = await fetch(`${url}/ALL_ORDERS?select=*&limit=5000`, { headers });

      if (!prodRes.ok) {
        throw new Error(`Clone: không đọc được kho PROD: ${
            await readError(prodRes, "Đọc kho thật thất bại")
          }`);
      }

      const prod = await prodRes.json();

      if (!Array.isArray(prod)) {
        throw new Error("Clone: dữ liệu PROD trả về không phải mảng");
      }

      if (prod.length === 0) {
        return 0;
      }

      // Ghi từng nhóm 100 đơn vào bảng TEST.
      for (let i = 0; i < prod.length; i += 100) {
        const batch = prod.slice(i, i + 100);

        const writeRes = await fetch(`${url}/ALL_ORDERS_TEST`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(batch)
        });

        if (!writeRes.ok) {
          throw new Error(`Clone: ghi kho TEST thất bại ở nhóm ${i + 1}–${i + batch.length}: ${
              await readError(writeRes, "Ghi kho test thất bại")
            }`);
        }
      }

      // Kiểm tra số dòng thực tế sau khi ghi.
      const verifyRes = await fetch(`${url}/ALL_ORDERS_TEST?select=id`, { headers: { ...headers, Prefer: "count=exact" } });

      if (!verifyRes.ok) {
        throw new Error(`Clone: không xác minh được kho TEST: ${
            await readError(verifyRes, "Xác minh kho test thất bại")
          }`);
      }

      const contentRange = verifyRes.headers.get("content-range") || "";
      const totalPart = contentRange.split("/")[1];
      const actualCount = totalPart && totalPart !== "*" ? Number(totalPart) : null;

      if (actualCount !== null && actualCount < prod.length) {
        throw new Error(`Clone chưa đủ dữ liệu: PROD=${prod.length}, TEST=${actualCount}`);
      }

      return prod.length;
    },
    async clearTest() {
      const res = await fetch(`${url}/ALL_ORDERS_TEST?id=not.is.null`, { method: "DELETE", headers });

      if (!res.ok) {
        throw new Error(`Supabase clearTest: ${await readError(res, "Xóa kho test thất bại")}`);
      }

      return true;
    }
  };
}

async function pingSupabase(env, isTest = false) {
  const sb = getSupabase(env, isTest);
  if (!sb) {
    const hasUrl = !!(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_PROJECT_REF);
    const hasKey = !!(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY || env.SUPABASE_ANON_KEY);
    return {
      ok: false,
      status: 0,
      error: !hasKey ? "Chưa cấu hình SUPABASE_KEY / SUPABASE_SERVICE_ROLE_KEY" : (!hasUrl ? "Chưa cấu hình SUPABASE_URL / SUPABASE_PROJECT_REF" : "Thiếu biến cấu hình Supabase")
    };
  }
  return await sb.ping();
}

// ====================================================================
// TELEGRAM BOT BACKUP & TEST MODULE
// ====================================================================
async function sendTelegramMessage(env, text) {
  if (!(env.TELEGRAM_BOT_TOKEN || env.TG_BOT_TOKEN) || !(env.TELEGRAM_CHAT_ID || env.TG_CHAT_ID)) return {
    ok: false,
    error: "Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID"
  };
  const res = await fetch(`https://api.telegram.org/bot${(env.TELEGRAM_BOT_TOKEN || env.TG_BOT_TOKEN)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: (env.TELEGRAM_CHAT_ID || env.TG_CHAT_ID),
      text,
      parse_mode: "HTML"
    })
  });
  return res.json().catch(() => ({ ok: false }));
}

// Gửi nhiều file gộp chung 1 bong bóng tin nhắn duy nhất bằng sendMediaGroup
async function sendTelegramMediaGroup(env, filesWithCaption) {
  if (!(env.TELEGRAM_BOT_TOKEN || env.TG_BOT_TOKEN) || !(env.TELEGRAM_CHAT_ID || env.TG_CHAT_ID)) return {
    ok: false,
    error: "Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID"
  };
  const formData = new FormData();
  formData.append("chat_id", (env.TELEGRAM_CHAT_ID || env.TG_CHAT_ID));

  const mediaList = filesWithCaption.map((f, i) => {
    const attachName = `file_${i}`;
    const blob = new Blob([f.content], { type: f.mimeType || "application/octet-stream" });
    formData.append(attachName, blob, f.filename);
    const item = { type: "document", media: `attach://${attachName}` };
    if (f.caption) {
      item.caption = f.caption;
      item.parse_mode = "HTML";
    }
    return item;
  });

  formData.append("media", JSON.stringify(mediaList));
  const res = await fetch(`https://api.telegram.org/bot${(env.TELEGRAM_BOT_TOKEN || env.TG_BOT_TOKEN)}/sendMediaGroup`, { method: "POST", body: formData });
  return res.json().catch(() => ({ ok: false }));
}

async function runTelegramBackup(env, actionReason = "Admin gửi thủ công", detailDiff = "") {
  const KV = getKV(env);
  const isTest = (await KV.get("TEST_MODE_ACTIVE")) === "1";
  const sb = getSupabase(env, isTest);
  let orders = [];
  if (sb) {
    try {
      orders = await sb.getAll();
    } catch {}
  }

  const now = new Date(Date.now() + 7 * 36e5);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}_${m}_${d}`;
  const dayKey = `${d}_${m}_${y}`;

  let stt = 1;
  let prevCount = null;
  const prefix = isTest ? "TG_BACKUP_TEST" : "TG_BACKUP_PROD";
  if (KV) {
    const lastDate = await KV.get(`${prefix}_LAST_DATE`);
    const lastStt = Number(await KV.get(`${prefix}_LAST_STT`)) || 0;
    const lastCount = Number(await KV.get(`${prefix}_LAST_COUNT`));
    if (!isNaN(lastCount)) prevCount = lastCount;
    if (lastDate === dayKey) {
      stt = lastStt + 1;
    }
    await KV.put(`${prefix}_LAST_DATE`, dayKey);
    await KV.put(`${prefix}_LAST_STT`, String(stt));
    await KV.put(`${prefix}_LAST_COUNT`, String(orders.length));
    await KV.put(`LAST_ORDER_BACKUP_TS`, String(Date.now()));
  }
  const sttStr = String(stt).padStart(2, "0");
  const envTag = isTest ? "TEST" : "PROD";
  const keyTitle = `#ALL_ORDERS_${envTag}_${dayKey}_${sttStr}`;

  let diffNote = detailDiff;
  if (!diffNote) {
    if (prevCount === null) {
      diffNote = `Khởi tạo mốc theo dõi (${orders.length} đơn).`;
    } else {
      const diff = orders.length - prevCount;
      if (diff > 0) diffNote = `Tăng ${diff} đơn so với bản backup trước (${prevCount} → ${orders.length}).`;
      else if (diff < 0) diffNote = `Giảm ${Math.abs(diff)} đơn so với bản backup trước (${prevCount} → ${orders.length}).`;
      else diffNote = `Số lượng đơn không đổi (${orders.length} đơn), dữ liệu được cập nhật mới nhất.`;
    }
  }

  const caption = [`<b>${keyTitle}</b> ${isTest ? '🧪 [KHO TEST]' : '✅ [KHO THẬT]'}`, `📌 <b>Hành động:</b> ${actionReason}`, `📊 <b>Số lượng:</b> ${orders.length} đơn hàng`, `📝 <b>Chi tiết/Điểm mới:</b> ${diffNote}`, `⏰ <b>Thời gian:</b> ${fmtBank(Date.now())} (UTC+7)`].join("\n");

  const jsonContent = JSON.stringify(orders, null, 2);

  const headers = ["id", "email", "nickname", "zalo", "method", "pkgId", "qty", "pkgName", "totalVnd", "totalCny", "days", "expDate", "status", "createdTs", "date"];
  const csvRows = [headers.join(",")];
  for (const o of orders) {
    csvRows.push(headers.map(h => {
      let val = o[h] ?? "";
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(","));
  }
  const csvContent = "\uFEFF" + csvRows.join("\r\n");

  const resGroup = await sendTelegramMediaGroup(env, [{
    filename: `Backup_Orders_${envTag}_${dateStr}.json`,
    content: jsonContent,
    mimeType: "application/json"
  }, {
    filename: `Backup_Orders_${envTag}_${dateStr}.csv`,
    content: csvContent,
    mimeType: "text/csv",
    caption: caption
  }]);

  const ok = !!(resGroup && resGroup.ok);
  return { ok, count: orders.length, dateStr, keyTitle };
}

async function runTelegramKvBackup(env) {
  const KV = getKV(env);
  if (!KV) return { ok: false, error: "Không có KV" };
  const now = new Date(Date.now() + 7 * 36e5);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}_${m}_${d}`;
  const dayKey = `${d}_${m}_${y}`;
  const keyTitle = `#KV_BACKUP_${dayKey}`;

  // Tách riêng từng file theo từng key quan trọng trong KV
  const keyNames = ["ALL_LINKS", "LINK_POOL", "ALL_CMS", "DEAD_LINKS", "GLOBAL_ROUTER", "ADMIN_DEVICES", "ALL_PACKAGES", "FULFILLMENT_CONFIG"];
  const mediaFiles = [];
  for (const kn of keyNames) {
    const val = await KV.get(kn);
    if (val !== null) {
      let pretty = val;
      try {
        pretty = JSON.stringify(JSON.parse(val), null, 2);
      } catch {}
      mediaFiles.push({
        filename: `${kn}_${dateStr}.json`,
        content: pretty,
        mimeType: "application/json"
      });
    }
  }

  const caption = [`<b>${keyTitle}</b>`, `📦 <b>Loại:</b> Sao lưu từng Key riêng biệt của KV Space`, `📊 <b>Gồm các file:</b> ${keyNames.join(", ")}`, `⏰ <b>Thời gian:</b> ${fmtBank(Date.now())} (UTC+7)`].join("\n");

  if (mediaFiles.length > 0) {
    mediaFiles[0].caption = caption;
  }

  const res = await sendTelegramMediaGroup(env, mediaFiles);
  return {
    ok: !!(res && res.ok),
    keysCount: mediaFiles.length,
    dateStr,
    keyTitle
  };
}

const PDS = {
  1: "https://vpntrinhhg.pages.dev",
  2: "https://vpntrinhhg2.pages.dev",
  3: "https://vpntrinhhg3.pages.dev"
};
// Danh sách 9 gói mặc định của hệ thống (làm căn cứ fallback)
const DEFAULT_PKGS = {
  t1: {
    id: "t1",
    n: "Gói 1 tháng",
    d: "100GB",
    vnd: 60000,
    cny: 15.5,
    usd: 2.5,
    m: 1,
    dev: 1,
    tag1: "🔥 BÁN CHẠY",
    tag2: "✈️ Du lịch",
    category: ["cycle", "travel"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  t2: {
    id: "t2",
    n: "Gói 1 tháng",
    d: "500GB",
    vnd: 70000,
    cny: 18,
    usd: 3.0,
    m: 1,
    dev: 3,
    tag1: "🔥 BÁN CHẠY",
    tag2: "✈️ Du lịch",
    category: ["cycle", "travel"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  c1: {
    id: "c1",
    n: "Gói 1 tháng",
    d: "1000GB",
    vnd: 80000,
    cny: 20.5,
    usd: 3.5,
    m: 1,
    dev: "unlimited",
    tag1: "🔥 BÁN CHẠY",
    tag2: "✈️ Du lịch",
    category: ["cycle", "travel"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  c2: {
    id: "c2",
    n: "Gói Cao Cấp",
    d: "3000GB",
    vnd: 200000,
    cny: 50,
    usd: 8.0,
    m: 1,
    dev: "unlimited",
    category: ["cycle"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  c3: {
    id: "c3",
    n: "Gói 1 Năm",
    d: "300GB/tháng",
    vnd: 799000,
    cny: 199,
    usd: 30.0,
    m: 12,
    dev: "unlimited",
    tag3: "Khuyên dùng",
    category: ["cycle"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  d1: {
    id: "d1",
    n: "Không Giới Hạn",
    d: "200GB",
    vnd: 200000,
    cny: 52,
    usd: 8.0,
    m: 0,
    dev: "unlimited",
    category: ["usage"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  d2: {
    id: "d2",
    n: "Không Giới Hạn",
    d: "1000GB",
    vnd: 399000,
    cny: 102,
    usd: 16.0,
    m: 0,
    dev: "unlimited",
    category: ["usage"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  d3: {
    id: "d3",
    n: "Không Giới Hạn",
    d: "5000GB",
    vnd: 999000,
    cny: 256,
    usd: 40.0,
    m: 0,
    dev: "unlimited",
    category: ["usage"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  custom: {
    id: "custom",
    n: "Gói Tùy Chọn",
    d: "100GB - 100,000GB",
    vnd: 0,
    cny: 0,
    usd: 0,
    m: 1,
    dev: "custom",
    isCustom: true,
    category: ["travel", "cycle", "usage"],
    features: ["Băng thông lên đến 3Gbps"]
  },
  // GÓI GIÁ CŨ: chỉ để thống kê đơn cũ, không bán
  o1: {
    id: "o1",
    n: "Gói 1 tháng",
    d: "100GB",
    vnd: 50000,
    cny: 12.5,
    m: 1,
    old: true
  },
  o2: {
    id: "o2",
    n: "Gói 1 tháng",
    d: "500GB",
    vnd: 60000,
    cny: 15,
    m: 1,
    old: true
  },
  o3: {
    id: "o3",
    n: "Gói 1 tháng",
    d: "1000GB",
    vnd: 70000,
    cny: 17.5,
    m: 1,
    old: true
  }
};

let CACHED_PKGS = null;
let DYNAMIC_PKGS = { ...DEFAULT_PKGS };
async function getActivePkgs(KV) {
  if (CACHED_PKGS) return CACHED_PKGS;
  const raw = safeJson(await KV.get("ALL_PACKAGES"), null);
  if (Array.isArray(raw) && raw.length) {
    const map = { ...DEFAULT_PKGS };
    for (const p of raw) {
      if (p && p.id) {
        map[p.id] = {
          ...p,
          n: p.name || p.n || "",
          d: p.data || p.d || "",
          m: p.m !== undefined ? Number(p.m) : (p.time === "lifetime" ? 0 : Number(p.time) || 1),
          vnd: Number(p.vnd) || 0,
          cny: Number(p.cny) || 0,
          usd: Number(p.usd) || 0
        };
      }
    }
    CACHED_PKGS = map;
    DYNAMIC_PKGS = map;
    return map;
  }
  CACHED_PKGS = DEFAULT_PKGS;
  DYNAMIC_PKGS = DEFAULT_PKGS;
  return DEFAULT_PKGS;
}

const PKGS = new Proxy(DEFAULT_PKGS, {
  get(target, prop) {
    return (DYNAMIC_PKGS && DYNAMIC_PKGS[prop]) !== undefined ? DYNAMIC_PKGS[prop] : target[prop];
  },
  has(target, prop) {
    return (DYNAMIC_PKGS && prop in DYNAMIC_PKGS) || (prop in target);
  },
  ownKeys() {
    return Array.from(new Set([...Reflect.ownKeys(DEFAULT_PKGS), ...Reflect.ownKeys(DYNAMIC_PKGS || {})]));
  },
  getOwnPropertyDescriptor(target, prop) {
    return {
      enumerable: true,
      configurable: true,
      value: this.get(target, prop)
    };
  }
});
const LOCK_ORIG = "Da_bi_khoa";
const MONTHLY = {
  "100GB": ["t1", "o1"],
  "500GB": ["t2", "o2"],
  "1000GB": ["c1", "o3"]
};
const VND = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pkgStr = (pk) => `${pk.n} - ${VND(pk.vnd)}VND${pk.old ? " (giá cũ)" : ""}`;
const monthsOf = (o) => {
  const pk = PKGS[o.pkgId];
  return pk && pk.m === 0 ? "Vĩnh viễn" : ((pk ? pk.m : 1) * (Number(o.qty) || 1)) + " tháng";
};
const daysOfPkg = (pk, qty) => (pk.m === 0 ? "" : (pk.m === 12 ? 365 : 30 * pk.m) * (Number(qty) || 1));
const linkDate = (exp, cts) => isLifetime(exp) ? "Vĩnh viễn" : exp;
// Nhận diện gói của 1 đơn (kể cả đơn cũ): ưu tiên số tiền đã thu + dung lượng -> tách giá cũ / giá mới. KHÔNG bao giờ đổi totalVnd.
function detectPkg(o) {
  const s = String(o.pkg || ""), legacy = /[đ¥$]/.test(s);
  if (!legacy && PKGS[o.pkgId]) return { id: o.pkgId, qty: Number(o.qty) || null };
  const gm = s.match(/\((\d+GB)/i), pm = s.match(/-\s*([\d.,]+)\s*(?:đ|VND)/i);
  const data = String(o.pkgData || (gm && gm[1]) || "").toUpperCase(), price = pm ? Number(pm[1].replace(/[.,]/g, "")) : 0, total = Number(o.totalVnd) || 0;
  const name = String(o.pkgName || s.split(" - ")[0] || ""), cand = MONTHLY[data];
  if (cand && (!name || /1 tháng/i.test(name))) {
    if (total > 0) for (const id of cand) {
      const u = PKGS[id].vnd;
      if (total % u === 0 && total / u <= 36) return { id, qty: total / u };
    }
    if (price) {
      const id = cand.find((k) => PKGS[k].vnd === price);
      if (id) return { id, qty: null };
    }
    return { id: cand[0], qty: null };
  }
  const id = Object.keys(PKGS).find((k) => !PKGS[k].old && PKGS[k].n === name && PKGS[k].d.toUpperCase() === data) || (price ? Object.keys(PKGS).find((k) => !PKGS[k].old && PKGS[k].vnd === price) : null);
  return id ? {
    id,
    qty: total > 0 ? Math.round(total / PKGS[id].vnd) || null : null
  } : { id: null, qty: null };
}
const isExpiredOrder = (o, now) => {
  if (!o.expDate || isLifetime(o.expDate)) return false;
  const t = parseDmy(o.expDate);
  return !!t && t + 864e5 <= now;
};

// ---------------------------------------------------------------- helpers

// ---- Đồng hồ hệ thống: chạy theo giờ thật, hoặc giờ Admin đặt ở Cài đặt > Thời gian (chế độ "Tùy chỉnh")
let SIM_OFF = 0, SIM_T = 0;
const NOW = () => Date.now() + SIM_OFF;
async function syncClock(KV) {
  if (Date.now() - SIM_T < 30000) return;
  SIM_T = Date.now();
  const c = safeJson(await KV.get("ALL_CMS"), {}), s = (c && c.settings) || {};
  SIM_OFF = s.simMode ? Number(s.simOffset) || 0 : 0;
}
// Khi cấu hình (ALL_CMS) vừa được LƯU trong chính request này, cập nhật SIM_OFF ngay (tránh KV eventual consistency khi test cron)
function applySimFromSettingsText(text) {
  try {
    const c = JSON.parse(text), s = (c && c.settings) || {};
    SIM_OFF = s.simMode ? Number(s.simOffset) || 0 : 0;
    SIM_T = Date.now();
  } catch {}
}
const pad = (n) => String(n).padStart(2, "0");
const normId = (v) => String(v || "").trim().toUpperCase().replace(/[-_.\s]/g, "");
const isLifetime = (s) => /(v[i\u00EC\u00ED\u0129\u0128]nh\s*vi[e\u00EA\u1EC5\u1EC4]n|vinh\s*vien|lifetime|永久)/i.test(String(s || ""));
const arr = (v) => (Array.isArray(v) ? v : []);
const normStatus = (s) => (s === "paid" ? "success" : s === "rejected" ? "failed" : s || "pending");
const isBankMethod = (m) => !/alipay|wechat|weixin/i.test(String(m || ""));
const numOrEmpty = (v) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(String(v).replace(/[,\s]/g, ""));
  return isFinite(n) ? n : "";
};
function safeJson(value, fallback) {
  try {
    if (value === null || value === undefined || value === "") return fallback;
    return JSON.parse(value);
  } catch { return fallback;
  }
}
function safeEq(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function hex(len) {
  const b = new Uint8Array(Math.ceil(len / 2));
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, len);
}
function genOrderId() {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", b = new Uint8Array(10);
  crypto.getRandomValues(b);
  return "DH" + [...b].map((x) => c[x % 36]).join("");
}
function vn(ts) {
  const d = new Date(ts + 7 * 36e5);
  return {
    d: d.getUTCDate(),
    m: d.getUTCMonth() + 1,
    y: d.getUTCFullYear(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes()
  };
}
const dmy = (ts) => {
  const t = vn(ts);
  return `${pad(t.d)}/${pad(t.m)}/${t.y}`;
};
const fmtBank = (ts) => {
  const t = vn(ts);
  return `${pad(t.d)}/${pad(t.m)}/${t.y} ${pad(t.h)}:${pad(t.mi)}`;
};
const parseDmy = (s) => {
  const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? Date.UTC(+m[3], m[2] - 1, +m[1]) - 7 * 36e5 : 0;
}; // 00:00 giờ VN
const day0 = (ts) => parseDmy(dmy(ts));
// Chuẩn hóa quy ước cứng: 1 tháng = 30 ngày (xóa bỏ hàm cộng theo tháng dương lịch)
function addDaysDmy(ts0, days) {
  return dmy(ts0 + (Number(days) || 0) * 864e5);
}
// Mốc khóa chuẩn: Đúng 00:00:00 giờ Việt Nam (UTC+7) của ngày hết hạn là khóa link sub ẩn
const lockAt = (exp) => {
  const t0 = parseDmy(exp);
  return t0 || Infinity;
};
// origBackup: URL gốc thật được cất khi link bị khóa (orig -> "Da_bi_khoa"); gia hạn/mở khóa sẽ khôi phục từ đây.
function lockLink(l) {
  l.isLocked = true;
  if (l.orig && l.orig !== LOCK_ORIG) {
    l.origBackup = l.orig;
    l.orig = LOCK_ORIG;
  }
  if (l.orig2 && l.orig2 !== LOCK_ORIG) {
    l.origBackup2 = l.orig2;
    delete l.orig2;
  }
}
const linkTs = (l) => Number(l.createdTs) || Number(((l.id || "").match(/^LNK-(\d{13})/) || [])[1]) || 0;
const expKey = (e) => (isLifetime(e) ? "life" : parseDmy(e) || 0);

// Parse mọi định dạng thời gian cũ -> epoch ms (dữ liệu cũ đều là giờ VN)
function parseAny(v) {
  if (typeof v === "number") return v;
  const s = String(v || "").trim();
  if (!s) return 0;
  let m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let y = +m[6];
    if (y < 100) y += 2000;
    return Date.UTC(y, m[5] - 1, +m[4], m[1] - 7, +m[2], +(m[3] || 0));
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return Date.UTC(y, m[2] - 1, +m[1], m[4] - 7, +m[5], +(m[6] || 0));
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) return Date.UTC(+m[1], m[2] - 1, +m[3], m[4] - 7, +m[5], +(m[6] || 0));
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

function getActiveGiftRule(rules, pkgId, now = Date.now()) {
  if (!Array.isArray(rules) || !pkgId) return null;
  for (const r of rules) {
    if (!r || r.enabled === false) continue;
    if (Array.isArray(r.packageIds) && r.packageIds.includes(pkgId)) {
      const start = r.startDate ? new Date(r.startDate).getTime() : 0;
      const end = r.endDate ? new Date(r.endDate).getTime() : Infinity;
      if (now >= start && now <= end) {
        return r;
      }
    }
  }
  return null;
}

function computeExp(o, orders, now, giftRules = []) {
  const pk = PKGS[o.pkgId];
  if (!pk) return o.expDate || addDaysDmy(day0(now), 30);
  if (pk.m === 0 || pk.time === "lifetime") return "Vĩnh viễn";
  const em = String(o.email || "").toLowerCase();
  let base = day0(now);

  // CHỈ đơn gia hạn (orderType === "renew") VÀ khách không chọn cấp link mới VÀ link không phải fallback new
  if (o.orderType === "renew" && em && o.subLinkDecision !== "CREATE_NEW" && !o.fallbackNew) {
    let targetOrd = null;
    if (o.renewOf) {
      targetOrd = orders.find(x => x && normId(x.id) === normId(o.renewOf));
    }
    if (!targetOrd && o.targetLink) {
      targetOrd = orders.find(x => x && (x.info1 === o.targetLink || x.info2 === o.targetLink || x.info3 === o.targetLink));
    }
    if (targetOrd && targetOrd.expDate && !isLifetime(targetOrd.expDate)) {
      const targetT = parseDmy(targetOrd.expDate);
      // Nếu link/đơn cũ còn hạn (targetT >= day0(now)): cộng dồn từ HSD chuẩn trong tab Đơn hàng
      if (targetT >= day0(now)) {
        base = targetT;
      } else {
        // Link cũ đã hết hạn/bị khóa: tính từ ngày mua hôm nay
        base = day0(now);
      }
    } else {
      // Heuristic fallback: tìm đơn thành công còn hạn dài nhất
      for (const x of orders) {
        if (!x || x === o || normStatus(x.status) !== "success" || String(x.email || "").toLowerCase() !== em || isLifetime(x.expDate)) continue;
        const t = parseDmy(x.expDate);
        if (t > base) base = t;
      }
    }
  }

  // Bonus days: Ưu tiên snapshot của chính đơn hàng -> Gift Rule đang hiệu lực -> fallback dữ liệu cũ
  let bonus = 0;
  if (o.bonusDays !== undefined) {
    bonus = Number(o.bonusDays) || 0;
  } else if (o.bonus_days !== undefined) {
    bonus = Number(o.bonus_days) || 0;
  } else {
    const activeRule = getActiveGiftRule(giftRules, o.pkgId, now);
    if (activeRule) {
      bonus = Number(activeRule.bonusDays) || 0;
    } else {
      bonus = Number(pk.bonus_days || pk.bonusDays || 0);
    }
  }

  // Quy ước cứng: 1 năm = 365 ngày; còn lại = (30 ngày * số tháng + số ngày tặng khuyến mãi) * số lượng
  const totalDays = ((pk.m === 12 ? 365 : 30 * pk.m) + bonus) * (Number(o.qty) || 1);
  return addDaysDmy(base, totalDays);
}

// ---------------------------------------------------------------- node pool
const todayVN0 = () => day0(NOW());
function isDying(p) {
  if (!p || !p.url) return false;
  // 1. Kiểm tra hạn dùng: chỉ coi là sắp hết khi có hạn cụ thể và còn <= 1 ngày
  if (p.exp && !isLifetime(p.exp)) {
    const t = parseDmy(p.exp);
    if (t && t <= todayVN0() + 864e5) return true;
  }
  // 2. Kiểm tra dung lượng: CHỈ báo sắp cạn khi THỰC SỰ có nhập số lớn hơn 0 và nhỏ hơn 100
  // (Nếu để trống hoặc mặc định "0" do chưa tra cứu thì TUYỆT ĐỐI không coi là dying)
  const rg = String(p.remainGb ?? "").trim();
  const nRg = Number(rg);
  return rg !== "" && !isNaN(nRg) && nRg > 0 && nRg < 100;
}
const poolOk = (p) => !!(p && p.url) && (Number(p.used) || 0) < (Number(p.max) || 30) && !isDying(p);
function pickNode(pool, exclude) {
  const c = pool.filter((p) => poolOk(p) && p.url !== exclude);
  if (!c.length) return null;
  c.sort((a, b) => {
    const sa = (Number(a.max) || 30) - (Number(a.used) || 0), sb = (Number(b.max) || 30) - (Number(b.used) || 0);
    if (sa !== sb) return sa - sb;
    const la = !a.exp || isLifetime(a.exp), lb = !b.exp || isLifetime(b.exp);
    if (la && !lb) return 1;
    if (!la && lb) return -1;
    if (la && lb) return 0;
    return parseDmy(a.exp) - parseDmy(b.exp);
  });
  return c[0];
}

function getMe(url, env, cms) {
  let n = Number(env.WEB_INDEX) || 0;
  const s = (cms && cms.settings) || {}, h = (url && url.hostname) || "";
  if (!n) for (const i of [1, 2, 3]) {
    const r = String(s["routeWeb" + i] || "").trim();
    if (r && h.includes(r)) {
      n = i;
      break;
    }
  }
  if (!n) n = h.includes("doicucden") ? 1 : h.includes("onepiece") ? 2 : 3;
  return { n, field: "info" + n, PD: PDS[n] };
}

// ---------------------------------------------------------------- auth
const enc = (s) => new TextEncoder().encode(s);
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc(msg)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function makeToken(env) {
  const exp = Date.now() + 30 * 864e5;
  return exp + "." + (await hmac(env.ADMIN_PASSWORD, "adm|" + exp));
}
async function isAdmin(request, env) {
  const a = request.headers.get("Authorization") || "";
  if (!a.startsWith("Bearer ") || !env.ADMIN_PASSWORD) return false;
  const [exp, sig] = a.slice(7).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, await hmac(env.ADMIN_PASSWORD, "adm|" + exp));
}
const isInternal = (request, env) => !!env.WEB_API_SECRET2 && safeEq(request.headers.get("Authorization") || "", "Bearer " + env.WEB_API_SECRET2);

// ---------------------------------------------------------------- log (lưu giữ 7 ngày, tự dọn bản ghi quá 7 ngày)
const LOG_TTL = 7 * 864e5; // 7 ngày = 7 * 24 * 60 * 60 * 1000 ms
function mkLog() {
  const q = [];
  const f = (lvl, src, act, msg, ref) => q.push({
    ts: NOW(),
    lvl,
    src,
    act,
    msg: String(msg || "").slice(0, 300),
    ref: ref || ""
  });
  f.q = q;
  return f;
}
async function flushLog(KV, log) {
  if (!log.q.length) return;
  const now = NOW();
  // Giữ lại các bản ghi trong vòng 7 ngày gần nhất
  const a = arr(safeJson(await KV.get("SYS_LOG"), [])).filter((x) => x && x.ts && (now - Number(x.ts) <= LOG_TTL));
  await KV.put("SYS_LOG", JSON.stringify([...log.q.slice().reverse(), ...a].slice(0, 3000)));
  log.q.length = 0;
}

// ---------------------------------------------------------------- D1 (gọi phía server, secret nằm trong env)
async function d1(env, path, opt = {}) {
  if (!env.D1_URL || !env.D1_SECRET) return {
    ok: false,
    status: 0,
    data: { error: "Chưa cấu hình D1_URL / D1_SECRET" }
  };
  try {
    const fullUrl = env.D1_URL.replace(/\/$/, "") + path;
    const r = await fetch(fullUrl, {
      method: opt.method || "GET",
      headers: {
        Authorization: "Bearer " + env.D1_SECRET,
        "Content-Type": "application/json"
      },
      body: opt.body ? JSON.stringify(opt.body) : undefined
    });
    let data = null;
    const rawText = await r.text().catch(() => "");
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        error: rawText.replace(/<[^>]*>/g, " ").trim().slice(0, 300) || `Downstream HTTP ${r.status}`
      };
    }
    return { ok: r.ok, status: r.status, data, url: fullUrl };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: { error: String(e && e.message || e) }
    };
  }
}
const d1Register = (env, url, o, kind) => isBankMethod(o.method) ? d1(env, "/api/orders", {
  method: "POST",
  body: {
    orderId: o.id,
    totalVnd: o.totalVnd,
    email: o.email,
    targetWeb: o.sourceWeb || "",
    workerUrl: env.PUBLIC_WORKER_URL || url.origin,
    orderType: kind,
    pkgId: o.pkgId || null
  }
}) : Promise.resolve({ ok: true });
const d1Upgrade = (env, url, o, up) => isBankMethod(up.method || o.method) ? d1(env, "/api/upgrades", {
  method: "POST",
  body: {
    orderId: o.id,
    targetPackageId: up.targetPkgId,
    amount: up.amount,
    baseOrder: {
      email: o.email,
      totalVnd: o.totalVnd,
      workerUrl: o.workerUrl || env.PUBLIC_WORKER_URL || (url && url.origin) || "",
      targetWeb: o.sourceWeb || "",
      orderType: o.orderType || "new"
    }
  }
}) : Promise.resolve({ ok: true });

// ---------------------------------------------------------------- tombstone: link đã xóa KHÔNG được quay lại
// KV "DELETED_LINKS" = [{id, ts}] giữ 60 ngày. Mọi đường ghi ALL_LINKS (persist, POST /api/links, cron, update_sub.py) đều lọc theo danh sách này.
const TOMB_TTL = 60 * 864e5;
const loadTombs = async (KV) => arr(safeJson(await KV.get("DELETED_LINKS"), []));
const saveTombs = (KV, a) => KV.put("DELETED_LINKS", JSON.stringify(arr(a).filter((t) => t && t.id && Date.now() - (t.ts || 0) < TOMB_TTL).slice(-2000)));
const notTomb = (links, tb) => {
  if (!tb.length) return links;
  const s = new Set(tb.map((t) => t.id));
  return links.filter((l) => l && !s.has(l.id));
};

// ---------------------------------------------------------------- state
const isTestOrderRecord = (o) => !o || !o.id || String(o.id).startsWith("DH_TEST_") || o.isTest === true || String(o.email || "").toLowerCase().includes("khach_test");

async function loadAll(KV, env, isTestOverride = null) {
  const g = async (k, d) => safeJson(await KV.get(k), d);
  // Mặc định luôn là Production; không tự ý dùng TEST_MODE_ACTIVE toàn cục nếu request không yêu cầu
  const isTest = isTestOverride === null ? false : !!isTestOverride;
  const sb = env ? getSupabase(env, isTest) : null;
  let sbOk = false;
  let sbError = null;
  let orders = [];
  if (sb) {
    try {
      const res = await sb.getAll();
      if (Array.isArray(res)) {
        sbOk = true;
        orders = res;
      } else {
        sbOk = false;
        sbError = "Dữ liệu Supabase trả về không phải mảng";
      }
    } catch (err) {
      sbOk = false;
      sbError = err.message || String(err);
      orders = [];
    }
  } else {
    sbError = "Chưa cấu hình SUPABASE_KEY / SUPABASE_URL";
    // Chỉ đọc KV khi hoàn toàn không có kết nối Supabase
    const kvOrders = arr(await g(isTest ? "ALL_ORDERS_TEST" : "ALL_ORDERS", []));
    orders = isTest ? kvOrders : kvOrders.filter(o => !isTestOrderRecord(o));
    sbOk = true;
  }
  const [links, pool, cms] = await Promise.all([g("ALL_LINKS", []), g("LINK_POOL", []), g("ALL_CMS", {})]);
  const st = {
    orders,
    links: arr(links),
    pool: arr(pool),
    cms: cms && typeof cms === "object" && !Array.isArray(cms) ? cms : {},
    dO: false,
    dL: false,
    dP: false,
    isTest,
    sbOk,
    sbError
  };
  for (const p of st.pool) p.used = st.links.filter((l) => l && (l.orig === p.url || l.orig2 === p.url)).length;
  return st;
}
async function persist(KV, st) {
  if (st.dL) {
    const tb = await loadTombs(KV);
    if (tb.length) st.links = notTomb(st.links, tb);
  }
  for (const p of st.pool) p.used = st.links.filter((l) => l && (l.orig === p.url || l.orig2 === p.url)).length;
  const w = [];
  // Tuyệt đối không ghi ALL_ORDERS vào Cloudflare KV nữa - 100% dùng Supabase
  if (st.dL) w.push(KV.put("ALL_LINKS", JSON.stringify(st.links)), KV.put("GLOBAL_ROUTER", JSON.stringify(buildGlobalRouter(st.links, st.orders))));
  if (st.dP) w.push(KV.put("LINK_POOL", JSON.stringify(st.pool)));
  await Promise.all(w);
  st.dO = st.dL = st.dP = false;
}
async function acquire(KV) {
  for (let i = 0; i < 8; i++) {
    if (!(await KV.get("GLOBAL_FULFILL_LOCK"))) {
      await KV.put("GLOBAL_FULFILL_LOCK", String(Date.now()), { expirationTtl: 60 });
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
// Đổi Mã đơn của CHÍNH đơn đó (không tạo đơn trùng): cập nhật id, link.orderId, yêu cầu dung lượng. Trả về 1 (ok) / 0 (không thấy) / -1 (trùng id đích)
async function applyRename(KV, st, from, to) {
  const f = normId(from), t = normId(to);
  const o = st.orders.find((x) => x && normId(x.id) === f);
  if (!o) return 0;
  if (st.orders.some((x) => x && x !== o && normId(x.id) === t)) return -1;
  o.id = t;
  st.dO = true;
  for (const l of st.links) if (l && l.orderId && normId(l.orderId) === f) {
    l.orderId = t;
    st.dL = true;
  }
  const drs = arr(safeJson(await KV.get("ALL_DATA_REQUESTS"), []));
  let ch = false;
  for (const r of drs) if (r && normId(r.orderId) === f) {
    r.orderId = t;
    ch = true;
  }
  if (ch) await KV.put("ALL_DATA_REQUESTS", JSON.stringify(drs));
  return 1;
}

// ---------------------------------------------------------------- order helpers
function maskEmail(e) {
  e = String(e || "");
  const [a, b] = e.split("@");
  if (!b) return e;
  if (a.length <= 3) return a[0] + "***@" + b;
  const k = Math.min(a.length - 2, 4);
  return a.slice(0, a.length - k) + "****@" + b;
}
function publicOrder(o, cms, links, field) {
  const s = (cms && cms.settings) || {};
  const out = {
    id: o.id,
    email: maskEmail(o.email),
    status: normStatus(o.status),
    method: o.method || "",
    pkgId: detectPkg(o).id || o.pkgId || "",
    pkgName: o.pkgName || "",
    pkgData: o.pkgData || "",
    pkg: o.pkg || "",
    totalVnd: o.totalVnd || 0,
    totalCny: o.totalCny || 0,
    days: o.days || "",
    expDate: o.expDate || "",
    createdTs: o.createdTs || 0,
    reason: o.reason || "",
    isUpgrade: !!o.isUpgrade,
    upgradeStatus: o.upgradeStatus || null,
    upgradedAt: o.upgradedAt || 0,
    serverTime: NOW(),
    pendingUpgrade: o.pendingUpgrade ? {
      ts: o.pendingUpgrade.ts || 0,
      amount: o.pendingUpgrade.amount || 0,
      targetPkg: o.pendingUpgrade.targetPkg || "",
      method: o.pendingUpgrade.method || o.method || ""
    } : null,
    fulfillResult: o.fulfillResult || (o.subLinkDecision === "CREATE_NEW" ? "create_new" : (o.orderType === "renew" ? "keep_active" : null)),
    subLinkDecision: o.subLinkDecision || "",
    fallbackNew: !!o.fallbackNew,
    bonusDays: Number(o.bonusDays || o.bonus_days || 0),
    giftName: o.giftName || o.promo_sticker || ""
  };

  // QUY ĐỊNH ĐỊNH TUYẾN LÀM MỜ (CHỈ TRÊN WEB NÀY):
  // Ô 1 nhập đúng doicucden (hoặc Web 1 (doicucden)) + BẬT -> Mờ Link 1
  const blur1 = !!(s.blurOn1 && /doicucden/i.test(String(s.blurRoute1 || "")));
  // Ô 2 nhập đúng onepiecechapter (hoặc Web 2 (onepiecechapter)) + BẬT -> Mờ Link 2
  const blur2 = !!(s.blurOn2 && /onepiecechapter/i.test(String(s.blurRoute2 || "")));
  // Ô 3 nhập đúng lucastanora (hoặc Web 3 (lucastanora)) + BẬT -> Mờ Link 3
  const blur3 = !!(s.blurOn3 && /lucastanora/i.test(String(s.blurRoute3 || "")));

  const blurMap = { 1: blur1, 2: blur2, 3: blur3 };

  for (const i of [1, 2, 3]) {
    const f = "info" + i;
    const isBlur = blurMap[i];
    const linkVal = String(o[f] || (i === 1 ? o.info : "") || "");
    let v = isBlur ? "" : linkVal;
    if (v && links && field === f && !(o.lockInfo && o.lockInfo[field]) && !links.some((l) => l && l.masked === v)) v = "";
    out["blur" + i] = isBlur;
    out["info" + i] = v;
  }
  return out;
}
function findOrder(orders, q) {
  q = String(q || "").trim();
  if (!q) return null;
  const id = normId(q), em = q.toLowerCase();
  const byId = orders.find((o) => o && normId(o.id) === id);
  if (byId) return byId;
  const list = orders.filter((o) => o && o.email && String(o.email).toLowerCase() === em).sort((a, b) => (b.createdTs || 0) - (a.createdTs || 0));
  return list.find((o) => normStatus(o.status) !== "failed") || list[0] || null;
}
function applyUpgrade(o, st = null) {
  const pu = o.pendingUpgrade || {}, pk = PKGS[pu.targetPkgId], cur = PKGS[o.pkgId];
  if (!pk) return false;
  Object.assign(o, {
    pkgId: pu.targetPkgId,
    pkgName: pk.n,
    pkgData: pk.d,
    pkg: pkgStr(pk)
  });
  if (isBankMethod(pu.method || o.method)) o.totalVnd = (Number(o.totalVnd) || 0) + (Number(pu.amount) || 0);
  else {
    const c = Number(pu.amountCny) || (cur ? Math.max(0, (pk.cny - cur.cny) * (Number(pu.qty) || 1)) : 0);
    if (c) o.totalCny = (Number(o.totalCny) || 0) + c;
  }
  o.pendingUpgrade = null;
  o.upgradeStatus = "success";
  o.isUpgrade = true;
  o.upgradedAt = NOW();

  // Đồng bộ nâng cấp cấu hình ngay trên chính Link Sub hiện tại (không tạo link mới)
  if (st && Array.isArray(st.links)) {
    const curLink = st.links.find(l => l && (normId(l.orderId) === normId(o.id) || l.masked === o.info1 || l.masked === o.info2 || l.masked === o.info3));
    if (curLink) {
      curLink.pkg = o.pkgName || pk.n || "";
      if (curLink.isLocked) {
        curLink.isLocked = false;
        if (curLink.orig === LOCK_ORIG && curLink.origBackup) curLink.orig = curLink.origBackup;
      }
      st.dL = true;
    }
  }
  return true;
}

// Cấp link cho 1 đơn (đã success) trên web này. Trả về: new | renew | already | error | skip
function fulfillOrder(st, o, me, log) {
  const f = me.field, now = NOW();
  if (normStatus(o.status) !== "success") return "skip";
  if (!o.expFinal) {
    if (o.orderType || !o.expDate) o.expDate = computeExp(o, st.orders, now, st.cms?.giftRules);
    o.expFinal = true;
    st.dO = true;
  } // đơn cũ (không có orderType): giữ nguyên HSD
  if (o.lockInfo && o.lockInfo[f]) return "already"; // admin đã sửa tay ô này: web không tự sửa lại
  if (o[f] && st.links.some((l) => l && l.masked === o[f])) return "already";
  const life = isLifetime(o.expDate), em = String(o.email || "").toLowerCase(), cts = o.createdTs || now;
  let link = null;

  // Lọc các đơn đang hoạt động theo HSD của email này
  const activeOrders = st.orders.filter(x => x && x !== o && normStatus(x.status) === "success" && String(x.email || "").toLowerCase() === em && (isLifetime(x.expDate) || parseDmy(x.expDate) >= now));

  // Kiểm tra case B6: Email có >= 2 đơn đang hoạt động cùng lúc VÀ không phải luồng gia hạn đích danh từ portal
  const isMultiActive = activeOrders.length >= 2 && !o.renewOf;

  // 1. Tìm link theo chính orderId của đơn hiện tại (chống retry)
  link = st.links.find((l) => l && l.orderId && normId(l.orderId) === normId(o.id));

  if (!link && isMultiActive) {
    // B6: Email có >= 2 đơn đang cùng hoạt động -> Backend tự động cấp link mới độc lập
    link = null;
    o.subLinkDecision = "CREATE_NEW";
    o.fulfillResult = "multi_active_new";
    log("ok", "fulfill", `Email có ${activeOrders.length} đơn đang hoạt động -> Tự động cấp Link mới độc lập`, o.id, o.id);
  } else if (!link && o.subLinkDecision === "CREATE_NEW") {
    link = null;
    o.fulfillResult = "create_new";
  } else if (!link && (o.subLinkDecision === "KEEP_EXISTING" || o.orderType === "renew")) {
    let candidate = null;
    if (o.targetLink) {
      candidate = st.links.find(l => l && (l.masked === o.targetLink || l.id === o.targetLink));
      if (!candidate) {
        const srcOrd = st.orders.find(x => x && (x.info1 === o.targetLink || x.info2 === o.targetLink || x.info3 === o.targetLink));
        if (srcOrd && srcOrd[f]) candidate = st.links.find(l => l && l.masked === srcOrd[f]);
      }
    }
    if (!candidate && o.renewOf) {
      const srcOrd = st.orders.find(x => x && normId(x.id) === normId(o.renewOf));
      if (srcOrd) {
        if (srcOrd[f]) candidate = st.links.find(l => l && l.masked === srcOrd[f]);
        if (!candidate) candidate = st.links.find(l => l && l.orderId && normId(l.orderId) === normId(srcOrd.id));
      }
    }
    if (!candidate && em && activeOrders.length === 1) {
      const singleOrd = activeOrders[0];
      if (singleOrd[f]) candidate = st.links.find(l => l && l.masked === singleOrd[f]);
      if (!candidate) candidate = st.links.find(l => l && l.orderId && normId(l.orderId) === normId(singleOrd.id));
    }
    if (!candidate && em) {
      for (const x of st.orders) {
        if (!x || x === o || normStatus(x.status) !== "success" || String(x.email || "").toLowerCase() !== em) continue;
        if (x[f]) {
          const found = st.links.find(l => l && l.masked === x[f]);
          if (found) {
            candidate = found;
            break;
          }
        }
      }
    }

    if (candidate) {
      link = candidate;
    } else {
      // Fallback B2 / B5: Khách chọn giữ link cũ nhưng link cũ không tồn tại hoặc đã bị xóa -> Fallback cấp link mới
      log("warn", "fulfill", "Khách chọn giữ link cũ nhưng link cũ không tồn tại hoặc đã bị xóa -> Fallback cấp link mới", o.id, o.id);
      o.fallbackNew = true;
      o.fulfillResult = "fallback_new";
      link = null;
    }
  }

  if (link) {
    const isLocked = link.isLocked || link.orig === LOCK_ORIG;
    if (isLocked) {
      // B8: Mở khóa link -> kiểm tra node nguồn đủ GB và slot
      let eligibleNode = null;
      if (link.origBackup && link.origBackup !== LOCK_ORIG) {
        eligibleNode = st.pool.find(p => p && p.url === link.origBackup && poolOk(p));
      }
      if (!eligibleNode) {
        eligibleNode = pickNode(st.pool);
      }
      if (!eligibleNode) {
        log("error", "fulfill", "Không tìm thấy link nguồn đáp ứng điều kiện GB/slot để mở khóa", o.id, o.id);
        o.fulfillResult = "error_no_source";
        return "error";
      }

      link.orig = eligibleNode.url;
      eligibleNode.used = (Number(eligibleNode.used) || 0) + 1;
      delete link.origBackup;
      delete link.origBackup2;
      link.isLocked = false;
      o.fulfillResult = "restore_locked";
    } else {
      // Link đang hoạt động bình thường
      if (!st.pool.some(p => p && p.url === link.orig)) {
        const eligibleNode = pickNode(st.pool);
        if (eligibleNode) {
          link.orig = eligibleNode.url;
          eligibleNode.used = (Number(eligibleNode.used) || 0) + 1;
        }
      }
      o.fulfillResult = "keep_active";
    }

    Object.assign(link, {
      expDate: life ? "Vĩnh viễn" : o.expDate,
      createdTs: cts,
      date: linkDate(life ? "Vĩnh viễn" : o.expDate, cts),
      orderId: o.id,
      pkg: o.pkgName || "",
      email: o.email || link.email
    });

    o[f] = link.masked;
    o.fulfilledAt = now;
    st.dL = st.dO = true;

    log("ok", "fulfill", `Fulfillment thành công [${o.fulfillResult}]: Link sub ${link.masked}`, o.id, o.id);
    return "renew";
  }
  // Đọc cấu hình Mapping Fulfillment động (đã nạp sẵn trong st, mặc định luôn là single_lx)
  const fulfillData = st.fulfillment_config || safeJson(st.cms?.fulfillment_config, {}) || {};
  const fulfillCfg = fulfillData.mapping || fulfillData;
  const pkgTargetType = fulfillCfg[o.pkgId] || "single_lx"; // Chuẩn hóa mặc định: single_lx

  const isKittyUrl = u => String(u || "").includes("tohno-1.top") || String(u || "").includes("oosaka") || String(u || "").includes("kitty");

  if (pkgTargetType === "combo" || pkgTargetType.startsWith("combo_")) {
    let pool1, pool2, cVer, cParam, cName;
    if (pkgTargetType === "combo_liki") {
      pool1 = st.pool.filter(p => poolOk(p) && String(p.url).includes("liangxin"));
      pool2 = st.pool.filter(p => poolOk(p) && isKittyUrl(p.url));
      cVer = "v4";
      cParam = "liki";
      cName = "Liangxin + Kitty";
    } else if (pkgTargetType === "combo_kidj") {
      pool1 = st.pool.filter(p => poolOk(p) && isKittyUrl(p.url));
      pool2 = st.pool.filter(p => poolOk(p) && String(p.url).includes("djjc"));
      cVer = "v6";
      cParam = "kidj";
      cName = "Kitty + DJJC";
    } else {
      pool1 = st.pool.filter(p => poolOk(p) && String(p.url).includes("liangxin"));
      pool2 = st.pool.filter(p => poolOk(p) && String(p.url).includes("djjc"));
      cVer = "v5";
      cParam = "lidj";
      cName = "Liangxin + DJJC";
    }

    const node1 = pool1[0] || pickNode(st.pool);
    const node2 = pool2[0] || pickNode(st.pool, node1 ? node1.url : "");

    if (!node1 || !node2) {
      log("error", "fulfill", `Hết nguồn trống để ghép ${cName}`, o.id, o.id);
      return "error";
    }

    const masked = `${me.PD}/${cVer}/VPNTrinhHg?${cParam}=${hex(32)}#VPNTrinhHg`;
    node1.used = (Number(node1.used) || 0) + 1;
    node2.used = (Number(node2.used) || 0) + 1;
    const existingComboIndices = st.links.filter(x => x && x.isCombo).map(x => parseInt(x.linkIndex) || 0);
    const idx = (existingComboIndices.length ? Math.max(...existingComboIndices) : 0) + 1;

    st.links.unshift({
      id: "LNK-" + now + "-" + hex(4),
      orderId: o.id,
      pkg: o.pkgName || "",
      isCombo: true,
      orig: node1.url,
      orig2: node2.url,
      masked,
      email: o.email || "Khach",
      expDate: life ? "Vĩnh viễn" : o.expDate,
      linkIndex: String(idx),
      isLocked: false,
      createdTs: cts,
      date: linkDate(life ? "Vĩnh viễn" : o.expDate, cts)
    });
    o[f] = masked;
    o.fulfilledAt = now;
    st.dL = st.dO = true;
    log("ok", "fulfill", `Cấp Combo Trộn mới ${cName}`, `${o.id} → #${idx}`, o.id);
    return "new";
  }

  // Cấp Link Đơn có lọc mạng theo cấu hình
  let candidatePool = st.pool;
  if (pkgTargetType === "single_kt") candidatePool = st.pool.filter(p => isKittyUrl(p.url));
  else if (pkgTargetType === "single_dj") candidatePool = st.pool.filter(p => String(p.url).includes("djjc"));
  else candidatePool = st.pool.filter(p => String(p.url).includes("liangxin"));

  const node = pickNode(candidatePool) || pickNode(st.pool);
  if (!node) {
    log("error", "fulfill", "Hết node trống", o.id, o.id);
    return "error";
  }
  const lx = String(node.url).includes("liangxin");
  const kt = isKittyUrl(node.url);
  const vNum = kt ? "v3" : (lx ? "v1" : "v2");
  const pParam = kt ? "top=" : (lx ? "OwO=" : "token=");
  const masked = `${me.PD}/${vNum}/VPNTrinhHg?${pParam}${hex(32)}#VPNTrinhHg`;
  const existingNodeIndices = st.links.filter((x) => x && x.orig === node.url).map(x => parseInt(x.linkIndex) || 0);
  const idx = (existingNodeIndices.length ? Math.max(...existingNodeIndices) : 0) + 1;
  node.used = (node.used || 0) + 1;
  st.links.unshift({
    id: "LNK-" + now + "-" + hex(4),
    orderId: o.id,
    pkg: o.pkgName || "",
    orig: node.url,
    masked,
    email: o.email || "Khach",
    expDate: life ? "Vĩnh viễn" : o.expDate,
    linkIndex: String(idx),
    isLocked: false,
    createdTs: cts,
    date: linkDate(life ? "Vĩnh viễn" : o.expDate, cts)
  });
  o[f] = masked;
  o.fulfilledAt = now;
  st.dL = st.dO = true;
  log("ok", "fulfill", "Cấp link mới", `${o.id} → node #${idx}`, o.id);
  return "new";
}
function mailFor(ctx, env, st, o, kind, me) {
  if (!(st.cms.settings && st.cms.settings.emailRole === "master") || !o.email) return; // Slave: KHÔNG gửi mail automation nào
  ctx.waitUntil(sendMail(o.email, sysSubject(st.cms, kindKey(kind), o), buildSuccessMailHtml(o, me.PD, kind, st.cms), env, st.cms));
}

// Kiểm tra quyền báo mail cho Admin khi khách thao tác trên Index
function shouldNotifyAdmin(cms, eventKey) {
  const s = (cms && cms.settings) || {};
  const role = s.adminNotifyRole || "master"; // Mặc định Master nếu chưa cài đặt
  if (role === "master") return true;
  // Nếu là Slave: chỉ gửi các sự kiện được tick chọn
  const ev = s.adminNotifyEvents || {};
  return !!ev[eventKey];
}

// ---------------------------------------------------------------- main
export default {
  async fetch(request, env, ctx) {
    const CORS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,DELETE",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Test-Mode,Cache-Control,Pragma,Accept",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url), p = url.pathname, m = request.method;
    // Chuẩn hóa xác định môi trường Test Mode cho request hiện tại:
    const reqIsTest = url.searchParams.has("test") ? (url.searchParams.get("test") === "1") : (request.headers.has("X-Test-Mode") ? (request.headers.get("X-Test-Mode") === "1") : false);
    const KV = getKV(env);
    if (!KV) return new Response("LỖI: Chưa kết nối kho KV", { status: 500, headers: CORS });
    const J = (d, s = 200) => new Response(JSON.stringify(d), {
      status: s,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
    const OK = () => new Response("OK", { status: 200, headers: CORS });
    const RAW = (txt) => new Response(txt, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
    const body = async () => {
      try {
        return await request.json();
      } catch { return {};
      }
    };
    const getP = (u, ...keys) => {
      for (const k of keys) {
        const v = u.searchParams.get(k);
        if (v) return v;
      }
      return null;
    };
    const b64e = (str) => {
      const bytes = new TextEncoder().encode(str);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin);
    };

    // ================================================================ QR TICKET GATEWAY (/qr/...)
    if (p.startsWith("/qr/")) {
      const ticket = p.slice(4).trim();
      const rawTkt = ticket ? await KV.get("QR_TKT_" + ticket) : null;
      const tktData = safeJson(rawTkt, null);
      const ua = request.headers.get("User-Agent") || "";
      const isSingbox = /hiddify|sing-box|singbox|nekobox|nekoray|singbox-legacy/i.test(ua);
      const isClash = !isSingbox && /clash|meta|stash|surfboard|flclash|mihomo|clashmeta/i.test(ua);
      const VP = "vless://00000000-0000-0000-0000-000000000000@127.0.0.1:1?type=tcp#";
      if (!tktData || !tktData.url || Date.now() > Number(tktData.exp || 0)) {
        const expSecCfg = (tktData && tktData.sec) || 30;
        const EXP_QR_NODES = ["⛔ Mã QR đã tự hủy", `⏳ Hết hạn sau ${expSecCfg}s`, "🔄 Hãy bấm Lấy QR mới", "📞 Zalo: 0917678211"];
        const rh = new Headers({
          ...CORS,
          "profile-title": "VPNTrinhHg",
          "Profile-Title": "VPNTrinhHg",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Access-Control-Expose-Headers": "profile-title,Profile-Title,subscription-userinfo,Content-Disposition"
        });
        if (isSingbox) {
          rh.set("Content-Disposition", 'attachment; filename="VPNTrinhHg"');
          rh.set("Content-Type", "application/json; charset=utf-8");
          return new Response(makeSimpleSingbox(EXP_QR_NODES), { status: 200, headers: rh });
        }
        if (isClash) {
          rh.set("Content-Disposition", 'attachment; filename="VPNTrinhHg.yaml"');
          rh.set("Content-Type", "text/yaml; charset=utf-8");
          return new Response(makeSimpleYaml(EXP_QR_NODES), { status: 200, headers: rh });
        }
        rh.set("Content-Disposition", 'attachment; filename="VPNTrinhHg"');
        rh.set("Content-Type", "text/plain; charset=utf-8");
        return new Response(b64e(EXP_QR_NODES.map(n => VP + encodeURIComponent(n)).join("\n")), { status: 200, headers: rh });
      }
      return Response.redirect(tktData.url, 302);
    }

    // ================================================================ SUBSCRIPTION /v1 -> /v6
    if (p.match(/^\/v[1-6]/)) {
      const reqToken = getP(url, "top", "liki", "lidj", "kidj", "OwO", "token", "oos");
      const ua = request.headers.get("User-Agent") || "";
      const isSingbox = /hiddify|sing-box|singbox|nekobox|nekoray|singbox-legacy/i.test(ua);
      const isClash = !isSingbox && /clash|meta|stash|surfboard|flclash|mihomo|clashmeta/i.test(ua);
      const rh = new Headers({ ...CORS });
      rh.set("profile-title", "VPNTrinhHg");
      rh.set("profile-update-interval", "1");
      rh.set("Profile-Update-Interval", "1");
      rh.set("X-Profile-Update-Interval", "3600");
      rh.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      rh.set("Access-Control-Expose-Headers", "profile-title,profile-update-interval,Profile-Update-Interval,X-Profile-Update-Interval,subscription-userinfo,Content-Disposition");

      const VP = "vless://00000000-0000-0000-0000-000000000000@127.0.0.1:1?type=tcp#";

      // C. Node ảo khi ĐƠN BỊ KHÓA hoặc HẾT HẠN (Admin khóa tay hoặc Cron quét 00h00)
      const LOCKED_NODES = ["⛔ Gói cước đã hết hạn", "🌐 Gia hạn tại: vpntrinhhg.pages.dev", "📞 Zalo hỗ trợ: 0917678211"];
      const LOCKED_B64 = b64e(LOCKED_NODES.map(n => VP + encodeURIComponent(n)).join("\n"));
      const LOCKED_YAML = makeSimpleYaml(LOCKED_NODES);
      const LOCKED_SB = makeSimpleSingbox(LOCKED_NODES);

      // D. Node ảo khi LINK BỊ XÓA khỏi Link Sub / Không tồn tại
      const DEAD_NODES = ["❌ Gói cước không tồn tại", "🌐 Mua hàng tại: vpntrinhhg.pages.dev", "📞 Zalo hỗ trợ: 0917678211"];
      const DEAD_B64 = b64e(DEAD_NODES.map(n => VP + encodeURIComponent(n)).join("\n"));
      const DEAD_YAML = makeSimpleYaml(DEAD_NODES);
      const DEAD_SB = makeSimpleSingbox(DEAD_NODES);

      // Gắn DUY NHẤT tham số expire (Tuyệt đối KHÔNG có upload, download, total)
      const respond = (b, fmt, expireSec = null) => {
        if (expireSec !== null && expireSec !== undefined) {
          rh.set("subscription-userinfo", `expire=${expireSec}`);
        }
        if (fmt === "yaml") {
          rh.set("Content-Disposition", 'attachment; filename="VPNTrinhHg.yaml"');
          rh.set("Content-Type", "text/yaml; charset=utf-8");
        }
        else if (fmt === "singbox") {
          rh.set("Content-Disposition", 'attachment; filename="VPNTrinhHg"');
          rh.set("Content-Type", "application/json; charset=utf-8");
        }
        else {
          rh.set("Content-Disposition", 'attachment; filename="VPNTrinhHg"');
          rh.set("Content-Type", "text/plain; charset=utf-8");
        }
        return new Response(b, { status: 200, headers: rh });
      };
      const getFmt = () => (isSingbox ? "singbox" : isClash ? "yaml" : "b64");
      const getDead = () => {
        const f = getFmt();
        return respond(f === "singbox" ? DEAD_SB : f === "yaml" ? DEAD_YAML : DEAD_B64, f, 0);
      };
      const getLocked = (expSec = 0) => {
        const f = getFmt();
        return respond(f === "singbox" ? LOCKED_SB : f === "yaml" ? LOCKED_YAML : LOCKED_B64, f, expSec);
      };
      if (!reqToken) return getDead();
      try {
        let routerObj = safeJson(await KV.get("GLOBAL_ROUTER"), {});
        if (!routerObj || typeof routerObj !== "object") routerObj = {};
        const mapping = routerObj[reqToken];
        if (!mapping) return getDead();

        // Mốc hết hạn của link sub: Đúng 00:00:00 UTC+7 ngày hết hạn
        const isLife = !!mapping.isLife || isLifetime(mapping.expDate);
        const dayStart = parseDmy(mapping.expDate);
        const lockTs = isLife ? 4102444800000 : (mapping.lockTs || dayStart);
        const expireSec = isLife ? 4102444800 : Math.floor(lockTs / 1000);

        // Kiểm tra khóa: Do Admin khóa tay HOẶC chạm 00:00:00 ngày hết hạn
        const now = NOW();
        const isExpired = (!isLife && lockTs > 0 && now >= lockTs);
        if (mapping.isLocked || isExpired) return getLocked(expireSec);

        // Danh sách 3 Node thông tin chuẩn: HSD kèm số ngày còn lại (lấy mốc Tab Đơn hàng), Website, Zalo
        let remainDaysText = "";
        if (!isLife && mapping.expDate) {
          const lockT = mapping.lockTs || parseDmy(mapping.expDate);
          if (lockT > now) {
            const dLeft = Math.floor((lockT - now) / 864e5);
            remainDaysText = ` (Còn ${dLeft} ngày)`;
          }
        }
        // Danh sách 3 Node thông tin chuẩn: Node 1 chỉ hiện HSD (thời gian còn lại app tự hiện ở thanh VPN), Website, Zalo
        const hsdNodeTitle = isLife ? "♾️ HSD: Vĩnh viễn" : `⏰ HSD: ${mapping.expDate || "Đang hoạt động"}`;
        const ACTIVE_INFO_NAMES = [hsdNodeTitle, "🌐 Website: vpntrinhhg.pages.dev", "📞 Zalo hỗ trợ: 0917678211"];
        let subsObj = safeJson(await KV.get("GLOBAL_SUBS"), {});
        if (!subsObj || typeof subsObj !== "object") subsObj = {};

        const extractNodes = (cd) => {
          if (!cd || !cd.body_b64) return [];
          const dec = decB64(cd.body_b64);
          return dec.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes("://") && !l.includes("127.0.0.1"));
        };

        const isKtUrl = u => String(u || "").includes("tohno-1.top") || String(u || "").includes("oosaka") || String(u || "").includes("kitty");

        // XỬ LÝ LINK COMBO TRỘN REAL-TIME
        if (mapping.isCombo && Array.isArray(mapping.tokens) && mapping.tokens.length) {
          const [tok1, tok2] = mapping.tokens;
          let cd1 = subsObj[tok1], cd2 = subsObj[tok2];

          if (!cd1 && !cd2) {
            const fulfillCfg = safeJson(await KV.get("FULFILLMENT_CONFIG"), {});
            const pref = fulfillCfg.failover_pref || "lx";
            let targetUrl = mapping.origUrls?.[0];
            if (pref === "dj" && mapping.origUrls?.[1]) targetUrl = mapping.origUrls[1];
            else if (pref === "kt" && mapping.origUrls) targetUrl = mapping.origUrls.find(isKtUrl) || mapping.origUrls[0];
            else if (pref === "lx" && mapping.origUrls) targetUrl = mapping.origUrls.find(u => String(u).includes("liangxin")) || mapping.origUrls[0];
            if (!targetUrl) return getDead();
            const r = await fetch(targetUrl, { headers: { "User-Agent": "v2rayN/6.23" } });
            if (!r.ok) return getDead();
            const rawB64 = (await r.text()).replace(/\s+/g, "");
            const provName = isKtUrl(targetUrl) ? "kitty" : (String(targetUrl).includes("liangxin") ? "liangxin" : "djjc");
            const { newB64, yamlStr, singboxStr } = processB64(rawB64, ACTIVE_INFO_NAMES, VP, provName);
            return isSingbox ? respond(singboxStr, "singbox", expireSec) : isClash ? respond(yamlStr, "yaml", expireSec) : respond(newB64, "b64", expireSec);
          }

          const rawNodes1 = extractNodes(cd1);
          const rawNodes2 = extractNodes(cd2);
          const combinedNodeLines = [...rawNodes1, ...rawNodes2];

          if (!combinedNodeLines.length) return getDead();

          const infoLines = ACTIVE_INFO_NAMES.map(n => VP + encodeURIComponent(n));
          const allLines = [...infoLines, ...combinedNodeLines];
          const comboB64 = encB64(allLines.join("\n"));

          const proxies = [];
          for (const line of combinedNodeLines) {
            const p = parseURI(line);
            if (p && p.server && p.name) proxies.push(p);
          }

          const uJoined = (mapping.origUrls || []).join(" ");
          const hasLx = uJoined.includes("liangxin"), hasDj = uJoined.includes("djjc"), hasKt = isKtUrl(uJoined);
          let comboMode = "combo_lidj";
          if (hasLx && hasKt) comboMode = "combo_liki";
          else if (hasKt && hasDj) comboMode = "combo_kidj";

          if (isSingbox) {
            const sbStr = buildSingboxFull(proxies, ACTIVE_INFO_NAMES, comboMode);
            return respond(sbStr, "singbox", expireSec);
          }
          if (isClash) {
            const yStr = buildYaml(proxies, ACTIVE_INFO_NAMES, comboMode);
            return respond(yStr, "yaml", expireSec);
          }
          return respond(comboB64, "b64", expireSec);
        }

        // XỬ LÝ LINK ĐƠN (LIANGXIN, DJJC HOẶC KITTY)
        const originToken = mapping.origTok, origUrl = mapping.origUrl;
        let cd = subsObj[originToken];
        const isKt = isKtUrl(origUrl);
        const isLiangxin = String(origUrl || "").includes("liangxin");
        const singleMode = isKt ? "kitty" : (isLiangxin ? "liangxin" : "djjc");

        // FAST-PATH v2.4: Lấy node thực tế từ cache Python và chèn 3 Node thông tin cá nhân hóa (HSD + remainings)
        if (cd) {
          const rawNodes = extractNodes(cd);
          if (rawNodes.length) {
            const infoLines = ACTIVE_INFO_NAMES.map(n => VP + encodeURIComponent(n));
            const allLines = [...infoLines, ...rawNodes];
            const singleB64 = encB64(allLines.join("\n"));

            if (!isSingbox && !isClash) {
              return respond(singleB64, "b64", expireSec);
            }

            const proxies = [];
            for (const line of rawNodes) {
              const p = parseURI(line);
              if (p && p.server && p.name) proxies.push(p);
            }

            if (isSingbox) {
              const sbStr = buildSingboxFull(proxies, ACTIVE_INFO_NAMES, singleMode);
              return respond(sbStr, "singbox", expireSec);
            }
            if (isClash) {
              const yStr = buildYaml(proxies, ACTIVE_INFO_NAMES, singleMode);
              return respond(yStr, "yaml", expireSec);
            }
          }
        }

        if (!cd && origUrl) {
          const r = await fetch(origUrl, {
            headers: { "User-Agent": "v2rayN/6.23" },
            cf: { cacheTtl: 0, cacheEverything: false }
          });
          if (r.ok) {
            const rawB64 = (await r.text()).replace(/\s+/g, ""), ui = r.headers.get("subscription-userinfo") || "";
            if (rawB64 && rawB64.length >= 20) {
              const { newB64, yamlStr, singboxStr } = processB64(rawB64, ACTIVE_INFO_NAMES, VP, singleMode);
              cd = {
                body_b64: newB64,
                body_yaml: yamlStr,
                body_singbox: singboxStr,
                info: ui
              };
              subsObj[originToken] = cd;
              ctx.waitUntil(KV.put("GLOBAL_SUBS", JSON.stringify(subsObj)));
              if (isSingbox) return singboxStr && singboxStr.length > 500 ? respond(singboxStr, "singbox", expireSec) : getDead();
              if (isClash) return yamlStr && yamlStr.length > 200 ? respond(yamlStr, "yaml", expireSec) : getDead();
              return respond(newB64, "b64", expireSec);
            }
          }
        }
        return getDead();
      } catch (e) {
        console.error("Sub error:", e && e.message || e);
        return getDead();
      }
    }

    await syncClock(KV);
    await getActivePkgs(KV);
    const admin = await isAdmin(request, env), internal = isInternal(request, env), log = mkLog();
    const need = (ok) => (ok ? null : J({ ok: false, error: "Unauthorized" }, 401));
    const pub = (o, st) => publicOrder(o, st.cms, st.links, getMe(url, env, st.cms).field);

    // ================================================================ PUBLIC (khách)
    if (p === "/api/public/config" && m === "GET") {
      const cms = safeJson(await KV.get("ALL_CMS"), {}), s = cms.settings || {};
      let g = safeJson(await KV.get("GUIDES"), null);
      if (!g || !Object.keys(g).length) {
        g = {};
        for (const k of ["android", "windows", "macos", "ios"]) if (typeof cms[k] === "string" && cms[k]) g[k] = cms[k];
      }

      const blur1 = !!(s.blurOn1 && /doicucden/i.test(String(s.blurRoute1 || "")));
      const blur2 = !!(s.blurOn2 && /onepiecechapter/i.test(String(s.blurRoute2 || "")));
      const blur3 = !!(s.blurOn3 && /lucastanora/i.test(String(s.blurRoute3 || "")));
      const blur = [blur1, blur2, blur3];

      const httpOnly = (v) => (/^https?:\/\//i.test(String(v || "")) ? String(v) : "");
      const dock = Array.isArray(s.dock) ? s.dock.filter((d) => d && (httpOnly(d.img) || d.icon)).map((d) => ({
        name: String(d.name || "").slice(0, 40),
        img: httpOnly(d.img),
        url: httpOnly(d.url),
        icon: d.icon || "",
        bg: d.bg || ""
      })) : [];

      // Trả về danh sách gói động, FAQ, cấu hình routes động, footer và headerDrawer đã lưu trong KV
      const dynamicPkgs = safeJson(await KV.get("ALL_PACKAGES"), null);
      const dynamicFaqs = Array.isArray(cms.faqs) && cms.faqs.length ? cms.faqs : null;
      const qrExpireSeconds = Math.max(5, Math.min(3600, Number(s.qrExpireSeconds) || 30));
      const routes = s.routes || null;
      const footer = cms.footer || null;
      const headerDrawer = s.headerDrawer || null;
      const couponEnabled = s.couponEnabled !== false;
      const coupons = Array.isArray(cms.coupons) ? cms.coupons.filter(c => c && c.enabled !== false) : [];
      const flashSale = (cms.sales && cms.sales.campaign) || s.flashSale || null;
      const giftRules = Array.isArray(cms.giftRules) ? cms.giftRules.filter(r => r && r.enabled !== false) : [];
      return J({
        ok: true,
        guides: g,
        blur,
        dock: dock.length ? dock : null,
        packages: dynamicPkgs,
        faqs: dynamicFaqs,
        qrExpireSeconds,
        routes,
        footer,
        headerDrawer,
        couponEnabled,
        coupons,
        flashSale,
        giftRules
      });
    }

    // Endpoint tạo Vé QR tạm thời (Tự hủy sau qrExpireSeconds giây)
    if (p === "/api/public/qr_ticket" && m === "POST") {
      const b = await body();
      const targetUrl = String(b.url || "").trim();
      if (!/^https?:\/\//i.test(targetUrl)) return J({ ok: false, error: "Link không hợp lệ" }, 400);
      const cms = safeJson(await KV.get("ALL_CMS"), {});
      const sec = Math.max(5, Math.min(3600, Number(cms?.settings?.qrExpireSeconds) || 30));
      const ticket = hex(16);
      const exp = Date.now() + sec * 1000;
      await KV.put("QR_TKT_" + ticket, JSON.stringify({ url: targetUrl, exp, sec }), { expirationTtl: Math.max(60, sec + 30) });
      const workerBase = (env.PUBLIC_WORKER_URL || url.origin).replace(/\/$/, "");
      return J({
        ok: true,
        ticket,
        qrUrl: `${workerBase}/qr/${ticket}#VPNTrinhHg`,
        expireSeconds: sec,
        exp
      });
    }

    // Endpoint hủy vé QR ngay lập tức khi đóng x modal
    if (p === "/api/public/qr_cancel" && m === "POST") {
      const b = await body();
      const ticket = String(b.ticket || "").trim();
      if (ticket) await KV.delete("QR_TKT_" + ticket);
      return J({ ok: true });
    }

    // Endpoint quản lý Giá gói cho Admin (GET và POST)
    if (p === "/api/packages") {
      if (m === "GET") {
        const pkgs = safeJson(await KV.get("ALL_PACKAGES"), null);
        const cms = safeJson(await KV.get("ALL_CMS"), {});
        const s = cms.settings || {};
        return J({
          ok: true,
          packages: pkgs,
          couponEnabled: s.couponEnabled !== false,
          coupons: Array.isArray(cms.coupons) ? cms.coupons : [],
          flashSale: (cms.sales && cms.sales.campaign) || s.flashSale || null,
          giftRules: Array.isArray(cms.giftRules) ? cms.giftRules : []
        });
      }
      if (m === "POST") {
        const bad = need(admin);
        if (bad) return bad;
        const b = await body();
        const list = Array.isArray(b.packages) ? b.packages : [];
        await KV.put("ALL_PACKAGES", JSON.stringify(list));
        CACHED_PKGS = null; // Xóa cache in-memory
        await getActivePkgs(KV); // Cập nhật ngay lập tức vào DYNAMIC_PKGS

        // Đồng bộ lưu couponEnabled, flashSale, coupons & giftRules vào ALL_CMS
        const cms = safeJson(await KV.get("ALL_CMS"), {});
        cms.settings = cms.settings || {};
        if (b.couponEnabled !== undefined) cms.settings.couponEnabled = !!b.couponEnabled;
        if (b.flashSale !== undefined) {
          cms.sales = cms.sales || {};
          cms.sales.campaign = b.flashSale;
          cms.settings.flashSale = b.flashSale;
        }
        if (Array.isArray(b.coupons)) cms.coupons = b.coupons;
        if (b.giftRules !== undefined) {
          // Validate chống 2 quy tắc quà tặng cùng active trên 1 package
          const gList = Array.isArray(b.giftRules) ? b.giftRules : [];
          const activePkgMap = new Map();
          for (const r of gList) {
            if (!r || r.enabled === false) continue;
            for (const pid of (r.packageIds || [])) {
              if (activePkgMap.has(pid)) {
                return J({
                  ok: false,
                  error: `Gói ${pid} đang bị áp dụng bởi nhiều hơn 1 quy tắc quà tặng đang hoạt động!`
                }, 400);
              }
              activePkgMap.set(pid, r.id || r.name);
            }
          }
          cms.giftRules = gList;
        }
        await KV.put("ALL_CMS", JSON.stringify(cms));

        log("ok", "admin", "Lưu cấu hình Giá gói, Sale & Quà tặng", `${list.length} gói cước`);
        await flushLog(KV, log);
        return J({ ok: true, count: list.length });
      }
    }
    // Endpoint quản lý Cấu hình Mapping & Chính sách Failover Fulfillment
    if (p === "/api/admin/fulfillment_config") {
      if (m === "GET") {
        const cfg = safeJson(await KV.get("FULFILLMENT_CONFIG"), { mapping: {}, failover_pref: "lx" });
        return J({ ok: true, config: cfg });
      }
      if (m === "POST") {
        const bad = need(admin);
        if (bad) return bad;
        const b = await body();
        await KV.put("FULFILLMENT_CONFIG", JSON.stringify(b.config || {}));
        log("ok", "admin", "Lưu cấu hình", "Fulfillment Mapping & Failover Policy");
        await flushLog(KV, log);
        return J({ ok: true });
      }
    }

    if (p === "/api/public/translations" && m === "GET") {
      const t = await KV.get("translations", { cacheTtl: 60 });
      return RAW(t || '{"version":"","vi":{},"en":{},"zh":{}}');
    }
    if (p === "/api/public/lookup" && m === "POST") {
      const isTestReq = reqIsTest;
      const b = await body();
      const rawQ = String(b.q || "").trim();
      const isEmailQuery = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawQ);
      const sb = env ? getSupabase(env, isTestReq) : null;

      let matchedOrders = [];
      let o = null;

      if (sb) {
        try {
          if (isEmailQuery) {
            const emQuery = rawQ.toLowerCase();
            const resOrders = await sb.getOrdersByEmail(emQuery, 50);
            matchedOrders = Array.isArray(resOrders) ? resOrders : [];
            matchedOrders = matchedOrders.filter(ord => {
              if (!ord || String(ord.email || "").toLowerCase() !== emQuery) return false;
              const isTestOrd = ord.isTest === true || String(ord.id).startsWith("DH_TEST_");
              return isTestReq === isTestOrd;
            });
            matchedOrders.sort((a, b) => (b.createdTs || 0) - (a.createdTs || 0));
            o = matchedOrders.find(ord => normStatus(ord.status) === "success") || matchedOrders[0] || null;
          } else {
            const singleOrd = await sb.getOrder(normId(rawQ));
            if (singleOrd) {
              const isTestOrd = singleOrd.isTest === true || String(singleOrd.id).startsWith("DH_TEST_");
              if (isTestReq === isTestOrd) {
                o = singleOrd;
                matchedOrders = [singleOrd];
                if (singleOrd.email) {
                  const related = await sb.getOrdersByEmail(singleOrd.email, 50).catch(() => []);
                  if (Array.isArray(related)) {
                    related.forEach(ro => {
                      if (ro && !matchedOrders.some(x => normId(x.id) === normId(ro.id))) {
                        const roTest = ro.isTest === true || String(ro.id).startsWith("DH_TEST_");
                        if (isTestReq === roTest) matchedOrders.push(ro);
                      }
                    });
                  }
                }
              }
            }
          }
        } catch (err) {
          return J({
            ok: false,
            error: "Lỗi kết nối cơ sở dữ liệu tra cứu: " + (err.message || String(err))
          }, 503);
        }
      } else {
        // Fallback đọc KV khi không cấu hình Supabase
        const g = async (k, d) => safeJson(await KV.get(k), d);
        const kvOrders = arr(await g(isTestReq ? "ALL_ORDERS_TEST" : "ALL_ORDERS", []));
        const allOrders = isTestReq ? kvOrders : kvOrders.filter(x => !isTestOrderRecord(x));

        if (isEmailQuery) {
          const emQuery = rawQ.toLowerCase();
          matchedOrders = allOrders.filter(ord => {
            if (!ord || String(ord.email || "").toLowerCase() !== emQuery) return false;
            const isTestOrd = ord.isTest === true || String(ord.id).startsWith("DH_TEST_");
            return isTestReq === isTestOrd;
          });
          matchedOrders.sort((a, b) => (b.createdTs || 0) - (a.createdTs || 0));
          o = matchedOrders.find(ord => normStatus(ord.status) === "success") || matchedOrders[0] || null;
        } else {
          const byId = allOrders.find(ord => ord && normId(ord.id) === normId(rawQ));
          if (byId) {
            const isTestOrd = byId.isTest === true || String(byId.id).startsWith("DH_TEST_");
            if (isTestReq === isTestOrd) {
              o = byId;
              const em = String(byId.email || "").toLowerCase();
              matchedOrders = em ? allOrders.filter(x => String(x.email || "").toLowerCase() === em) : [byId];
            }
          }
        }
      }

      // Fallback kiểm tra bộ nhớ đệm đơn hàng chờ (KV Pending Cache)
      if (!o && rawQ) {
        const rawPending = await KV.get("PENDING_ORD_" + normId(rawQ));
        if (rawPending) {
          const pOrd = safeJson(rawPending, null);
          if (pOrd) {
            const isTestOrd = pOrd.isTest === true || String(pOrd.id).startsWith("DH_TEST_");
            if (isTestReq === isTestOrd) {
              o = pOrd;
              if (!matchedOrders.some(x => normId(x.id) === normId(pOrd.id))) matchedOrders.push(pOrd);
            }
          }
        }
      }

      if (!o) {
        if (isEmailQuery) {
          return J({ ok: true, found: false, order: null, existingLinks: [] }, 200);
        }
        return J({
          ok: false,
          found: false,
          error: "not_found",
          existingLinks: []
        }, 404);
      }

      // 1. Đọc đồng thời ALL_CMS, ALL_LINKS và DELETED_LINKS (tombstone) từ KV trước khi xử lý link
      const [cms, rawLinks, tb] = await Promise.all([safeJson(await KV.get("ALL_CMS"), {}), safeJson(await KV.get("ALL_LINKS"), []), loadTombs(KV)]);
      const links = arr(rawLinks);
      const stMini = {
        cms: cms && typeof cms === "object" && !Array.isArray(cms) ? cms : {},
        links
      };

      // 2. Chuẩn hóa Set tra cứu tombstone theo đúng schema (hỗ trợ cả t.id, t.url hoặc chuỗi ID)
      const tombSet = new Set();
      for (const t of tb) {
        if (!t) continue;
        if (typeof t === "string") tombSet.add(t);
        else {
          if (t.id) tombSet.add(t.id);
          if (t.url) tombSet.add(t.url);
        }
      }
      const isTombId = (idOrUrl) => idOrUrl ? tombSet.has(idOrUrl) : false;

      // 3. Lọc danh sách đơn thành công của email từ matchedOrders (đảm bảo đúng môi trường Test/Prod)
      const em = String(o.email || (isEmailQuery ? rawQ : "")).toLowerCase();
      const userOrders = matchedOrders.filter(ord => {
        if (!ord || String(ord.email || "").toLowerCase() !== em) return false;
        if (normStatus(ord.status) !== "success") return false;
        const isTestOrd = ord.isTest === true || String(ord.id).startsWith("DH_TEST_");
        return isTestReq === isTestOrd;
      });

      // 4. Xác định các đơn còn hạn (chuẩn hóa mốc đầu ngày 00:00:00 UTC+7 để so khớp chính xác với parseDmy)
      const now = NOW();
      const todayStart = day0(now);
      const isOrderActive = (ord) => {
        if (!ord || !ord.expDate) return false;
        if (isLifetime(ord.expDate)) return true;
        const expT = parseDmy(ord.expDate);
        return expT ? expT >= todayStart : false;
      };
      const activeOrders = userOrders.filter(isOrderActive);

      // 5. Kiểm tra thực tế trong kho ALL_LINKS và loại bỏ link tombstone đã xóa
      const existingLinks = [];
      const seenMasked = new Set();
      for (const ord of userOrders) {
        for (const f of ["info1", "info2", "info3"]) {
          const lk = ord[f];
          if (lk && !seenMasked.has(lk)) {
            seenMasked.add(lk);
            // Kiểm tra trạng thái thực tế của link trong kho link sub
            const foundRec = links.find(l => l && (l.masked === lk || l.id === lk));
            const isTomb = isTombId(lk) || (foundRec && isTombId(foundRec.id));
            if (isTomb || !foundRec) {
              // Link đã bị xóa hoặc không còn tồn tại trong kho -> bỏ qua
              continue;
            }
            const isLocked = !!(foundRec.isLocked || foundRec.orig === LOCK_ORIG || (!isLifetime(ord.expDate) && parseDmy(ord.expDate) ? parseDmy(ord.expDate) < todayStart : false));
            existingLinks.push({
              url: lk,
              orderId: ord.id,
              pkgName: ord.pkgName || ord.pkg || "",
              expDate: ord.expDate || "",
              status: isLocked ? "locked" : "active"
            });
          }
        }
      }

      // 6. Xác định số link thực sự phân biệt đang hoạt động
      const activeDistinctLinks = existingLinks.filter(l => l.status === "active");

      // 7. Phân loại luồng linkScenario chính xác
      let linkScenario = "none";
      if (userOrders.length === 0) {
        linkScenario = "none"; // B4: Email mới tinh, chưa từng có đơn thành công
      } else if (existingLinks.length === 0) {
        linkScenario = "deleted_links"; // Email có lịch sử nhưng tất cả link cũ đã bị xóa / tombstone
      } else if (activeDistinctLinks.length >= 2) {
        linkScenario = "multi_active"; // B6: Có >= 2 link đang cùng hoạt động riêng biệt
      } else if (existingLinks.length === 1) {
        linkScenario = "single_link"; // B5: Có đúng 1 link cũ phù hợp (dù đang active hay locked)
      } else {
        // Có > 1 link trong kho (ví dụ: 1 link active + 1 link locked, hoặc nhiều link locked)
        linkScenario = activeDistinctLinks.length > 0 ? "multi_active" : "single_link";
      }

      return J({
        ok: true,
        found: true,
        order: pub(o, stMini),
        existingLinks,
        linkScenario,
        activeOrdersCount: activeOrders.length
      });
    }
    if (p === "/api/public/order" && m === "POST") {
      const isTestReq = reqIsTest;
      const b = await body(), id = normId(b.id), pk = PKGS[b.pkgId], qty = Math.max(1, Math.min(120, parseInt(b.qty) || 1));
      if (!/^DH[A-Z0-9]{10}$/.test(id) || !pk || pk.old) return J({ ok: false, error: "Dữ liệu đơn hàng không hợp lệ" }, 400);
      const st = await loadAll(KV, env, isTestReq), now = NOW();
      const dup = st.orders.find((o) => o && normId(o.id) === id);
      if (dup) return J({ ok: true, order: pub(dup, st), existed: true });
      let email = String(b.email || "").trim(), zalo = String(b.zalo || "").trim();
      const renewSrc = b.renewOf ? st.orders.find((x) => x && normId(x.id) === normId(b.renewOf) && normStatus(x.status) === "success") : null;
      if (renewSrc) {
        if (!email && renewSrc.email) email = renewSrc.email;
        if (!zalo && renewSrc.zalo) zalo = renewSrc.zalo;
      }
      if (!email && !zalo) return J({ ok: false, error: "Cần ít nhất Email hoặc Zalo" }, 400);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ ok: false, error: "Email không hợp lệ" }, 400);
      const isRenew = !!renewSrc;
      const method = String(b.method || "Ngân hàng VN"), bank = isBankMethod(method);

      // Tra cứu tất cả link sub hiện hữu của email này trong kho dữ liệu phù hợp
      const emLower = email.toLowerCase();
      const existingSubLinks = [];
      const seenUrls = new Set();
      if (emLower) {
        for (const ord of st.orders) {
          if (!ord || String(ord.email || "").toLowerCase() !== emLower) continue;
          if (normStatus(ord.status) !== "success") continue;
          const isTestOrd = ord.isTest === true || String(ord.id).startsWith("DH_TEST_");
          if (isTestReq !== isTestOrd) continue;
          for (const f of ["info1", "info2", "info3"]) {
            const lk = ord[f];
            if (lk && !seenUrls.has(lk)) {
              seenUrls.add(lk);
              existingSubLinks.push({ url: lk, orderId: ord.id });
            }
          }
        }
      }

      // XÁC THỰC BẮT BUỘC VÒNG ĐỜI LINK SUB TRÊN SERVER
      let subLinkDecision = String(b.subLinkDecision || "").trim();
      let targetLink = String(b.targetLink || "").trim();

      // Lọc các đơn đang còn hạn hoạt động của email này
      const activeUserOrders = st.orders.filter(x => x && normStatus(x.status) === "success" && String(x.email || "").toLowerCase() === emLower && (isLifetime(x.expDate) || parseDmy(x.expDate) >= now));

      if (renewSrc) {
        // B2: Gia hạn bắt đầu từ nút gia hạn portal -> 100% giữ link cũ đích danh
        subLinkDecision = "KEEP_EXISTING";
        targetLink = renewSrc.info1 || renewSrc.info2 || renewSrc.info3 || "";
      } else if (activeUserOrders.length >= 2) {
        // B6: Email có 2 đơn hoạt động -> Backend tự động quyết định CẤP LINK MỚI ĐỘC LẬP
        subLinkDecision = "CREATE_NEW";
        targetLink = "";
      } else if (existingSubLinks.length === 1) {
        // B5: Có đúng 1 link cũ phù hợp trong luồng mua thông thường
        if (!subLinkDecision || (subLinkDecision !== "KEEP_EXISTING" && subLinkDecision !== "CREATE_NEW")) {
          return J({ ok: false, error: "Vui lòng chọn Giữ link cũ hoặc Cấp link mới" }, 400);
        }
        if (subLinkDecision === "KEEP_EXISTING") {
          targetLink = existingSubLinks[0].url;
        } else {
          targetLink = "";
        }
      } else {
        // B4: Email mới chưa từng tồn tại hoặc không còn link cũ -> Tự động cấp link mới
        subLinkDecision = "CREATE_NEW";
        targetLink = "";
      }

      // Snapshot Gift Rule đang có hiệu lực
      const giftRules = Array.isArray(st.cms?.giftRules) ? st.cms.giftRules : [];
      const activeGift = getActiveGiftRule(giftRules, b.pkgId, now);
      let giftRuleId = "";
      let giftName = "";
      let bonusDays = 0;
      let bonusText = "";

      if (activeGift && pk.m !== 0 && pk.time !== "lifetime") {
        giftRuleId = activeGift.id || "";
        giftName = activeGift.name || activeGift.sticker || "";
        bonusDays = Number(activeGift.bonusDays) || 0;
        bonusText = activeGift.bonusText || "";
      } else if (pk.m !== 0 && pk.time !== "lifetime") {
        // Fallback đơn cũ
        bonusDays = Number(pk.bonus_days || pk.bonusDays || 0);
        bonusText = pk.bonus_text || "";
        giftName = pk.promo_sticker || "";
      }

      // TÍNH TOÁN GIÁ TIỀN AUTHORITATIVE PHÍA SERVER (HỖ TRỢ FLASH SALE & COUPON)
      let baseVnd = pk.vnd * qty;
      let finalVnd = baseVnd;
      let appliedCouponCode = "";
      let discountVnd = 0;

      // 1. Áp dụng Flash Sale nếu có hiệu lực
      const fs = (st.cms && st.cms.sales && st.cms.sales.campaign) || (st.cms && st.cms.settings && st.cms.settings.flashSale);
      if (fs && fs.enabled && Number(fs.discountPercent) > 0) {
        const fsStart = fs.startDate ? new Date(fs.startDate).getTime() : 0;
        const fsEnd = fs.endDate ? new Date(fs.endDate).getTime() : Infinity;
        if (now >= fsStart && now <= fsEnd) {
          const discountPct = Math.min(90, Math.max(1, Number(fs.discountPercent)));
          finalVnd = Math.round(baseVnd * (100 - discountPct) / 100);
        }
      }

      // 2. Xác thực và áp dụng mã giảm giá Coupon từ ALL_CMS phía Server
      const rawCode = String(b.couponCode || b.coupon || "").trim().toUpperCase();
      const couponsList = Array.isArray(st.cms?.coupons) ? st.cms.coupons : [];
      if (rawCode && st.cms?.settings?.couponEnabled !== false) {
        const foundC = couponsList.find(c => c && String(c.code).trim().toUpperCase() === rawCode && c.enabled !== false);
        if (foundC) {
          const cEnd = foundC.endDate ? new Date(foundC.endDate).getTime() : (foundC.expiry ? new Date(foundC.expiry).getTime() : Infinity);
          const cStart = foundC.startDate ? new Date(foundC.startDate).getTime() : 0;
          const minSpend = Number(foundC.minSpend || foundC.minOrder) || 0;
          const maxUsage = Number(foundC.maxUsage || foundC.usageLimit) || 0;
          const curUsage = Number(foundC.usedCount) || 0;

          if (now >= cStart && now <= cEnd && baseVnd >= minSpend && (maxUsage === 0 || curUsage < maxUsage)) {
            appliedCouponCode = foundC.code;
            if (foundC.type === "percent") {
              discountVnd = Math.round(finalVnd * (Number(foundC.value) || 0) / 100);
            } else {
              discountVnd = Math.round(Number(foundC.value) || 0);
            }
            finalVnd = Math.max(1000, finalVnd - discountVnd);
            // Ghi nhận số lượt dùng coupon
            foundC.usedCount = curUsage + 1;
            ctx.waitUntil(KV.put("ALL_CMS", JSON.stringify(st.cms)));
          }
        }
      }

      const o = {
        id,
        email,
        zalo,
        method,
        pkgId: b.pkgId,
        qty,
        pkgName: pk.n,
        pkgData: pk.d,
        pkg: pkgStr(pk),
        // Schema tiền chuẩn hóa (không rỗng): Bank VN lưu totalVnd, Cổng CNY lưu totalCny
        totalVnd: bank ? finalVnd : 0,
        totalCny: bank ? 0 : Math.round(pk.cny * qty * 100) / 100,
        originalVnd: baseVnd,
        discountVnd,
        couponCode: appliedCouponCode,
        days: daysOfPkg(pk, qty),
        needSupport: !!b.needSupport,
        status: "pending",
        createdTs: now,
        date: fmtBank(now),
        dateCreated: dmy(now),
        expFinal: false,
        workerUrl: env.PUBLIC_WORKER_URL || url.origin,
        nickname: "",
        reason: "",
        info1: "",
        info2: "",
        info3: "",
        lockInfo: {},
        sourceWeb: String(b.sourceWeb || "").slice(0, 80),
        orderType: isRenew ? "renew" : "new",
        isTest: !!isTestReq,
        subLinkDecision,
        targetLink,
        renewOf: renewSrc ? renewSrc.id : (b.renewOf ? String(b.renewOf) : ""),
        giftRuleId,
        giftName,
        bonusDays,
        bonusText
      };
      o.expDate = computeExp(o, st.orders, now, giftRules);
      st.orders.unshift(o);

      // Lưu bộ đệm dự phòng vào KV với TTL 24h để tra cứu không bao giờ 404
      await KV.put("PENDING_ORD_" + o.id, JSON.stringify(o), { expirationTtl: 86400 });

      const sb = getSupabase(env, st.isTest);
      if (sb) await sb.upsert(o).catch(() => {});
      ctx.waitUntil((async () => {
        try {
          const r = await d1Register(env, url, o, o.orderType), l2 = mkLog();
          l2(r.ok ? "ok" : "warn", "order", r.ok ? "Đăng ký đơn lên D1" : "Đăng ký D1 lỗi (cron sẽ thử lại)", `${o.id} ${r.data && r.data.error || r.status || ""}`, o.id);
          l2("info", "order", isRenew ? "Đơn gia hạn mới" : "Đơn mới", `${o.id} ${o.email} ${bank ? o.totalVnd : "¥" + o.totalCny}`, o.id);
          await flushLog(KV, l2);
          if (shouldNotifyAdmin(st.cms, isRenew ? "renew" : "new")) {
            await sendMail(env.ADMIN_EMAIL || "lucastanora@gmail.com", isRenew ? `[GIA HẠN] ${o.id} - ${o.email}` : `[ĐƠN MỚI] ${o.id} - ${o.email}`, buildAdminMail(isRenew ? "renew" : "new", o), env, st.cms);
          }
        } catch (e) {
          const lErr = mkLog();
          lErr("error", "order", "Lỗi gửi thông báo đơn mới", String(e && e.message || e), o.id);
          await flushLog(KV, lErr);
        }
      })());
      return J({ ok: true, order: pub(o, st) });
    }
    if (p === "/api/public/upgrade" && m === "POST") {
      const b = await body(), st = await loadAll(KV, env, reqIsTest), o = st.orders.find((x) => x && normId(x.id) === normId(b.orderId));
      const tg = PKGS[b.pkgId], qty = Math.max(1, Math.min(120, parseInt(b.qty) || 1));
      if (!o || !tg || tg.old) return J({ ok: false, error: "Không tìm thấy đơn hoặc gói" }, 404);
      if (normStatus(o.status) !== "success") return J({ ok: false, error: "Đơn chưa kích hoạt" }, 409);
      if (o.pendingUpgrade) return J({ ok: false, error: "Đang có yêu cầu nâng gói chờ xác minh" }, 409);
      const cur = PKGS[o.pkgId] || Object.values(PKGS).find((x) => x.n === o.pkgName && x.d === o.pkgData);

      // Tính giá gói đích chuẩn hóa (Áp dụng giảm giá Flash Sale nếu gói đích thỏa điều kiện)
      let targetVnd = tg.vnd;
      const fs = (st.cms && st.cms.sales && st.cms.sales.campaign) || (st.cms && st.cms.settings && st.cms.settings.flashSale);
      if (fs && fs.enabled && Number(fs.discountPercent) > 0) {
        const fsStart = fs.startDate ? new Date(fs.startDate).getTime() : 0;
        const fsEnd = fs.endDate ? new Date(fs.endDate).getTime() : Infinity;
        const nowMs = NOW();
        if (nowMs >= fsStart && nowMs <= fsEnd) {
          const pct = Math.min(90, Math.max(1, Number(fs.discountPercent)));
          targetVnd = Math.max(1000, Math.round((Number(tg.vnd || 0) * (100 - pct) / 100) / 1000) * 1000);
        }
      }

      const diff = targetVnd - (cur ? cur.vnd : 0);
      if (!cur || diff <= 0) return J({ ok: false, error: "Vui lòng chọn gói cao hơn gói hiện tại" }, 400);
      o.pendingUpgrade = {
        ts: NOW(),
        targetPkg: tg.n,
        targetPkgData: tg.d,
        targetPkgId: b.pkgId,
        amount: diff * qty,
        amountCny: Math.round(Math.max(0, tg.cny - cur.cny) * qty * 100) / 100,
        qty,
        method: String(b.method || "Ngân hàng VN")
      };
      o.upgradeStatus = "pending";
      o.isUpgrade = true;
      const sb = getSupabase(env, st.isTest);
      if (sb) await sb.upsert(o).catch(() => {});
      ctx.waitUntil((async () => {
        try {
          const r = await d1Upgrade(env, url, o, o.pendingUpgrade), l2 = mkLog();
          l2(r.ok ? "ok" : "warn", "upgrade", r.ok ? "Đăng ký nâng gói lên D1" : "Đăng ký nâng gói D1 lỗi", `${o.id} ${r.data && r.data.error || r.status || ""}`, o.id);
          await flushLog(KV, l2);
          if (shouldNotifyAdmin(st.cms, "upgrade")) {
            await sendMail(env.ADMIN_EMAIL || "lucastanora@gmail.com", `[NÂNG GÓI] ${o.id} - ${o.email}`, buildAdminMail("upgrade", o, { cur, tg, qty }), env, st.cms);
          }
        } catch (e) {
          const lErr = mkLog();
          lErr("error", "upgrade", "Lỗi gửi thông báo nâng gói", String(e && e.message || e), o.id);
          await flushLog(KV, lErr);
        }
      })());
      return J({ ok: true, order: pub(o, st) });
    }
    if (p === "/api/public/data_request" && m === "POST") {
      const b = await body(), st = await loadAll(KV, env, reqIsTest), o = st.orders.find((x) => x && normId(x.id) === normId(b.orderId));
      if (!o) return J({ ok: false, error: "not_found" }, 404);
      let reqs = arr(safeJson(await KV.get("ALL_DATA_REQUESTS"), []));
      const old = reqs.find((r) => r.orderId === o.id && r.status === "pending");
      if (old) return J({ ok: true, existed: true });
      reqs.unshift({
        orderId: o.id,
        email: o.email,
        pkgName: o.pkgName || "Gói VPN",
        status: "pending",
        ts: NOW(),
        date: fmtBank(NOW())
      });
      await KV.put("ALL_DATA_REQUESTS", JSON.stringify(reqs.slice(0, 200)));
      if (shouldNotifyAdmin(st.cms, "data")) {
        ctx.waitUntil((async () => {
          try {
            await sendMail(env.ADMIN_EMAIL || "lucastanora@gmail.com", `[TRA CỨU DỮ LIỆU] ${o.id} - ${o.email}`, buildAdminMail("data", o), env, st.cms);
          } catch (e) {
            const lErr = mkLog();
            lErr("error", "mail", "Lỗi gửi mail báo admin tra cứu data", String(e && e.message || e), o.id);
            await flushLog(KV, lErr);
          }
        })());
      }
      return J({ ok: true });
    }

    if (p === "/api/admin/test/toggle" && m === "POST") {
      const b = await body();
      await KV.put("TEST_MODE_ACTIVE", b.active ? "1" : "0");
      return J({ ok: true, active: !!b.active });
    }
    if (p === "/api/admin/test/status" && m === "GET") {
      const active = (await KV.get("TEST_MODE_ACTIVE")) === "1";
      const [ping_prod, ping_test] = await Promise.all([pingSupabase(env, false), pingSupabase(env, true)]);
      return J({
        ok: true,
        active,
        isTest: active,
        ping: active ? ping_test : ping_prod,
        ping_prod,
        ping_test,
        pingProd: ping_prod,
        pingTest: ping_test
      });
    }
    if (p === "/api/admin/test/fake_order" && m === "POST") {
      const sb = getSupabase(env, true);
      if (!sb) return J({ ok: false, error: "Chưa cấu hình Supabase" }, 500);
      const now = NOW();
      const fakeId = "DH_TEST_" + Math.floor(1000 + Math.random() * 9000);
      const fakeOrder = {
        id: fakeId,
        email: "khach_test@gmail.com",
        nickname: "Khách Ảo Test",
        zalo: "0917678211",
        method: "Ngân hàng VN",
        pkgId: "t1",
        qty: 1,
        pkgName: "Gói 1 tháng",
        pkgData: "100GB",
        pkg: "Gói 1 tháng - 60,000VND",
        totalVnd: 60000,
        days: 30,
        expDate: addDaysDmy(day0(now), 30),
        status: "success",
        createdTs: now,
        date: fmtBank(now),
        dateCreated: dmy(now),
        info1: "https://vpntrinhhg.pages.dev/v1/VPNTrinhHg?OwO=test1",
        info2: "",
        info3: ""
      };
      await sb.upsert(fakeOrder);
      return J({ ok: true, order: fakeOrder });
    }
    if (p === "/api/admin/test/clone" && m === "POST") {
      const sb = getSupabase(env, true);
      const count = sb ? await sb.cloneProdToTest() : 0;
      return J({ ok: true, count });
    }
    if (p === "/api/admin/test/clear" && m === "POST") {
      const sb = getSupabase(env, true);
      if (sb) await sb.clearTest();
      await KV.put("ALL_ORDERS_TEST", "[]");
      return J({ ok: true });
    }

    // ================================================================ ADMIN LOGIN
    if (p === "/api/admin/login" && m === "POST") {
      if (!env.ADMIN_PASSWORD) return J({ ok: false, error: "Worker chưa có biến ADMIN_PASSWORD" }, 500);
      const ip = request.headers.get("CF-Connecting-IP") || "x";
      if (await KV.get("LOCKED_IP_" + ip)) {
        return J({
          ok: false,
          error: "Bạn đã nhập sai quá 10 lần. Tài khoản bị tạm khóa 30 phút!"
        }, 429);
      }
      const b = await body();
      if (!safeEq(String(b.password || ""), env.ADMIN_PASSWORD)) {
        const fails = Number(await KV.get("FAIL_IP_" + ip)) || 0;
        const newFails = fails + 1;
        if (newFails >= 10) {
          await KV.put("LOCKED_IP_" + ip, "1", { expirationTtl: 1800 });
          await KV.delete("FAIL_IP_" + ip);
          return J({
            ok: false,
            error: "Bạn đã nhập sai 10 lần. IP bị tạm khóa 30 phút!"
          }, 429);
        }
        await KV.put("FAIL_IP_" + ip, String(newFails), { expirationTtl: 1800 });
        return J({
          ok: false,
          error: `Sai mật khẩu! Bạn còn ${10 - newFails} lần thử.`
        }, 401);
      }
      await Promise.all([KV.delete("FAIL_IP_" + ip), KV.delete("LOCKED_IP_" + ip)]);
      if (b.dev && b.dev.id) {
        const devs = arr(safeJson(await KV.get("ADMIN_DEVICES"), []));
        if (!devs.find((d) => d.id === b.dev.id)) {
          devs.push({
            id: String(b.dev.id).slice(0, 40),
            ua: String(b.dev.ua || "").slice(0, 80),
            ts: NOW()
          });
          await KV.put("ADMIN_DEVICES", JSON.stringify(devs));
        }
      }
      log("info", "auth", "Admin đăng nhập", String(b.dev && b.dev.id || ""));
      await flushLog(KV, log);
      return J({ ok: true, token: await makeToken(env) });
    }

    // ================================================================ INTERNAL (D1 / web khác / cron ngoài)
    if (p === "/api/internal/order" && m === "GET") {
      const bad = need(internal);
      if (bad) return bad;
      const targetId = normId(url.searchParams.get("id"));
      const isTest = (await KV.get("TEST_MODE_ACTIVE")) === "1";
      const sb = getSupabase(env, isTest);
      let o = null;
      if (sb) {
        try {
          const orders = await sb.getAll();
          o = orders.find(x => x && normId(x.id) === targetId);
        } catch {}
      }
      return o ? J({
        ok: true,
        order: {
          id: o.id,
          email: o.email,
          totalVnd: o.totalVnd,
          totalCny: o.totalCny,
          method: o.method,
          pkgId: o.pkgId || "",
          pkgName: o.pkgName || "",
          createdTs: o.createdTs,
          orderType: o.orderType || "new",
          status: normStatus(o.status),
          workerUrl: o.workerUrl || "",
          pendingUpgrade: o.pendingUpgrade ? {
            amount: o.pendingUpgrade.amount,
            targetPkgId: o.pendingUpgrade.targetPkgId,
            method: o.pendingUpgrade.method || ""
          } : null
        }
      }) : J({ ok: false }, 404);
    }
    if (p === "/api/internal/rename_order" && m === "POST") {
      const bad = need(internal);
      if (bad) return bad;
      const b = await body(), st = await loadAll(KV, env), r = await applyRename(KV, st, b.from, b.to);
      if (r > 0) await persist(KV, st);
      return J({ ok: true, renamed: r });
    }
    if (p === "/api/internal/cron" && m === "POST") {
      const bad = need(internal);
      if (bad) return bad;
      return J({ ok: true, details: await runCron(env, ctx, {}) });
    }

    if (p === "/api/internal/auto_fulfill" && m === "POST") {
      const bad = need(internal);
      if (bad) return bad;
      if (!(await acquire(KV))) return J({ ok: false, error: "Hệ thống đang bận", status: "locked" }, 429);
      try {
        const b = await body(), st = await loadAll(KV, env), me = getMe(url, env, st.cms);
        const sb = getSupabase(env, st.isTest);
        const ids = [...new Set(arr(b.orderIds).map(normId).filter(Boolean))];
        const upOrders = new Set(arr(b.upgrades).map((u) => normId(u.orderId)));
        const results = {
          fulfilled: [],
          already_fulfilled: [],
          missing: [],
          errors: []
        };
        if (!ids.length) return J({ ok: true, skipped: true });
        for (const oid of ids) {
          let o = st.orders.find((x) => x && normId(x.id) === oid);
          // Cơ chế phục hồi an toàn tầng 1: Kiểm tra bộ nhớ đệm PENDING_ORD_ trong KV
          if (!o) {
            const rawPending = await KV.get("PENDING_ORD_" + oid);
            if (rawPending) {
              const po = safeJson(rawPending, null);
              if (po && po.id) {
                o = po;
                st.orders.unshift(o);
                log("info", "fulfill", "Phục hồi đơn từ KV PENDING cache để fulfillment", oid, oid);
              }
            }
          }
          // Cơ chế phục hồi an toàn tầng 2: Truy vấn trực tiếp từ D1 database
          if (!o) {
            try {
              const d1Res = await d1(env, `/api/orders/${oid}`);
              if (d1Res.ok && d1Res.data && d1Res.data.order) {
                const d1o = d1Res.data.order;
                const d1Pk = PKGS[d1o.pkg_id] || PKGS.d1 || {
                  n: "Gói VPN",
                  d: "100GB",
                  vnd: d1o.total_vnd,
                  cny: 0,
                  m: 1
                };
                o = {
                  id: oid,
                  email: d1o.email || "",
                  zalo: "",
                  method: "Ngân hàng VN",
                  pkgId: d1o.pkg_id || "d1",
                  qty: 1,
                  pkgName: d1Pk.n,
                  pkgData: d1Pk.d,
                  pkg: pkgStr(d1Pk),
                  totalVnd: Number(d1o.total_vnd) || 0,
                  totalCny: 0,
                  days: daysOfPkg(d1Pk, 1),
                  needSupport: false,
                  status: "pending",
                  createdTs: d1o.created_at ? new Date(d1o.created_at).getTime() : NOW(),
                  date: fmtBank(NOW()),
                  dateCreated: dmy(NOW()),
                  expFinal: false,
                  workerUrl: d1o.worker_url || env.PUBLIC_WORKER_URL || url.origin,
                  nickname: "",
                  reason: "",
                  info1: "",
                  info2: "",
                  info3: "",
                  lockInfo: {},
                  sourceWeb: d1o.target_web || "Web 3",
                  orderType: d1o.order_type || "new"
                };
                o.expDate = computeExp(o, st.orders, NOW());
                st.orders.unshift(o);
                log("info", "fulfill", "Phục hồi đơn từ D1 Database để fulfillment", oid, oid);
              }
            } catch (errD1) {}
          }
          if (!o) {
            results.missing.push(oid);
            log("warn", "fulfill", "D1 báo đã thanh toán nhưng không tìm thấy thông tin đơn", oid, oid);
            continue;
          }
          let kind = null;
          if (normStatus(o.status) !== "success") {
            o.status = "success";
            o.paidAt = NOW();
            o.reason = "";
            st.dO = true;
          }
          if (upOrders.has(oid)) {
            if (o.pendingUpgrade) {
              applyUpgrade(o);
              st.dO = true;
              kind = "upgrade";
              log("ok", "upgrade", "Nâng gói thành công", `${oid} → ${o.pkgName} ${o.pkgData}`, oid);
            }
            else log("warn", "upgrade", "D1 báo nâng gói nhưng không có yêu cầu chờ", oid, oid);
          }
          const r = fulfillOrder(st, o, me, log);
          if (r === "error") {
            results.errors.push(oid);
            continue;
          }
          if (sb) await sb.upsert(o).catch(() => {});
          // Lưu trạng thái thành công và link VPN vào KV cache để Index tra cứu ra ngay
          await KV.put("PENDING_ORD_" + o.id, JSON.stringify(o), { expirationTtl: 86400 });
          // Đồng bộ vào bảng dự phòng tương ứng của KV (Kho Thật hoặc Kho Test)
          const targetKvTable = st.isTest ? "ALL_ORDERS_TEST" : "ALL_ORDERS";
          const kvAll = arr(safeJson(await KV.get(targetKvTable), []));
          const idxAll = kvAll.findIndex(x => x && normId(x.id) === normId(o.id));
          if (idxAll >= 0) kvAll[idxAll] = o;
          else kvAll.unshift(o);
          await KV.put(targetKvTable, JSON.stringify(kvAll.slice(0, 3000)));

          const mailKind = o.orderType === "renew" ? "renew" : "new";
          if (r === "new" || r === "renew") {
            results.fulfilled.push(oid);
            mailFor(ctx, env, st, o, mailKind, me);
          }
          else {
            results.already_fulfilled.push(oid);
            if (kind === "upgrade") mailFor(ctx, env, st, o, "upgrade", me);
          }
        }
        if (st.dL || st.dP) await persist(KV, st);
        await flushLog(KV, log);
        const done = [...results.fulfilled, ...results.already_fulfilled];
        if (done.length) {
          ctx.waitUntil(runTelegramBackup(env, `Đơn hàng #${done[0]} thanh toán tự động thành công (Auto Fulfill)`));
        }
        return J({ ok: true, results });
      } catch (e) {
        return J({
          ok: false,
          error: (e && e.message) || "Auto fulfillment error"
        }, 500);
      }
      finally {
        await KV.delete("GLOBAL_FULFILL_LOCK");
      }
    }

    // link + push_data_batch: admin hoặc internal (update_sub.py gửi kèm Bearer WEB_API_SECRET2)
    if (p === "/api/links") {
      const bad = need(admin || internal);
      if (bad) return bad;
      if (m === "GET") return RAW((await KV.get("ALL_LINKS")) || "[]");
      if (m === "POST") {
        try {
          let links = JSON.parse(await request.text());
          if (!Array.isArray(links)) return J({ error: "ALL_LINKS must be an array" }, 400);
          links = notTomb(links, await loadTombs(KV)); // link đã xóa không thể được ghi lại từ bản cũ (admin cũ / update_sub.py)
          await KV.put("ALL_LINKS", JSON.stringify(links));
          await KV.put("GLOBAL_ROUTER", JSON.stringify(buildGlobalRouter(links, [])));
          return OK();
        } catch (e) {
          return J({ error: (e && e.message) || "Links error" }, 400);
        }
      }
    }
    if (p === "/api/push_data_batch" && m === "POST") {
      const bad = need(admin || internal);
      if (bad) return bad;
      try {
        const t = await request.text();
        if (!t) return J({ error: "Empty" }, 400);
        JSON.parse(t);
        await KV.put("GLOBAL_SUBS", t);
        return OK();
      }
      catch (e) {
        return J({ error: (e && e.message) || "Push error" }, 500);
      }
    }

    // ================================================================ ADMIN
    if (p.startsWith("/api/admin/") || ["/api/orders", "/api/deadlinks", "/api/cms", "/api/devices", "/api/data_requests", "/api/link_pool", "/api/guides", "/api/gc", "/api/trigger_github"].includes(p)) {
      const bad = need(admin);
      if (bad) return bad;
      const st0 = () => loadAll(KV, env, reqIsTest);
      // Xóa triệt để 1 link nguồn khỏi KV (LINK_POOL, GLOBAL_SUBS, ALL_LINKS neo #1, GLOBAL_ROUTER)
      if (p === "/api/admin/source/delete" && m === "POST") {
        const b = await body();
        const targetUrl = String(b.url || "").trim();
        const targetId = String(b.id || "").trim();
        const targetUrl2 = String(b.url2 || "").trim();
        if (!targetUrl && !targetId) return J({ ok: false, error: "Thiếu url hoặc id nguồn" }, 400);

        const st = await st0();
        const poolItem = st.pool.find(p => (targetId && p.id === targetId) || (targetUrl && (p.url === targetUrl && (!targetUrl2 || p.url2 === targetUrl2))));
        const pUrl1 = poolItem ? poolItem.url : targetUrl;
        const pUrl2 = poolItem ? poolItem.url2 : targetUrl2;

        st.pool = st.pool.filter(p => p !== poolItem && p.id !== targetId && !(p.url === pUrl1 && (!pUrl2 || p.url2 === pUrl2)));

        // Xóa link neo #1 Auto tương ứng
        st.links = st.links.filter(l => !(l && ((l.orig === pUrl1 && (!pUrl2 || l.orig2 === pUrl2)) || (pUrl2 && l.orig === pUrl2)) && String(l.linkIndex) === "1"));

        // Xóa token trong GLOBAL_SUBS
        let subsObj = safeJson(await KV.get("GLOBAL_SUBS"), {});
        const getTokSafe = (u) => {
          try {
            return u ? getParam(new URL(u), "OwO", "token") : null;
          } catch { return null;
          }
        };
        const tok1 = getTokSafe(pUrl1);
        const tok2 = getTokSafe(pUrl2);
        if (tok1 && subsObj[tok1]) delete subsObj[tok1];
        if (tok2 && subsObj[tok2]) delete subsObj[tok2];
        await KV.put("GLOBAL_SUBS", JSON.stringify(subsObj));

        st.dL = true;
        st.dP = true;
        await persist(KV, st);

        log("warn", "admin", "Xóa triệt để Link Nguồn KV", `${pUrl1}${pUrl2 ? " + " + pUrl2 : ""}`);
        await flushLog(KV, log);
        return J({ ok: true });
      }

      // Dọn sạch toàn bộ link nguồn không còn link ẩn nào (count = 0)
      if (p === "/api/admin/source/clean_unused" && m === "POST") {
        const st = await st0();
        let subsObj = safeJson(await KV.get("GLOBAL_SUBS"), {});
        let deletedCount = 0;

        const getTokSafe = (u) => {
          try {
            return u ? getParam(new URL(u), "OwO", "token") : null;
          } catch { return null;
          }
        };
        const unusedPool = st.pool.filter(p => {
          if (!p || !p.url) return false;
          const activeLinks = st.links.filter(l => l && String(l.linkIndex) !== "1" && (l.orig === p.url || l.orig2 === p.url));
          return activeLinks.length === 0;
        });

        for (const p of unusedPool) {
          deletedCount++;
          st.links = st.links.filter(l => !(l && (l.orig === p.url || (p.url2 && l.orig2 === p.url2)) && String(l.linkIndex) === "1"));
          const tok1 = getTokSafe(p.url);
          const tok2 = getTokSafe(p.url2);
          if (tok1 && subsObj[tok1]) delete subsObj[tok1];
          if (tok2 && subsObj[tok2]) delete subsObj[tok2];
        }

        const unusedSet = new Set(unusedPool);
        st.pool = st.pool.filter(p => !unusedSet.has(p));

        await KV.put("GLOBAL_SUBS", JSON.stringify(subsObj));
        st.dL = true;
        st.dP = true;
        await persist(KV, st);

        log("warn", "admin", "Dọn sạch Link Nguồn không dùng", `Đã xóa ${deletedCount} nguồn mồ côi`);
        await flushLog(KV, log);
        return J({ ok: true, deleted: deletedCount });
      }

      // ----- Xóa link ATOMIC: khỏi ALL_LINKS + vào DEAD_LINKS + tombstone + rebuild MAP + gỡ khỏi Info của đơn trên Supabase
      if (p === "/api/admin/link/delete" && m === "POST") {
        const b = await body(), st = await st0();
        const idx = st.links.findIndex((l) => l && ((b.id && l.id === b.id) || (!b.id && b.masked && l.masked === b.masked)));
        const link = idx >= 0 ? st.links[idx] : (b.link && typeof b.link === "object" ? b.link : null), lid = (link && link.id) || b.id;
        if (!link || !lid) return J({ ok: false, error: "Không tìm thấy link" }, 404);
        const tb = await loadTombs(KV);
        if (!tb.some((t) => t.id === lid)) tb.push({ id: lid, ts: Date.now() });
        await saveTombs(KV, tb);
        if (idx >= 0) {
          st.links.splice(idx, 1);
          st.dL = true;
        }
        const masked = link.masked || b.masked;
        const touchedOrders = masked ? clearMasked(st, [masked]) : [];
        if (touchedOrders.length) {
          const sb = getSupabase(env, st.isTest);
          if (sb) {
            for (const od of touchedOrders) await sb.upsert(od).catch(() => {});
          }
        }
        await persist(KV, st);
        let dead = arr(safeJson(await KV.get("DEAD_LINKS"), [])).filter((d) => d && d.id !== lid);
        dead.unshift({
          ...(b.link || {}),
          ...link,
          deadTs: NOW(),
          deadDate: new Date(NOW()).toISOString()
        });
        await KV.put("DEAD_LINKS", JSON.stringify(dead));
        log("info", "admin", "Xóa link (cục bộ)", `${link.email || ""} · gỡ ${touchedOrders.length} đơn`, lid);
        await flushLog(KV, log);
        return J({ ok: true, cleared: touchedOrders.length });
      }
      if (p === "/api/admin/poll") {
        const isTest = reqIsTest;
        const sb = getSupabase(env, isTest);
        let ordersList = [];
        let sbOk = false;
        let sbError = null;
        if (sb) {
          try {
            const sbOrders = await sb.getAll();
            if (Array.isArray(sbOrders)) {
              ordersList = sbOrders;
              sbOk = true;
            } else {
              sbError = "Dữ liệu Supabase trả về không phải mảng";
            }
          } catch (e) {
            sbError = e.message || String(e);
          }
        } else {
          sbError = "Chưa cấu hình SUPABASE_KEY / SUPABASE_URL";
          const kvOrders = safeJson(await KV.get(isTest ? "ALL_ORDERS_TEST" : "ALL_ORDERS"), []);
          if (Array.isArray(kvOrders)) {
            ordersList = isTest ? kvOrders : kvOrders.filter(o => !isTestOrderRecord(o));
            sbOk = true;
          }
        }
        const ordersData = JSON.stringify(ordersList);
        const [l, pl, dr] = await Promise.all(["ALL_LINKS", "LINK_POOL", "ALL_DATA_REQUESTS"].map((k) => KV.get(k)));
        return RAW(`{"orders":${ordersData},"links":${l || "[]"},"pool":${pl || "[]"},"data_requests":${dr || "[]"}${sbError ? `,"sbError":${JSON.stringify(sbError)}` : ""},"sbOk":${sbOk},"isTest":${isTest}}`);
      }
      if (p === "/api/admin/status") {
        const cron = safeJson(await KV.get("CRON_LAST_RUN"), null), r = await d1(env, "/api/admin/logs?limit=1");
        return J({
          ok: true,
          cron,
          d1: r.ok,
          d1Error: r.ok ? "" : (r.data && r.data.error) || "HTTP " + r.status,
          web: getMe(url, env, {}).n,
          hasPassword: !!env.ADMIN_PASSWORD,
          hasSecret2: !!env.WEB_API_SECRET2,
          cronEveryMin: 15
        });
      }
      if (p === "/api/admin/log" && m === "POST") {
        const b = await body();
        log(["ok", "warn", "error"].includes(b.lvl) ? b.lvl : "info", /^Gửi mail/.test(String(b.act || "")) ? "mail" : "admin", String(b.act || "").slice(0, 80), b.msg, b.ref);
        await flushLog(KV, log);
        return OK();
      }
      // Endpoint ghi nhật ký gom khối (Batching 1 lần ghi KV) từ Admin UI
      if (p === "/api/admin/log_batch" && m === "POST") {
        const b = await body();
        for (const item of arr(b.logs)) {
          log(["ok", "warn", "error"].includes(item.lvl) ? item.lvl : "info", /^Gửi mail/.test(String(item.act || "")) ? "mail" : "admin", String(item.act || "").slice(0, 80), item.msg, item.ref);
        }
        await flushLog(KV, log);
        return OK();
      }
      // Endpoint gộp lưu Link Sub và Kho Nguồn trong 1 request duy nhất (giảm 1/2 lượt ghi KV Write)
      if (p === "/api/admin/save_links_and_pool" && m === "POST") {
        const b = await body();
        const tb = await loadTombs(KV);
        let links = arr(b.links);
        links = notTomb(links, tb);
        const pool = arr(b.pool);
        for (const pl of pool) pl.used = links.filter((l) => l && (l.orig === pl.url || l.orig2 === pl.url)).length;
        await Promise.all([KV.put("ALL_LINKS", JSON.stringify(links)), KV.put("LINK_POOL", JSON.stringify(pool)), KV.put("GLOBAL_ROUTER", JSON.stringify(buildGlobalRouter(links, [])))]);
        return OK();
      }

      if (p === "/api/admin/logs") {
        const [w, r] = await Promise.all([KV.get("SYS_LOG"), d1(env, "/api/admin/logs?limit=200")]);
        return J({
          ok: true,
          worker: arr(safeJson(w, [])),
          d1: r.ok ? arr(r.data && r.data.logs) : []
        });
      }

      if (p === "/api/admin/cron" && m === "POST") {
        try {
          const b = await body();
          const details = await runCron(env, ctx, {
            force: !!b.force,
            sim: b.simMode === undefined ? undefined : !!b.simMode,
            simOffset: b.simOffset
          });
          return J({ ok: true, details });
        } catch (e) {
          return J({ ok: false, error: e.message || String(e) }, 500);
        }
      }

      // Endpoint bù link thủ công theo yêu cầu từ tab Kiểm tra (xử lý 100% cục bộ cho ô định tuyến của Web này)
      if (p === "/api/admin/heal" && m === "POST") {
        const b = await body();
        const ids = arr(b.orderIds).map(normId).filter(Boolean);
        let details = [];
        const st = await st0();
        const me = getMe(url, env, st.cms);
        if (ids.length) {
          const isTest = reqIsTest;
          const sb = getSupabase(env, isTest);
          const idsSet = new Set(ids);
          const ordersToProcess = st.orders.filter((x) => x && idsSet.has(normId(x.id)) && normStatus(x.status) === "success");
          let localCapped = 0;
          for (const o of ordersToProcess) {
            let wasMissing = !o[me.field];
            if (wasMissing) {
              const r = fulfillOrder(st, o, me, log);
              if (r === "new" || r === "renew" || o[me.field]) {
                localCapped++;
                st.dO = true;
                if (sb) await sb.upsert(o);
              }
            }
            details.push({
              id: o.id,
              email: o.email,
              field: me.field,
              success: !!o[me.field],
              link: o[me.field] || "",
              wasMissing
            });
          }
          if (st.dO || st.dL) {
            await persist(KV, st);
          }
          log("ok", "heal", "Bù link cục bộ", `Xử lý ${ordersToProcess.length} đơn | Cấp bù ${me.field}: ${localCapped}`);
          await flushLog(KV, log);
        }
        return J({ ok: true, field: me.field, count: ids.length, details });
      }

      // Endpoint nhận lệnh bắn mail từ Admin UI (nút thủ công, nút nhắc Zalo, nút gửi dung lượng...)
      if (p === "/api/admin/send_mail" && m === "POST") {
        const b = await body();
        const st = await st0();
        ctx.waitUntil(sendMail(b.to, b.subject, b.html, env, st.cms));
        return OK();
      }

      // Endpoint Test kết nối Telegram Bot
      if (p === "/api/admin/telegram/test" && m === "POST") {
        const res = await sendTelegramMessage(env, `🔔 <b>VPN Trinh Hg</b>: Kiểm tra kết nối Telegram Bot thành công!\n⏰ Thời gian: ${fmtBank(NOW())}`);
        return J(res);
      }

      // Endpoint Kích hoạt gửi Backup sang Telegram Channel ngay lập tức
      if (p === "/api/admin/telegram/backup_now" && m === "POST") {
        const b = await body();
        const actionReason = b.reason || "Admin gửi thủ công";
        const detailDiff = b.detail || "";
        const res = await runTelegramBackup(env, actionReason, detailDiff);
        log(res.ok ? "ok" : "warn", "admin", "Bắn Backup Telegram", `${actionReason} · ${res.keyTitle}`);
        await flushLog(KV, log);
        return J(res);
      }
      if (p === "/api/admin/telegram/backup_kv_now" && m === "POST") {
        const res = await runTelegramKvBackup(env);
        log(res.ok ? "ok" : "warn", "admin", "Bắn Backup KV Telegram", `${res.keysCount} keys`);
        await flushLog(KV, log);
        return J(res);
      }
      if (p === "/api/admin/telegram/reset_stt" && m === "POST") {
        await Promise.all([KV.delete("TG_BACKUP_PROD_LAST_STT"), KV.delete("TG_BACKUP_TEST_LAST_STT")]);
        log("warn", "admin", "Reset STT Telegram Backup về 01");
        await flushLog(KV, log);
        return J({ ok: true });
      }
      // ----- Quota hệ thống (Cloudflare GraphQL Analytics + Google Script)
      if (p === "/api/admin/quota" && m === "GET") return J(await quotaReport(env));

      // ----- Xóa giao dịch khỏi D1 thật sự (từng dòng, dùng cho nút Xóa ở admin.html)
      const delTxM = p.match(/^\/api\/admin\/tx\/(\d+)\/delete$/);
      if (delTxM && m === "POST") {
        const id = Number(delTxM[1]);
        const r = await d1(env, "/api/admin/transactions/delete", { method: "POST", body: { ids: [id] } });
        log(r.ok ? "warn" : "error", "admin", "Xóa giao dịch D1", `#${id} ${r.ok ? "" : (r.data && r.data.error) || r.status}`);
        await flushLog(KV, log);
        return J(r.data || { ok: false }, r.ok ? 200 : r.status || 502);
      }
      if (p === "/api/admin/tx/delete" && m === "POST") {
        const b = await body(), r = await d1(env, "/api/admin/transactions/delete", { method: "POST", body: { ids: b.ids } });
        log(r.ok ? "warn" : "error", "admin", "Xóa giao dịch D1", `${arr(b.ids).join(",")} ${r.ok ? "" : (r.data && r.data.error) || r.status}`);
        await flushLog(KV, log);
        return J(r.data || { ok: false }, r.ok ? 200 : r.status || 502);
      }

      // ----- Rà quét (làm sạch Info) / Map lại link vào ô info của đơn hàng (CHỈ CỤC BỘ TRÊN WEB NÀY)
      if (p === "/api/admin/relink" && m === "POST") {
        const b = await body(), st = await st0(), me = getMe(url, env, st.cms);
        const myNum = Number(me.field.slice(4));
        const opts = {
          fields: [myNum],
          scope: b.scope === "all" ? "all" : "dead",
          expired: b.expired || "all",
          includeManual: !!b.includeManual
        };
        const picks = new Set(arr(b.picks).map((x) => x.id + "|" + x.field)), apply = b.mode === "apply";
        if (apply) {
          const actionReason = b.action === "remap" ? "Áp dụng Map lại link" : "Áp dụng Làm sạch ô Info";
          await runTelegramBackup(env, `${actionReason} (Cục bộ ${me.field})`);
        }
        if (b.action === "remap") {
          const { items } = await relinkMap(env, url, st, me, opts);
          if (!apply) return J({ ok: true, items, remoteOk: true });
          let n = 0;
          const appliedItems = [];
          const isTest = reqIsTest;
          const sb = getSupabase(env, isTest);
          for (const it of items) {
            if (!picks.has(it.id + "|" + it.field)) continue;
            const od = st.orders.find((x) => x && normId(x.id) === normId(it.id));
            if (!od) continue;
            od[it.field] = it.to;
            if (od.lockInfo) delete od.lockInfo[it.field];
            n++;
            appliedItems.push({ id: od.id, field: it.field, to: it.to });
            const lTarget = st.links.find(l => l && l.masked === it.to);
            if (lTarget) {
              lTarget.expDate = isLifetime(od.expDate) ? "Vĩnh viễn" : od.expDate;
              lTarget.isLocked = false;
              lTarget.orderId = od.id;
              if (lTarget.orig === LOCK_ORIG && lTarget.origBackup) {
                lTarget.orig = lTarget.origBackup;
                delete lTarget.origBackup;
              }
              st.dL = true;
            }
            if (sb) await sb.upsert(od);
          }
          if (st.dL) await persist(KV, st);
          log("ok", "admin", "Map lại link vào đơn hàng (cục bộ)", `${n} ô`);
          await flushLog(KV, log);
          return J({ ok: true, applied: n, field: me.field, items: appliedItems });
        }
        const { items } = await relinkScan(env, url, st, opts);
        if (!apply) return J({ ok: true, items, remoteOk: true });
        let n = 0;
        const appliedItems = [];
        const isTest = reqIsTest;
        const sb = getSupabase(env, isTest);
        for (const it of items) {
          if (!picks.has(it.id + "|" + it.field)) continue;
          const od = st.orders.find((x) => x && normId(x.id) === normId(it.id));
          if (!od) continue;
          od[it.field] = "";
          if (od.lockInfo) delete od.lockInfo[it.field];
          n++;
          appliedItems.push({ id: od.id, field: it.field, to: "" });
          if (sb) await sb.upsert(od);
        }
        log("ok", "admin", "Làm sạch URL trong ô info của đơn (cục bộ)", `${n} ô`);
        await flushLog(KV, log);
        return J({ ok: true, applied: n, field: me.field, items: appliedItems });
      }

      // Giao dịch D1 (worker giữ secret, trình duyệt không cần biết)
      if (p === "/api/admin/tx" && m === "GET") {
        const r = await d1(env, "/api/admin/transactions" + url.search);
        if (!r.ok) {
          const detail = (r.data && (r.data.details || r.data.error)) || (r.status === 0 ? "Không thể kết nối đến D1 Payment Webhook" : `D1 trả về lỗi HTTP ${r.status}`);
          const errMsg = `[D1 /api/admin/transactions] ${detail}`;
          return J({
            ok: false,
            error: errMsg,
            transactions: [],
            status: r.status
          }, r.status >= 400 && r.status < 600 ? r.status : 502);
        }
        return J(r.data || { ok: true, transactions: [] }, 200);
      }
      const tm = p.match(/^\/api\/admin\/tx\/(\d+)\/(approve|reject)$/);
      if (tm && m === "POST") {
        const b = await body(), r = await d1(env, `/api/admin/reviews/${tm[1]}/${tm[2]}`, { method: "POST", body: b });
        log(r.ok ? "ok" : "error", "admin", tm[2] === "approve" ? "Ép khớp giao dịch" : "Từ chối giao dịch", `#${tm[1]} ${b.orderId || ""} ${r.ok ? "" : (r.data && r.data.error) || r.status}`, b.orderId);
        await flushLog(KV, log);
        if (r.ok && tm[2] === "approve" && b.orderId) {
          const st = await st0(), o = st.orders.find((x) => x && normId(x.id) === normId(b.orderId));
          if (o && normStatus(o.status) !== "success") {
            o.status = "success";
            const sb = getSupabase(env, st.isTest);
            if (sb) await sb.upsert(o).catch(() => {});
          }
        }
        return J(r.data || { ok: false }, r.ok ? 200 : r.status || 502);
      }
      if (p === "/api/admin/tx/clear" && m === "POST") {
        const r = await d1(env, "/api/admin/transactions/clear", { method: "POST" });
        log("warn", "admin", "Làm sạch giao dịch D1", r.ok ? `Đã xóa ${r.data && r.data.deleted} dòng` : "Lỗi D1");
        await flushLog(KV, log);
        return J(r.data || { ok: false }, r.ok ? 200 : r.status || 502);
      }

      // ===== Đơn hàng: API danh sách phân trang, tìm kiếm & chi tiết
      if (p === "/api/admin/orders" && m === "GET") {
        const isTest = reqIsTest;
        const sb = getSupabase(env, isTest);
        const status = url.searchParams.get("status") || "all";
        const search = url.searchParams.get("q") || url.searchParams.get("search") || "";
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 500);
        const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
        if (sb) {
          try {
            const res = await sb.listOrders({ status, search, limit, offset });
            return J({
              ok: true,
              orders: res.data,
              count: res.count,
              limit,
              offset,
              source: isTest ? "supabase_test" : "supabase_prod"
            });
          } catch (e) {
            if (!isTest) {
              const all = arr(safeJson(await KV.get("ALL_ORDERS"), []));
              let filtered = all;
              if (status && status !== "all") filtered = filtered.filter(o => normStatus(o.status) === normStatus(status));
              if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter(o => (o.id && o.id.toLowerCase().includes(s)) || (o.email && o.email.toLowerCase().includes(s)) || (o.nickname && o.nickname.toLowerCase().includes(s)));
              }
              const paged = filtered.slice(offset, offset + limit);
              return J({
                ok: true,
                orders: paged,
                count: filtered.length,
                limit,
                offset,
                source: "kv_fallback",
                sbError: e.message || String(e)
              });
            }
            return J({ ok: false, error: e.message || String(e) }, 500);
          }
        }
        const all = arr(safeJson(await KV.get(isTest ? "ALL_ORDERS_TEST" : "ALL_ORDERS"), []));
        let filtered = all;
        if (status && status !== "all") filtered = filtered.filter(o => normStatus(o.status) === normStatus(status));
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(o => (o.id && o.id.toLowerCase().includes(s)) || (o.email && o.email.toLowerCase().includes(s)) || (o.nickname && o.nickname.toLowerCase().includes(s)));
        }
        const paged = filtered.slice(offset, offset + limit);
        return J({
          ok: true,
          orders: paged,
          count: filtered.length,
          limit,
          offset,
          source: "kv",
          sbError: "Chưa cấu hình SUPABASE_KEY / SUPABASE_URL"
        });
      }

      const ordDetailMatch = p.match(/^\/api\/admin\/orders\/([A-Za-z0-9_-]+)$/);
      if (ordDetailMatch && m === "GET") {
        const oid = normId(ordDetailMatch[1]);
        const isTest = reqIsTest;
        const sb = getSupabase(env, isTest);
        if (sb) {
          try {
            const order = await sb.getOrder(oid);
            if (order) return J({
              ok: true,
              order,
              source: isTest ? "supabase_test" : "supabase_prod"
            });
          } catch (e) {}
        }
        const st = await loadAll(KV, env);
        const order = st.orders.find(o => o && normId(o.id) === oid);
        if (!order) return J({ ok: false, error: "Không tìm thấy đơn hàng" }, 404);
        return J({ ok: true, order, source: "kv" });
      }

      // ===== Đơn hàng: upsert 1 đơn theo admin.html v2
      //  · newId: đổi Mã đơn của chính đơn đó (đồng bộ link/yêu cầu dung lượng/vệ tinh) · lockAuto: KHÔNG chạy automation (cấp link, sync 3 web)
      //  · lockExpiry (hoặc settings.lockExpiry): expDate & days của đơn có sẵn KHÔNG bao giờ đổi · unlockInfo: ["info1",...] mở khóa ô đã sửa tay
      //  · Bank -> totalVnd, Alipay/Weixin -> totalCny · KHÔNG tự sửa totalVnd/totalCny/days/expDate của dữ liệu cũ
      if (p === "/api/admin/order" && m === "POST") {
        const b = await body(), id = normId(b.id);
        const st = await st0(), me = getMe(url, env, st.cms), s = st.cms.settings || {};
        let o = st.orders.find((x) => x && normId(x.id) === id);
        const isNew = !o;
        if (isNew && !/^DH[A-Z0-9]{10}$/.test(id)) return J({ ok: false, error: "Mã đơn phải dạng DH + 10 ký tự" }, 400);
        const lockAuto = b.lockAuto === true, lockExp = !isNew && (b.lockExpiry === true || !!s.lockExpiry);
        let renamedFrom = "", nid = id;
        if (!isNew && b.newId !== undefined && normId(b.newId) !== id) {
          nid = normId(b.newId);
          if (!/^DH[A-Z0-9]{10}$/.test(nid)) return J({ ok: false, error: "Mã đơn mới phải dạng DH + 10 ký tự" }, 400);
          const r = await applyRename(KV, st, id, nid);
          if (r < 0) return J({ ok: false, error: "Mã đơn mới đã tồn tại" }, 409);
          renamedFrom = id;
          o = st.orders.find((x) => x && normId(x.id) === nid);
          log("warn", "admin", "Đổi mã đơn", `${id} → ${nid}`, nid);
        }
        if (isNew) {
          const now = NOW();
          o = {
            id,
            createdTs: now,
            date: fmtBank(now),
            dateCreated: dmy(now),
            orderType: "new",
            email: "",
            nickname: "",
            zalo: "",
            method: "Ngân hàng VN",
            pkg: "",
            pkgName: "",
            pkgData: "",
            totalVnd: "",
            totalCny: "",
            days: "",
            expDate: "",
            status: "pending",
            info1: "",
            info2: "",
            info3: "",
            reason: "",
            needSupport: false,
            lockInfo: {}
          };
          st.orders.unshift(o);
        }
        const prevExp = o.expDate, prevDays = o.days, hadPrevDays = "days" in o;
        const isManualEdit = b.manualEdit === true;
        for (const k of ["email", "nickname", "zalo", "method", "status", "expDate", "days", "reason", "info1", "info2", "info3", "totalVnd", "totalCny", "qty"]) {
          if (b[k] === undefined) continue;
          if (lockExp && (k === "expDate" || k === "days")) continue;
          if (k.startsWith("info")) {
            o[k] = String(b[k]);
            // Nếu bật Sửa tay: bất kỳ ô link nào có giá trị được nhập tay đều tự động khóa lockInfo để hệ thống không ghi đè
            if (isManualEdit && o[k]) {
              (o.lockInfo = o.lockInfo || {})[k] = true;
            } else if (isManualEdit && !o[k] && o.lockInfo) {
              // Nếu admin chủ động xóa trắng ô đó thì mở khóa ô đó
              delete o.lockInfo[k];
            }
            continue;
          }
          if (k === "totalVnd" || k === "totalCny" || k === "days" || k === "qty") {
            o[k] = numOrEmpty(b[k]);
            continue;
          }
          o[k] = b[k];
        }
        for (const k of arr(b.unlockInfo)) if (/^info[123]$/.test(k) && o.lockInfo) delete o.lockInfo[k];
        if (b.pkgId && PKGS[b.pkgId]) {
          const pk = PKGS[b.pkgId];
          Object.assign(o, {
            pkgId: b.pkgId,
            pkgName: pk.n,
            pkgData: pk.d,
            pkg: pkgStr(pk)
          });
        }
        if (b.expDate && !lockExp) o.expFinal = true;
        const u = b.upg;
        if (u === "verify") {
          o.isUpgrade = true;
          o.pendingUpgrade = o.pendingUpgrade || { ts: NOW(), amount: 0 };
          o.upgradeStatus = "pending";
        }
        else if (u === "success") {
          if (o.pendingUpgrade) {
            applyUpgrade(o);
            ctx.waitUntil(d1(env, "/api/admin/upgrades/resolve", { method: "POST", body: { orderId: o.id, status: "success" } }));
          } else {
            o.isUpgrade = true;
            o.upgradeStatus = "success";
          }
        }
        else if (u === "reject") {
          o.isUpgrade = true;
          o.pendingUpgrade = null;
          o.upgradeStatus = "failed";
          ctx.waitUntil(d1(env, "/api/admin/upgrades/resolve", {
            method: "POST",
            body: { orderId: o.id, status: "cancelled" }
          }));
        }
        else if (u === "none") {
          o.isUpgrade = false;
          o.pendingUpgrade = null;
          o.upgradeStatus = null;
        }
        if (lockExp) {
          o.expDate = prevExp;
          if (hadPrevDays) o.days = prevDays;
          else delete o.days;
          o.expFinal = true;
        }
        let kind = null;
        if (normStatus(o.status) === "success") {
          o.status = "success";
          if (o.expDate) o.expFinal = true;
          // Ưu tiên Sửa tay trước fulfillment: Nếu ô của web này đã bị sửa tay (lockInfo) thì fulfillOrder tự trả về 'already'
          if (!lockAuto) kind = fulfillOrder(st, o, me, log);
        }
        if (!lockExp && o.expDate) {
          for (const l of st.links) {
            if (l && (normId(l.orderId) === normId(o.id) || l.masked === o.info1 || l.masked === o.info2 || l.masked === o.info3)) {
              l.expDate = isLifetime(o.expDate) ? "Vĩnh viễn" : o.expDate;
              st.dL = true;
            }
          }
        }
        const stNorm = normStatus(o.status);
        if (stNorm === "pending") {
          for (const l of st.links) {
            if (l && normId(l.orderId) === normId(o.id) && !l.isLocked) {
              lockLink(l);
              st.dL = true;
            }
          }
        } else if (stNorm === "failed") {
          const before = st.links.length;
          st.links = st.links.filter((l) => !(l && normId(l.orderId) === normId(o.id)));
          if (st.links.length !== before) st.dL = true;
        }
        if (st.dL || st.dP) await persist(KV, st);
        const sb = getSupabase(env, st.isTest);
        if (sb) {
          if (renamedFrom) await sb.delete(renamedFrom, renamedFrom).catch(() => {});
          await sb.upsert(o).catch(() => {});
        }
        log("info", "admin", "Lưu đơn", `${o.id} → ${o.status}${kind ? " / " + kind : ""}${lockAuto ? " [khóa fulfillment]" : ""}${isManualEdit ? " [sửa tay]" : ""}${lockExp ? " [khóa hạn]" : ""}`, o.id);
        await flushLog(KV, log);
        if (stNorm === "success" && b.sendMail === true) mailFor(ctx, env, st, o, "new", me);
        if (renamedFrom) {
          if (stNorm === "pending" && isBankMethod(o.method)) ctx.waitUntil(d1Register(env, url, o, o.orderType || "new"));
        }
        return J({
          ok: true,
          order: o,
          kind,
          renamedFrom: renamedFrom || undefined
        });
      }
      if (p === "/api/admin/order" && m === "DELETE") {
        const rawParamId = String(url.searchParams.get("id") || "").trim();
        const id = normId(rawParamId), st = await st0();
        const oTarget = st.orders.find((x) => x && (normId(x.id) === id || x.id === rawParamId));
        const rawId = oTarget ? oTarget.id : rawParamId;

        // Thu hồi và chuyển tất cả link sub của đơn này sang DEAD_LINKS
        const orderLinks = st.links.filter((l) => l && (normId(l.orderId) === id || (oTarget && [oTarget.info1, oTarget.info2, oTarget.info3].includes(l.masked))));
        if (orderLinks.length) {
          const tb = await loadTombs(KV);
          let dead = arr(safeJson(await KV.get("DEAD_LINKS"), []));
          for (const l of orderLinks) {
            lockLink(l);
            if (l.id && !tb.some((t) => t.id === l.id)) tb.push({ id: l.id, ts: Date.now() });
            dead = dead.filter((d) => d && d.id !== l.id);
            dead.unshift({
              ...l,
              deadTs: NOW(),
              deadDate: new Date(NOW()).toISOString()
            });
          }
          await saveTombs(KV, tb);
          await KV.put("DEAD_LINKS", JSON.stringify(dead));
          st.links = st.links.filter((l) => !orderLinks.includes(l));
          st.dL = true;
        }

        // Xóa đơn khỏi ALL_ORDERS
        st.orders = st.orders.filter((x) => !(x && (normId(x.id) === id || x.id === rawId)));
        st.dO = true;
        await persist(KV, st);

        // Xóa đơn trên Supabase đồng bộ trước khi phản hồi (xóa cả id chuẩn lẫn rawId)
        const isTest = reqIsTest;
        const sb = getSupabase(env, isTest);
        if (sb) {
          try {
            await sb.delete(id, rawId);
          } catch {}
        }

        log("warn", "admin", "Xóa đơn & Thu hồi Link", `${rawId} (${id}) · Thu hồi ${orderLinks.length} link sub`, id);
        await flushLog(KV, log);
        return OK();
      }

      // Chuẩn hóa định dạng thời gian dữ liệu KV (Tách biệt ngày hết hạn và timestamp tạo)
      if (p === "/api/admin/migrate_dates" && m === "POST") {
        const b = await body(), apply = !!b.apply, rep = {};
        const st = await st0();
        const fix = (list, name, field, tsField, fmt) => {
          let n = 0, sample = [];
          for (const x of list) {
            if (!x || typeof x !== "object") continue;
            const src = x[field];
            const parsedTs = parseAny(src);
            const rawTs = Number(x[tsField]) || parsedTs;
            if (!rawTs) continue;
            const finalTs = parsedTs || rawTs;
            const wantStr = fmt ? fmt(x, finalTs) : null;

            const textMismatch = wantStr && x[field] !== wantStr;
            const tsMismatch = tsField && (!x[tsField] || Math.abs(Number(x[tsField]) - finalTs) > 60000);

            if (textMismatch || tsMismatch) {
              if (sample.length < 3) sample.push(`${src ?? "—"}  →  ${wantStr || finalTs}`);
              if (apply) {
                if (tsField) x[tsField] = finalTs;
                if (wantStr) x[field] = wantStr;
              }
              n++;
            }
          }
          rep[name] = { changed: n, total: list.length, sample };
        };
        const fDate = (x, t) => fmtBank(t);
        fix(st.orders, "Đơn hàng", "date", "createdTs", fDate);
        // Với Link sub: Chỉ chuẩn hóa chuỗi date nếu sai định dạng DD/MM/YYYY, KHÔNG so sánh chéo với createdTs
        let lChanged = 0, lSample = [];
        for (const l of st.links) {
          if (!l || typeof l !== "object") continue;
          if (l.expDate && !isLifetime(l.expDate)) {
            const parsed = parseDmy(l.expDate);
            if (parsed) {
              const proper = dmy(parsed);
              if (l.expDate !== proper) {
                if (lSample.length < 3) lSample.push(`${l.expDate} → ${proper}`);
                if (apply) l.expDate = proper;
                lChanged++;
              }
            }
          }
        }
        rep["Link sub (HSD + giờ tạo)"] = { changed: lChanged, total: st.links.length, sample: lSample };

        const dead = arr(safeJson(await KV.get("DEAD_LINKS"), []));
        fix(dead, "Đã xóa", "deadDate", "deadTs", false);
        const devs = arr(safeJson(await KV.get("ADMIN_DEVICES"), []));
        fix(devs, "Thiết bị", "date", "ts", fDate);
        const drs = arr(safeJson(await KV.get("ALL_DATA_REQUESTS"), []));
        fix(drs, "Yêu cầu dung lượng", "date", "ts", fDate);
        if (apply) {
          const tb = await loadTombs(KV);
          const links = notTomb(st.links, tb);
          await Promise.all([KV.put("ALL_LINKS", JSON.stringify(links)), KV.put("DEAD_LINKS", JSON.stringify(dead)), KV.put("ADMIN_DEVICES", JSON.stringify(devs)), KV.put("ALL_DATA_REQUESTS", JSON.stringify(drs))]);
          await KV.put("GLOBAL_ROUTER", JSON.stringify(buildGlobalRouter(links, st.orders)));
          log("ok", "admin", "Chuẩn hóa định dạng thời gian", JSON.stringify(Object.fromEntries(Object.entries(rep).map(([k, v]) => [k, v.changed]))));
          await flushLog(KV, log);
        }
        return J({ ok: true, applied: apply, report: rep });
      }

      if (p === "/api/admin/migrate_pkg" && m === "POST") {
        const b = await body(), apply = !!b.apply, st = await st0();
        let n = 0, old = 0;
        const sample = [];
        const modifiedOrders = [];
        for (const o of st.orders) {
          if (!o) continue;
          const d = detectPkg(o);
          if (!d.id) continue;
          const pk = PKGS[d.id], want = pkgStr(pk), qty = Number(o.qty) || d.qty || (Number(o.days) > 0 ? Math.max(1, Math.round(Number(o.days) / 30)) : 1);
          if (pk.old) old++;
          if (o.pkg !== want || o.pkgId !== d.id || !o.qty) {
            if (sample.length < 5) sample.push(`${o.pkg || "—"}  →  ${want}${o.qty ? "" : " · x" + qty}`);
            if (apply) {
              o.pkgId = d.id;
              o.pkg = want;
              o.pkgName = pk.n;
              o.pkgData = pk.d;
              if (!o.qty) o.qty = qty;
              modifiedOrders.push(o);
            }
            n++;
          }
        }
        if (apply && modifiedOrders.length) {
          const isTest = (await KV.get("TEST_MODE_ACTIVE")) === "1";
          const sb = getSupabase(env, isTest);
          if (sb) {
            for (const mo of modifiedOrders) {
              await sb.upsert(mo).catch(() => {});
            }
          }
          log("ok", "admin", "Chuẩn hóa hiển thị gói", `Đã lưu ${modifiedOrders.length} đơn vào Supabase`);
          await flushLog(KV, log);
        }
        return J({
          ok: true,
          applied: apply,
          changed: n,
          total: st.orders.length,
          oldPrice: old,
          sample
        });
      }

      if (p === "/api/trigger_github" && m === "POST") {
        try {
          const { repo, workflow } = await body();
          if (!env.GH_PAT) return J({ error: "Chưa cấu hình GH_PAT!" }, 500);
          if (!repo || !workflow) return J({ error: "Thiếu repo hoặc workflow!" }, 400);
          const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
            method: "POST",
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${env.GH_PAT}`,
              "User-Agent": "VPN-TrinhHg-Cloudflare-Worker",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ ref: "main" })
          });
          if (!r.ok) return J({ error: await r.text() }, r.status);
          return OK();
        } catch (e) {
          return J({ error: (e && e.message) || "GitHub error" }, 500);
        }
      }
      if (p === "/api/gc" && m === "POST") {
        try {
          const legacy = ["MAP_", "SUB_DATA_", "ORIG_URL_", "LOCK_"], del = [];
          let cursor = "";
          do {
            const list = await KV.list({ cursor: cursor || undefined });
            for (const k of list.keys) if (legacy.some((x) => k.name.startsWith(x))) del.push(k.name);
            cursor = list.list_complete ? "" : list.cursor || "";
          } while (cursor);
          for (let i = 0; i < del.length; i += 50) await Promise.all(del.slice(i, i + 50).map((k) => KV.delete(k)));
          log("ok", "admin", "Dọn KV", `${del.length} key rác`);
          await flushLog(KV, log);
          return J({ deleted: del.length });
        } catch (e) {
          return J({ error: (e && e.message) || "GC error" }, 500);
        }
      }

      // ----- Link đã xóa (tab "Đã xóa"): ghi/khôi phục đồng bộ với tombstone
      if (p === "/api/deadlinks" && m === "POST") {
        const text = await request.text();
        let list;
        try {
          list = JSON.parse(text);
          if (!Array.isArray(list)) throw 0;
        } catch { return J({ error: "JSON không hợp lệ" }, 400);
        }
        const prev = arr(safeJson(await KV.get("DEAD_LINKS"), [])), prevIds = new Set(prev.map((d) => d && d.id)), newIds = new Set(list.map((d) => d && d.id));
        let tb = await loadTombs(KV);
        const have = new Set(tb.map((t) => t.id));
        for (const id of newIds) if (id && !have.has(id)) tb.push({ id, ts: Date.now() }); // vừa bị xóa -> tombstone
        tb = tb.filter((t) => !(prevIds.has(t.id) && !newIds.has(t.id))); // bị gỡ khỏi "Đã xóa" (Khôi phục) -> bỏ tombstone
        await saveTombs(KV, tb);
        await KV.put("DEAD_LINKS", text);
        return OK();
      }
      if (p === "/api/deadlinks" && m === "DELETE") { // Xóa hết lịch sử: vẫn GIỮ tombstone để link không sống lại
        const prev = arr(safeJson(await KV.get("DEAD_LINKS"), [])), tb = await loadTombs(KV), have = new Set(tb.map((t) => t.id));
        for (const d of prev) if (d && d.id && !have.has(d.id)) tb.push({ id: d.id, ts: Date.now() });
        await saveTombs(KV, tb);
        await KV.delete("DEAD_LINKS");
        return OK();
      }

      const MAP = {
        "/api/deadlinks": ["DEAD_LINKS", "[]"],
        "/api/cms": ["ALL_CMS", "{}"],
        "/api/devices": ["ADMIN_DEVICES", "[]"],
        "/api/data_requests": ["ALL_DATA_REQUESTS", "[]"],
        "/api/link_pool": ["LINK_POOL", "[]"],
        "/api/guides": ["GUIDES", "{}"]
      };
      if (MAP[p]) {
        const [key, def] = MAP[p];
        if (m === "GET") return RAW((await KV.get(key)) || def);
        if (m === "POST") {
          const text = await request.text();
          try {
            JSON.parse(text);
          } catch { return J({ error: "JSON không hợp lệ" }, 400);
          }
          await KV.put(key, text);
          if (p === "/api/cms") applySimFromSettingsText(text);
          return OK();
        }
        if (m === "DELETE") {
          await KV.delete(key);
          return OK();
        }
      }

      return J({ ok: false, error: "Not found", path: p }, 404);
    }

    // ================================================================ FRONTEND ASSETS
    try {
      if (env.ASSETS && typeof env.ASSETS.fetch === "function") return await env.ASSETS.fetch(request);
    }
    catch (e) {
      console.error("ASSETS error:", e && e.message || e);
    }
    return new Response("API Online - " + p, { status: 200, headers: CORS });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(env, ctx, {}));
  }
};

// ====================================================================
// CRON (mỗi 15 phút): khóa link, luân chuyển node (MỖI LẦN CRON CHẠY), mail (19h), dọn "Đã xóa" > 48h, thử lại đăng ký D1
// persist() đã tự lọc tombstone nên link vừa bị admin xóa không thể bị cron ghi sống lại, kể cả khi state được load trước lúc admin xóa.
// ====================================================================
async function runCron(env, ctx, opt) {
  const KV = getKV(env), log = mkLog();
  if (opt.sim !== undefined) {
    SIM_OFF = opt.sim ? Number(opt.simOffset) || 0 : 0;
    SIM_T = Date.now();
  } else {
    SIM_T = 0;
    await syncClock(KV);
  }
  const now = NOW();
  const st = await loadAll(KV, env), s = st.cms.settings || {}, me = getMe(null, env, st.cms);
  const hr = vn(now).h, today = dmy(now);
  let locked = 0, migrated = 0, delNodes = 0, mails = 0, d1Retry = 0, deadDel = 0;

  // Đồng bộ HSD chuẩn từ Supabase vào st.links theo orderId trước khi quét hạn (chỉ chạy khi Supabase trả dữ liệu thành công)
  if (st.sbOk && st.orders.length > 0) {
    const orderMap = new Map();
    for (const o of st.orders) {
      if (o && o.id) orderMap.set(normId(o.id), o);
    }
    for (const l of st.links) {
      if (l && l.orderId) {
        const od = orderMap.get(normId(l.orderId));
        if (od && od.expDate && l.expDate !== od.expDate) {
          l.expDate = od.expDate;
        }
      }
    }
  }

  // 1. Khóa link: đúng 00:00:00 UTC+7 ngày hết hạn là khóa link sub ẩn và đổi nguồn Da_bi_khoa
  for (const l of st.links) {
    if (!l || l.isLocked || !l.expDate || isLifetime(l.expDate)) continue;
    if (now >= lockAt(l.expDate)) {
      lockLink(l);
      locked++;
      st.dL = true;
      log("warn", "cron", "Khóa link hết hạn", `${l.email} · HSD ${l.expDate}`, l.orderId);
    }
  }

  if (opt.force || SIM_OFF !== 0) {
    const live = st.links.filter((l) => l && !l.isLocked && l.expDate && !isLifetime(l.expDate)), next = live.length ? Math.min(...live.map((l) => lockAt(l.expDate, linkTs(l) || now))) : 0;
    log("info", "cron", "Kiểm tra khóa link", `giờ hệ thống ${fmtBank(now)}${SIM_OFF !== 0 ? " (GIỜ TÙY CHỈNH)" : ""} · ${live.length} link còn hoạt động${next ? " · sắp khóa gần nhất lúc " + fmtBank(next) : ""}`);
  }
  // 2. Luân chuyển node sắp hết hạn: Link con chuyển đi, Neo Index #1 bị khóa, Node nguồn VẪN GIỮ NGUYÊN
  if (s.autoMigrateNode !== false) {
    const dying = st.pool.filter((p) => isDying(p));
    for (const dn of dying) {
      // Khóa neo Index #1 tại node dying (không chuyển đi đâu)
      for (const l of st.links.filter((x) => x && x.orig === dn.url && String(x.linkIndex) === "1" && !x.isLocked)) {
        lockLink(l);
        st.dL = true;
      }

      const candidateNodes = st.pool.filter((p) => !dying.includes(p) && p.url !== dn.url);
      const tn = pickNode(candidateNodes);
      if (!tn) continue;

      let moved = 0;
      // Chuyển toàn bộ link khách (Index >= 2) sang node mới còn trống
      for (const l of st.links.filter((x) => x && x.orig === dn.url && !x.isLocked && String(x.linkIndex) !== "1")) {
        if (l.orig !== tn.url) {
          l.orig = tn.url;
          dn.used = Math.max(0, (Number(dn.used) || 0) - 1);
          tn.used = (Number(tn.used) || 0) + 1;
          moved++;
        }
      }
      if (moved > 0) {
        migrated += moved;
        st.dL = true;
      }
      // Node nguồn dn VẪN GIỮ NGUYÊN TRONG KHO để Admin theo dõi, tuyệt đối không xóa
    }
    if (migrated > 0) log("ok", "cron", "Luân chuyển node", `${migrated} link sang node mới`);
  }

  // 2.1 Telegram Backup định kỳ lúc 08:00 AM VN (01:00 UTC)
  if (hr === 8 || opt.force === "telegram_backup") {
    const backupKey = `TELEGRAM_BACKUP_CRON_${today}`;
    const alreadyDone = await KV.get(backupKey);
    if (!alreadyDone) {
      ctx.waitUntil((async () => {
        await KV.put(backupKey, String(Date.now()), { expirationTtl: 86400 });
        const lastOrderBackupTs = Number(await KV.get("LAST_ORDER_BACKUP_TS")) || 0;
        if (!lastOrderBackupTs || (Date.now() - lastOrderBackupTs >= 24 * 36e5)) {
          const resOrders = await runTelegramBackup(env, "Tự động định kỳ 8h sáng (24h qua chưa có biến động)");
          log(resOrders.ok ? "ok" : "warn", "cron", "Tự động sao lưu Đơn hàng 8h sáng", `Gửi ${resOrders.count} đơn`);
        }
        const resKv = await runTelegramKvBackup(env);
        log(resKv.ok ? "ok" : "warn", "cron", "Tự động sao lưu KV Space 8h sáng", `${resKv.keysCount} keys`);
        await flushLog(KV, log);
      })());
    }
  }

  // 3. Mail nhắc hết hạn (19h VN, D-2 và D-1) — chỉ chạy khi Master và cập nhật lastMailTrack lên Supabase
  if ((hr === 19 || opt.force === "mail") && s.autoMailEnabled && s.emailRole === "master") {
    const t0 = day0(now);
    const sb = getSupabase(env, st.isTest);
    for (const o of st.orders) {
      if (!o || normStatus(o.status) !== "success" || !o.email || !o.expDate || isLifetime(o.expDate)) continue;
      const dl = Math.round((parseDmy(o.expDate) - t0) / 864e5);
      if (dl !== 1 && dl !== 2) continue;
      const key = `${dl}D_${today}`;
      if (o.lastMailTrack === key) continue;
      const msg = dl === 1 ? "**ngày mai hết hạn**" : `còn **${dl} ngày** (hết hạn **${o.expDate}**)`;
      ctx.waitUntil(sendMail(o.email, sysSubject(st.cms, "exp", o, { expText: msg.replace(/\*\*/g, "") }), buildExpMailHtml(o, msg, me.PD, st.cms), env, st.cms));
      o.lastMailTrack = key;
      if (sb) await sb.upsert(o).catch(() => {});
      mails++;
      log("ok", "mail", "Gửi mail nhắc hết hạn", `${o.email} (D-${dl})`, o.id);
    }
  }

  // 4. Dọn tab "Đã xóa" quá 48h (giữ tombstone dài hơn — xem TOMB_TTL)
  let dead = arr(safeJson(await KV.get("DEAD_LINKS"), []));
  const keep = dead.filter((d) => now - (Number(d.deadTs) || parseAny(d.deadDate) || now) <= 48 * 36e5);
  if (keep.length !== dead.length) {
    deadDel = dead.length - keep.length;
    await KV.put("DEAD_LINKS", JSON.stringify(keep));
    log("info", "cron", "Dọn link đã xóa quá 48h", `${deadDel} link`);
  }

  // 5. Thử lại đăng ký D1 cho đơn chuyển khoản còn chờ (24h gần nhất) và yêu cầu nâng gói chờ
  const pend = st.orders.filter((o) => o && normStatus(o.status) === "pending" && isBankMethod(o.method) && now - (o.createdTs || 0) < 864e5).slice(0, 12);
  for (const o of pend) {
    const r = await d1Register(env, { origin: o.workerUrl || env.PUBLIC_WORKER_URL || "" }, o, o.orderType || "new");
    if (r.ok) d1Retry++;
  }
  for (const o of st.orders.filter((x) => x && x.pendingUpgrade && isBankMethod(x.pendingUpgrade.method || x.method) && x.pendingUpgrade.amount).slice(0, 6)) await d1Upgrade(env, null, o, o.pendingUpgrade);

  // Chỉ persist vào KV khi st.dL hoặc st.dP thực sự có thay đổi
  if (st.dL || st.dP) {
    await persist(KV, st);
  }

  const hasEvents = !!(locked || migrated || delNodes || mails || deadDel || opt.force || SIM_OFF !== 0);
  const sum = {
    ts: now,
    real: Date.now(),
    sim: SIM_OFF !== 0,
    locked,
    migrated,
    delNodes,
    mails,
    deadDel,
    d1Retry
  };

  // Chỉ ghi CRON_LAST_RUN khi có sự kiện HOẶC mỗi 60 phút/lần (giảm từ 96 xuống 24 writes/ngày/web)
  const prevCron = safeJson(await KV.get("CRON_LAST_RUN"), null);
  if (hasEvents || !prevCron || (Date.now() - (Number(prevCron.real || prevCron.ts) || 0) >= 55 * 60000)) {
    await KV.put("CRON_LAST_RUN", JSON.stringify(sum));
  }

  // Chỉ ghi SYS_LOG khi thực sự có sự kiện (tiết kiệm 100% lượt ghi log khi hệ thống đứng yên)
  if (hasEvents) {
    log("ok", "cron", "Cron chạy có sự kiện", `khóa ${locked} · luân chuyển ${migrated} · xóa node ${delNodes} · mail ${mails} · dọn ${deadDel} · thử lại D1 ${d1Retry}`);
  }
  await flushLog(KV, log);
  return sum;
}

function buildGlobalRouter(links, orders = []) {
  const r = {};
  if (!Array.isArray(links)) return r;
  const now = NOW();
  const orderMap = new Map();
  if (Array.isArray(orders)) {
    for (const o of orders) {
      if (o && o.id) orderMap.set(normId(o.id), o);
    }
  }

  const extractOriginToken = u => {
    if (!u || u === LOCK_ORIG) return "";
    try {
      const mKt = String(u).match(/\/oosaka\/([a-zA-Z0-9]+)/);
      if (mKt) return mKt[1];
      return getParam(new URL(u), "top", "liki", "lidj", "kidj", "OwO", "token", "oos") || "";
    } catch { return "";
    }
  };

  for (const l of links) {
    try {
      if (!l || !l.masked) continue;
      const mt = getParam(new URL(l.masked), "top", "liki", "lidj", "kidj", "OwO", "token", "oos");
      if (!mt) continue;

      let effectiveExp = l.expDate;
      if (l.orderId) {
        const od = orderMap.get(normId(l.orderId));
        if (od && od.expDate) {
          effectiveExp = od.expDate;
          l.expDate = od.expDate;
        }
      }

      const isLife = isLifetime(effectiveExp);
      const dayStart = parseDmy(effectiveExp);
      const lockTs = isLife ? 4102444800000 : (dayStart || 0);
      const isLocked = !!l.isLocked || (!isLife && lockTs > 0 && now >= lockTs) || (l.orig === LOCK_ORIG);

      if (l.isCombo) {
        if (isLocked || l.orig === LOCK_ORIG) {
          r[mt] = {
            isCombo: true,
            tokens: [],
            origUrls: [LOCK_ORIG],
            isLocked: true,
            expDate: effectiveExp || (isLife ? "Vĩnh viễn" : ""),
            lockTs,
            isLife
          };
          continue;
        }
        const ot1 = l.orig && l.orig !== LOCK_ORIG ? extractOriginToken(l.orig) : "";
        const ot2 = l.orig2 && l.orig2 !== LOCK_ORIG ? extractOriginToken(l.orig2) : "";
        r[mt] = {
          isCombo: true,
          tokens: [ot1, ot2].filter(Boolean),
          origUrls: [l.orig, l.orig2].filter(Boolean),
          isLocked,
          expDate: effectiveExp || (isLife ? "Vĩnh viễn" : ""),
          lockTs,
          isLife
        };
        continue;
      }
      if (!l.orig) continue;
      if (isLocked || l.orig === LOCK_ORIG) {
        r[mt] = {
          origTok: "",
          origUrl: LOCK_ORIG,
          isLocked: true,
          isCombo: false,
          expDate: effectiveExp || (isLife ? "Vĩnh viễn" : ""),
          lockTs,
          isLife
        };
        continue;
      }
      const ot = extractOriginToken(l.orig);
      if (ot) r[mt] = {
        origTok: ot,
        origUrl: l.orig,
        isLocked,
        isCombo: false,
        expDate: effectiveExp || (isLife ? "Vĩnh viễn" : ""),
        lockTs,
        isLife
      };
    } catch {
      /* bỏ qua link lỗi */
    }
  }
  return r;
}
function getParam(url, ...keys) {
  for (const k of keys) {
    const v = url.searchParams.get(k);
    if (v) return v;
  }
  return null;
}

// ====================================================================
// Rà quét / map lại link trong ô info của đơn hàng
// ====================================================================
function clearMasked(st, list) {
  const set = new Set(arr(list).filter(Boolean));
  const touched = [];
  for (const o of st.orders) {
    if (!o) continue;
    let mod = false;
    for (const f of ["info1", "info2", "info3"]) {
      if (o[f] && set.has(o[f])) {
        o[f] = "";
        if (o.lockInfo) delete o.lockInfo[f];
        mod = true;
      }
    }
    if (mod) touched.push(o);
  }
  return touched;
}
// Rà quét độc lập 100%: nhận diện chuẩn xác link không tồn tại, link hỏng cú pháp, và link bị khóa
async function relinkScan(env, url, st, o) {
  const now = NOW(), me = getMe(url, env, st.cms);
  const myNum = Number(me.field.slice(4));
  const fields = [myNum]; // Chỉ quét duy nhất ô info tương ứng của chính web này
  const items = [];
  for (const od of st.orders) {
    if (!od) continue;
    const expired = isExpiredOrder(od, now);
    if (o.expired === "expired" && !expired) continue;
    if (o.expired === "active" && expired) continue;
    for (const i of fields) {
      const f = "info" + i, v = String(od[f] || "").trim();
      if (!v) continue;
      const manual = !!(od.lockInfo && od.lockInfo[f]);
      if (manual && !o.includeManual) continue;
      const isUrl = /^https?:\/\//i.test(v);
      const ownLink = st.links.find((l) => l && l.masked === v);
      // Link coi là chết nếu: sai cú pháp URL, hoặc thuộc web này nhưng không có trong ALL_LINKS hoặc link đã bị khóa
      const isDead = !isUrl || (f === me.field && (!ownLink || ownLink.isLocked));
      if (o.scope === "dead" && !isDead) continue;
      items.push({
        id: od.id,
        email: od.email || "",
        field: f,
        link: v,
        expired,
        dead: isDead,
        manual,
        isLocked: !!(ownLink && ownLink.isLocked)
      });
    }
  }
  return { items, remoteOk: true };
}

// Tìm link còn sống khớp nhất cho 1 đơn: ưu tiên orderId trùng, rồi cùng email + hạn giống hệt (kể cả Vĩnh viễn), rồi cùng email.
function matchLink(links, od) {
  const em = String(od.email || "").toLowerCase();
  return links.find((x) => x && x.orderId && normId(x.orderId) === normId(od.id)) || links.find((x) => x && String(x.email || "").toLowerCase() === em) || null;
}

// Map lại độc lập 100%: Tự động map lại nếu ô hiện tại bị rỗng hoặc link hiện tại đã bị khóa/chết
async function relinkMap(env, url, st, me, o) {
  const now = NOW(), fields = arr(o.fields).length ? o.fields.map(Number) : [1, 2, 3], items = [];
  const myNum = Number(me.field.slice(4));
  if (!fields.includes(myNum)) return { items: [], remoteOk: true };

  for (const od of st.orders) {
    if (!od || normStatus(od.status) !== "success" || isExpiredOrder(od, now) || !od.email) continue;
    const f = me.field;
    if (!o.includeManual && od.lockInfo && od.lockInfo[f]) continue;
    const cur = String(od[f] || "").trim();
    // Nếu link hiện tại vẫn còn sống và KHÔNG bị khóa thì bỏ qua
    if (cur && st.links.some((l) => l && l.masked === cur && !l.isLocked)) continue;
    const l = matchLink(st.links, od);
    if (l && l.masked !== cur) {
      items.push({
        id: od.id,
        email: od.email,
        field: f,
        link: cur || "",
        to: l.masked
      });
    }
  }
  return { items, remoteOk: true };
}

// ====================================================================
// QUOTA: Cloudflare GraphQL Analytics (KV của web này,
// Worker này, D1) + Google Script (mail). Không có nguồn = báo lỗi rõ,
// không bịa số.
// ====================================================================

async function cfGql(env, query, variables, token) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (token || env.CF_API_TOKEN),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });

  const j = await r.json().catch(() => null);
  if (!j) throw new Error("HTTP " + r.status);
  if (j.errors && j.errors.length) {
    throw new Error(j.errors[0].message);
  }

  const a = j.data && j.data.viewer && j.data.viewer.accounts;
  return (a && a[0]) || {};
}

async function quotaReport(env) {
  const now = new Date(), day = now.toISOString().slice(0, 10), from = day + "T00:00:00Z", to = now.toISOString(), acc = env.CF_ACCOUNT_ID,
  // Dynamic fallback: Không có D1_ACCOUNT_ID -> dùng chung acc; Không có D1_CF_API_TOKEN -> dùng chung CF_API_TOKEN
  d1Acc = env.D1_ACCOUNT_ID || acc, d1Token = env.D1_CF_API_TOKEN || env.CF_API_TOKEN;

  const out = {
    ok: true,
    ts: Date.now(),
    day,
    nextReset: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    cfg: {
      token: !!env.CF_API_TOKEN,
      account: !!acc,
      kv: !!env.KV_NAMESPACE_ID,
      script: !!env.WORKER_SCRIPT_NAME,
      d1: !!env.D1_DATABASE_ID,
      d1Account: !!d1Acc,
      d1Token: !!d1Token,
      d1Shared: !env.D1_ACCOUNT_ID || env.D1_ACCOUNT_ID === acc,
      brevo: !!env.BREVO_API_KEY,
      sendpulse: !!(env.SENDPULSE_API_ID && env.SENDPULSE_API_SECRET)
    },
    kv: null,
    worker: null,
    d1: null,
    mail: null,
    brevo: null,
    sendpulse: null,
    err: {}
  };

  const T = [];

  if (!env.CF_API_TOKEN || !acc) {
    out.err.kv = out.err.worker = out.err.d1 = "Worker chưa cấu hình CF_API_TOKEN / CF_ACCOUNT_ID";
  } else {
    // ================================================================
    // KV
    // ================================================================
    if (env.KV_NAMESPACE_ID) {
      T.push((async () => {
        try {
          const a = await cfGql(env, "query($a:String!,$ns:String!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){kvOperationsAdaptiveGroups(limit:20,filter:{namespaceId:$ns,date_geq:$d,date_leq:$d}){sum{requests} dimensions{actionType}}}}}", { a: acc, ns: env.KV_NAMESPACE_ID, d: day });

          const k = { read: 0, write: 0, delete: 0, list: 0 };

          for (const g of arr(a.kvOperationsAdaptiveGroups)) {
            const t = String(g.dimensions && g.dimensions.actionType || "").toLowerCase();

            if (t in k) {
              k[t] += (g.sum && g.sum.requests) || 0;
            }
          }

          out.kv = k;
        } catch (e) {
          out.err.kv = String(e.message || e);
        }
      })());
    } else {
      out.err.kv = "Worker chưa cấu hình KV_NAMESPACE_ID";
    }

    // ================================================================
    // WORKER
    // ================================================================
    if (env.WORKER_SCRIPT_NAME) {
      T.push((async () => {
        try {
          const a = await cfGql(env, "query($a:String!,$s:String!,$f:Time!,$t:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:50,filter:{scriptName:$s,datetime_geq:$f,datetime_leq:$t}){sum{requests errors subrequests}}}}}", { a: acc, s: env.WORKER_SCRIPT_NAME, f: from, t: to });

          const w = { requests: 0, errors: 0, subrequests: 0 };

          for (const g of arr(a.workersInvocationsAdaptive)) {
            for (const k of Object.keys(w)) {
              w[k] += (g.sum && g.sum[k]) || 0;
            }
          }

          out.worker = w;
        } catch (e) {
          out.err.worker = String(e.message || e);
        }
      })());
    } else {
      out.err.worker = "Worker chưa cấu hình WORKER_SCRIPT_NAME";
    }

    // ================================================================
    // D1 (Tự động nhận diện: Cùng Account hoặc Khác Account)
    // ================================================================
    if (env.D1_DATABASE_ID && d1Acc && d1Token) {
      T.push((async () => {
        try {
          const a = await cfGql(env, "query($a:String!,$db:String!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){d1AnalyticsAdaptiveGroups(limit:50,filter:{databaseId:$db,date_geq:$d,date_leq:$d}){sum{readQueries writeQueries rowsRead rowsWritten}}}}}", { a: d1Acc, db: env.D1_DATABASE_ID, d: day }, d1Token);

          const d = { readQueries: 0, writeQueries: 0, rowsRead: 0, rowsWritten: 0 };

          for (const g of arr(a.d1AnalyticsAdaptiveGroups)) {
            for (const k of Object.keys(d)) {
              d[k] += (g.sum && g.sum[k]) || 0;
            }
          }

          out.d1 = d;
        } catch (e) {
          out.err.d1 = String(e.message || e);
        }
      })());
    } else if (!env.D1_DATABASE_ID) {
      out.err.d1 = "Worker chưa cấu hình D1_DATABASE_ID";
    } else if (!d1Acc) {
      out.err.d1 = env.D1_ACCOUNT_ID !== undefined ? "Worker chưa cấu hình D1_ACCOUNT_ID" : "Worker chưa cấu hình CF_ACCOUNT_ID";
    } else {
      out.err.d1 = env.D1_CF_API_TOKEN !== undefined ? "Worker chưa cấu hình D1_CF_API_TOKEN" : "Worker chưa cấu hình CF_API_TOKEN";
    }
  }
  // ---- Supabase Quota (Cơ chế 1: RPC Database thật; Cơ chế 2: Management API)
  if (env.SUPABASE_URL && env.SUPABASE_KEY) {
    T.push((async () => {
      try {
        const sb = getSupabase(env, false);
        const rpcData = sb ? await sb.getRpcQuota() : null;
        let mgmtData = null;
        const hasMgmt = !!(env.SUPABASE_MGMT_TOKEN && env.SUPABASE_PROJECT_REF);
        if (hasMgmt) {
          const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/usage`, { headers: { Authorization: `Bearer ${env.SUPABASE_MGMT_TOKEN}` } });
          if (mgmtRes.ok) mgmtData = await mgmtRes.json();
        }
        out.supabase = { rpc: rpcData, mgmt: mgmtData, hasMgmt, connected: !!rpcData };
      } catch (e) {
        out.err.supabase = String(e.message || e);
      }
    })());
  } else {
    out.err.supabase = "Worker chưa cấu hình SUPABASE_URL / SUPABASE_KEY";
  }

  // ---- Brevo quota
  if (env.BREVO_API_KEY) {
    T.push((async () => {
      try {
        const r = await fetch("https://api.brevo.com/v3/account", {
          headers: { Accept: "application/json", "api-key": env.BREVO_API_KEY }
        });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j) {
          out.err.brevo = "HTTP " + r.status;
          return;
        }
        const plans = arr(j.plan);
        const plan = plans.find(p => p.creditsType === "sendLimit") || plans[0];
        out.brevo = plan ? {
          credits: plan.credits ?? null,
          creditsType: plan.creditsType || "",
          planType: plan.type || ""
        } : { credits: null };
      } catch (e) {
        out.err.brevo = String(e.message || e);
      }
    })());
  } else out.err.brevo = "Worker chưa cấu hình BREVO_API_KEY";

  // ---- SendPulse quota (định mức Free: 12.000/tháng, 50 mail/giờ + Bộ đếm 60 phút tự hủy trong KV)
  if (env.SENDPULSE_API_ID && env.SENDPULSE_API_SECRET) {
    T.push((async () => {
      try {
        const tok = await spToken(env);
        const [rBal, rTotal] = await Promise.all([fetch("https://api.sendpulse.com/user/balance/detail", { headers: { Authorization: "Bearer " + tok } }), fetch("https://api.sendpulse.com/smtp/emails/total", { headers: { Authorization: "Bearer " + tok } })]);
        const jBal = await rBal.json().catch(() => ({}));
        const jTotal = await rTotal.json().catch(() => ({}));

        if (!rBal.ok) {
          out.err.sendpulse = "HTTP " + rBal.status + " " + (jBal.message || "");
          return;
        }

        const tariffName = (jBal.smtp && jBal.smtp.tariff_name) || (jBal.email && jBal.email.tariff_name) || "SMTP Free";
        const isFree = /free/i.test(tariffName);
        const totalSent = (jTotal && typeof jTotal.total === "number") ? jTotal.total : 0;

        // Quét bộ nhớ 1 giờ trong KV SP_HOUR_TRACKER & tự dọn các mốc > 60 phút
        let hourSent = 0;
        if (getKV(env)) {
          try {
            const kvDb = getKV(env);
            const now = Date.now();
            let tracker = arr(safeJson(await kvDb.get("SP_HOUR_TRACKER"), []));
            const valid = tracker.filter(ts => typeof ts === "number" && now - ts < 3600000);
            hourSent = valid.length;
            if (valid.length !== tracker.length) {
              if (valid.length > 0) await kvDb.put("SP_HOUR_TRACKER", JSON.stringify(valid), { expirationTtl: 3600 });
              else await kvDb.delete("SP_HOUR_TRACKER");
            }
          } catch {}
        }

        out.sendpulse = {
          tariff: tariffName,
          status: "connected",
          // Định mức tháng & giờ của SendPulse Free
          monthTotal: isFree ? 12000 : null,
          monthLeft: isFree ? Math.max(0, 12000 - totalSent) : (jBal.email && jBal.email.emails_left) || null,
          hourLimit: 50,
          hourSent: hourSent,
          hourLeft: Math.max(0, 50 - hourSent),
          dayTotal: isFree ? 50 : null,
          dayLeft: isFree ? 50 : null,
          emailsLeftFallback: isFree ? 12000 : null,
          totalSent: totalSent,
          balance: (jBal.balance && jBal.balance.main) ?? "0",
          currency: (jBal.balance && jBal.balance.currency) || "USD"
        };
      } catch (e) {
        out.err.sendpulse = String(e.message || e);
      }
    })());
  } else out.err.sendpulse = "Worker chưa cấu hình SENDPULSE_API_ID / SENDPULSE_API_SECRET";

  // Google Apps Script phải deploy doGet trả JSON khi có ?quota=1 (xem hướng dẫn); nếu Google trả về trang HTML thì báo lỗi rõ thay vì crash.
  T.push((async () => {
    try {
      const r = await fetch(MAIL_URL + "?quota=1", { redirect: "follow" }), ct = r.headers.get("content-type") || "";
      if (!ct.includes("json")) {
        out.err.mail = "Apps Script trả về " + (ct || "không rõ định dạng") + " thay vì JSON — kiểm tra doGet(e) đã xử lý ?quota=1 và đã Deploy bản mới (quyền Anyone) chưa";
        return;
      }
      const j = await r.json();
      if (j && typeof j.remaining === "number") out.mail = { remaining: j.remaining, limit: j.limit || 100 };
      else out.err.mail = "Apps Script chưa trả trường 'remaining'";
    } catch (e) {
      out.err.mail = String(e.message || e);
    }
  })());
  await Promise.all(T);
  return out;
}

// ====================================================================
// EMAIL
// ====================================================================
function htmlEscape(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const MAIL_URL = "https://script.google.com/macros/s/AKfycbyTwS_udF6JbVXkE-PRYf1keRA00DqHMC2-lcH6dU2rvD8KVLBX99Yl_4HpxODDnMrU/exec"; // Google Apps Script — mặc định/dự phòng

// ---- Gửi mail đa nhà cung cấp. Chọn ở Admin > Cài đặt > Set Web > "Nhà cung cấp gửi mail" (lưu vào cms.settings.mailProvider: google|brevo|sendpulse)
let SP_TOKEN = "", SP_TOKEN_EXP = 0;
async function spToken(env) {
  if (SP_TOKEN && Date.now() < SP_TOKEN_EXP) return SP_TOKEN;
  const r = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.SENDPULSE_API_ID,
      client_secret: env.SENDPULSE_API_SECRET
    })
  });
  const j = await r.json().catch(() => null);
  if (!j || !j.access_token) throw new Error("SendPulse: không lấy được access_token — kiểm tra SENDPULSE_API_ID/SECRET");
  SP_TOKEN = j.access_token;
  SP_TOKEN_EXP = Date.now() + 55 * 60000;
  return SP_TOKEN;
}
function b64eUtf8(s) {
  const bytes = new TextEncoder().encode(String(s ?? ""));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
async function sendMailGoogle(to, subject, html) {
  await fetch(MAIL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html })
  });
}
async function sendMailBrevo(env, to, subject, html) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        name: env.BREVO_SENDER_NAME || "VPN Trinh Hg",
        email: env.BREVO_SENDER_EMAIL
      },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  if (!r.ok) throw new Error("Brevo HTTP " + r.status + " " + (await r.text().catch(() => "")));
}
// Ghi nhận mốc thời gian gửi mail của SendPulse vào KV SP_HOUR_TRACKER và tự dọn dẹp các mốc quá 60 phút
async function recordSendPulseSent(KV) {
  if (!KV) return;
  try {
    const now = Date.now();
    let tracker = arr(safeJson(await KV.get("SP_HOUR_TRACKER"), []));
    tracker = tracker.filter(ts => typeof ts === "number" && now - ts < 3600000);
    tracker.push(now);
    await KV.put("SP_HOUR_TRACKER", JSON.stringify(tracker), { expirationTtl: 3600 });
  } catch {}
}

async function sendMailSendpulse(env, to, subject, html, KV) {
  const tok = await spToken(env);
  const body = {
    email: {
      html: b64eUtf8(html),
      subject,
      from: {
        name: env.SENDPULSE_SENDER_NAME || "VPN Trinh Hg",
        email: env.SENDPULSE_SENDER_EMAIL
      },
      to: [{ email: to }]
    }
  };
  const r = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + tok
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("SendPulse HTTP " + r.status + " " + (await r.text().catch(() => "")));
  if (KV) await recordSendPulseSent(KV);
}
async function sendMail(to, subject, html, env, cms, KV) {
  const prov = (cms && cms.settings && cms.settings.mailProvider) || "google";
  try {
    if (prov === "brevo" && env.BREVO_API_KEY) await sendMailBrevo(env, to, subject, html);
    else if (prov === "sendpulse" && env.SENDPULSE_API_ID && env.SENDPULSE_API_SECRET) await sendMailSendpulse(env, to, subject, html, KV);
    else await sendMailGoogle(to, subject, html);
  } catch (e) {
    console.error("Mail error (" + prov + ")", e && e.message || e);
  }
}

// ---- Lõi mail dùng chung Admin + Worker (khớp 100% hàm mailRender phía admin.html để "xem trước" = "gửi thật")
const mailGrad = (c1, c2, ang, stop) => `linear-gradient(${Number(ang) || 135}deg,${c1} 0%,${c2} ${Math.max(1, Math.min(100, Number(stop) || 100))}%)`;
const mailShell = (c1, c2, title, inner, ang, stop) => `<div style="font-family:Arial,Helvetica,sans-serif;width:100%;max-width:480px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden"><div style="background:${c1};background-image:${mailGrad(c1, c2, ang, stop)};padding:22px 16px;text-align:center"><h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:800;line-height:1.4;text-transform:uppercase;letter-spacing:.5px;font-family:Arial,Helvetica,sans-serif">${title}</h2></div><div style="padding:20px;font-family:Arial,Helvetica,sans-serif">${inner}</div></div>`;
const mailIdBox = (label, id, color) => `<div style="background:#f1f5f9;border-left:4px solid ${color};padding:15px;border-radius:8px;margin:18px 0;text-align:center"><p style="margin:0;font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase">${label}</p><p style="margin:8px 0 0;font-size:22px;font-weight:900;color:${color};letter-spacing:1px;word-break:break-word">${htmlEscape(id)}</p></div>`;
const mailPortal = (PD, label) => `<div style="text-align:center;margin:24px 0 6px"><a href="${htmlEscape(PD)}" style="display:block;background:#1e293b;color:#ffffff;padding:13px 15px;border-radius:10px;text-decoration:none;font-weight:900;font-size:14px">${label}</a></div><p style="margin:10px 0 0;font-size:12px;color:#64748b;text-align:center;line-height:1.5">👉 <i>Dùng <b>Mã Đơn Hàng</b> hoặc <b>Email</b> để tra cứu thông tin đơn hàng</i></p>`;
const mailBtn = (href, bg, label) => `<td width="50%" style="padding:4px"><a href="${htmlEscape(href)}" style="display:block;background:${bg};color:#ffffff;padding:10px 0;border-radius:8px;text-decoration:none;font-weight:bold;font-size:12px;text-align:center">${label}</a></td>`;
const mailSupport = (PD) => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:22px;text-align:center"><p style="margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5">Cần hỗ trợ? Đội ngũ của chúng tôi luôn sẵn sàng 24/7 để hỗ trợ bạn ❤️</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>${mailBtn("https://zalo.me/0917678211", "#0068ff", "Chat Zalo")}${mailBtn("https://www.facebook.com/trinh.hg.57", "#0668E1", "Messenger")}</tr><tr>${mailBtn("https://t.me/hoaian57", "#0088cc", "Telegram")}${mailBtn(String(PD).replace(/\/$/, "") + "/#wechat", "#07C160", "WeChat")}</tr></table></div>`;
const TPL_THEME = {
  red: ["#fef2f2", "#fca5a5", "#991b1b", "#b91c1c"],
  amber: ["#fefce8", "#facc15", "#a16207", "#ca8a04"],
  purple: ["#f5f3ff", "#a78bfa", "#6d28d9", "#7c3aed"],
  blue: ["#eff6ff", "#93c5fd", "#1e40af", "#2563eb"],
  green: ["#f0fdf4", "#86efac", "#166534", "#16a34a"]
};
const P0 = { t: "portal", x: "TRUY CẬP CỔNG KHÁCH HÀNG" }, S0 = { t: "support" };
const SYS_TPL = {
  success: {
    name: "Kích hoạt thành công",
    subject: "VPN Trinh Hg - Kích hoạt thành công",
    title: "KÍCH HOẠT THÀNH CÔNG",
    c1: "#4f46e5",
    c2: "#8b5cf6",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Xin chào, Gói VPN **{pkgName}** của bạn đã sẵn sàng."
    }, { t: "orderid", label: "MÃ ĐƠN HÀNG CỦA BẠN" }, P0, S0]
  },
  renew: {
    name: "Gia hạn thành công",
    subject: "VPN Trinh Hg - Gia hạn thành công",
    title: "GIA HẠN THÀNH CÔNG",
    c1: "#4f46e5",
    c2: "#8b5cf6",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Xin chào, Gói VPN **{pkgName}** của bạn đã được gia hạn thành công."
    }, { t: "orderid", label: "MÃ ĐƠN HÀNG CỦA BẠN" }, P0, S0]
  },
  upgrade: {
    name: "Nâng cấp thành công",
    subject: "VPN Trinh Hg - Nâng cấp thành công",
    title: "NÂNG CẤP THÀNH CÔNG",
    c1: "#4f46e5",
    c2: "#8b5cf6",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Xin chào, Gói VPN **{pkgName}** của bạn đã được nâng cấp thành công."
    }, { t: "orderid", label: "MÃ ĐƠN HÀNG CỦA BẠN" }, P0, S0]
  },
  failed: {
    name: "Kích hoạt thất bại",
    subject: "VPN Trinh Hg - Kích hoạt thất bại",
    title: "KÍCH HOẠT THẤT BẠI",
    c1: "#ef4444",
    c2: "#b91c1c",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Xin chào, Gói VPN **{pkgName}** của bạn không thể kích hoạt."
    }, { t: "orderid", label: "MÃ ĐƠN HÀNG CỦA BẠN", color: "#4f46e5" }, {
      t: "box",
      label: "LÝ DO TỪ CHỐI",
      x: "{reason}",
      theme: "red"
    }, P0, S0]
  },
  exp: {
    name: "Gói VPN sắp hết hạn",
    subject: "VPN Trinh Hg - Gói VPN sắp hết hạn",
    title: "GÓI VPN SẮP HẾT HẠN",
    c1: "#f59e0b",
    c2: "#d97706",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Xin chào, Gói VPN **{pkgName}** của bạn {expText}.",
      al: "c"
    }, { t: "orderid", label: "MÃ ĐƠN HÀNG HIỆN TẠI", color: "#d97706" }, {
      t: "text",
      x: "Gia hạn ngay để không bị gián đoạn dịch vụ.",
      al: "c",
      sz: "m"
    }, { t: "portal", x: "GIA HẠN NGAY TẠI WEBSITE" }, S0]
  },
  support: {
    name: "Hỗ trợ cài đặt",
    subject: "VPN Trinh Hg - Hỗ trợ cài đặt",
    title: "HỖ TRỢ CÀI ĐẶT",
    c1: "#2563eb",
    c2: "#1d4ed8",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Vui lòng liên hệ Admin qua Zalo để được hỗ trợ gói VPN mã đơn **{orderId}** nhé!",
      al: "c"
    }, {
      t: "box",
      label: "ZALO ADMIN",
      x: "0917678211",
      theme: "amber"
    }, P0, S0]
  },
  data: {
    name: "Báo cáo dung lượng",
    subject: "VPN Trinh Hg - Báo cáo dung lượng {orderId}",
    title: "KẾT QUẢ TRA CỨU\nDUNG LƯỢNG",
    c1: "#8b5cf6",
    c2: "#6d28d9",
    ang: 135,
    stop: 100,
    blocks: [{
      t: "text",
      x: "Đây là dung lượng của đơn hàng **{orderId}**.",
      al: "c"
    }, {
      t: "box",
      label: "DUNG LƯỢNG CÒN LẠI",
      x: "{gb} GB",
      theme: "purple"
    }, {
      t: "text",
      x: "Nếu tốc độ chậm, có thể gói đã dùng hết dung lượng.",
      al: "c",
      sz: "m"
    }, P0, S0]
  }
};
const getTpl = (cms, key) => ({
  ...SYS_TPL[key],
  ...((((cms && cms.mailSys) || {})[key]) || {})
});
const subjVars = (t, v) => String(t ?? "").replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== null ? String(v[k]) : m));
function mailRender(tpl, v, PD) {
  const rp = (t) => subjVars(t, v);
  const tx = (t) => htmlEscape(rp(t)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const al = (b) => (b.al === "c" ? "center" : b.al === "r" ? "right" : "left"), fs = { s: "12px", m: "14px", l: "17px", xl: "22px" };
  const inner = arr(tpl.blocks).map((b) => {
    if (b.t === "text") return `<p style="margin:0 0 12px;font-size:${fs[b.sz] || "15px"};line-height:1.6;color:#334155;text-align:${al(b)};white-space:pre-wrap;${b.b ? "font-weight:bold;" : ""}${b.i ? "font-style:italic;" : ""}${b.ul ? "text-decoration:underline;" : ""}">${tx(b.x)}</p>`;
    if (b.t === "orderid") return mailIdBox(htmlEscape(rp(b.label || "MÃ ĐƠN HÀNG CỦA BẠN")), v.orderId || "", b.color || tpl.c1);
    if (b.t === "box") {
      const t = TPL_THEME[b.theme] || TPL_THEME.amber;
      return `<div style="background:${t[0]};border:2px dashed ${t[1]};padding:18px;border-radius:12px;text-align:center;margin:14px 0"><p style="margin:0;font-size:12px;color:${t[2]};font-weight:bold;text-transform:uppercase">${htmlEscape(rp(b.label))}</p><p style="margin:10px 0 0;font-size:${fs[b.sz] || "26px"};font-weight:900;color:${t[3]};word-break:break-word">${tx(b.x)}</p></div>`;
    }
    if (b.t === "info") return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:10px 0">${[["✉️", "Email", v.email], ["#️⃣", "Mã đơn", v.orderId], ["📦", "Gói VPN", v.pkg], ["⏰", "HSD", v.exp]].map(([ic, lb, val]) => `<tr><td style="padding:9px 6px;border-bottom:1px solid #f1f5f9;width:34%;font-size:13px;color:#64748b">${ic} ${lb}</td><td style="padding:9px 6px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:bold;color:#0f172a;word-break:break-word">${htmlEscape(val || "—")}</td></tr>`).join("")}</table>`;
    if (b.t === "portal") return mailPortal(PD, htmlEscape(rp(b.x || "TRUY CẬP CỔNG KHÁCH HÀNG")));
    if (b.t === "support") return mailSupport(PD);
    if (b.t === "img") return /^https?:\/\//i.test(b.u || "") ? `<div style="text-align:${al(b)};margin:10px 0"><img src="${htmlEscape(b.u)}" style="max-width:100%;border-radius:8px"></div>` : "";
    if (b.t === "divider") return '<hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0">';
    if (b.t === "spacer") return `<div style="height:${Math.max(4, Math.min(200, parseInt(b.h) || 16))}px"></div>`;
    return "";
  }).join("");
  return mailShell(tpl.c1, tpl.c2, htmlEscape(rp(tpl.title)).replace(/\n/g, "<br>"), inner, tpl.ang, tpl.stop);
}
function orderVars(o, extra) {
  const pk = PKGS[o.pkgId] || PKGS[detectPkg(o).id], dl = o.expDate && !isLifetime(o.expDate) ? Math.ceil((parseDmy(o.expDate) + 864e5 - NOW()) / 864e5) : "";
  return {
    email: o.email || "",
    orderId: o.id || "",
    pkgName: o.pkgName || "",
    pkg: pk ? pkgStr(pk) : (o.pkgName || ""),
    exp: o.expDate || "",
    daysLeft: dl,
    nickname: o.nickname || "",
    zalo: o.zalo || "",
    reason: o.reason || "Vui lòng liên hệ Admin",
    ...(extra || {})
  };
}
const kindKey = (kind) => (kind === "upgrade" ? "upgrade" : kind === "renew" ? "renew" : "success");
function buildSuccessMailHtml(o, PD, kind, cms) {
  return mailRender(getTpl(cms, kindKey(kind)), orderVars(o), PD);
}
function buildFailedMailHtml(o, PD, cms) {
  return mailRender(getTpl(cms, "failed"), orderVars(o), PD);
}
function buildExpMailHtml(o, expText, PD, cms) {
  return mailRender(getTpl(cms, "exp"), orderVars(o, { expText }), PD);
}
const sysSubject = (cms, key, o, extra) => subjVars(getTpl(cms, key).subject, orderVars(o, extra));

// ---- Mail báo cho Admin
const adminRows = (rows) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows.map(([ic, lb, v]) => `<tr><td style="padding:10px 6px;border-bottom:1px solid #f1f5f9;width:34%;font-size:13px;color:#64748b;vertical-align:top">${ic} ${lb}</td><td style="padding:10px 6px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:bold;color:#0f172a;word-break:break-word">${v}</td></tr>`).join("")}</table>`;
function buildAdminMail(kind, o, x) {
  const pk = PKGS[o.pkgId] || PKGS[detectPkg(o).id], pkg = pk ? pkgStr(pk) : htmlEscape(o.pkgName || "—"), bank = isBankMethod(o.method);
  const E = htmlEscape, base = [["✉️", "Email", E(o.email || "—")], ["#️⃣", "Mã Đơn", `<span style="color:#ef4444;font-family:monospace">${E(o.id)}</span>`]];
  if (kind === "upgrade") {
    const cur = x && x.cur, tg = x && x.tg, qty = (x && x.qty) || 1, amtTxt = bank ? VND(o.pendingUpgrade ? o.pendingUpgrade.amount : 0) + "VND" : "¥" + (o.pendingUpgrade ? o.pendingUpgrade.amountCny || 0 : 0);
    return mailShell("#7e22ce", "#a855f7", "YÊU CẦU NÂNG GÓI", adminRows([...base, ["📦", "Gói VPN cũ", `${cur ? `${cur.n} - ${VND(cur.vnd)}VND` : pkg} x ${monthsOf(o)}`], ["🚀", "Gói VPN muốn nâng", `${tg ? `${tg.n} - ${VND(tg.vnd)}VND` : "—"} x ${qty} tháng`], ["💵", "Số tiền chênh lệch", `<span style="color:#16a34a">${amtTxt}</span>`], ["💬", "Zalo", E(o.zalo || "Không nhập")]]));
  }
  if (kind === "data") return mailShell("#2563eb", "#6366f1", "YÊU CẦU KIỂM TRA<br>DUNG LƯỢNG", adminRows([...base, ["📦", "Gói VPN", pkg], ["💬", "Zalo", E(o.zalo || "Không nhập")]]) + `<p style="margin:16px 0 0;font-size:12px;color:#1e40af;background:#eff6ff;padding:10px;border-radius:8px;text-align:center">Mở tab "Dung lượng" trên Admin để báo số GB cho khách.</p>`);
  const isRenew = kind === "renew", amtTxt = bank ? VND(o.totalVnd) + "VND" : "¥" + (o.totalCny || 0);
  return mailShell(isRenew ? "#0891b2" : "#2563eb", isRenew ? "#06b6d4" : "#6366f1", isRenew ? "KHÁCH GIA HẠN GÓI" : "KHÁCH BÁO ĐÃ CHUYỂN KHOẢN", adminRows([...base, ["📦", "Gói VPN", pkg], ["💵", "Số tiền", `<span style="color:#16a34a">${amtTxt}</span>`], ["📅", "Số tháng", monthsOf(o)], ["💬", "Zalo", E(o.zalo || "Không nhập")]]));
}

// ====================================================================
// YAML
// ====================================================================

function yamlQuote(value) {
  return JSON.stringify(String(value ?? ""));
}

function makeSimpleYaml(names) {
  const proxies = names.map(name => {
    return `    - ${JSON.stringify({ name, type: "vless", server: "127.0.0.1", port: 1, uuid: "00000000-0000-0000-0000-000000000000", udp: false })}`;
  });
  return ["mixed-port: 7890", "allow-lan: false", "bind-address: '*'", "mode: rule", "log-level: info", "proxies:", ...proxies, "proxy-groups:", `    - { name: "VPN Trinh Hg", type: select, proxies: [${names.map(yamlQuote).join(", ")}] }`, "rules:", '    - "MATCH,VPN Trinh Hg"'].join("\n");
}

// ====================================================================
// SIMPLE SING-BOX
// ====================================================================

function makeSimpleSingbox(names) {
  const outbounds = [{ type: "selector", tag: "VPN Trinh Hg", outbounds: names }, { type: "direct", tag: "direct" }, { type: "block", tag: "block" }, { type: "dns", tag: "dns-out" }];
  for (const name of names) {
    outbounds.push({
      type: "vless",
      tag: name,
      server: "127.0.0.1",
      server_port: 1,
      uuid: "00000000-0000-0000-0000-000000000000"
    });
  }
  return JSON.stringify({
    log: { level: "info" },
    dns: {
      servers: [{ tag: "dns-direct", address: "223.5.5.5", detour: "direct" }],
      final: "dns-direct"
    },
    inbounds: [{
      type: "mixed",
      tag: "mixed-in",
      listen: "127.0.0.1",
      listen_port: 2080
    }],
    outbounds,
    route: {
      auto_detect_interface: true,
      rules: [{ protocol: "dns", outbound: "dns-out" }],
      final: "VPN Trinh Hg"
    }
  }, null, 2);
}

// ====================================================================
// BASE64
// ====================================================================

function decB64(str) {
  try {
    const clean = String(str || "").replace(/\s+/g, "");
    if (!clean) return "";
    const padded = clean + "=".repeat((4 - (clean.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch { return "";
  }
}

function encB64(str) {
  const bytes = new TextEncoder().encode(String(str ?? ""));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// ====================================================================
// SUB PROCESS & CHUẨN HÓA NODE ĐỘC LẬP
// ====================================================================

const INFO_SKIP = ["剩余流量", "已用流量", "套餐总量", "距离下次重置", "套餐到期", "认准官网", "官网地址", "官网", "kitty.fo", "SKYLUMO", "如果现在只能看到", "立即更新教程", "群", "频道", "公告"];
const ISP_DROP_KEYWORDS = new Set(["CUCM", "CMCU", "CTCUCM", "CTCU"]);
function cleanLiangxinNode(rawName) {
  if (!rawName) return "Liangxin - VPNTrinhHg";
  try {
    let s = String(rawName).replace(/\s*-\s*VPNTrinhHg$/g, "").trim();
    s = s.replace(/🇨🇳台湾/g, "🇹🇼台湾");
    let parts = s.split("|").map(p => p.trim());
    let cleanParts = parts.filter(p => !ISP_DROP_KEYWORDS.has(p.toUpperCase()));
    s = cleanParts.length ? cleanParts.join("|") : s;
    return `${s} - VPNTrinhHg`;
  } catch (e) {
    const fallback = String(rawName).trim();
    return fallback.includes("VPNTrinhHg") ? fallback : `${fallback} - VPNTrinhHg`;
  }
}
function cleanDjjcNode(rawName) {
  if (!rawName) return "DJJC - VPNTrinhHg";
  try {
    let s = String(rawName).replace(/\s*-\s*VPNTrinhHg$/g, "").trim();
    s = s.replace(/(\d+(?:\.\d+)?)\s*倍率?/g, "$1x");
    s = s.replace(/(?<![\d.xX])(\d{1,2})(?:\s*号)?(?![\d.xX])/g, (_, num) => {
      return num.length === 2 ? num.padStart(3, "0") : num.padStart(2, "0");
    });
    return `${s} - VPNTrinhHg`;
  } catch (e) {
    const fallback = String(rawName).trim();
    return fallback.includes("VPNTrinhHg") ? fallback : `${fallback} - VPNTrinhHg`;
  }
}

const KITTY_COUNTRY_MAP = [["United States", "美国", "🇺🇸"], ["Malaysia", "马来西亚", "🇲🇾"], ["Singapore", "新加坡", "🇸🇬"], ["Japan", "日本", "🇯🇵"], ["Korea", "韩国", "🇰🇷"], ["Netherlands", "荷兰", "🇳🇱"], ["United Kingdom", "英国", "🇬🇧"], ["Hong Kong", "香港", "🇭🇰"], ["Hongkong", "香港", "🇭🇰"], ["Taiwan", "台湾", "🇹🇼"], ["Germany", "德国", "🇩🇪"]];

function cleanKittyNode(rawName) {
  if (!rawName) return "Kitty - VPNTrinhHg";
  try {
    let s = String(rawName).replace(/\s*-\s*VPNTrinhHg$/g, "").trim();
    for (const [eng, cn, defaultFlag] of KITTY_COUNTRY_MAP) {
      const re = new RegExp("(" + eng + ")\\s*(\\d+)", "i");
      const m = s.match(re);
      if (m) {
        const num = m[2];
        const flagMatch = s.match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/);
        const flag = flagMatch ? flagMatch[0] : defaultFlag;
        return `${flag} VIP ${cn} ${num} - VPNTrinhHg`;
      }
    }
    const fallback = String(rawName).trim();
    return fallback.includes("VPNTrinhHg") ? fallback : `${fallback} - VPNTrinhHg`;
  } catch (e) {
    const fallback = String(rawName).trim();
    return fallback.includes("VPNTrinhHg") ? fallback : `${fallback} - VPNTrinhHg`;
  }
}

function cleanUniversalNode(rawName) {
  if (!rawName) return "VPN - VPNTrinhHg";
  let s = String(rawName).replace(/\s*-\s*VPNTrinhHg$/g, "").trim();
  return `${s} - VPNTrinhHg`;
}
function formatNodeName(rawName, prov = "liangxin") {
  const p = String(prov).toLowerCase();
  if (p.includes("kitty") || p.includes("tohno-1.top") || p.includes("oosaka")) return cleanKittyNode(rawName);
  if (p === "true" || p.includes("liangxin")) return cleanLiangxinNode(rawName);
  if (p.includes("djjc")) return cleanDjjcNode(rawName);
  return cleanUniversalNode(rawName);
}

function processB64(rawB64, infoNames, vp, isLiangxin) {
  const decoded = decB64(rawB64);
  if (!decoded) return { newB64: rawB64, yamlStr: "", singboxStr: "" };

  const newB64Lines = infoNames.map(n => vp + encodeURIComponent(n));
  const proxies = [];
  const seenNames = {};

  if (decoded.trim().startsWith("{") && decoded.includes('"outbounds"')) {
    try {
      const sbData = JSON.parse(decoded);
      for (const ob of (sbData.outbounds || [])) {
        const oldName = ob.tag || "";
        if (!oldName || INFO_SKIP.some(k => oldName.includes(k))) continue;
        if (ob.server === "127.0.0.1" || ob.server === "1.1.1.1") continue;
        let newName = formatNodeName(oldName, isLiangxin);
        if (seenNames[newName]) {
          seenNames[newName]++;
          newName = `${newName} (${seenNames[newName]})`;
        } else {
          seenNames[newName] = 1;
        }

        const pType = ob.type;
        if (pType === "vless") {
          const tlsObj = ob.tls || {};
          const trObj = ob.transport || {};
          const roObj = tlsObj.reality || {};
          const px = {
            name: newName,
            type: "vless",
            server: ob.server,
            port: Number(ob.server_port) || 443,
            uuid: ob.uuid,
            udp: true
          };
          if (ob.flow) px.flow = ob.flow;
          if (tlsObj.utls && tlsObj.utls.fingerprint) px["client-fingerprint"] = tlsObj.utls.fingerprint;
          if (tlsObj.server_name) px.servername = tlsObj.server_name;
          let secType = "none";
          if (tlsObj.enabled) {
            px.tls = true;
            if (roObj.enabled || roObj.public_key) {
              secType = "reality";
              px["reality-opts"] = {
                "public-key": roObj.public_key || "",
                "short-id": roObj.short_id || ""
              };
            } else {
              secType = "tls";
            }
            if (tlsObj.insecure) px["skip-cert-verify"] = true;
          }
          if (trObj.type === "ws") {
            px.network = "ws";
            px["ws-opts"] = {
              path: trObj.path || "/",
              headers: {
                Host: (trObj.headers && trObj.headers.Host) || px.servername || px.server
              }
            };
          } else if (trObj.type === "grpc") {
            px.network = "grpc";
            px["grpc-opts"] = { "grpc-service-name": trObj.service_name || "" };
          }
          proxies.push(px);

          const params = [];
          if (trObj.type === "ws") {
            params.push("type=ws", `path=${encodeURIComponent(trObj.path || "/")}`);
            if (trObj.headers && trObj.headers.Host) params.push(`host=${encodeURIComponent(trObj.headers.Host)}`);
          } else if (trObj.type === "grpc") {
            params.push("type=grpc", `serviceName=${encodeURIComponent(trObj.service_name || "")}`);
          } else {
            params.push("type=tcp");
          }
          params.push(`security=${secType}`);
          if (secType === "reality") {
            if (roObj.public_key) params.push(`pbk=${roObj.public_key}`);
            if (roObj.short_id) params.push(`sid=${roObj.short_id}`);
            if (px.servername) params.push(`sni=${px.servername}`);
            if (px["client-fingerprint"]) params.push(`fp=${px["client-fingerprint"]}`);
          } else if (secType === "tls") {
            if (px.servername) params.push(`sni=${px.servername}`);
            if (px["client-fingerprint"]) params.push(`fp=${px["client-fingerprint"]}`);
            if (px["skip-cert-verify"]) params.push("insecure=1");
          }
          if (px.flow) params.push(`flow=${px.flow}`);
          newB64Lines.push(`vless://${px.uuid}@${px.server}:${px.port}?${params.join("&")}#${encodeURIComponent(newName)}`);
        } else if (pType === "hysteria2" || pType === "hy2") {
          const px = {
            name: newName,
            type: "hysteria2",
            server: ob.server,
            port: Number(ob.server_port) || 443,
            password: ob.password || "",
            udp: true,
            "skip-cert-verify": true
          };
          if (ob.tls && ob.tls.server_name) px.sni = ob.tls.server_name;
          const mport = ob.mport || ob.ports;
          if (mport) {
            px.mport = String(mport);
            px.ports = String(mport);
          }
          proxies.push(px);
          const sniP = px.sni ? `&sni=${px.sni}` : "";
          const mpP = px.mport ? `&mport=${px.mport}` : "";
          newB64Lines.push(`hysteria2://${px.password}@${px.server}:${px.port}?insecure=1${sniP}${mpP}#${encodeURIComponent(newName)}`);
        }
      }
    } catch (e) {}
  } else {
    const lines = decoded.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes("://"));
    for (const line of lines) {
      if (line.includes("127.0.0.1")) continue;
      const hi = line.lastIndexOf("#");
      let name = hi >= 0 ? safeDecode(line.slice(hi + 1)) : "";
      if (!name) name = "VPN Node";
      if (INFO_SKIP.some(k => name.includes(k))) continue;

      const base = hi >= 0 ? line.slice(0, hi) : line;
      let newName = formatNodeName(name, isLiangxin);
      if (seenNames[newName]) {
        seenNames[newName]++;
        newName = `${newName} (${seenNames[newName]})`;
      } else {
        seenNames[newName] = 1;
      }

      const newLine = base + "#" + encodeURIComponent(newName);
      newB64Lines.push(newLine);
      const proxy = parseURI(newLine);
      if (proxy && proxy.server && proxy.name) proxies.push(proxy);
    }
  }

  const newB64 = encB64(newB64Lines.join("\n"));
  const yamlStr = proxies.length ? buildYaml(proxies, infoNames, isLiangxin) : "";
  const singboxStr = proxies.length ? buildSingboxFull(proxies, infoNames, isLiangxin) : "";

  return { newB64, yamlStr, singboxStr };
}

// ====================================================================
// URI PARSER
// ====================================================================

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch { return value;
  }
}

function parseURI(line) {
  try {
    const hi = line.lastIndexOf("#");
    const name = hi >= 0 ? safeDecode(line.slice(hi + 1)) : "";
    const base = hi >= 0 ? line.slice(0, hi) : line;
    const u = new URL(base);
    const p = {};
    u.searchParams.forEach((v, k) => {
      p[k] = v;
    });
    const proto = u.protocol.replace(":", "").toLowerCase();

    if (proto === "hysteria2" || proto === "hy2") {
      const proxy = {
        name,
        type: "hysteria2",
        server: u.hostname,
        port: parseInt(u.port) || 443,
        password: safeDecode(u.username || ""),
        udp: true,
        "skip-cert-verify": true // Bắt buộc true để tránh lỗi TLS Handshake
      };
      if (p.sni) proxy.sni = p.sni;
      if (p.obfs) proxy.obfs = p.obfs;
      if (p["obfs-password"]) proxy["obfs-password"] = safeDecode(p["obfs-password"]);
      if (p.mport) proxy.mport = p.mport;
      return proxy;
    }

    if (proto === "vless") {
      const sec = (p.security || "none").toLowerCase();
      const net = (p.type || "tcp").toLowerCase();
      const proxy = {
        name,
        type: "vless",
        server: u.hostname,
        port: parseInt(u.port) || 443,
        uuid: safeDecode(u.username || ""),
        udp: true
      };

      proxy.tls = sec === "tls" || sec === "reality";
      if (p.insecure === "1") proxy["skip-cert-verify"] = true;
      if (p.flow) proxy.flow = p.flow;
      if (p.fp) proxy["client-fingerprint"] = p.fp;
      if (p.sni) proxy.servername = p.sni;

      if (sec === "reality") {
        const ro = {};
        if (p.pbk) ro["public-key"] = p.pbk;
        if (p.sid) ro["short-id"] = p.sid;
        if (Object.keys(ro).length) proxy["reality-opts"] = ro;
      }

      if (net === "ws") {
        proxy.network = "ws";
        proxy["ws-opts"] = {
          path: safeDecode(p.path || "/"),
          headers: { Host: p.host || u.hostname }
        };
      } else if (net === "grpc") {
        proxy.network = "grpc";
        proxy["grpc-opts"] = { "grpc-service-name": p.serviceName || "" };
      }
      return proxy;
    }

    if (proto === "trojan") {
      return {
        name,
        type: "trojan",
        server: u.hostname,
        port: parseInt(u.port) || 443,
        password: safeDecode(u.username || ""),
        udp: true,
        ...(p.sni ? { sni: p.sni } : {}),
        ...(p.allowInsecure === "1" ? { "skip-cert-verify": true } : {})
      };
    }
    if (proto === "anytls") {
      return {
        name,
        type: "anytls",
        server: u.hostname,
        port: parseInt(u.port) || 443,
        password: safeDecode(u.username || ""),
        udp: true,
        "skip-cert-verify": true,
        ...(p.sni ? { sni: p.sni } : {}),
        ...(p.fp ? { "client-fingerprint": p.fp } : {}),
        ...(p.alpn ? { alpn: p.alpn.split(",") } : {})
      };
    }
  } catch { return null;
  }
  return null;
}

// ====================================================================
// 3 BỘ DNS & RULES ĐỘC LẬP TƯỜNG MINH 100% (LIANGXIN, DJJC, COMBO)
// ====================================================================

const LIANGXIN_DNS_STR = `
dns:
  enable: true
  ipv6: false
  default-nameserver: [223.5.5.5, 119.29.29.29, 114.114.114.114]
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  use-hosts: true
  respect-rules: true
  proxy-server-nameserver: [223.5.5.5, 119.29.29.29, 114.114.114.114]
  nameserver: [223.5.5.5, 119.29.29.29, 114.114.114.114]
  fallback: [1.1.1.1, 8.8.8.8]
  fallback-filter:
    geoip: true
    geoip-code: CN
    geosite: [gfw]
    ipcidr: [240.0.0.0/4]
    domain: [+.google.com, +.facebook.com, +.youtube.com]
`.trim();

const DJJC_DNS_STR = `
dns:
  enable: true
  ipv6: false
  default-nameserver: [223.5.5.5, 119.29.29.29]
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  use-hosts: true
  respect-rules: false
  nameserver: ['https://doh.pub/dns-query', 'https://dns.alidns.com/dns-query']
  fallback: ['https://doh.dns.sb/dns-query', 'https://dns.cloudflare.com/dns-query', 'https://dns.twnic.tw/dns-query', 'tls://8.8.4.4:853']
  fallback-filter:
    geoip: true
    ipcidr: [240.0.0.0/4, 0.0.0.0/32]
`.trim();

const COMBO_DNS_STR = `
dns:
  enable: true
  ipv6: false
  default-nameserver: [223.5.5.5, 119.29.29.29, 114.114.114.114]
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  use-hosts: true
  respect-rules: true
  proxy-server-nameserver: [223.5.5.5, 119.29.29.29, 114.114.114.114]
  nameserver: [223.5.5.5, 119.29.29.29, 114.114.114.114, 'https://doh.pub/dns-query', 'https://dns.alidns.com/dns-query']
  fallback: [1.1.1.1, 8.8.8.8, 'https://doh.dns.sb/dns-query', 'https://dns.cloudflare.com/dns-query', 'https://dns.twnic.tw/dns-query', 'tls://8.8.4.4:853']
  fallback-filter:
    geoip: true
    geoip-code: CN
    geosite: [gfw]
    ipcidr: [240.0.0.0/4, 0.0.0.0/32]
    domain: [+.google.com, +.facebook.com, +.youtube.com]
`.trim();

const KITTY_DNS_STR = `
dns:
  enable: true
  prefer-h3: false
  ipv6: false
  ipv6-timeout: 100
  use-hosts: true
  use-system-hosts: false
  respect-rules: true
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  proxy-server-nameserver:
    - https://dns.alidns.com/dns-query
    - https://doh.pub/dns-query
    - 223.5.5.5
    - 119.29.29.29
  direct-nameserver:
    - https://doh.pub/dns-query
    - https://dns.alidns.com/dns-query
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - https://dns.cloudflare.com/dns-query
    - https://dns.google/dns-query
    - 1.1.1.1
    - 8.8.8.8
  fallback:
    - 1.1.1.1
    - 8.8.8.8
  fallback-filter:
    geoip: true
    geoip-code: "CN"
    ipcidr:
      - 240.0.0.0/4
    domain:
      - "+.google.com"
      - "+.facebook.com"
      - "+.youtube.com"
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "*.direct"
    - "*.localhost"
    - "time.*.com"
    - "ntp.*.com"
    - "time.*.gov"
    - "time.*.apple.com"
    - "time.windows.com"
    - "time.nist.gov"
    - "+.pool.ntp.org"
    - "*.msftconnecttest.com"
    - "*.msftncsi.com"
    - "localhost.ptlogin2.qq.com"
    - "*.cmpassport.com"
    - "*.mcdn.bilivideo.cn"
    - "*.battlenet.com.cn"
    - "+.wotgame.cn"
    - "+.wggames.cn"
    - "+.wowsgame.cn"
    - "id6.me"
    - "lens.l.google.com"
    - "captive.apple.com"
    - "connectivitycheck.gstatic.com"
  fake-ip-filter-mode: blacklist
  fake-ip-ttl: 1
  cache-algorithm: arc
  cache-max-size: 0
`.trim();

// ====================================================================
// 4 BỘ RULES CLASH/SINGBOX THÔ TÁCH RIÊNG TỪNG NGUỒN (KHỚP 100% GỐC)
// ====================================================================
const KITTY_RULES_RAW = `
DOMAIN,m1.tohno-1.top,DIRECT
DOMAIN-SUFFIX,tohno-1.top,DIRECT
DOMAIN-SUFFIX,oh-node.com,DIRECT
DOMAIN-SUFFIX,hoyoverse.com,DIRECT
DOMAIN-SUFFIX,setel.com,DIRECT
DOMAIN-SUFFIX,capcom.co.jp,DIRECT
DOMAIN-SUFFIX,bandainamcoent.co.jp,DIRECT
DOMAIN-SUFFIX,coway.com,DIRECT
DOMAIN-SUFFIX,philips.com,DIRECT
DOMAIN-SUFFIX,bp.com,DIRECT
DOMAIN-SUFFIX,siemens.com,DIRECT
DOMAIN-SUFFIX,asus.com,DIRECT
DOMAIN-SUFFIX,hsbc.com.hk,DIRECT
DOMAIN-SUFFIX,susercontent.com,DIRECT
IP-CIDR,127.0.0.0/8,DIRECT,no-resolve
IP-CIDR,10.0.0.0/8,DIRECT,no-resolve
IP-CIDR,172.16.0.0/12,DIRECT,no-resolve
IP-CIDR,192.168.0.0/16,DIRECT,no-resolve
IP-CIDR,100.64.0.0/10,DIRECT,no-resolve
IP-CIDR,169.254.0.0/16,DIRECT,no-resolve
IP-CIDR6,::1/128,DIRECT,no-resolve
IP-CIDR6,fc00::/7,DIRECT,no-resolve
IP-CIDR6,fe80::/10,DIRECT,no-resolve
DOMAIN-SUFFIX,trace.qq.com,REJECT
DOMAIN-SUFFIX,beacon.qq.com,REJECT
DOMAIN-SUFFIX,report.qq.com,REJECT
DOMAIN-SUFFIX,pingtas.qq.com,REJECT
DOMAIN-SUFFIX,pingtcss.qq.com,REJECT
DOMAIN-SUFFIX,stats.g.qq.com,REJECT
DOMAIN-SUFFIX,isdspeed.qq.com,REJECT
DOMAIN-SUFFIX,tp.linksgo.qq.com,REJECT
DOMAIN-SUFFIX,webpush.wx.qq.com,REJECT
DOMAIN-SUFFIX,mi.gdt.qq.com,REJECT
DOMAIN-SUFFIX,t.gdt.qq.com,REJECT
DOMAIN-SUFFIX,e.qq.com,REJECT
DOMAIN-SUFFIX,l.qq.com,REJECT
DOMAIN-SUFFIX,btrace.qq.com,REJECT
DOMAIN-SUFFIX,gdt.qq.com,REJECT
DOMAIN-SUFFIX,pgdt.gtimg.cn,REJECT
DOMAIN-SUFFIX,adsmind.gdtimg.com,REJECT
DOMAIN-KEYWORD,admarvel,REJECT
DOMAIN-KEYWORD,admaster,REJECT
DOMAIN-KEYWORD,adsage,REJECT
DOMAIN-KEYWORD,adwords,REJECT
DOMAIN-SUFFIX,doubleclick.net,REJECT
DOMAIN-SUFFIX,appsflyer.com,REJECT
DOMAIN-SUFFIX,openai.com,VPN Trinh Hg
DOMAIN-SUFFIX,chatgpt.com,VPN Trinh Hg
DOMAIN-SUFFIX,oaistatic.com,VPN Trinh Hg
DOMAIN-SUFFIX,oaiusercontent.com,VPN Trinh Hg
DOMAIN-SUFFIX,anthropic.com,VPN Trinh Hg
DOMAIN-SUFFIX,claude.ai,VPN Trinh Hg
DOMAIN-SUFFIX,ai.google.dev,VPN Trinh Hg
DOMAIN-SUFFIX,generativelanguage.googleapis.com,VPN Trinh Hg
DOMAIN-SUFFIX,midjourney.com,VPN Trinh Hg
DOMAIN-SUFFIX,poe.com,VPN Trinh Hg
DOMAIN-SUFFIX,cursor.sh,VPN Trinh Hg
DOMAIN-SUFFIX,cursor.com,VPN Trinh Hg
DOMAIN-SUFFIX,perplexity.ai,VPN Trinh Hg
DOMAIN-SUFFIX,sora.com,VPN Trinh Hg
DOMAIN-SUFFIX,v0.dev,VPN Trinh Hg
DOMAIN-SUFFIX,cohere.ai,VPN Trinh Hg
DOMAIN-SUFFIX,cohere.com,VPN Trinh Hg
DOMAIN-SUFFIX,deepseek.com,VPN Trinh Hg
DOMAIN,api.githubcopilot.com,VPN Trinh Hg
DOMAIN,api.jetbrains.ai,VPN Trinh Hg
DOMAIN-SUFFIX,tiktok.com,VPN Trinh Hg
DOMAIN-SUFFIX,tiktokcdn.com,VPN Trinh Hg
DOMAIN-SUFFIX,tiktokv.com,VPN Trinh Hg
DOMAIN-SUFFIX,byteoversea.com,VPN Trinh Hg
DOMAIN-SUFFIX,ibytedtos.com,VPN Trinh Hg
DOMAIN-SUFFIX,musical.ly,VPN Trinh Hg
DOMAIN-SUFFIX,snssdk.com,VPN Trinh Hg
DOMAIN-SUFFIX,google.com,VPN Trinh Hg
DOMAIN-SUFFIX,youtube.com,VPN Trinh Hg
DOMAIN-SUFFIX,googlevideo.com,VPN Trinh Hg
DOMAIN-SUFFIX,googleapis.com,VPN Trinh Hg
DOMAIN-SUFFIX,gstatic.com,VPN Trinh Hg
DOMAIN-SUFFIX,googleusercontent.com,VPN Trinh Hg
DOMAIN-SUFFIX,g.co,VPN Trinh Hg
DOMAIN-SUFFIX,gmail.com,VPN Trinh Hg
DOMAIN-SUFFIX,ggpht.com,VPN Trinh Hg
DOMAIN-SUFFIX,ytimg.com,VPN Trinh Hg
DOMAIN-SUFFIX,googleapis.cn,VPN Trinh Hg
DOMAIN-SUFFIX,google.cn,VPN Trinh Hg
DOMAIN-SUFFIX,xn--ngstr-lra8j.com,VPN Trinh Hg
DOMAIN-KEYWORD,facebook,VPN Trinh Hg
DOMAIN-SUFFIX,fb.me,VPN Trinh Hg
DOMAIN-SUFFIX,fbcdn.net,VPN Trinh Hg
DOMAIN-KEYWORD,twitter,VPN Trinh Hg
DOMAIN-KEYWORD,instagram,VPN Trinh Hg
DOMAIN-SUFFIX,twimg.com,VPN Trinh Hg
DOMAIN-KEYWORD,telegram,VPN Trinh Hg
DOMAIN-SUFFIX,t.me,VPN Trinh Hg
DOMAIN-SUFFIX,telegra.ph,VPN Trinh Hg
DOMAIN-SUFFIX,telegram.org,VPN Trinh Hg
IP-CIDR,91.108.4.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.56.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,149.154.160.0/20,VPN Trinh Hg,no-resolve
DOMAIN-SUFFIX,netflix.com,VPN Trinh Hg
DOMAIN-SUFFIX,netflix.net,VPN Trinh Hg
DOMAIN-SUFFIX,nflximg.net,VPN Trinh Hg
DOMAIN-SUFFIX,nflxvideo.net,VPN Trinh Hg
DOMAIN-SUFFIX,spotify.com,VPN Trinh Hg
DOMAIN-SUFFIX,cm.steampowered.com,DIRECT
DOMAIN-SUFFIX,steamcontent.com,DIRECT
DOMAIN-SUFFIX,steamstatic.com,DIRECT
DOMAIN-SUFFIX,steamchina.com,DIRECT
DOMAIN-SUFFIX,steamserver.net,DIRECT
DOMAIN-SUFFIX,apple.com,DIRECT
DOMAIN-SUFFIX,icloud.com,DIRECT
DOMAIN-SUFFIX,icloud-content.com,DIRECT
DOMAIN-SUFFIX,aaplimg.com,DIRECT
DOMAIN-SUFFIX,cdn-apple.com,DIRECT
DOMAIN-SUFFIX,mzstatic.com,DIRECT
DOMAIN-SUFFIX,apple-dns.net,DIRECT
DOMAIN-SUFFIX,microsoft.com,DIRECT
DOMAIN-SUFFIX,windows.com,DIRECT
DOMAIN-SUFFIX,windowsupdate.com,DIRECT
DOMAIN-SUFFIX,msedge.net,DIRECT
DOMAIN-SUFFIX,office.com,DIRECT
DOMAIN-SUFFIX,office365.com,DIRECT
DOMAIN-KEYWORD,officecdn,DIRECT
DOMAIN-SUFFIX,cn,DIRECT
DOMAIN-KEYWORD,-cn,DIRECT
DOMAIN-SUFFIX,126.com,DIRECT
DOMAIN-SUFFIX,163.com,DIRECT
DOMAIN-SUFFIX,baidu.com,DIRECT
DOMAIN-SUFFIX,bilibili.com,DIRECT
DOMAIN-SUFFIX,qq.com,DIRECT
DOMAIN-SUFFIX,taobao.com,DIRECT
DOMAIN-SUFFIX,weibo.com,DIRECT
DOMAIN-SUFFIX,zhihu.com,DIRECT
GEOIP,CN,DIRECT
MATCH,VPN Trinh Hg
`;

const LIANGXIN_RULES_RAW = `
IP-CIDR,1.1.1.1/32,VPN Trinh Hg,no-resolve
IP-CIDR,8.8.8.8/32,VPN Trinh Hg,no-resolve
DOMAIN-SUFFIX,services.googleapis.cn,VPN Trinh Hg
DOMAIN-SUFFIX,xn--ngstr-lra8j.com,VPN Trinh Hg
DOMAIN,safebrowsing.urlsec.qq.com,DIRECT
DOMAIN,safebrowsing.googleapis.com,DIRECT
DOMAIN,developer.apple.com,VPN Trinh Hg
DOMAIN-SUFFIX,digicert.com,VPN Trinh Hg
DOMAIN,ocsp.apple.com,VPN Trinh Hg
DOMAIN,ocsp.comodoca.com,VPN Trinh Hg
DOMAIN,ocsp.usertrust.com,VPN Trinh Hg
DOMAIN,ocsp.sectigo.com,VPN Trinh Hg
DOMAIN,ocsp.verisign.net,VPN Trinh Hg
DOMAIN-SUFFIX,apple-dns.net,VPN Trinh Hg
DOMAIN,testflight.apple.com,VPN Trinh Hg
DOMAIN,sandbox.itunes.apple.com,VPN Trinh Hg
DOMAIN,itunes.apple.com,VPN Trinh Hg
DOMAIN-SUFFIX,apps.apple.com,VPN Trinh Hg
DOMAIN-SUFFIX,blobstore.apple.com,VPN Trinh Hg
DOMAIN,cvws.icloud-content.com,VPN Trinh Hg
DOMAIN-SUFFIX,mzstatic.com,DIRECT
DOMAIN-SUFFIX,itunes.apple.com,DIRECT
DOMAIN-SUFFIX,icloud.com,DIRECT
DOMAIN-SUFFIX,icloud-content.com,DIRECT
DOMAIN-SUFFIX,me.com,DIRECT
DOMAIN-SUFFIX,aaplimg.com,DIRECT
DOMAIN-SUFFIX,cdn20.com,DIRECT
DOMAIN-SUFFIX,cdn-apple.com,DIRECT
DOMAIN-SUFFIX,akadns.net,DIRECT
DOMAIN-SUFFIX,akamaiedge.net,DIRECT
DOMAIN-SUFFIX,edgekey.net,DIRECT
DOMAIN-SUFFIX,mwcloudcdn.com,DIRECT
DOMAIN-SUFFIX,mwcname.com,DIRECT
DOMAIN-SUFFIX,apple.com,DIRECT
DOMAIN-SUFFIX,apple-cloudkit.com,DIRECT
DOMAIN-SUFFIX,apple-mapkit.com,DIRECT
DOMAIN,cn.bing.com,DIRECT
DOMAIN-SUFFIX,126.com,DIRECT
DOMAIN-SUFFIX,126.net,DIRECT
DOMAIN-SUFFIX,127.net,DIRECT
DOMAIN-SUFFIX,163.com,DIRECT
DOMAIN-SUFFIX,360buyimg.com,DIRECT
DOMAIN-SUFFIX,36kr.com,DIRECT
DOMAIN-SUFFIX,acfun.tv,DIRECT
DOMAIN-SUFFIX,air-matters.com,DIRECT
DOMAIN-SUFFIX,aixifan.com,DIRECT
DOMAIN-KEYWORD,alicdn,DIRECT
DOMAIN-KEYWORD,alipay,DIRECT
DOMAIN-KEYWORD,taobao,DIRECT
DOMAIN-SUFFIX,amap.com,DIRECT
DOMAIN-SUFFIX,autonavi.com,DIRECT
DOMAIN-KEYWORD,baidu,DIRECT
DOMAIN-SUFFIX,bdimg.com,DIRECT
DOMAIN-SUFFIX,bdstatic.com,DIRECT
DOMAIN-SUFFIX,bilibili.com,DIRECT
DOMAIN-SUFFIX,bilivideo.com,DIRECT
DOMAIN-SUFFIX,caiyunapp.com,DIRECT
DOMAIN-SUFFIX,clouddn.com,DIRECT
DOMAIN-SUFFIX,cnbeta.com,DIRECT
DOMAIN-SUFFIX,cnbetacdn.com,DIRECT
DOMAIN-SUFFIX,cootekservice.com,DIRECT
DOMAIN-SUFFIX,csdn.net,DIRECT
DOMAIN-SUFFIX,ctrip.com,DIRECT
DOMAIN-SUFFIX,dgtle.com,DIRECT
DOMAIN-SUFFIX,dianping.com,DIRECT
DOMAIN-SUFFIX,douban.com,DIRECT
DOMAIN-SUFFIX,doubanio.com,DIRECT
DOMAIN-SUFFIX,duokan.com,DIRECT
DOMAIN-SUFFIX,easou.com,DIRECT
DOMAIN-SUFFIX,ele.me,DIRECT
DOMAIN-SUFFIX,feng.com,DIRECT
DOMAIN-SUFFIX,fir.im,DIRECT
DOMAIN-SUFFIX,frdic.com,DIRECT
DOMAIN-SUFFIX,g-cores.com,DIRECT
DOMAIN-SUFFIX,godic.net,DIRECT
DOMAIN-SUFFIX,gtimg.com,DIRECT
DOMAIN,cdn.hockeyapp.net,DIRECT
DOMAIN-SUFFIX,hongxiu.com,DIRECT
DOMAIN-SUFFIX,hxcdn.net,DIRECT
DOMAIN-SUFFIX,iciba.com,DIRECT
DOMAIN-SUFFIX,ifeng.com,DIRECT
DOMAIN-SUFFIX,ifengimg.com,DIRECT
DOMAIN-SUFFIX,ipip.net,DIRECT
DOMAIN-SUFFIX,iqiyi.com,DIRECT
DOMAIN-SUFFIX,jd.com,DIRECT
DOMAIN-SUFFIX,jianshu.com,DIRECT
DOMAIN-SUFFIX,knewone.com,DIRECT
DOMAIN-SUFFIX,le.com,DIRECT
DOMAIN-SUFFIX,lecloud.com,DIRECT
DOMAIN-SUFFIX,lemicp.com,DIRECT
DOMAIN-SUFFIX,licdn.com,DIRECT
DOMAIN-SUFFIX,luoo.net,DIRECT
DOMAIN-SUFFIX,meituan.com,DIRECT
DOMAIN-SUFFIX,meituan.net,DIRECT
DOMAIN-SUFFIX,mi.com,DIRECT
DOMAIN-SUFFIX,miaopai.com,DIRECT
DOMAIN-SUFFIX,microsoft.com,DIRECT
DOMAIN-SUFFIX,microsoftonline.com,DIRECT
DOMAIN-SUFFIX,miui.com,DIRECT
DOMAIN-SUFFIX,miwifi.com,DIRECT
DOMAIN-SUFFIX,mob.com,DIRECT
DOMAIN-SUFFIX,netease.com,DIRECT
DOMAIN-SUFFIX,office.com,DIRECT
DOMAIN-SUFFIX,office365.com,DIRECT
DOMAIN-KEYWORD,officecdn,DIRECT
DOMAIN-SUFFIX,oschina.net,DIRECT
DOMAIN-SUFFIX,ppsimg.com,DIRECT
DOMAIN-SUFFIX,pstatp.com,DIRECT
DOMAIN-SUFFIX,qcloud.com,DIRECT
DOMAIN-SUFFIX,qdaily.com,DIRECT
DOMAIN-SUFFIX,qdmm.com,DIRECT
DOMAIN-SUFFIX,qhimg.com,DIRECT
DOMAIN-SUFFIX,qhres.com,DIRECT
DOMAIN-SUFFIX,qidian.com,DIRECT
DOMAIN-SUFFIX,qihucdn.com,DIRECT
DOMAIN-SUFFIX,qiniu.com,DIRECT
DOMAIN-SUFFIX,qiniucdn.com,DIRECT
DOMAIN-SUFFIX,qiyipic.com,DIRECT
DOMAIN-SUFFIX,qq.com,DIRECT
DOMAIN-SUFFIX,qqurl.com,DIRECT
DOMAIN-SUFFIX,rarbg.to,DIRECT
DOMAIN-SUFFIX,ruguoapp.com,DIRECT
DOMAIN-SUFFIX,segmentfault.com,DIRECT
DOMAIN-SUFFIX,sinaapp.com,DIRECT
DOMAIN-SUFFIX,smzdm.com,DIRECT
DOMAIN-SUFFIX,snapdrop.net,DIRECT
DOMAIN-SUFFIX,sogou.com,DIRECT
DOMAIN-SUFFIX,sogoucdn.com,DIRECT
DOMAIN-SUFFIX,sohu.com,DIRECT
DOMAIN-SUFFIX,soku.com,DIRECT
DOMAIN-SUFFIX,speedtest.net,DIRECT
DOMAIN-SUFFIX,sspai.com,DIRECT
DOMAIN-SUFFIX,suning.com,DIRECT
DOMAIN-SUFFIX,taobao.com,DIRECT
DOMAIN-SUFFIX,tencent.com,DIRECT
DOMAIN-SUFFIX,tenpay.com,DIRECT
DOMAIN-SUFFIX,tianyancha.com,DIRECT
DOMAIN-SUFFIX,tmall.com,DIRECT
DOMAIN-SUFFIX,tudou.com,DIRECT
DOMAIN-SUFFIX,umetrip.com,DIRECT
DOMAIN-SUFFIX,upaiyun.com,DIRECT
DOMAIN-SUFFIX,upyun.com,DIRECT
DOMAIN-SUFFIX,veryzhun.com,DIRECT
DOMAIN-SUFFIX,weather.com,DIRECT
DOMAIN-SUFFIX,weibo.com,DIRECT
DOMAIN-SUFFIX,xiami.com,DIRECT
DOMAIN-SUFFIX,xiami.net,DIRECT
DOMAIN-SUFFIX,xiaomicp.com,DIRECT
DOMAIN-SUFFIX,ximalaya.com,DIRECT
DOMAIN-SUFFIX,xmcdn.com,DIRECT
DOMAIN-SUFFIX,xunlei.com,DIRECT
DOMAIN-SUFFIX,yhd.com,DIRECT
DOMAIN-SUFFIX,yihaodianimg.com,DIRECT
DOMAIN-SUFFIX,yinxiang.com,DIRECT
DOMAIN-SUFFIX,ykimg.com,DIRECT
DOMAIN-SUFFIX,youdao.com,DIRECT
DOMAIN-SUFFIX,youku.com,DIRECT
DOMAIN-SUFFIX,zealer.com,DIRECT
DOMAIN-SUFFIX,zhihu.com,DIRECT
DOMAIN-SUFFIX,zhimg.com,DIRECT
DOMAIN-SUFFIX,zimuzu.tv,DIRECT
DOMAIN-SUFFIX,zoho.com,DIRECT
DOMAIN-KEYWORD,amazon,VPN Trinh Hg
DOMAIN-KEYWORD,google,VPN Trinh Hg
DOMAIN-KEYWORD,gmail,VPN Trinh Hg
DOMAIN-KEYWORD,youtube,VPN Trinh Hg
DOMAIN-KEYWORD,facebook,VPN Trinh Hg
DOMAIN-SUFFIX,fb.me,VPN Trinh Hg
DOMAIN-SUFFIX,fbcdn.net,VPN Trinh Hg
DOMAIN-KEYWORD,twitter,VPN Trinh Hg
DOMAIN-KEYWORD,instagram,VPN Trinh Hg
DOMAIN-KEYWORD,dropbox,VPN Trinh Hg
DOMAIN-SUFFIX,twimg.com,VPN Trinh Hg
DOMAIN-KEYWORD,blogspot,VPN Trinh Hg
DOMAIN-SUFFIX,youtu.be,VPN Trinh Hg
DOMAIN-KEYWORD,whatsapp,VPN Trinh Hg
DOMAIN-SUFFIX,telegra.ph,VPN Trinh Hg
DOMAIN-SUFFIX,telegram.org,VPN Trinh Hg
DOMAIN-KEYWORD,admarvel,REJECT
DOMAIN-KEYWORD,admaster,REJECT
DOMAIN-KEYWORD,adsage,REJECT
DOMAIN-KEYWORD,adsmogo,REJECT
DOMAIN-KEYWORD,adsrvmedia,REJECT
DOMAIN-KEYWORD,adwords,REJECT
DOMAIN-KEYWORD,adservice,REJECT
DOMAIN-SUFFIX,appsflyer.com,REJECT
DOMAIN-KEYWORD,domob,REJECT
DOMAIN-SUFFIX,doubleclick.net,REJECT
DOMAIN-KEYWORD,duomeng,REJECT
DOMAIN-KEYWORD,dwtrack,REJECT
DOMAIN-KEYWORD,guanggao,REJECT
DOMAIN-KEYWORD,lianmeng,REJECT
DOMAIN-SUFFIX,mmstat.com,REJECT
DOMAIN-KEYWORD,mopub,REJECT
DOMAIN-KEYWORD,omgmta,REJECT
DOMAIN-KEYWORD,openx,REJECT
DOMAIN-KEYWORD,partnerad,REJECT
DOMAIN-KEYWORD,pingfore,REJECT
DOMAIN-KEYWORD,supersonicads,REJECT
DOMAIN-KEYWORD,uedas,REJECT
DOMAIN-KEYWORD,umeng,REJECT
DOMAIN-KEYWORD,usage,REJECT
DOMAIN-SUFFIX,vungle.com,REJECT
DOMAIN-KEYWORD,wlmonitor,REJECT
DOMAIN-KEYWORD,zjtoolbar,REJECT
DOMAIN-SUFFIX,9to5mac.com,VPN Trinh Hg
DOMAIN-SUFFIX,abpchina.org,VPN Trinh Hg
DOMAIN-SUFFIX,adblockplus.org,VPN Trinh Hg
DOMAIN-SUFFIX,adobe.com,VPN Trinh Hg
DOMAIN-SUFFIX,akamaized.net,VPN Trinh Hg
DOMAIN-SUFFIX,android.com,VPN Trinh Hg
DOMAIN-SUFFIX,appspot.com,VPN Trinh Hg
DOMAIN-SUFFIX,archive.org,VPN Trinh Hg
DOMAIN-SUFFIX,awsstatic.com,VPN Trinh Hg
DOMAIN-SUFFIX,azureedge.net,VPN Trinh Hg
DOMAIN-SUFFIX,azurewebsites.net,VPN Trinh Hg
DOMAIN-SUFFIX,bing.com,VPN Trinh Hg
DOMAIN-SUFFIX,bit.ly,VPN Trinh Hg
DOMAIN-SUFFIX,bitbucket.org,VPN Trinh Hg
DOMAIN-SUFFIX,blogger.com,VPN Trinh Hg
DOMAIN-SUFFIX,blogspot.com,VPN Trinh Hg
DOMAIN-SUFFIX,bloomberg.com,VPN Trinh Hg
DOMAIN-SUFFIX,box.com,VPN Trinh Hg
DOMAIN-SUFFIX,cachefly.net,VPN Trinh Hg
DOMAIN-SUFFIX,chromium.org,VPN Trinh Hg
DOMAIN-SUFFIX,cloudflare.com,VPN Trinh Hg
DOMAIN-SUFFIX,cloudfront.net,VPN Trinh Hg
DOMAIN-SUFFIX,docker.com,VPN Trinh Hg
DOMAIN-SUFFIX,dribbble.com,VPN Trinh Hg
DOMAIN-SUFFIX,duckduckgo.com,VPN Trinh Hg
DOMAIN-SUFFIX,evernote.com,VPN Trinh Hg
DOMAIN-SUFFIX,fast.com,VPN Trinh Hg
DOMAIN-SUFFIX,fastly.net,VPN Trinh Hg
DOMAIN-SUFFIX,feedly.com,VPN Trinh Hg
DOMAIN-SUFFIX,firebaseio.com,VPN Trinh Hg
DOMAIN-SUFFIX,flickr.com,VPN Trinh Hg
DOMAIN-SUFFIX,g.co,VPN Trinh Hg
DOMAIN-SUFFIX,ggpht.com,VPN Trinh Hg
DOMAIN-SUFFIX,git.io,VPN Trinh Hg
DOMAIN-KEYWORD,github,VPN Trinh Hg
DOMAIN-SUFFIX,golang.org,VPN Trinh Hg
DOMAIN-SUFFIX,goo.gl,VPN Trinh Hg
DOMAIN-SUFFIX,goodreads.com,VPN Trinh Hg
DOMAIN-SUFFIX,gravatar.com,VPN Trinh Hg
DOMAIN-SUFFIX,gstatic.com,VPN Trinh Hg
DOMAIN-SUFFIX,hotmail.com,VPN Trinh Hg
DOMAIN-SUFFIX,imgur.com,VPN Trinh Hg
DOMAIN-SUFFIX,instapaper.com,VPN Trinh Hg
DOMAIN-SUFFIX,linkedin.com,VPN Trinh Hg
DOMAIN-SUFFIX,live.com,VPN Trinh Hg
DOMAIN-SUFFIX,live.net,VPN Trinh Hg
DOMAIN-SUFFIX,medium.com,VPN Trinh Hg
DOMAIN-SUFFIX,mega.nz,VPN Trinh Hg
DOMAIN-SUFFIX,microsofttranslator.com,VPN Trinh Hg
DOMAIN-SUFFIX,msedge.net,VPN Trinh Hg
DOMAIN-SUFFIX,onedrive.com,VPN Trinh Hg
DOMAIN-SUFFIX,onenote.com,VPN Trinh Hg
DOMAIN-SUFFIX,openvpn.net,VPN Trinh Hg
DOMAIN-SUFFIX,outlook.com,VPN Trinh Hg
DOMAIN-SUFFIX,pinterest.com,VPN Trinh Hg
DOMAIN-SUFFIX,pixiv.net,VPN Trinh Hg
DOMAIN-SUFFIX,playstation.com,VPN Trinh Hg
DOMAIN-SUFFIX,playstation.net,VPN Trinh Hg
DOMAIN-SUFFIX,shadowsocks.org,VPN Trinh Hg
DOMAIN-SUFFIX,skype.com,VPN Trinh Hg
DOMAIN-SUFFIX,soundcloud.com,VPN Trinh Hg
DOMAIN-SUFFIX,sourceforge.net,VPN Trinh Hg
DOMAIN-SUFFIX,spotify.com,VPN Trinh Hg
DOMAIN-SUFFIX,stackoverflow.com,VPN Trinh Hg
DOMAIN-SUFFIX,steamcommunity.com,VPN Trinh Hg
DOMAIN-SUFFIX,techcrunch.com,VPN Trinh Hg
DOMAIN-SUFFIX,theverge.com,VPN Trinh Hg
DOMAIN-SUFFIX,todoist.com,VPN Trinh Hg
DOMAIN-SUFFIX,trello.com,VPN Trinh Hg
DOMAIN-SUFFIX,tumblr.com,VPN Trinh Hg
DOMAIN-SUFFIX,twitch.tv,VPN Trinh Hg
DOMAIN-SUFFIX,v2ex.com,VPN Trinh Hg
DOMAIN-SUFFIX,vimeo.com,VPN Trinh Hg
DOMAIN-SUFFIX,vultr.com,VPN Trinh Hg
DOMAIN-SUFFIX,w.org,VPN Trinh Hg
DOMAIN-SUFFIX,wikipedia.org,VPN Trinh Hg
DOMAIN-SUFFIX,windows.com,VPN Trinh Hg
DOMAIN-SUFFIX,windows.net,VPN Trinh Hg
DOMAIN-SUFFIX,wordpress.com,VPN Trinh Hg
DOMAIN-SUFFIX,wsj.com,VPN Trinh Hg
DOMAIN-SUFFIX,yahoo.com,VPN Trinh Hg
DOMAIN-SUFFIX,ytimg.com,VPN Trinh Hg
IP-CIDR,91.108.4.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.8.0/21,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.16.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.56.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,149.154.160.0/20,VPN Trinh Hg,no-resolve
IP-CIDR6,2001:67c:4e8::/48,VPN Trinh Hg,no-resolve
IP-CIDR6,2001:b28:f23d::/48,VPN Trinh Hg,no-resolve
IP-CIDR6,2001:b28:f23f::/48,VPN Trinh Hg,no-resolve
DOMAIN,injections.adguard.org,DIRECT
DOMAIN,local.adguard.org,DIRECT
DOMAIN-SUFFIX,local,DIRECT
IP-CIDR,127.0.0.0/8,DIRECT
IP-CIDR,172.16.0.0/12,DIRECT
IP-CIDR,192.168.0.0/16,DIRECT
IP-CIDR,10.0.0.0/8,DIRECT
IP-CIDR,100.64.0.0/10,DIRECT
IP-CIDR,224.0.0.0/4,DIRECT
IP-CIDR6,fe80::/10,DIRECT
DOMAIN-SUFFIX,cn,DIRECT
DOMAIN-KEYWORD,-cn,DIRECT
GEOIP,CN,DIRECT
MATCH,VPN Trinh Hg
`;

const DJJC_RULES_RAW = `
DOMAIN-SUFFIX,services.googleapis.cn,VPN Trinh Hg
DOMAIN-SUFFIX,xn--ngstr-lra8j.com,VPN Trinh Hg
DOMAIN,safebrowsing.urlsec.qq.com,DIRECT
DOMAIN,safebrowsing.googleapis.com,DIRECT
DOMAIN,developer.apple.com,VPN Trinh Hg
DOMAIN-SUFFIX,digicert.com,VPN Trinh Hg
DOMAIN,ocsp.apple.com,VPN Trinh Hg
DOMAIN,ocsp.comodoca.com,VPN Trinh Hg
DOMAIN,ocsp.usertrust.com,VPN Trinh Hg
DOMAIN,ocsp.sectigo.com,VPN Trinh Hg
DOMAIN,ocsp.verisign.net,VPN Trinh Hg
DOMAIN-SUFFIX,apple-dns.net,VPN Trinh Hg
DOMAIN,testflight.apple.com,VPN Trinh Hg
DOMAIN,sandbox.itunes.apple.com,VPN Trinh Hg
DOMAIN,itunes.apple.com,VPN Trinh Hg
DOMAIN-SUFFIX,apps.apple.com,VPN Trinh Hg
DOMAIN-SUFFIX,blobstore.apple.com,VPN Trinh Hg
DOMAIN,cvws.icloud-content.com,VPN Trinh Hg
DOMAIN-SUFFIX,mzstatic.com,DIRECT
DOMAIN-SUFFIX,itunes.apple.com,DIRECT
DOMAIN-SUFFIX,icloud.com,DIRECT
DOMAIN-SUFFIX,icloud-content.com,DIRECT
DOMAIN-SUFFIX,me.com,DIRECT
DOMAIN-SUFFIX,aaplimg.com,DIRECT
DOMAIN-SUFFIX,cdn20.com,DIRECT
DOMAIN-SUFFIX,cdn-apple.com,DIRECT
DOMAIN-SUFFIX,akadns.net,DIRECT
DOMAIN-SUFFIX,akamaiedge.net,DIRECT
DOMAIN-SUFFIX,edgekey.net,DIRECT
DOMAIN-SUFFIX,mwcloudcdn.com,DIRECT
DOMAIN-SUFFIX,mwcname.com,DIRECT
DOMAIN-SUFFIX,apple.com,DIRECT
DOMAIN-SUFFIX,apple-cloudkit.com,DIRECT
DOMAIN-SUFFIX,apple-mapkit.com,DIRECT
DOMAIN-SUFFIX,126.com,DIRECT
DOMAIN-SUFFIX,126.net,DIRECT
DOMAIN-SUFFIX,127.net,DIRECT
DOMAIN-SUFFIX,163.com,DIRECT
DOMAIN-SUFFIX,360buyimg.com,DIRECT
DOMAIN-SUFFIX,36kr.com,DIRECT
DOMAIN-SUFFIX,acfun.tv,DIRECT
DOMAIN-SUFFIX,air-matters.com,DIRECT
DOMAIN-SUFFIX,aixifan.com,DIRECT
DOMAIN-KEYWORD,alicdn,DIRECT
DOMAIN-KEYWORD,alipay,DIRECT
DOMAIN-KEYWORD,taobao,DIRECT
DOMAIN-SUFFIX,amap.com,DIRECT
DOMAIN-SUFFIX,autonavi.com,DIRECT
DOMAIN-KEYWORD,baidu,DIRECT
DOMAIN-SUFFIX,bdimg.com,DIRECT
DOMAIN-SUFFIX,bdstatic.com,DIRECT
DOMAIN-SUFFIX,bilibili.com,DIRECT
DOMAIN-SUFFIX,bilivideo.com,DIRECT
DOMAIN-SUFFIX,caiyunapp.com,DIRECT
DOMAIN-SUFFIX,clouddn.com,DIRECT
DOMAIN-SUFFIX,cnbeta.com,DIRECT
DOMAIN-SUFFIX,cnbetacdn.com,DIRECT
DOMAIN-SUFFIX,cootekservice.com,DIRECT
DOMAIN-SUFFIX,csdn.net,DIRECT
DOMAIN-SUFFIX,ctrip.com,DIRECT
DOMAIN-SUFFIX,dgtle.com,DIRECT
DOMAIN-SUFFIX,dianping.com,DIRECT
DOMAIN-SUFFIX,douban.com,DIRECT
DOMAIN-SUFFIX,doubanio.com,DIRECT
DOMAIN-SUFFIX,duokan.com,DIRECT
DOMAIN-SUFFIX,easou.com,DIRECT
DOMAIN-SUFFIX,ele.me,DIRECT
DOMAIN-SUFFIX,feng.com,DIRECT
DOMAIN-SUFFIX,fir.im,DIRECT
DOMAIN-SUFFIX,frdic.com,DIRECT
DOMAIN-SUFFIX,g-cores.com,DIRECT
DOMAIN-SUFFIX,godic.net,DIRECT
DOMAIN-SUFFIX,gtimg.com,DIRECT
DOMAIN,cdn.hockeyapp.net,DIRECT
DOMAIN-SUFFIX,hongxiu.com,DIRECT
DOMAIN-SUFFIX,hxcdn.net,DIRECT
DOMAIN-SUFFIX,iciba.com,DIRECT
DOMAIN-SUFFIX,ifeng.com,DIRECT
DOMAIN-SUFFIX,ifengimg.com,DIRECT
DOMAIN-SUFFIX,ipip.net,DIRECT
DOMAIN-SUFFIX,iqiyi.com,DIRECT
DOMAIN-SUFFIX,jd.com,DIRECT
DOMAIN-SUFFIX,jianshu.com,DIRECT
DOMAIN-SUFFIX,knewone.com,DIRECT
DOMAIN-SUFFIX,le.com,DIRECT
DOMAIN-SUFFIX,lecloud.com,DIRECT
DOMAIN-SUFFIX,lemicp.com,DIRECT
DOMAIN-SUFFIX,licdn.com,DIRECT
DOMAIN-SUFFIX,luoo.net,DIRECT
DOMAIN-SUFFIX,meituan.com,DIRECT
DOMAIN-SUFFIX,meituan.net,DIRECT
DOMAIN-SUFFIX,mi.com,DIRECT
DOMAIN-SUFFIX,miaopai.com,DIRECT
DOMAIN-SUFFIX,microsoft.com,DIRECT
DOMAIN-SUFFIX,microsoftonline.com,DIRECT
DOMAIN-SUFFIX,miui.com,DIRECT
DOMAIN-SUFFIX,miwifi.com,DIRECT
DOMAIN-SUFFIX,mob.com,DIRECT
DOMAIN-SUFFIX,netease.com,DIRECT
DOMAIN-SUFFIX,office.com,DIRECT
DOMAIN-SUFFIX,office365.com,DIRECT
DOMAIN-KEYWORD,officecdn,DIRECT
DOMAIN-SUFFIX,oschina.net,DIRECT
DOMAIN-SUFFIX,ppsimg.com,DIRECT
DOMAIN-SUFFIX,pstatp.com,DIRECT
DOMAIN-SUFFIX,qcloud.com,DIRECT
DOMAIN-SUFFIX,qdaily.com,DIRECT
DOMAIN-SUFFIX,qdmm.com,DIRECT
DOMAIN-SUFFIX,qhimg.com,DIRECT
DOMAIN-SUFFIX,qhres.com,DIRECT
DOMAIN-SUFFIX,qidian.com,DIRECT
DOMAIN-SUFFIX,qihucdn.com,DIRECT
DOMAIN-SUFFIX,qiniu.com,DIRECT
DOMAIN-SUFFIX,qiniucdn.com,DIRECT
DOMAIN-SUFFIX,qiyipic.com,DIRECT
DOMAIN-SUFFIX,qq.com,DIRECT
DOMAIN-SUFFIX,qqurl.com,DIRECT
DOMAIN-SUFFIX,rarbg.to,DIRECT
DOMAIN-SUFFIX,ruguoapp.com,DIRECT
DOMAIN-SUFFIX,segmentfault.com,DIRECT
DOMAIN-SUFFIX,sinaapp.com,DIRECT
DOMAIN-SUFFIX,smzdm.com,DIRECT
DOMAIN-SUFFIX,snapdrop.net,DIRECT
DOMAIN-SUFFIX,sogou.com,DIRECT
DOMAIN-SUFFIX,sogoucdn.com,DIRECT
DOMAIN-SUFFIX,sohu.com,DIRECT
DOMAIN-SUFFIX,soku.com,DIRECT
DOMAIN-SUFFIX,speedtest.net,DIRECT
DOMAIN-SUFFIX,sspai.com,DIRECT
DOMAIN-SUFFIX,suning.com,DIRECT
DOMAIN-SUFFIX,taobao.com,DIRECT
DOMAIN-SUFFIX,tencent.com,DIRECT
DOMAIN-SUFFIX,tenpay.com,DIRECT
DOMAIN-SUFFIX,tianyancha.com,DIRECT
DOMAIN-SUFFIX,tmall.com,DIRECT
DOMAIN-SUFFIX,tudou.com,DIRECT
DOMAIN-SUFFIX,umetrip.com,DIRECT
DOMAIN-SUFFIX,upaiyun.com,DIRECT
DOMAIN-SUFFIX,upyun.com,DIRECT
DOMAIN-SUFFIX,veryzhun.com,DIRECT
DOMAIN-SUFFIX,weather.com,DIRECT
DOMAIN-SUFFIX,weibo.com,DIRECT
DOMAIN-SUFFIX,xiami.com,DIRECT
DOMAIN-SUFFIX,xiami.net,DIRECT
DOMAIN-SUFFIX,xiaomicp.com,DIRECT
DOMAIN-SUFFIX,ximalaya.com,DIRECT
DOMAIN-SUFFIX,xmcdn.com,DIRECT
DOMAIN-SUFFIX,xunlei.com,DIRECT
DOMAIN-SUFFIX,yhd.com,DIRECT
DOMAIN-SUFFIX,yihaodianimg.com,DIRECT
DOMAIN-SUFFIX,yinxiang.com,DIRECT
DOMAIN-SUFFIX,ykimg.com,DIRECT
DOMAIN-SUFFIX,youdao.com,DIRECT
DOMAIN-SUFFIX,youku.com,DIRECT
DOMAIN-SUFFIX,zealer.com,DIRECT
DOMAIN-SUFFIX,zhihu.com,DIRECT
DOMAIN-SUFFIX,zhimg.com,DIRECT
DOMAIN-SUFFIX,zimuzu.tv,DIRECT
DOMAIN-SUFFIX,zoho.com,DIRECT
DOMAIN-KEYWORD,amazon,VPN Trinh Hg
DOMAIN-KEYWORD,google,VPN Trinh Hg
DOMAIN-KEYWORD,gmail,VPN Trinh Hg
DOMAIN-KEYWORD,youtube,VPN Trinh Hg
DOMAIN-KEYWORD,facebook,VPN Trinh Hg
DOMAIN-SUFFIX,fb.me,VPN Trinh Hg
DOMAIN-SUFFIX,fbcdn.net,VPN Trinh Hg
DOMAIN-KEYWORD,twitter,VPN Trinh Hg
DOMAIN-KEYWORD,instagram,VPN Trinh Hg
DOMAIN-KEYWORD,dropbox,VPN Trinh Hg
DOMAIN-SUFFIX,twimg.com,VPN Trinh Hg
DOMAIN-KEYWORD,blogspot,VPN Trinh Hg
DOMAIN-SUFFIX,youtu.be,VPN Trinh Hg
DOMAIN-KEYWORD,whatsapp,VPN Trinh Hg
DOMAIN-SUFFIX,telegra.ph,VPN Trinh Hg
DOMAIN-SUFFIX,telegram.org,VPN Trinh Hg
DOMAIN-KEYWORD,admarvel,REJECT
DOMAIN-KEYWORD,admaster,REJECT
DOMAIN-KEYWORD,adsage,REJECT
DOMAIN-KEYWORD,adsmogo,REJECT
DOMAIN-KEYWORD,adsrvmedia,REJECT
DOMAIN-KEYWORD,adwords,REJECT
DOMAIN-KEYWORD,adservice,REJECT
DOMAIN-SUFFIX,appsflyer.com,REJECT
DOMAIN-KEYWORD,domob,REJECT
DOMAIN-SUFFIX,doubleclick.net,REJECT
DOMAIN-KEYWORD,duomeng,REJECT
DOMAIN-KEYWORD,dwtrack,REJECT
DOMAIN-KEYWORD,guanggao,REJECT
DOMAIN-KEYWORD,lianmeng,REJECT
DOMAIN-SUFFIX,mmstat.com,REJECT
DOMAIN-KEYWORD,mopub,REJECT
DOMAIN-KEYWORD,omgmta,REJECT
DOMAIN-KEYWORD,openx,REJECT
DOMAIN-KEYWORD,partnerad,REJECT
DOMAIN-KEYWORD,pingfore,REJECT
DOMAIN-KEYWORD,supersonicads,REJECT
DOMAIN-KEYWORD,uedas,REJECT
DOMAIN-KEYWORD,umeng,REJECT
DOMAIN-KEYWORD,usage,REJECT
DOMAIN-SUFFIX,vungle.com,REJECT
DOMAIN-KEYWORD,wlmonitor,REJECT
DOMAIN-KEYWORD,zjtoolbar,REJECT
DOMAIN-SUFFIX,9to5mac.com,VPN Trinh Hg
DOMAIN-SUFFIX,abpchina.org,VPN Trinh Hg
DOMAIN-SUFFIX,adblockplus.org,VPN Trinh Hg
DOMAIN-SUFFIX,adobe.com,VPN Trinh Hg
DOMAIN-SUFFIX,akamaized.net,VPN Trinh Hg
DOMAIN-SUFFIX,android.com,VPN Trinh Hg
DOMAIN-SUFFIX,appspot.com,VPN Trinh Hg
DOMAIN-SUFFIX,archive.org,VPN Trinh Hg
DOMAIN-SUFFIX,awsstatic.com,VPN Trinh Hg
DOMAIN-SUFFIX,azureedge.net,VPN Trinh Hg
DOMAIN-SUFFIX,azurewebsites.net,VPN Trinh Hg
DOMAIN-SUFFIX,bing.com,VPN Trinh Hg
DOMAIN-SUFFIX,bit.ly,VPN Trinh Hg
DOMAIN-SUFFIX,bitbucket.org,VPN Trinh Hg
DOMAIN-SUFFIX,blogger.com,VPN Trinh Hg
DOMAIN-SUFFIX,blogspot.com,VPN Trinh Hg
DOMAIN-SUFFIX,bloomberg.com,VPN Trinh Hg
DOMAIN-SUFFIX,box.com,VPN Trinh Hg
DOMAIN-SUFFIX,cachefly.net,VPN Trinh Hg
DOMAIN-SUFFIX,chromium.org,VPN Trinh Hg
DOMAIN-SUFFIX,cloudflare.com,VPN Trinh Hg
DOMAIN-SUFFIX,cloudfront.net,VPN Trinh Hg
DOMAIN-SUFFIX,docker.com,VPN Trinh Hg
DOMAIN-SUFFIX,dribbble.com,VPN Trinh Hg
DOMAIN-SUFFIX,duckduckgo.com,VPN Trinh Hg
DOMAIN-SUFFIX,evernote.com,VPN Trinh Hg
DOMAIN-SUFFIX,fast.com,VPN Trinh Hg
DOMAIN-SUFFIX,fastly.net,VPN Trinh Hg
DOMAIN-SUFFIX,feedly.com,VPN Trinh Hg
DOMAIN-SUFFIX,firebaseio.com,VPN Trinh Hg
DOMAIN-SUFFIX,flickr.com,VPN Trinh Hg
DOMAIN-SUFFIX,g.co,VPN Trinh Hg
DOMAIN-SUFFIX,ggpht.com,VPN Trinh Hg
DOMAIN-SUFFIX,git.io,VPN Trinh Hg
DOMAIN-KEYWORD,github,VPN Trinh Hg
DOMAIN-SUFFIX,golang.org,VPN Trinh Hg
DOMAIN-SUFFIX,goo.gl,VPN Trinh Hg
DOMAIN-SUFFIX,goodreads.com,VPN Trinh Hg
DOMAIN-SUFFIX,gravatar.com,VPN Trinh Hg
DOMAIN-SUFFIX,gstatic.com,VPN Trinh Hg
DOMAIN-SUFFIX,hotmail.com,VPN Trinh Hg
DOMAIN-SUFFIX,imgur.com,VPN Trinh Hg
DOMAIN-SUFFIX,instapaper.com,VPN Trinh Hg
DOMAIN-SUFFIX,linkedin.com,VPN Trinh Hg
DOMAIN-SUFFIX,live.com,VPN Trinh Hg
DOMAIN-SUFFIX,live.net,VPN Trinh Hg
DOMAIN-SUFFIX,medium.com,VPN Trinh Hg
DOMAIN-SUFFIX,mega.nz,VPN Trinh Hg
DOMAIN-SUFFIX,microsofttranslator.com,VPN Trinh Hg
DOMAIN-SUFFIX,msedge.net,VPN Trinh Hg
DOMAIN-SUFFIX,onedrive.com,VPN Trinh Hg
DOMAIN-SUFFIX,onenote.com,VPN Trinh Hg
DOMAIN-SUFFIX,openvpn.net,VPN Trinh Hg
DOMAIN-SUFFIX,outlook.com,VPN Trinh Hg
DOMAIN-SUFFIX,pinterest.com,VPN Trinh Hg
DOMAIN-SUFFIX,pixiv.net,VPN Trinh Hg
DOMAIN-SUFFIX,playstation.com,VPN Trinh Hg
DOMAIN-SUFFIX,playstation.net,VPN Trinh Hg
DOMAIN-SUFFIX,shadowsocks.org,VPN Trinh Hg
DOMAIN-SUFFIX,skype.com,VPN Trinh Hg
DOMAIN-SUFFIX,soundcloud.com,VPN Trinh Hg
DOMAIN-SUFFIX,sourceforge.net,VPN Trinh Hg
DOMAIN-SUFFIX,spotify.com,VPN Trinh Hg
DOMAIN-SUFFIX,stackoverflow.com,VPN Trinh Hg
DOMAIN-SUFFIX,steamcommunity.com,VPN Trinh Hg
DOMAIN-SUFFIX,techcrunch.com,VPN Trinh Hg
DOMAIN-SUFFIX,theverge.com,VPN Trinh Hg
DOMAIN-SUFFIX,todoist.com,VPN Trinh Hg
DOMAIN-SUFFIX,trello.com,VPN Trinh Hg
DOMAIN-SUFFIX,tumblr.com,VPN Trinh Hg
DOMAIN-SUFFIX,twitch.tv,VPN Trinh Hg
DOMAIN-SUFFIX,v2ex.com,VPN Trinh Hg
DOMAIN-SUFFIX,vimeo.com,VPN Trinh Hg
DOMAIN-SUFFIX,vultr.com,VPN Trinh Hg
DOMAIN-SUFFIX,w.org,VPN Trinh Hg
DOMAIN-SUFFIX,wikipedia.org,VPN Trinh Hg
DOMAIN-SUFFIX,windows.com,VPN Trinh Hg
DOMAIN-SUFFIX,windows.net,VPN Trinh Hg
DOMAIN-SUFFIX,wordpress.com,VPN Trinh Hg
DOMAIN-SUFFIX,wsj.com,VPN Trinh Hg
DOMAIN-SUFFIX,yahoo.com,VPN Trinh Hg
DOMAIN-SUFFIX,ytimg.com,VPN Trinh Hg
IP-CIDR,91.108.4.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.8.0/21,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.16.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,91.108.56.0/22,VPN Trinh Hg,no-resolve
IP-CIDR,149.154.160.0/20,VPN Trinh Hg,no-resolve
IP-CIDR6,2001:67c:4e8::/48,VPN Trinh Hg,no-resolve
IP-CIDR6,2001:b28:f23d::/48,VPN Trinh Hg,no-resolve
IP-CIDR6,2001:b28:f23f::/48,VPN Trinh Hg,no-resolve
DOMAIN,injections.adguard.org,DIRECT
DOMAIN,local.adguard.org,DIRECT
DOMAIN-SUFFIX,local,DIRECT
IP-CIDR,127.0.0.0/8,DIRECT
IP-CIDR,172.16.0.0/12,DIRECT
IP-CIDR,192.168.0.0/16,DIRECT
IP-CIDR,10.0.0.0/8,DIRECT
IP-CIDR,100.64.0.0/10,DIRECT
IP-CIDR,224.0.0.0/4,DIRECT
IP-CIDR6,fe80::/10,DIRECT
DOMAIN-SUFFIX,cn,DIRECT
DOMAIN-KEYWORD,-cn,DIRECT
GEOIP,CN,DIRECT
MATCH,VPN Trinh Hg
`;

const parseRules = (raw) => raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
const KITTY_RULES = parseRules(KITTY_RULES_RAW);
const LIANGXIN_RULES = parseRules(LIANGXIN_RULES_RAW);
const DJJC_RULES = parseRules(DJJC_RULES_RAW);
const COMBO_RULES = Array.from(new Set([...LIANGXIN_RULES, ...DJJC_RULES]));

function proxyToInline(p) {
  const out = {
    name: p.name,
    type: p.type,
    server: p.server,
    port: Number(p.port)
  };
  if (p.type === "vless") {
    out.uuid = p.uuid;
    out.udp = p.udp !== false;
    if (p.tls) out.tls = true;
    if (p["skip-cert-verify"]) out["skip-cert-verify"] = true;
    if (p.flow) out.flow = p.flow;
    if (p["client-fingerprint"]) out["client-fingerprint"] = p["client-fingerprint"];
    if (p.servername) out.servername = p.servername;
    if (p["reality-opts"]) out["reality-opts"] = p["reality-opts"];
    if (p.network) out.network = p.network;
    if (p["ws-opts"]) out["ws-opts"] = p["ws-opts"];
    if (p["grpc-opts"]) out["grpc-opts"] = p["grpc-opts"];
  } else if (p.type === "hysteria2") {
    out.password = p.password;
    out.udp = p.udp !== false;
    if (p.sni) out.sni = p.sni;
    if (p["skip-cert-verify"]) out["skip-cert-verify"] = true;
    if (p.obfs) out.obfs = p.obfs;
    if (p["obfs-password"]) out["obfs-password"] = p["obfs-password"];
    if (p.mport) out.mport = p.mport;
  } else if (p.type === "trojan") {
    out.password = p.password;
    out.udp = p.udp !== false;
    if (p.sni) out.sni = p.sni;
    if (p["skip-cert-verify"]) out["skip-cert-verify"] = true;
  } else if (p.type === "anytls") {
    out.password = p.password;
    out.udp = p.udp !== false;
    if (p.sni) out.sni = p.sni;
    if (p["skip-cert-verify"]) out["skip-cert-verify"] = true;
    if (p.alpn) out.alpn = p.alpn;
    if (p["client-fingerprint"]) out["client-fingerprint"] = p["client-fingerprint"];
  }
  return `    - ${JSON.stringify(out)}`;
}

function buildYaml(proxies, infoNames, mode = "liangxin") {
  const allProxies = [];
  for (const n of infoNames) {
    allProxies.push(`    - ${JSON.stringify({ name: n, type: "vless", server: "127.0.0.1", port: 1, uuid: "00000000-0000-0000-0000-000000000000", udp: false })}`);
  }
  for (const p of proxies) allProxies.push(proxyToInline(p));

  const realNames = proxies.map(p => yamlQuote(p.name)).join(", ");
  const allNames = [...infoNames.map(n => yamlQuote(n)), ...proxies.map(p => yamlQuote(p.name))].join(", ");

  const mLow = String(mode).toLowerCase();
  let dnsStr = LIANGXIN_DNS_STR, rules = LIANGXIN_RULES;

  if (mLow === "kitty" || mLow === "single_kt") {
    dnsStr = KITTY_DNS_STR;
    rules = KITTY_RULES;
  } else if (mLow === "combo_liki" || mLow === "combo_kidj") {
    dnsStr = KITTY_DNS_STR;
    const baseR = mLow === "combo_liki" ? LIANGXIN_RULES : DJJC_RULES;
    rules = Array.from(new Set([...KITTY_RULES, ...baseR]));
  } else if (mLow === "combo" || mLow === "combo_lidj") {
    dnsStr = COMBO_DNS_STR;
    rules = COMBO_RULES;
  } else if (mLow === "djjc" || mLow === "single_dj" || mode === false) {
    dnsStr = DJJC_DNS_STR;
    rules = DJJC_RULES;
  }

  const lines = ["mixed-port: 7890", "allow-lan: false", "bind-address: '*'", "mode: rule", "log-level: info", "external-controller: '127.0.0.1:9090'", "unified-delay: true", "tcp-concurrent: true"];

  lines.push(dnsStr);
  lines.push("proxies:");
  lines.push(...allProxies);
  lines.push("proxy-groups:");

  if (mLow === "kitty" || mLow === "single_kt") {
    lines.push(`    - { name: "VPN Trinh Hg", type: select, proxies: ["Auto Select", "DIRECT", ${allNames}] }`);
    lines.push(`    - { name: "Auto Select", type: url-test, proxies: [${realNames}], url: "http://cp.cloudflare.com/generate_204", interval: 300, tolerance: 50 }`);
  } else if (mLow === "combo_liki" || mLow === "combo_kidj") {
    lines.push(`    - { name: "VPN Trinh Hg", type: select, proxies: ["Auto Select", "Fallback", "DIRECT", ${allNames}] }`);
    lines.push(`    - { name: "Auto Select", type: url-test, proxies: [${realNames}], url: "http://cp.cloudflare.com/generate_204", interval: 300, tolerance: 50 }`);
    lines.push(`    - { name: "Fallback", type: fallback, proxies: [${realNames}], url: "http://cp.cloudflare.com/generate_204", interval: 7200 }`);
  } else {
    lines.push(`    - { name: "VPN Trinh Hg", type: select, proxies: ["Auto Select", "Fallback", ${allNames}] }`);
    lines.push(`    - { name: "Auto Select", type: url-test, proxies: [${realNames}], url: "http://www.gstatic.com/generate_204", interval: 86400, tolerance: 50 }`);
    lines.push(`    - { name: "Fallback", type: fallback, proxies: [${realNames}], url: "http://www.gstatic.com/generate_204", interval: 7200 }`);
  }

  lines.push("rules:");
  for (const r of rules) lines.push(`    - ${JSON.stringify(r)}`);
  return lines.join("\n");
}

function buildSingboxFull(proxies, infoNames, mode = "liangxin") {
  const realNames = proxies.map(p => p.name).filter(Boolean);
  const mLow = String(mode).toLowerCase();
  let activeRules = LIANGXIN_RULES;
  if (mLow === "kitty" || mLow === "single_kt") {
    activeRules = KITTY_RULES;
  } else if (mLow === "combo_liki" || mLow === "combo_kidj") {
    const baseR = mLow === "combo_liki" ? LIANGXIN_RULES : DJJC_RULES;
    activeRules = Array.from(new Set([...KITTY_RULES, ...baseR]));
  } else if (mLow === "combo" || mLow === "combo_lidj") {
    activeRules = COMBO_RULES;
  } else if (mLow === "djjc" || mLow === "single_dj" || mode === false) {
    activeRules = DJJC_RULES;
  }

  const dns = {
    servers: [{
      tag: "proxy-dns",
      address: "https://8.8.8.8/dns-query",
      detour: "节点选择"
    }, {
      tag: "direct-dns",
      address: "https://223.5.5.5/dns-query",
      detour: "direct"
    }, { tag: "block-dns", address: "rcode://success" }],
    rules: [{ outbound: "any", server: "direct-dns" }, { clash_mode: "Direct", server: "direct-dns" }, { clash_mode: "Global", server: "proxy-dns" }],
    final: "proxy-dns",
    independent_cache: true
  };

  const inbounds = [{
    type: "mixed",
    tag: "mixed-in",
    listen: "127.0.0.1",
    listen_port: 2080,
    sniff: true,
    sniff_override_destination: true
  }, {
    type: "tun",
    tag: "tun-in",
    inet4_address: "172.19.0.1/30",
    inet6_address: "fdfe:dcba:9876::1/126",
    mtu: 9000,
    auto_route: true,
    strict_route: true,
    sniff: true,
    sniff_override_destination: true,
    domain_strategy: "prefer_ipv4"
  }];

  const outbounds = [{
    type: "selector",
    tag: "节点选择",
    outbounds: ["自动选择", ...realNames],
    default: "自动选择"
  }, {
    type: "urltest",
    tag: "自动选择",
    outbounds: realNames,
    url: "https://www.gstatic.com/generate_204",
    interval: "1m",
    tolerance: 50,
    idle_timeout: "30m"
  }, { type: "direct", tag: "direct" }, { type: "block", tag: "block" }, { type: "dns", tag: "dns-out" }];

  infoNames.forEach((n, i) => outbounds.push({
    type: "vless",
    tag: `${n} § ${i}`,
    server: "127.0.0.1",
    server_port: 1,
    uuid: "00000000-0000-0000-0000-000000000000",
    packet_encoding: "xudp"
  }));

  for (const p of proxies) {
    const sb = proxyToSingbox(p);
    if (sb) outbounds.push(sb);
  }

  const direct_domain = [], direct_suffix = [], direct_kw = [], direct_ip = [], direct_geoip = [];
  const proxy_domain = [], proxy_suffix = [], proxy_kw = [], proxy_ip = [];
  const block_domain = [], block_suffix = [], block_kw = [];

  for (const rule_str of activeRules) {
    const parts = rule_str.split(",");
    if (parts.length < 3) continue;
    const [rtype, value, target] = [parts[0], parts[1], parts[2]];
    const isDirect = target === "DIRECT";
    const isBlock = target === "REJECT" || target === "REJECT-DROP";

    if (rtype === "DOMAIN") {
      if (isDirect) direct_domain.push(value);
      else if (isBlock) block_domain.push(value);
      else proxy_domain.push(value);
    } else if (rtype === "DOMAIN-SUFFIX") {
      if (isDirect) direct_suffix.push(value);
      else if (isBlock) block_suffix.push(value);
      else proxy_suffix.push(value);
    } else if (rtype === "DOMAIN-KEYWORD") {
      if (isDirect) direct_kw.push(value);
      else if (isBlock) block_kw.push(value);
      else proxy_kw.push(value);
    } else if (rtype === "IP-CIDR" || rtype === "IP-CIDR6") {
      if (isDirect) direct_ip.push(value);
      else proxy_ip.push(value);
    } else if (rtype === "GEOIP") {
      if (isDirect) direct_geoip.push(value.toLowerCase());
    }
  }

  const routeRules = [{ protocol: "dns", outbound: "dns-out" }];
  if (block_domain.length || block_suffix.length || block_kw.length) {
    const r = { outbound: "block" };
    if (block_domain.length) r.domain = block_domain;
    if (block_suffix.length) r.domain_suffix = block_suffix;
    if (block_kw.length) r.domain_keyword = block_kw;
    routeRules.push(r);
  }
  if (direct_domain.length || direct_suffix.length || direct_kw.length) {
    const r = { outbound: "direct" };
    if (direct_domain.length) r.domain = direct_domain;
    if (direct_suffix.length) r.domain_suffix = direct_suffix;
    if (direct_kw.length) r.domain_keyword = direct_kw;
    routeRules.push(r);
  }
  if (direct_ip.length) routeRules.push({ ip_cidr: direct_ip, outbound: "direct" });
  if (direct_geoip.length) routeRules.push({ geoip: direct_geoip, outbound: "direct" });
  if (proxy_domain.length || proxy_suffix.length || proxy_kw.length) {
    const r = { outbound: "节点选择" };
    if (proxy_domain.length) r.domain = proxy_domain;
    if (proxy_suffix.length) r.domain_suffix = proxy_suffix;
    if (proxy_kw.length) r.domain_keyword = proxy_kw;
    routeRules.push(r);
  }
  if (proxy_ip.length) routeRules.push({ ip_cidr: proxy_ip, outbound: "节点选择" });
  routeRules.push({ geoip: ["cn"], outbound: "direct" });

  return JSON.stringify({
    log: { level: "info", timestamp: true },
    dns,
    inbounds,
    outbounds,
    route: {
      rules: routeRules,
      final: "节点选择",
      auto_detect_interface: true,
      override_android_vpn: true
    },
    experimental: {
      cache_file: { enabled: true, path: "cache.db", store_fakeip: true },
      clash_api: {
        external_controller: "127.0.0.1:9090",
        external_ui: "ui",
        secret: ""
      }
    }
  }, null, 2);
}

function proxyToSingbox(p) {
  if (!p || !p.type) return null;
  if (p.type === "vless") {
    const out = {
      type: "vless",
      tag: p.name,
      server: p.server,
      server_port: Number(p.port) || 443,
      uuid: p.uuid
    };
    out.packet_encoding = "xudp";
    if (p.flow) out.flow = p.flow;
    if (p.network === "ws" && p["ws-opts"]) out.transport = {
      type: "ws",
      path: p["ws-opts"].path || "/",
      headers: p["ws-opts"].headers || {},
      max_early_data: 2048,
      early_data_header_name: "Sec-WebSocket-Protocol"
    };
    else if (p.network === "grpc" && p["grpc-opts"]) out.transport = {
      type: "grpc",
      service_name: p["grpc-opts"]["grpc-service-name"] || ""
    };
    if (p.tls) {
      const tls = { enabled: true };
      if (p.servername) tls.server_name = p.servername;
      if (p["skip-cert-verify"]) tls.insecure = true;
      if (p["client-fingerprint"]) tls.utls = { enabled: true, fingerprint: p["client-fingerprint"] };
      if (p["reality-opts"]) tls.reality = {
        enabled: true,
        public_key: p["reality-opts"]["public-key"] || "",
        short_id: p["reality-opts"]["short-id"] || ""
      };
      out.tls = tls;
    }
    return out;
  }
  if (p.type === "hysteria2") {
    const out = {
      type: "hysteria2",
      tag: p.name,
      server: p.server,
      server_port: Number(p.port) || 443,
      password: p.password || ""
    };
    out.tls = { enabled: true, server_name: p.sni || "", insecure: true }; // Luôn insecure: true
    if (p.obfs) out.obfs = { type: p.obfs, password: p["obfs-password"] || "" };
    return out;
  }
  if (p.type === "trojan") {
    const out = {
      type: "trojan",
      tag: p.name,
      server: p.server,
      server_port: Number(p.port) || 443,
      password: p.password || ""
    };
    out.tls = {
      enabled: true,
      server_name: p.sni || "",
      insecure: !!p["skip-cert-verify"]
    };
    return out;
  }
  return null;
}
