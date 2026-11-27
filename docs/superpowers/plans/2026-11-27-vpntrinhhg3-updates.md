# VPNTrinhHg3 Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Admin Footer ON/OFF toggle + compact Index Footer mode, upgrade Related Articles to 1-column newspaper cards with opening excerpts, update/create the 5 Admin guide articles with verified download links, and run full live browser E2E verification via the `browser` subagent.

**Architecture:** Store `showFullFooter` inside `cms.footer` (`POST /api/cms` deep-merges `footer` and `GET /api/public/config` already returns `footer`), allowing immediate live & local-preview compatibility without redeploying `worker.js`. Render Related Articles in `src/customer.js` and `src/admin.js` using a shared-logic excerpt extractor (`extractGuideExcerpt`) and a 1-column card stack. Author the 5 guide articles directly into KV `GUIDES` via Admin after verifying every release URL.

**Tech Stack:** Vite 5, Vanilla HTML/CSS/JS (ESM), Tailwind CSS 3.4, Vitest + jsdom, DOMPurify, Quill, `browser` subagent on `vite preview`.

**Spec:** `docs/superpowers/specs/2026-11-27-vpntrinhhg3-updates-design.md`

## Global Constraints

- **Audit/Safety:** Do NOT commit, push, merge, or deploy to production. Keep all code edits as a reviewable diff in the local workspace.
- **No external dependencies:** Do NOT install new npm packages.
- **No images/videos in guides:** All 5 guide articles must contain text, structured headings (`H2`/`H3`), numbered steps, callouts, hyperlinks/anchors only — zero `<img>`, `<video>`, or `<iframe>`.
- **Strict app scope in guides:** Only write Hiddify, FlClash, and Karing as specified per OS; do NOT include Singbox, Clash Party, Clash Verge, Shadowrocket, or Nekobox.
- **Test isolation:** Run all customer order/checkout/upgrade/renew E2E tests in Test Mode (`?test=1` / `ALL_ORDERS_TEST`). Clean up any test `djjc` links, pool items, and test orders after E2E verification.
- **Privacy:** Never write Admin password or tokens into source files, test files, artifacts, or screenshots.

## Review Focus

- Calling `saveFooterConfig()` after toggling `showFullFooter` OFF must preserve `cmsDb.footer.showFullFooter === false` instead of wiping it.
- Compact Footer (`showFullFooter: false`) must keep `#wechatModal` trigger (`openWechatModal()`) and all 4 support URLs + copyright intact without height/CSS conflicts from `#footerArea .footer-support-btns`.
- `extractGuideExcerpt(art)` must handle empty HTML, HTML with only headings/lists, and HTML containing `<script>` or special characters safely via `esc()` without truncating mid-word awkwardly or throwing in non-DOM/jsdom edge cases.
- When Footer is toggled OFF in Admin, `index` must reflect it cleanly across desktop and mobile without stale `vpn_footer_cache` blocking updates.
- `openGuideArticle` related-articles click (`data-guide-action="openart"` + `data-guide-slug`) must still work when clicking anywhere on the new 1-column newspaper card.

---

### Task 1: Admin & Index Footer Display Toggle

**Files:**
- Modify: `admin.html:677-778`
- Modify: `src/admin.js:7837-7865`, `src/admin.js:7917-7965`, `src/admin.js:9838-9950`
- Modify: `index.html:490-512`
- Modify: `src/customer.js:1637-1660`, `src/customer.js:5350-5372`
- Test: `tests/footer-and-related.test.js`

**Interfaces:**
- Consumes: `saveCmsDb({ footer: { showFullFooter } })`, `cmsDb.footer`, `cfgCache.footer`
- Produces:
  - `saveFooterDisplayToggle(): Promise<void>` in `src/admin.js` (exposed on `window`)
  - `updateFooterDisplayBadge(showFull: boolean): void` in `src/admin.js` (exposed on `window`)
  - `renderDynamicFooter(ft: object): void` in `src/customer.js` (exported for tests & exposed on `window`)

- [ ] **Step 1: Write the failing test**

