# AGENTS.md — VPNTrinhHg3 AI Agent Guidelines

> Applies to AI coding agents working on `trinhhg/vpntrinhhg3`. Read this file before making changes. These guidelines protect the live service while allowing useful engineering work; they should not be interpreted as a reason to avoid applicable skills, tools, testing, or necessary refactoring.

## 1. Operating principles and precedence

- **Audit-only by default.** Unless the owner explicitly asks the agent to implement/edit code, agents may inspect files, test, diagnose, and prepare exact manual patch instructions—but MUST NOT edit, create, delete, rename, format, or otherwise modify any project file, including in the local workspace. An audit, review, test, or request to find/fix issues is not permission to modify code.
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
3. **Propose fixes (audit-only default):** Do not modify files. Prepare exact, copy/paste manual patch instructions in the required format below. Only implement changes if the owner explicitly says to edit/implement in the current task.
4. **Verify:** For audit-only tasks, test the current unchanged code and clearly separate confirmed failures from inferred issues. After the owner manually applies changes, verify the updated code only when asked to do the follow-up audit.
5. **Review:** If implementation was explicitly authorized, examine the diff for correctness, regressions, duplication, unnecessary complexity, security, and scope. If not authorized, review proposed patches for completeness and safety without applying them.
6. **Report:** Clearly state whether any files were changed. Audit-only tasks must report `Files changed: 0` and hand off manual instructions; do not publish/deploy.

## 2A. Audit-only default and manual patch format (mandatory)

- **Audit/review/test/fix-finding requests are not permission to edit code.** Default to audit-only: inspect source, run safe read-only checks, identify and validate issues, and provide proposed fixes for the owner to apply manually.
- Do not modify any file in the workspace: no edits, auto-formatting, generated-file changes, file creation/deletion/renaming, dependency installation that changes lockfiles, or scripted patching. Keep the workspace unchanged.
- The only exception is when the owner explicitly authorizes code implementation/editing in the current task (e.g. “implement these fixes”, “edit the files”). If authorized, scope permission to that task only; it does not imply commit, push, deploy, or production writes.
- Every proposed code fix must be given as an exact manual patch that can be located with Ctrl+F. Do not use ellipses (`...`) or omit lines inside the search block. Include enough unchanged surrounding lines to make the match unique and safe.
- **Manual-patch presentation (mandatory):** For each finding, first show the finding ID/severity, affected file path, exact location (line numbers if available), a plain-language explanation of what is wrong and why, current behavior, expected behavior, and test evidence. Then present the patch in a clearly labeled **MANUAL CHANGE — NOT APPLIED** section.
- Present each patch as a separate numbered change. Label its operation as **EDIT**, **INSERT**, or **DELETE**; state the exact Ctrl+F search anchor; and show the full replacement block in a fenced code block with the correct language where known. For INSERT/DELETE, include all required unchanged anchor lines in the replacement so the owner can safely locate and preserve context. Do not combine unrelated fixes into one patch.
- After each patch, briefly explain what it changes and any relevant side effect/regression check. If more than one file is needed, provide a separate patch for each file in the correct order.
- Never use ellipses, placeholders, pseudo-code, “same as above,” partial snippets, or invented source to represent code that the owner must paste. Keep the original indentation and surrounding syntax. If exact original code cannot be verified, provide no paste-ready patch and label the instruction **NOT VERIFIED** with the reason.
- Use these formats exactly:
  - **Insert (keep anchor):** `Find: [exact original anchor/block] → Replace with: [complete replacement block, including the original anchor and inserted lines]`
  - **Delete (keep surrounding anchors):** `Find: [exact original block] → Replace with: [complete remaining block with deleted lines removed]`
  - **Edit:** `Find: [exact original code] → Replace with: [exact new code]`
- If a target block is long, provide separate small patches only when each search block is exact and unique; never abbreviate source with ellipses. If the patch cannot be safely expressed this way, say so and ask before proposing a risky manual edit.
- Do not provide vague instructions such as “change the color”, “add aria”, or “fix the button” without the exact source and replacement. If the code cannot be located/verified, report the file/section and mark the patch `NOT VERIFIED`; do not invent old code.
- **After owner-applied manual edits:** When the owner requests a re-audit, compare the actual source to the proposed patches, confirm which were applied, then test those changes. Do not assume they were applied correctly.

## 2B. Source-led feature discovery and real-browser E2E audit (mandatory)

