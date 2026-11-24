# AGENTS.md — VPNTrinhHg3 AI Agent Guidelines

> Applies to AI coding agents working on the test repository `trinhhg/vpntrinhhg3`. Read this file before making changes. Thorough real-browser testing is expected in verified test environments; protect production and any real downstream integrations from accidental effects.

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
- **Manual patch format (mandatory):** briefly describe finding/severity, exact file/location, issue, current vs expected behavior, and evidence. Then present each proposed fix separately and numbered, labeled MANUAL CHANGE — NOT APPLIED. Use the Find/Replace presentation below exactly, with full verified code and anchor context; do not add a different patch format. Explain briefly what the fix changes and which regression to retest.
- Never use ellipses, placeholders, pseudo-code, “same as above,” partial snippets, or invented source to represent code that the owner must paste. Keep the original indentation and surrounding syntax. If exact original code cannot be verified, provide no paste-ready patch and label the instruction **NOT VERIFIED** with the reason.
- Use these formats exactly:
  - Template examples below are illustrative; use verified complete source snippets in real patches, never placeholder text.
  - **INSERT (keep anchor):**
    **Find:**
    ```
    ABC
    ```
    **Replace:**
    ```
    D
    E
    ABC
    ```
  - **DELETE (keep surrounding anchors):**
    **Find:**
    ```
    A
    B
    C
    D
    E
    ```
    **Replace:**
    ```
    A
    B
    E
    ```
  - **EDIT:**
    **Find:**
    ```
    [exact old code]
    ```
    **Replace:**
    ```
    [exact new code]
    ```
- If a target block is long, provide separate small patches only when each search block is exact and unique; never abbreviate source with ellipses. If the patch cannot be safely expressed this way, say so and ask before proposing a risky manual edit.
- Do not provide vague instructions such as “change the color”, “add aria”, or “fix the button” without the exact source and replacement. If the code cannot be located/verified, report the file/section and mark the patch `NOT VERIFIED`; do not invent old code.
- **After owner-applied manual edits:** When the owner requests a re-audit, compare the actual source to the proposed patches, confirm which were applied, then test those changes. Do not assume they were applied correctly.

## 2B. Source-led full real-browser E2E audit and mandatory skill-assisted evaluation (mandatory)