Create `tests/footer-and-related.test.js` testing:
1. `renderDynamicFooter({ showFullFooter: false })` adds `hidden` to `#footerFullColsWrap`, tightens `#footerArea` spacing, and keeps all 4 support links (`https://zalo.me/0917678211`, `https://www.facebook.com/trinh.hg.57`, `openWechatModal()`, `https://t.me/hoaian57`) and `© 2026 VPN Trinh Hg. All rights reserved.` visible.
2. `renderDynamicFooter({ showFullFooter: true })` (and `{}` default) removes `hidden` from `#footerFullColsWrap` and renders columns.
3. `admin.html` places `#toggleShowFullFooter` and `saveFooterDisplayToggle()` inside the right column of the row containing `Cấu hình Làm mờ / Khóa / Kiểm tra (Web này)`.
4. `src/admin.js` `saveFooterConfig` preserves `showFullFooter` from `cmsDb.footer`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/footer-and-related.test.js`
Expected: FAIL because `#footerFullColsWrap`, `#toggleShowFullFooter`, and `renderDynamicFooter` export/logic do not exist yet.

- [ ] **Step 3: Update `admin.html` and `src/admin.js` for the Footer Toggle block**

1. In `admin.html` (`#wpane-ui`), arrange the 2-column section into two explicit `grid grid-cols-1 lg:grid-cols-2 gap-4 items-start` rows so Row 2 places `Cấu hình Làm mờ / Khóa / Kiểm tra (Web này)` on the left and the new **`Hiển thị Footer Trang chủ (Index)`** card directly to its right on the right column, containing:
   - Status badge `#footerDisplayStatusBadge` (`BẬT` / `TẮT`)
   - Toggle switch `<input type="checkbox" id="toggleShowFullFooter" onchange="updateFooterDisplayBadge(this.checked)">`
   - Concise description of ON (full footer) vs OFF (1-row 4 support buttons + copyright)
   - Save button `<button type="button" onclick="saveFooterDisplayToggle()">Lưu</button>`
2. In `src/admin.js`:
   - Add `updateFooterDisplayBadge(showFull)` and `async function saveFooterDisplayToggle()`.
   - Sync toggle state in `loadWebAdminUI()` and `loadSettingsUI()`.
   - Preserve `showFullFooter: cmsDb.footer?.showFullFooter !== false` inside `saveFooterConfig()`.
   - Expose `updateFooterDisplayBadge` and `saveFooterDisplayToggle` on `window`.

- [ ] **Step 4: Update `index.html` and `src/customer.js` for compact Footer rendering**

1. In `index.html`, add `id="footerFullColsWrap"` to the 5-column grid div inside `#footerArea` and `id="footerBottomRow"` to the support-buttons + copyright row.
2. In `src/customer.js`, update `renderDynamicFooter(ft)`:
   - Determine `const showFull = ft.showFullFooter !== false;`.
   - Toggle `#footerFullColsWrap` with `.hidden` when `!showFull`.
   - Adjust `#footerArea` padding classes (`pt-8 pb-4` when `showFull`, `pt-3 pb-3` when `!showFull`) and ensure `#footerBottomRow` stays clean on 1 row on desktop.
   - Export `renderDynamicFooter` from `src/customer.js` for testability.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/footer-and-related.test.js`
Expected: PASS for all Footer toggle tests.

---

### Task 2: Related Articles 1-Column Newspaper Cards with Opening Excerpt

**Files:**
- Modify: `src/customer.js:1288-1324`, `src/customer.js:5350-5372`
- Modify: `src/admin.js:6630-6640`
- Test: `tests/footer-and-related.test.js`

**Interfaces:**
- Consumes: `art.relatedArts`, `art.showRelated`, `guideTabList()`, `guideArts(tabId)`
- Produces:
  - `extractGuideExcerpt(art: object, maxLen?: number): string` in `src/customer.js` (exported)
  - `buildRelatedArticlesHtml(otherList: Array<{item: object, tabName: string}>): string` in `src/customer.js` (exported)

- [ ] **Step 1: Write the failing tests in `tests/footer-and-related.test.js`**

Test:
1. `extractGuideExcerpt({ html: '<h2>1. Giới thiệu</h2><p>Đây là <b>đoạn mở đầu</b> giới thiệu cách cài đặt VPN trên Android nhanh chóng và ổn định.</p>' }, 90)` skips the leading H2 heading, strips HTML tags cleanly, and returns a tidy excerpt without cutting mid-word unexpectedly.
2. `extractGuideExcerpt({ html: '' })` returns `""` safely without throwing.
3. `buildRelatedArticlesHtml(...)` with 4 items renders a 1-column container (`flex flex-col gap-3`), does NOT render `sm:grid-cols-2`, shows full article title (no `truncate`), includes `data-guide-action="openart"` and `data-guide-slug="..."`, and renders each article's excerpt + category label cleanly.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/footer-and-related.test.js`
Expected: FAIL because `extractGuideExcerpt` and `buildRelatedArticlesHtml` are not exported/implemented yet.

