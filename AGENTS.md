# AGENTS.md — VPNTrinhHg3 AI Agent Guidelines

> Applies to AI coding agents working on `trinhhg/vpntrinhhg3`. Read this file before making changes. These guidelines protect the live service while allowing useful engineering work; they should not be interpreted as a reason to avoid applicable skills, tools, testing, or necessary refactoring.

## 1. Operating principles and precedence

- **Work locally/in an isolated workspace by default.** Agents may inspect relevant files, edit code, refactor, remove verified dead code, and run safe tests in the workspace.
- **Production safety is the default.** Do not write directly to GitHub, commit, push, create/merge PRs, publish, deploy, release, or mutate production unless the current task explicitly authorizes that exact action. An instruction to fix code is not permission to deploy.
- **Protect behavior and contracts, not obsolete implementation.** Keep user-facing behavior and important integrations unless the task calls for a change or evidence supports removal. Do not preserve dead code, duplication, needless guards/fallbacks, or bad architecture merely because they already exist.
- **Scope work to the task.** Read the entry point and relevant modules/dependencies. Expand the scope only when needed for root cause, shared contracts, isolation, tests, or a safe complete fix. Avoid repository-wide scans for small tasks.
- **Resolve conflicts by priority:** security and production-safety requirements → explicit current-task requirements → stable contracts/data compatibility → applicable skill guidance → simplest maintainable implementation. If a conflict is consequential or ambiguous, explain it and ask before taking a risky action.

## 2. Task workflow and Skills

Before acting, understand the requested outcome, identify affected workflows, and choose a proportionate plan.

### Skill discovery and use
- Discover the Skills available in the current agent environment when relevant; do not assume a fixed list or hard-code this file's skill inventory.
- Classify the task (e.g., debugging, feature implementation, UI/UX, accessibility, security, performance, architecture/refactor, tests, research, documentation) and look for skills that fit.
- Use the environment's actual skill activation mechanism (e.g., slash command, skill workflow, automatic trigger, or explicit skill instructions). Do not assume `@` mentions activate a skill; verify the mechanism.
- Read and follow the skill's instructions/checklist/tooling when it is relevant. A skill is not considered used just because its name was mentioned or its file was opened.
- Skills can guide the approach and add capability; they do not override repository safety, security, data/contract protections, or the task's scope.
- Do not force irrelevant skills. If no applicable skill exists, or activation is unavailable, continue with a sensible standard workflow and state the limitation only if it materially affects the result.

### Work stages
1. **Inspect:** Read this file; check `PROJECT_MAP.md` when useful; inspect relevant source, callers, dependencies, state, API, and tests.
2. **Plan:** Establish expected behavior, risks, impacted paths, and test strategy. Keep the plan lightweight for small changes.
3. **Implement:** Make a focused fix or design change. Use skills and tools when applicable. Do not stop at a superficial workaround if root cause can be safely fixed.
4. **Verify continuously:** Run checks after meaningful changes, not only at the end. See Testing below.
5. **Review:** Examine the diff for correctness, regressions, duplication, unnecessary complexity, security, and scope.
6. **Report:** Clearly state changes and actual verification status. Hand off for Admin review; do not publish/deploy.

## 3. Code structure and maintainability

- Prefer clear responsibility boundaries and low coupling over either a monolith or excessive file splitting. File count and LOC are not goals by themselves.
- Split modules when size, mixed responsibilities, frequent independent changes, test difficulty, duplication, or failure coupling make it worthwhile. Avoid tiny files that merely wrap a few lines or create needless layers.
- Keep `api.js` and `shared.js` limited to truly shared logic. `admin.js` and `customer.js` may be entry/coordination modules; domain-specific code may live in focused modules where beneficial.
- Use abstraction only when it measurably reduces duplication, coupling, complexity, or improves testability. Prefer the simplest maintainable solution.
- Check callers, inline handlers, exports/imports, globals, shared state, DOM IDs, initialization order, and feature interactions before moving/removing code.
- Remove dead code or duplicates only after verifying references, dynamic call paths, and tests. Do not blindly delete guards, error handling, or compatibility paths.
- Update `PROJECT_MAP.md` after a material architectural/module-boundary change, not after every small edit.
- Keep diffs reviewable. If a small task causes large code growth, investigate reuse, duplication, formatting churn, or scope creep; do not reduce code at the expense of readability, safety, or behavior.

## 4. UI, design systems, and mobile touch interactions