- **Read source code before browser testing.** First read `AGENTS.md`, then inspect the relevant project entry points, HTML, JavaScript modules, styles, API/backend integration, state/storage, and callers. Follow code paths far enough to understand actual behavior; do not infer functionality from filenames, labels, or function names alone.
- **Discover the feature inventory yourself.** Create a `Feature Inventory` from functions and flows actually found in source. Identify controls/actions, prerequisites, state transitions, API calls, expected outcomes, validation, loading/empty/error/success states, and cross-module dependencies. The user's checklist is only a starting point; add features discovered from the code and do not omit unmentioned functionality.
- **Derive the test plan from the inventory.** Design prioritized test cases (normal, edge, invalid input, failure, navigation, persistence/reload, and cross-feature workflow cases as applicable) before executing tests. Map each test to a feature and record its expected result. Do not merely click controls without checking their resulting behavior.
- **Browser E2E must be direct browser interaction.** Use Browser Subagent (or the environment's clearly equivalent browser subagent) to open the real website/build and interact with it using actual browser UI actions—click, type, scroll, navigation, reload, keyboard, and viewport resizing as applicable. Observe rendered results and inspect browser Console/Network when needed. Test real end-to-end flows across customer and admin interfaces, not just isolated screens.
- **Playwright is prohibited for this audit workflow.** Do not use Playwright, Playwright Test, Playwright scripts, or Playwright-powered browser automation. Do not replace real browser interaction with DOM-only simulation, code inspection, unit tests, or mocked flows. Those may be reported separately, but they are not real-browser E2E evidence.
- **Browser capability fallback:** If Browser Subagent/direct browser access is unavailable, clearly report `BLOCKED` for browser E2E and explain what capability is missing. Do not silently switch to Playwright or claim a browser test passed.
- **Safe test data:** Use a confirmed isolated/test backend and non-production test data for write operations. Never place real payments, customer orders, fulfillment, emails, or production mutations at risk. When the environment cannot be verified as safe, test read-only UI flows and mark write flows `BLOCKED`.
- **Report distinctions:** Separate code-derived feature inventory, tests actually executed in a browser, code-only checks, mock/stub tests, and inferred/unverified behavior. Record actual browser, environment/URL/build, viewport, and evidence where available. Do not overstate coverage.

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

### Audit runtime and stopping rules
For audits (UI/UX, accessibility, performance, security, functional, or code quality), keep the work bounded and resumable:
- **Default time budget:** aim to finish the audit + scoped fixes + verification within 8 minutes. If a task genuinely needs longer, explain why and request/continue in clearly separated stages; do not silently run an unbounded browser session.
- Avoid launching many browser instances, parallel heavy workflows, exhaustive viewport permutations, repeated screenshots, or full suites when targeted tests will answer the question.
- Prefer one browser instance and sequential testing. Use a small representative matrix (typically desktop + one or two mobile sizes) and expand only when evidence reveals a specific risk.
- Keep checkpoints: after inspection, after findings, after fixes, and after verification, save/report concise progress so the task can resume without repeating completed work.
- If browser automation is slow or stuck, stop the current operation safely, preserve findings, identify the exact unfinished test, and continue with a smaller targeted test. Do not repeatedly restart the entire audit or require the owner to prompt “continue” for obvious next steps.
- For web UI/E2E audits, use the available **Browser Subagent to operate an actual browser directly**, like a real user/admin. Do not use Playwright, Playwright Test, Playwright scripts, or Playwright-based browser automation for this audit. If Browser Subagent is unavailable, mark browser E2E as `BLOCKED`; do not substitute Playwright or claim E2E passed. State clearly if another non-browser test was run separately.
- An audit may be partial: clearly label coverage and blockers; do not inflate scores or claim full coverage.

### Verification
Choose tests appropriate to the task. When applicable:
- Build and syntax/import checks.
- Unit and integration tests.
- API request/response and contract checks.
- Browser UI tests on the current workspace build (local preview); confirm the browser is actually testing the new code.
- End-to-end workflow, persistence/readback after reload, side effects, console/network errors.
- Responsive desktop/mobile checks.
- Regression tests for affected shared modules, Admin↔Customer propagation, security, and data paths.

### Diagnosis and fix loop (audit-only unless explicitly authorized)
When a test fails, collect evidence and trace root cause. In audit-only mode, do not patch files; provide exact manual patch instructions using the mandatory Ctrl+F format, then test the unchanged code and clearly label the fix as proposed—not applied. If the owner explicitly authorized implementation in the current task, make a focused patch, rerun the failing test, and run relevant regression checks. Do not remove/disable tests, weaken assertions/validation/security, fake results, or conceal failures to force a pass.

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

## 10. Audit report format (owner-friendly)
For every audit, end with a **clear, action-oriented summary**. The owner should not need to read raw logs or guess what to fix.

### Required top summary
- **Audit type + scope** (what was examined, and what was intentionally excluded).
- **Overall score: X/100** and **coverage: Y%**. These are different: score measures observed quality; coverage is the proportion of the planned audit checklist actually tested/reviewed. Explain the coverage denominator briefly (e.g., 18 of 20 checks).
- **Before → after score** only if both were actually measured using the same criteria. If no fixes were applied, say “audit only; no changes made.”
- **Fix status:** number of findings total, fixed, remaining, blocked, and not verified.
- Give a plain-language verdict in 2–4 sentences: is it safe to proceed, what is the biggest issue, and what should the owner do next?

### Score breakdown
Provide a table with criteria, weight, score earned, and one-line explanation. Weights must total 100; scores must use the same criteria between before/after when comparing. Example categories (adapt to audit type; do not force irrelevant categories):
| Category | Weight | Score | Brief reason |
|---|---:|---:|---|
| Core functionality/workflows | 20 | 16/20 | ... |
| UX/layout/responsiveness | 20 | 14/20 | ... |
| Accessibility | 15 | 10/15 | ... |
| Reliability/security | 15 | 12/15 | ... |
| Performance/maintainability | 15 | 11/15 | ... |
| Visual consistency/polish | 15 | 12/15 | ... |
| **Total** | **100** | **75/100** | ... |
Clearly explain how the score was derived; do not use fake precision. If there is no reliable baseline, do not invent a before-score.

### File-by-file change ledger (mandatory)
List **every file inspected that was relevant to the audit** and classify it:
- `CHANGED`: path — only if code edits were explicitly authorized; what changed, why, and which finding(s) it addresses.
- `NO CHANGE`: path — reviewed, no edit; state whether it passed or why.
- For default audit-only work, the `CHANGED` list must be empty. List proposed patches separately and label them `PROPOSED MANUAL FIX — NOT APPLIED`.
- `ADDED` / `DELETED`: path — purpose and reason.
Group files by area if the list is long. Avoid vague descriptions such as “UI improvements”; name the concrete change.
If a file was not inspected, do not imply it was.

### Findings and next actions (mandatory)
Use severity labels `P0` (critical), `P1` (high), `P2` (medium), `P3` (minor):
- **FIXED:** finding → exact file(s) → what changed → retest result.
- **REMAINING:** finding → exact file(s)/location → what is wrong → recommended next action. Explain in simple, non-technical wording first, with technical details after if useful.
- **BLOCKED / NOT VERIFIED:** what could not be tested, why, and what evidence or permission/tool is needed.
Show a short ordered checklist of the remaining work (highest priority first). Do not leave the owner with only a score and generic caveats.

### Verification evidence
Summarize the tests by status (`PASS`, `FAIL`, `BLOCKED`, `NOT VERIFIED`) with counts and key examples. Distinguish:
- tests actually executed in browser vs code inspection;
- real backend/API behavior vs mocked/stubbed responses;
- automated mouse/keyboard/touch actions vs visual-only inspection;
- tests that completed vs those stopped due time/resource limits.
Include relevant screenshot names/paths or concise evidence when available, but do not dump logs.

### Final owner-facing format
1. One-line verdict + overall score and coverage.
2. Score breakdown table (weights total 100).
3. **Files changed / files reviewed with no changes** ledger.
4. **What was fixed** (plain language, linked to files).
5. **What still needs fixing** (prioritized checklist, exact location, recommended action).
6. Verification summary and blocked/not-verified items.
7. Safety confirmation: no production writes, no commit/push/PR/merge/deploy unless authorized.

Keep this readable and concise. Avoid large raw metrics dumps; translate them into specific user-visible problems and actions. A score is a summary—not a substitute for listing remaining issues.

## 12. Task handoff report

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

## 13. Living document

These guidelines are intentionally organized by topic rather than a large sequential list of overlapping rules. If a task reveals a gap, propose a focused edit to this file instead of appending another block of rules. Keep this document concise, consistent, and free of duplicate/conflicting instructions.