- [ ] **Step 3: Implement `extractGuideExcerpt` & 1-column cards in `src/customer.js` and update `cmsPrev` in `src/admin.js`**

1. In `src/customer.js`:
   - Implement `extractGuideExcerpt(art, maxLen = 155)`: extract opening body text from `<p>`, `<li>`, `<blockquote>` (falling back to stripped full text or `art.blocks` text if needed), collapse whitespace, trim cleanly at word boundary + `...`.
   - Implement `buildRelatedArticlesHtml(entries)` rendering a `flex flex-col gap-3` 1-column newspaper-card stack with category pill, full bold title, 2-line excerpt (`line-clamp-2`), and right arrow CTA.
   - Use `buildRelatedArticlesHtml` inside `openGuideArticle` (passing `{ item, tabName: t.name }`).
   - Export `extractGuideExcerpt` and `buildRelatedArticlesHtml` from `src/customer.js`.
2. In `src/admin.js` (`cmsPrev`):
   - Replace `display:grid;grid-template-columns:1fr 1fr;gap:8px` with `display:flex;flex-direction:column;gap:10px` and include a stripped opening snippet per related article so Admin preview matches `index`.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/footer-and-related.test.js`
Expected: PASS.

---

### Task 3: Full Unit Suite & Production Build Verification

**Files:**
- Verify: all files modified in Tasks 1 & 2

- [ ] **Step 1: Run full Vitest suite and Vite build**

Run: `npm test && npm run build`
Expected: All Vitest test files pass with 0 failures and `vite build` exits 0 producing `dist/index.html`, `dist/admin.html`, and required assets.

---

### Task 4: Verify Real Download Links & Author/Update All 5 Guide Articles in Admin KV (`GUIDES`)

**Files:**
- Remote/KV via Admin UI (no source code changes; authored via `admin.html` + `browser` subagent or verified API calls using the authenticated Admin browser session): `GUIDES` in KV.

- [ ] **Step 1: Start local `vite preview` server and verify real external download links**

Use `run_command` (`IsDaemon: true`, `BypassSandbox: false`) to run `npx vite preview --host 127.0.0.1 --port 4173`, OR inspect `browser` subagent on `http://127.0.0.1:4173/admin.html`.
Wait — remember `AGENTS.md` / terminal sandbox rule 8:
"On Windows, a server started in the sandbox is only reachable from the command that started it, not from later commands or from the user's browser... If the user wants to open the server themselves, tell them it must run outside the sandbox and start it with `BypassSandbox: true`."
Let's check whether the `browser` subagent can reach a server started with `BypassSandbox: true` vs `false`, and verify all external release URLs (`hiddify/hiddify-app/releases`, `chen08209/FlClash/releases`, `KaringX/karing/releases`, Google Play Hiddify, App Store Hiddify & Karing, `clashmi.app/download#android`) directly in the real browser so we obtain exact working `.dmg` / `.pkg` / `.exe` / release URLs with zero 404s!

- [ ] **Step 2: Read existing Android article & write/update all 5 articles cleanly**