- Preserve the current UI, layout, icons, and visual identity when the task is not asking for a UI/design change.
- For UI redesign, UI audit, styling, accessibility, responsive behavior, visual quality, or interaction tasks, **the preservation rule does not block improvements**. Discover and use applicable UI/design/interaction skills; assess the current interface and make scoped improvements.
- **Skills are not limited by framework compatibility:** if a skill is React, Radix, Tailwind, or component-library-specific, do not import its components blindly into this Vanilla HTML/CSS/JS project. Still apply relevant design principles, UX heuristics, interaction patterns, audit criteria, and ideas, then implement with the existing stack where practical. Stack incompatibility is a reason to adapt implementation—not to ignore an otherwise useful skill.
- For mobile-first Admin improvements, actively consider touch ergonomics and interaction patterns: thumb-reachable controls, larger touch targets, swipe actions only where discoverable, drag/reorder when it improves a workflow, drawers/bottom sheets, collapsible panels, sticky action bars, contextual menus, gesture affordances, and clear touch feedback. Choose patterns based on actual task needs; do not add gestures for decoration.
- **Gesture safety:** do not hijack normal page scrolling, text selection, browser back/forward, or native touch behavior unnecessarily. Avoid accidental destructive swipe actions; require confirmation or provide undo for risky actions. Prefer Pointer Events or an appropriate native mechanism; handle touch, mouse, and stylus consistently where applicable. Respect `prefers-reduced-motion`, keyboard accessibility, focus management, Escape/close behavior, and screen-reader labels.
- For drawers, sheets, overlays, and popovers implemented without a compatible library, ensure backdrop/close handling, body-scroll management, safe-area insets, stacking/focus, and cleanup of event listeners. Do not reproduce a React-only component dependency just to imitate its behavior.
- Evaluate the current design system rather than assuming existing CSS tokens are untouchable. Improve or consolidate tokens only when requested or when the task warrants it; avoid needless global redesign.
- Check desktop and mobile/responsive layouts when the change affects UI; specifically test touch flows on a mobile viewport/device when feasible, and report what was or was not tested.
- Keep the project compatible with its current stack (currently Vanilla HTML/CSS/JavaScript and Vite unless source/config says otherwise). Do not introduce a framework just because a skill's example uses one; adapt applicable principles.
- No dependency is forbidden categorically, but do not add one casually. Evaluate necessity, compatibility, maintainability, license, and size/runtime cost. Prefer free/open-source options with permissive licenses (MIT, Apache-2.0, BSD). Obtain project-owner approval before introducing a new runtime dependency or external service.
- Avoid paid services, subscriptions, trials that can auto-charge, and services requiring a payment card unless the owner explicitly approves.
- Pin dependency/CDN versions; never use floating `latest` versions.
## 5. Security, privacy, and secrets

- Never add credentials, API tokens, passwords, private keys, webhook secrets, or other sensitive values to source code, public repository files, frontend bundles, logs, or screenshots.
- Store Worker secrets in the appropriate secret/environment mechanism (e.g., Cloudflare Worker Secrets); never treat frontend variables as secrets.
- Do not log sensitive values. If a secret is found exposed or committed, report it immediately and recommend revocation/rotation; deleting it from the latest version is not sufficient.
- Public endpoints must return only the data intended for public use. Do not expose order lists, revenue, supplier-origin links, admin data, or secrets through public APIs.
- UI hiding is not access control. Enforce authentication/authorization server-side for admin operations, including order edits/deletion, status changes, fulfillment, and Link Pool management.
- Preserve authentication, authorization, CORS, rate limiting, device checks, and token-expiration protections. Do not weaken them as a workaround.
- Sanitize untrusted HTML before rendering (use existing DOMPurify flow where appropriate); avoid unsafe `innerHTML` with untrusted content. Avoid `eval`, `new Function`, or unsafe dynamic execution.
- Avoid retries for order/payment/renewal/fulfillment writes unless idempotency is verified. Prevent duplicate user actions where appropriate and never retry blindly.

## 6. Contracts, data, and business rules

Treat these as protected invariants unless the task explicitly requests a change and the impact has been analyzed:

- **API contracts:** endpoint URLs, HTTP methods, query/header/body fields, response shapes, and Worker proxy behavior.
- **Data compatibility:** KV, D1, Supabase structures and source-of-truth assignments; order/transaction/link records; historic values; existing field names and JSON shapes (including fields such as `totalVnd`, `totalCny`, `orig`, `masked`, `expDate`, `linkIndex`).
- **Routing and public URLs:** `/`, `/admin`, `/admin.html`, `/portal/*`, guide/blog paths, fallback handling, and referenced static asset paths.
- **Browser storage:** existing localStorage/sessionStorage keys and their meanings.
- **Business behavior:** package prices, exchange-rate logic, quota, duration, renewals, order fulfillment, and payment matching.
- **Historical data:** never rewrite old orders or financial amounts using current pricing/rules.
- **Time zones:** preserve Vietnam business timezone `Asia/Ho_Chi_Minh` (UTC+7); use `Asia/Shanghai` only where an Admin-selected China timezone is intended.
- **Read/write separation:** read-only functions/polling must not silently write or repair server data. No hidden auto-healing mutations on Admin page load; explicit Admin action and confirmation are required for data changes.
- **Migrations and bulk changes:** no production migrations, bulk edits, or deletes. Use dry-run/preview and a verified test environment first; preserve backward-readable data when compatibility conversion is needed.
- **Retries and concurrency:** avoid full-list overwrites for single-record changes; account for concurrent admins, race conditions, and duplicate submissions.