- **Read source before testing.** Read this file, then inspect relevant HTML, Vanilla JS/CSS, entry points, API/backend integrations, storage, callers, and tests. Trace actual code paths; do not infer features from filenames or labels.
- **Build your own complete feature inventory.** Enumerate every feature, control, workflow, validation, state transition, API call, persistence path, error/loading/empty/success state, cross-module dependency, and customer/Admin flow discovered in source. The user's list is only a starting point.
- **No artificial test limits.** Test every discovered feature and applicable normal, boundary, invalid, failure, authorization, navigation, persistence/reload, cross-feature, desktop/mobile case. Work in resumable checkpoints; do not use an arbitrary time budget or a small representative sample as a substitute for coverage. Clearly list anything genuinely untested.
- **Direct real-browser E2E.** Use Browser Subagent (or the environment's clearly equivalent direct browser agent) to interact with the actual website/build through user-visible actions: clicks, typing, scrolling, keyboard, navigation, reload, and viewport changes. Inspect rendered state, Console, and Network when relevant. Do not use Playwright, Playwright Test, Playwright scripts, or Playwright-based automation for this audit. If direct browser capability is unavailable, mark E2E BLOCKED; do not silently substitute.
- **Use Ponytail + Superpowers instead of the removed UI/UX skill set.** In every audit/testing/evaluation and relevant implementation task, discover and activate the available Ponytail and Superpowers skills. Do not require the owner to repeat these instructions in each prompt. Read/use the skill instructions—not merely mention the names—and report any unavailable skill or command.
- **Ponytail (minimalism, review, repo audit):** use the available commands/skills as applicable:
  - `/ponytail [lite|full|ultra|off]` — choose the mode. `lite`: smallest solution; `full` (default): complete but minimal solution, relevant checks, and name skipped work/risks; `ultra`: challenge assumptions and push back before implementation; `off`: disable. Bare `/ponytail` activates/reports the mode.
  - `/ponytail-review` — review the current diff for bugs, security, performance/load, missing tests, overengineering, and unnecessary code; return concrete findings and a delete/cut list.
  - `/ponytail-audit` — audit the whole repository for overengineering and quality issues, prioritized.
  - `/ponytail-debt` — collect deferred `ponytail:` shortcuts/comments into a debt ledger so deferred work is tracked.
  - `/ponytail-gain` — show a measured-impact scoreboard (code reduction, cost, speed) where benchmark/evidence exists; do not invent measurements.
  - `/ponytail-help` — display the Ponytail command/mode quick reference.
  - Ponytail principle: first rung that works; reuse existing code/platform/stdlib; smallest readable solution; no unnecessary abstractions, wrappers, options, or boilerplate. Do not cut validation, security, accessibility, data-loss safeguards, or requested functionality.
- **Superpowers (structured development process):** invoke relevant skill identifiers through the agent's actual skill mechanism (these may not be literal slash commands on every host):
  - `superpowers:using-superpowers` — skill-system introduction; discover and use applicable skills rather than bypassing them.
  - `superpowers:brainstorming` — clarify intent and constraints, explore alternatives, present a design, and obtain approval before creative feature/behavior changes.
  - `superpowers:using-git-worktrees` — create/use an isolated worktree for implementation workflows when supported and appropriate; verify baseline.
  - `superpowers:writing-plans` — create a detailed, bite-sized, testable implementation plan for multi-step work.
  - `superpowers:executing-plans` — execute a plan inline task-by-task with verification and a final review.
  - `superpowers:subagent-driven-development` — delegate implementation tasks to subagents with per-task spec-compliance and code-quality reviews when subagents are supported.
  - `superpowers:dispatching-parallel-agents` — use parallel subagents for independent tasks when available and safe.
  - `superpowers:test-driven-development` — use RED → GREEN → REFACTOR: write a failing test, verify failure, implement the minimal fix, verify pass, then refactor.
  - `superpowers:systematic-debugging` — investigate methodically, reproduce, trace root cause, test hypotheses, and verify the fix; avoid symptom-only patches.
  - `superpowers:verification-before-completion` — run relevant checks and inspect actual evidence before claiming completion; no unsupported “works” claims.
  - `superpowers:requesting-code-review` — request/perform a focused review before handoff, with concrete risks and findings.
  - `superpowers:receiving-code-review` — evaluate review feedback critically, verify it against source/tests, and respond or implement appropriately rather than accepting blindly.
  - `superpowers:finishing-a-development-branch` — verify final branch state and decide next steps (merge/PR/handoff) without performing unauthorized git/deploy actions.
  - `superpowers:writing-skills` — author or revise agent skills using the skill's test-first validation approach when skill-documentation work is requested.
  - `superpowers:diagnosing-superpowers` — diagnose failures in Superpowers skill behavior/session using evidence, when relevant.
- **Workflow/activation notes:** apply the relevant skill(s), not all indiscriminately. For small tasks, use the lightweight applicable process; for substantial creative/feature work, brainstorm/design approval → plan → isolated execution → TDD → verification → review. Audit-only requests remain audit-only unless implementation is explicitly authorized. Adapt framework-specific skill examples to this repo's Vanilla HTML/CSS/JS and existing tooling; do not install React/Radix/Tailwind/Konsta or other dependencies solely to follow a skill example.
- **Skill/command availability:** skill IDs and slash commands depend on the installed host/plugin version. Discover what's actually available; if a command/skill is missing, use its available equivalent or a standard workflow and report the limitation. Do not pretend an unavailable command was executed.
- **Test-site authorization.** The owner designates this repository/site as an isolated test project and authorizes comprehensive testing within that test environment without asking for routine confirmation. Do not limit tests merely because they create, edit, delete, submit, or persist test records; exercise full UI workflows, test checkout/payment simulations, configured test webhooks, dummy/test VPN activation/renewal/fulfillment, and mail to controlled test inboxes as applicable. Use disposable test data and clean it up when safe. Do not touch production, real financial accounts/transactions, actual customer access, uncontrolled real recipients, or other real-world targets. If a particular downstream target is demonstrably live or its test/live status is unclear, block only that target-specific action and continue all other tests; do not mark the whole audit blocked.
- **Evidence and reporting.** Separate source-derived feature inventory, direct-browser tests executed, code-only checks, mock/stub tests, and inferred/unverified behavior. Record actual test URL/build/browser/viewport where available. Do not claim tests passed without evidence.
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
- The owner authorizes unrestricted test-data mutations and end-to-end actions **inside the designated isolated test site/backend/integrations**; no additional confirmation is required for routine test records or workflows.
- Do not block tests solely because they create/update/delete test data, submit test orders, simulate payment/checkout, trigger test webhooks, exercise dummy/test VPN activation/renewal/fulfillment, or send email to controlled test inboxes. Run these when the configured test endpoints and targets are available.
- Keep real-world targets out of scope: no real charges, bank/account transactions, production mutations, actual customer VPN provisioning, or messages to uncontrolled/real recipients.
- If one integration's target is known to be live or cannot be established as test-only, block only that integration-specific step and continue the remaining audit.
### Audit runtime and stopping rules
For audits (UI/UX, accessibility, performance, security, functional, or code quality), keep the work bounded and resumable:
- **No arbitrary time cap on coverage:** work in checkpoints and continue comprehensive testing in stages as needed. Clearly report completed and unfinished tests; do not stop at a small sample just to meet an artificial time budget.
- Avoid launching many browser instances, parallel heavy workflows, exhaustive viewport permutations, repeated screenshots, or full suites when targeted tests will answer the question.
- Prefer one browser instance and sequential testing to avoid waste, but run the full relevant test matrix across desktop/mobile and feature workflows; do not use a small representative sample as a coverage substitute.
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