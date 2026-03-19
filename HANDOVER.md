# EMLPlatform — Session Handover
**Date:** 2026-03-19
**Context:** Pre-client call scope review. No code has been written yet. This is all discovery and planning.

---

## What This Project Is

Managing a **Brilliant Directories (BD)** website for a client called **EMLPlatform** — an emergency management platform based in Canada. BD is a SaaS directory platform. The only things managed here are **widgets** (BD's custom code blocks containing PHP, CSS, and JavaScript), pushed via MCP tools.

The client hired a previous developer who partially built a notification system and left. We did a full audit of what exists, what's broken, and what was never built. A report was delivered (v2 PDF).

---

## MCP Tools Available

| Tool | What It Does |
|------|-------------|
| `list_widgets` | Lists all widgets on the BD site |
| `get_widget` | Fetches a widget's current code |
| `push_widget` | Pushes edited code to production |
| `render_widget` | Renders a visual preview |

**All code changes are doable via MCP.** The workflow is: `get_widget` → edit locally → confirm with client → `push_widget`.

**Important:** PHP runs server-side on BD — no local testing. Every push goes live. Always test after pushing.

---

## Environment Variables (must be set on new machine)

| Variable | Value |
|----------|-------|
| `BD_SITE_URL` | `https://www.emlplatform.ca/` (must include `www.` and trailing slash) |
| `BD_API_KEY` | Get from the existing machine's Windows Environment Variables |

Set permanently via: Windows → System Properties → Environment Variables.

---

## Widgets Relevant to This Scope

| ID | Widget Name | Purpose |
|----|-------------|---------|
| 46 | `activation-post-preferred-contact-notification-email` | **THE critical one** — notifies resource list contacts when an activation is posted |
| 194 | `non-urgent-notification-post-preferred-contact-email` | Same but for non-urgent posts |
| 184 | `notification-cron` | Scheduled email reminders for profile updates + suspension logic |
| 16 | `activation_messages` | Offers of Support inbox — threaded messages, real-time updates, reply emails |
| 185 | `sms-notifications` | Developer test stub — never completed, contains live API key |
| 31 | `activitation-notification` | Admin-only alert when activation posted (misleadingly named) |
| 193 | `non-urgent-notification` | Admin-only alert for non-urgent posts (also misleadingly named) |
| 181 | `member_update_indicater` | Visual status card on member dashboard |
| — | `profileUpdate_api` | Reads/writes profile update timestamps to DB |

---

## Full Issue List — By Severity

### 🔴 CRITICAL

| # | Description | Work | Widgets | Notes |
|---|-------------|------|---------|-------|
| 1 | Widget 46 is the only thing that notifies resource contacts when an emergency activation is posted — it uses deprecated PHP that fails silently on PHP 7+. If PHP 7+ is running, **no one is receiving emergency notifications at all** | `mysql_*` → `mysqli_*` | 46 | Fix first, test immediately |

### 🟠 HIGH — Security vulnerabilities or major broken functionality

| # | Description | Work | Widgets | Notes |
|---|-------------|------|---------|-------|
| 2 | Five widgets use PHP database functions removed in PHP 7.0 (2015) — they fail silently with no error shown to admin | `mysql_*` → `mysqli_*` | 46, 194, 184, 16, profileUpdate_api | All five must be fixed |
| 3 | Widgets 46, 194, and 16 drop a raw browser cookie value into database queries — attacker can extract or modify member data | SQL injection fix | 46, 194, 16 | Replace `$_COOKIE['userid']` with `$user['user_id']` |
| 4 | Widget 16 prints a URL parameter directly onto the page — attacker can craft a link that runs malicious JavaScript in a logged-in member's browser | XSS fix | 16 | One `htmlspecialchars()` call — **not in original PDF, found in code review** |
| 5 | Widget 185 contains a live third-party API key (MSG91) and a developer's personal test data — exposed credentials in production | Remove/scrub | 185 | Delete or blank the widget — **PDF listed this as "short-term", should be treated as security incident** |
| 6 | The "Verify" button on the resource list elevates a contact to approved vendor status, but widget 46 ignores verified status entirely — everyone gets every notification | Notification targeting | 46, 194 | Requires confirming how verified status is stored in DB first |

### 🟡 MEDIUM — Broken logic or unverified behaviour

| # | Description | Work | Widgets | Notes |
|---|-------------|------|---------|-------|
| 7 | When a member hits 365 days without updating, the cron sets `active = 1` — which likely means **active** in BD's DB, the opposite of intended suspension | Suspension logic fix | 184 | Confirm correct value in BD schema before changing |
| 8 | The email template resource contacts receive when an activation is posted has never been reviewed — link accuracy, personalisation fields, and message clarity all unconfirmed | Review email template | n/a — BD Admin | Manual review in BD Admin → Email Templates |
| 9 | Widgets 31 and 193 appear in the activation workflow but only email the site admin — naming implies they notify members, which creates confusion during maintenance | Document / rename | 31, 193 | Low direct risk, legitimate function |

### 🟢 LOW

| # | Description | Work | Widgets | Notes |
|---|-------------|------|---------|-------|
| 10 | The cron emails every member every 90 days including those whose profiles are fully current — members with nothing to do still receive reminders | Fix cron condition | 184 | One condition change — only email when approaching a threshold |

### ⬜ NOT CODE — Human actions required

| # | Description | Who |
|---|-------------|-----|
| 11 | End-to-end test — post a test activation, confirm resource list contacts receive the email with a working link | Client + dev |
| 12 | SMS notifications never built — widget 185 is a proof-of-concept only. Requires client to set up Twilio or Telnyx account before any code work | Client (account setup) |

---

## SMS — Design Decisions Made This Session

**Provider:** Twilio or Telnyx (both Canada-compatible). MSG91 in widget 185 is India-focused — do not use.

**Template storage:** Reuse BD's native email template system. Create BD email templates with only the plain-text field filled in, named like `sms-activation-notification`. Pull with `prepareEmail()['text']` and send via Twilio/Telnyx. Client can edit SMS copy from BD Admin — no code change needed.

**Character limit:** 160 chars per segment. URLs are the main constraint. Options:
- Use a fixed dashboard URL instead of the specific post URL (always same length)
- Use Twilio/Telnyx built-in link shortening (saves ~30-40 chars, small extra cost)

**Phone numbers:** Already stored in DB — widget 16 shows `$show_supporter_chat['phone_number']` pulled from `users_data`. Data is there.

**API key storage:** Must live in widget PHP code — no better option on BD's platform. Lock down the provider account with IP restrictions and usage limits to mitigate risk.

**Scope question still open with client:** Which triggers should get SMS? Recommendation: activation posted only (the time-critical one). Profile reminders don't need SMS.

---

## Possible Notification Triggers

| Trigger | Email | SMS | Status |
|---------|-------|-----|--------|
| Activation posted → resource list contacts | ✅ exists (broken) | ❓ client to decide | Priority fix |
| Non-urgent post → resource list contacts | ✅ exists (broken) | ❓ client to decide | |
| Profile approaching expiry (180/340 days) | ✅ exists (broken) | ❓ probably no | |
| Profile suspended (365 days) | ✅ exists (broken) | ❓ probably no | |
| Offer of Support submitted → poster | ❌ not built | ❓ | Possible new feature |
| Offer of Support reply → responder | ✅ exists | ❓ | Working (once PHP fixed) |
| Member added to resource list | ❌ not built | ❓ | Possible new feature |
| New member joins | ❌ not built | ❓ | Possible new feature |

---

## Email — Key Points

- Email is handled natively by BD — no external provider needed (no Sendgrid, Mailgun, etc.)
- Templates live in BD Admin → Email Templates, referenced by name in widget PHP
- Fixing the `mysql_*` issues IS the fix for broken emails — the plumbing is all there
- Template content review (#8 above) is a manual step in BD Admin, not via MCP

---

## What's Currently Working (confirmed in report)

- Visual dashboard profile status card (correct colour/status per member)
- "Reset date/time" button correctly writes timestamp to DB
- Admin alert emails fire when new listings added (widgets 31, 193)
- Offers of Support inbox (widget 16): threaded messages, real-time polling, tagging, search, download
- Reply emails sent to responders when activation poster replies
- Resource list management (add/view/delete contacts) via BD favourites system

---

## What Was Discussed But Not Yet Decided

1. **SMS scope** — client is deciding which triggers get SMS. Question asked, answer pending.
2. **Verified/elevated targeting** — need to confirm whether verified status is stored in DB before building the targeting feature (Issue #6)
3. **Suspension value** — need to check BD DB schema for correct `active` field value before fixing Issue #7
4. **"Verify" button label** — PDF suggested alternatives: Endorse, Pre-Approve, Certify, Elevate, Approve Vendor. Client hasn't chosen yet.

---

## Next Steps When Resuming

1. Get client answers on: SMS triggers, "Verify" label preference
2. Confirm PHP version on BD hosting server (determines urgency of fix)
3. Start with Issue #1/#2 — the `mysql_*` fixes across all 5 widgets
4. Fix SQL injection (#3) and XSS (#4) in same pass since touching the same widgets
5. Scrub widget 185 (#5)
6. End-to-end test (#11) before declaring anything done

---

## Setup Checklist on New Machine

- [ ] Clone the repo
- [ ] Copy `~/.claude/` folder from old machine (same path)
- [ ] Set `BD_API_KEY` environment variable
- [ ] Set `BD_SITE_URL` to `https://www.emlplatform.ca/`
- [ ] Run `npm install` inside `mcp-server/` if `node_modules` doesn't exist
- [ ] Copy PDF to `C:\Users\<you>\Downloads\EMLPlatform — Notification System Review v2 (1).pdf` if you need to reference it again