If a requested change needs to alter a protected invariant, first trace impact and propose the migration/compatibility/test plan. Do not silently change it.

## 7. Testing and auto-fix requirements

Test in an isolated workspace or a test environment. **Local frontend preview does not make its configured backend safe**—verify the backend and downstream services before any write.

### Safety
- Production mutation is prohibited during testing: no real orders, payments, bank transactions/webhooks, customer VPN fulfillment, real email, production data/config changes, or production migrations.
- Only perform test mutations when the owner has clearly identified and verified the website, Admin, API, webhook, and downstream services as non-production/test. If uncertain, stop writes and mark the test blocked.
- Use mocks only for appropriate unit/isolation tests; do not use mock success to claim a real workflow passed.

### Verification
Choose tests appropriate to the task. When applicable:
- Build and syntax/import checks.
- Unit and integration tests.
- API request/response and contract checks.
- Browser UI tests on the current workspace build (local preview); confirm the browser is actually testing the new code.
- End-to-end workflow, persistence/readback after reload, side effects, console/network errors.
- Responsive desktop/mobile checks.
- Regression tests for affected shared modules, Admin↔Customer propagation, security, and data paths.

### Auto-fix loop
When a test fails, collect evidence, trace root cause, patch in the workspace, rerun the failing test, then run relevant regression checks. Continue while safely possible; do not stop after the first failed test. Do not remove/disable tests, weaken assertions/validation/security, fake results, or conceal failures to force a pass.

### Gate and truthful status
- Do not hand off as ready while a feasible relevant test remains unrun or a serious failure remains unresolved.
- Report each check as `PASS`, `FAIL`, `BLOCKED`, or `NOT VERIFIED`. A build pass is not proof that the workflow passed; a successful HTTP response/toast is not proof of persisted business state.
- If a test cannot be run due to missing tools, environment, permissions, or safe data, identify it explicitly rather than claiming it passed.
- Use browser/local preview and test backend when available. For Vite, use the configured scripts (e.g. `npm run dev -- --host 127.0.0.1`) only if suitable for this repo.

## 8. GitHub, deployment, and protected operational files

- Do not write directly to GitHub, commit, push, create PR, merge, or deploy unless the current task explicitly grants that permission. Default handoff is a reviewable diff in the workspace.
- Deployment/release is always a separate action requiring explicit authorization. Never deploy as a side effect of fixing or testing.
- Do not force-push, rewrite history, delete branches, or remove old commits without explicit approval.
- Do not change Cloudflare Pages/Workers routing, domains, bindings, secrets, or environment configuration unless required by the task and authorized.
- Treat these operational files as sensitive: `.github/workflows/update.yml`, `update_sub.py`, `_worker.js`, `_redirects`, PWA manifests and icons. Preserve their paths and roles; modify only when task requires it, then review and test carefully.
- When Vite/build packaging is involved, verify required root assets are present in output (when applicable): `index.html`, `admin.html`, `_worker.js`, `_redirects`, `manifest.json`, `manifestadmin.json`, `icon-192.png`, `icon-512.png`.
- Verify routes/fallbacks including `/`, `/admin`, `/admin.html`, and guide URLs when routing/build changes affect them. Never enable deployment from experimental branches as part of a task.

## 9. Cost and external-service constraints

- Project goal: $0/month. Keep within the existing free Cloudflare/GitHub quotas unless owner approves a cost.
- Do not switch Workers, Pages, KV, D1, or other services to paid plans or enable billing.
- Prefer existing Cloudflare/GitHub capabilities or compatible free/open-source solutions over new SaaS.
- Do not add AI paid API calls to website/admin runtime.
- Before recommending or introducing a new service/dependency, state its license (if relevant), pricing, free-tier limits, card/billing risk, and why the current stack is insufficient. Owner approval is required before adoption.
- Avoid unnecessary builds, workflows, polling, and requests. Respect free-tier limits and keep quota usage visible when it matters.

## 10. Task handoff report

For code changes, provide a concise but evidence-based report:
1. **Outcome:** what was requested and implemented.
2. **Files:** files read/changed/added/deleted, with a brief reason.
3. **Root cause:** for bug fixes, the verified cause or clearly marked hypothesis.
4. **Tests:** checks run, environment, actual results, and evidence; use PASS/FAIL/BLOCKED/NOT VERIFIED.
5. **Auto-fix:** issues found, fixes, and retests.
6. **Impact/regression:** workflows and contracts checked; residual risk.
7. **Diff review:** scope, complexity, duplication, coupling, or unusual growth.
8. **Safety:** confirm no production mutation and no commit/push/PR/merge/deploy unless explicitly authorized.

Do not report a test, skill, tool, review, or result as completed unless it actually was. Keep reports proportionate to the task; a small change does not need a verbose 10-item report.

---

## 11. Living document

These guidelines are intentionally organized by topic rather than a large sequential list of overlapping rules. If a task reveals a gap, propose a focused edit to this file instead of appending another block of rules. Keep this document concise, consistent, and free of duplicate/conflicting instructions.