In Admin → Tab Hướng dẫn (`GUIDES`):
1. **Android:** Read existing `Hướng dẫn cài đặt APP cấu hình VPN`, rewrite/format cleanly with proper technical terms, numbered steps, callout boxes, zero images/videos, keeping ONLY Hiddify (`https://play.google.com/store/apps/details?id=app.hiddify.com`), FlClash (`https://github.com/chen08209/FlClash/releases/`), Karing (`https://clashmi.app/download#android`).
2. **iOS:** Rewrite based on Android workflow for ONLY Hiddify (`https://apps.apple.com/us/app/hiddify-proxy-vpn/id6596777532`) and Karing (`https://apps.apple.com/us/app/karing/id6472431552`) using **text hyperlinks** (no CTA buttons).
3. **Windows:** Rename `Hướng dẫn cài đặt & sử dụng VPN trên FlClash (Windows)` to a general title covering all 3 apps; order strictly `1. Hiddify`, `2. FlClash`, `3. Karing` with verified GitHub release links (`https://github.com/hiddify/hiddify-app/releases/`, `https://github.com/chen08209/FlClash/releases/`, `https://github.com/KaringX/karing/releases`); add **Windows Defender SmartScreen** warning & bypass steps (*More info / Thông tin thêm* → *Run anyway / Vẫn chạy*).
4. **macOS:** Order `1. Hiddify`, `2. FlClash`, `3. Karing`; attach exact verified `.dmg` and `.pkg` asset URLs from GitHub Releases (noting Apple Silicon `arm64` / Intel `amd64/x64` / `Universal`); add bottom section **Lưu ý xử lý cảnh báo bảo mật macOS (Gatekeeper)** (*System Settings → Privacy & Security → Open Anyway*, *Control-click → Open*, `xattr -cr`); add `#anchor:...` links mid-article at each GitHub download/open step that scroll smoothly down to the Gatekeeper section. Ensure watermark (if enabled) uses mild opacity (`10–12%`).
5. **Lưu ý cho TikTok:** Create 1 brand-new complete article with fresh, natural Vietnamese prose covering environment detection (IP, GPS, timezone, region, cache, tracking, SIM carrier codes), HK restriction (prefer Singapore/Japan), `CTCarrier` changes in iOS/iPadOS 16.4+, ordered troubleshooting steps (TikTok & iOS settings → clean reinstall/Guest mode → Safari/cross-login/Vietnam helper/iOS update → Android no-SIM-removal method keeping `[Tải file TikTok APK tại đây — Admin sẽ cập nhật link sau]`).

---

### Task 5: Live Browser E2E Test Suite (`browser` subagent) & Cleanup

**Files:**
- None (live browser E2E verification on local preview `index.html` and `admin.html` in Test Mode)

- [ ] **Step 1: Verify `index` payment combinations & post-purchase flows (Test Mode `?test=1`)**

Test combinations across packages (cycle/travel/usage), durations (`1`, `3`, `6`, `12`, `custom X`), payment methods (`bank`, `alipay`, `wechat`), coupon codes, Zalo support checked/unchecked, logged-out new order vs logged-in portal order (keep existing vs create new link, upgrade, renew), QR ticket/cancel/error/invalid input states, copy link, and verify sub link functionality. Record every created test order ID.

- [ ] **Step 2: Verify Footer → Guide → Dashboard logged-out flow**

Ensure logged out → click a guide link in Footer → click **Bảng điều khiển** → verify `#guideAuthModal` ("Kiểm tra mã đơn hàng DH...") appears as expected.

- [ ] **Step 3: Verify Admin D1 reconciliation, Auto Fulfillment, and `djjc` Cron Auto-Lock**

1. Log into `admin.html`, switch to Test Mode (`Kho Test`), inspect orders created in Step 1, verify D1 transaction view / reconciliation & auto fulfillment / sub link output.
2. Create 1–5 hidden `djjc` sub links with `HSD = today (27/11/2026)`, run Cron (`runCronNow`), verify all created test `djjc` links are locked (`isLocked: true`, `orig: "dabikhoa"`).
3. Delete the test `djjc` links (and any disposable test orders created during Step 1) and verify cleanup.

- [ ] **Step 4: Verify Part 1 & Part 2 UI/Content live on Desktop & Mobile**

1. Toggle Footer **OFF** in `Admin → Cài đặt → Quản trị web` → click Lưu → verify `index` shows ONLY the 4 support buttons (`Zalo Support`, `Mess Support`, `WeChat` modal works, `Telegram`) + `© 2026 VPN Trinh Hg. All rights reserved.`.
2. Toggle Footer **ON** → click Lưu → verify `index` restores full 5-column Footer.
3. Open a guide article linked to 4 related articles → verify 1-column newspaper-card layout with short excerpts on desktop and mobile.
4. Inspect all 5 updated/created guides (`Android`, `iOS`, `Windows`, `macOS`, `Lưu ý cho TikTok`), test macOS anchor scroll, App Store text hyperlinks, SmartScreen/Gatekeeper sections, and verify zero console/runtime errors.
