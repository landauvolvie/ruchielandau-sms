# Ruchie Landau Photography — SMS Messaging site

The public SMS consent and compliance website for **Ruchie Landau Photography**.

Ruchie Landau Photography is operated by Wolf Landau, sole proprietor.

The site exists so that customers — and messaging-compliance reviewers
(Twilio / TCR, A2P 10DLC Sole Proprietor) — can see exactly how someone signs
up for text messages, what messages they will get, and how to stop them.

Intended production hostname: **https://sms.ruchielandau.com**

---

## ⚠️ Current status — FRONTEND SIMULATION MODE

**The deployed website currently uses FRONTEND SIMULATION MODE for SMS
enrollment and unsubscribe.**

**The UI intentionally behaves like the final system so the production
experience can be reviewed.**

**No phone numbers, consent records, or unsubscribe requests are transmitted or
stored.**

**The simulated success screens MUST NOT be considered proof of actual SMS
consent.**

There is **no backend of any kind** in this repository — no API, no Worker, no
database, no D1, no KV, no Twilio integration, no authentication.

### What "simulation" means in practice

The customer-facing flow is complete and production-looking: validate → brief
loading state → success state. Underneath:

- No `fetch`, no `XMLHttpRequest`, no `sendBeacon`, no WebSocket, no form POST.
- No `localStorage`, no `sessionStorage`, no cookies.
- Nothing is logged — the phone number never reaches `console.*`.
- The entered number lives only in a local variable for one page view. It is
  reduced to a masked form for display (`(***) ***-0123`) and the raw input
  value is cleared from the DOM as soon as it validates.
- Reloading the page discards everything. There is nothing to discard anywhere
  else.

The `_headers` file enforces this at the browser level as a hard backstop: the
Content-Security-Policy sets `connect-src 'none'` and `form-action 'none'`, so
the deployed page *cannot* make a network request even by accident.

Per the site owner's instruction, no "demo" / "test" / "simulation" wording
appears anywhere in the customer-facing UI. The disclosure lives here and in
the source comments only.

### Before actual production enrollment is enabled

1. Implement backend consent storage.
2. Implement actual opt-out processing.
3. Connect appropriate Twilio functionality.
4. Replace simulation handlers.
5. Change CSP `connect-src` appropriately.
6. Test end-to-end.
7. Only then treat form submissions as real consent.

---

## Pages

| Route                   | File                              | Title                                          |
| ----------------------- | --------------------------------- | ---------------------------------------------- |
| `/`                     | `index.html`                      | SMS Messaging \| Ruchie Landau Photography     |
| `/privacy-policy`       | `privacy-policy/index.html`       | Privacy Policy \| Ruchie Landau Photography    |
| `/terms-and-conditions` | `terms-and-conditions/index.html` | Terms & Conditions \| Ruchie Landau Photography |

Every page links to all three routes plus `https://www.ruchielandau.com` from
both the header navigation and the footer.

### Homepage layout

Deliberately compact — the whole point of the site lands in the first screen:

1. **Compact header** — wordmark + `SMS Messaging · Privacy · Terms · Main Website`
   on one row (two tight lines on phones).
2. **Short intro** — brand eyebrow, `SMS Messaging`, one line of purpose.
3. **One SMS card** with a two-tab strip: **Receive Texts** (default) and
   **Stop Texts**. Only the selected form is shown. Each panel swaps to its
   success view in place after a submission.
4. **Info trio** — three small cards: Help (reply HELP, phone, email), Privacy,
   Terms.
5. **SMS Information** — six-item accordion, all collapsed by default.
6. **Compact footer** — brand, operator line, four links, phone, email.

### ⚠️ Bump the asset version when you change CSS or JS

`index.html`, `privacy-policy/index.html` and `terms-and-conditions/index.html`
load the assets with a version query:

```html
<link rel="stylesheet" href="/assets/css/site.css?v=3" />
<script src="/assets/js/sms-forms.js?v=3" defer></script>
```

**Bump `v` in all three files whenever `site.css` or `sms-forms.js` changes.**

This is not cosmetic. New HTML served against an old cached `sms-forms.js`
produced a live site with no tab strip and a Sign Up button that did nothing —
the old script was looking for elements the new markup no longer had. `_headers`
backs this up (HTML always revalidates; assets cap at 10 minutes), and the test
suite fails if a page references an unversioned asset or if the three pages
disagree on the version.

### Two implementation notes worth knowing before editing

**The tabs are progressive enhancement.** The markup ships with the tab strip
`hidden` and *both* panels visible. `initTabs()` in `sms-forms.js` reveals the
strip, applies the ARIA tablist roles, and hides the inactive panel. So if the
script ever fails to load or throw-fails, the page degrades to both forms
stacked and fully usable — no dead buttons, nothing unreachable. Each feature
(`tabs`, `opt-in form`, `opt-out form`) is booted inside its own try/catch for
the same reason. Do not move `hidden` onto a panel in the HTML.

**The accordion is native `<details name="sms-faq">`.** The shared `name` gives
an exclusive accordion — one open at a time — with no JavaScript at all. On
browsers without support, more than one can be open; nothing is ever hidden
from a reader. Note that `d.open = true` in a loop will *close* the previous
item; remove the `name` attribute first if you need them all open (e.g. when
scraping the page in a test).

---

## Repository layout

```
.
├── index.html                      # / — SMS Messaging
├── privacy-policy/index.html       # /privacy-policy
├── terms-and-conditions/index.html # /terms-and-conditions
├── assets/
│   ├── css/site.css                # the entire stylesheet
│   └── js/sms-forms.js             # form validation + backend seam
├── _headers                        # Cloudflare Pages security headers
├── favicon.svg
├── robots.txt
└── sitemap.xml
```

Routes use a directory + `index.html` so the clean URLs work identically on
Cloudflare Pages and on any plain local static server.

---

## Running locally

There is **no build step and no dependencies**. Serve the repository root with
any static file server:

```bash
# Python (already installed on most machines)
python3 -m http.server 8080

# or Node
npx serve .
```

Then open <http://localhost:8080>.

Opening the `.html` files directly with `file://` will not work correctly,
because the pages reference assets with absolute paths (`/assets/...`). Use a
server.

## Building

Nothing to build. The repository *is* the deployable site — plain HTML, one CSS
file, one JS file. No framework, no bundler, no package manager, no lockfile.

---

## Deploying to Cloudflare Pages

Intended target: Cloudflare Pages, served at `sms.ruchielandau.com`.

Settings when connecting the repository:

| Setting              | Value             |
| -------------------- | ----------------- |
| Framework preset     | None              |
| Build command        | *(leave empty)*   |
| Build output directory | `/` (repo root) |

Then add `sms.ruchielandau.com` as a custom domain on the Pages project.

`_headers` is picked up automatically by Cloudflare Pages and applies the CSP
and security headers described above.

---

## Adding the backend later

`assets/js/sms-forms.js` is organised so that **only the simulation layer has
to change**. Its functions:

| Function | Role |
| --- | --- |
| `validatePhone(raw)` | NANP validation → `{ ok, e164, masked, reason }` |
| `simulateSmsOptIn(phone)` | **Replace me.** Returns a promise; sends nothing |
| `simulateSmsOptOut(phone)` | **Replace me.** Returns a promise; sends nothing |
| `showOptInSuccess(masked)` | Swaps the card to its success view |
| `showOptOutSuccess(masked)` | Same, for unsubscribe |
| `resetOptInForm()` | Restores the form ("Sign up another number") |
| `resetOptOutForm()` | Same, for unsubscribe |
| `initTabs()` | Upgrades the Receive/Stop markup into an ARIA tablist |

Both simulation functions receive the validated E.164 number
(e.g. `+18455550123`) and return a promise. To go live:

1. Replace the bodies of `simulateSmsOptIn` / `simulateSmsOptOut` with
   same-origin `fetch()` calls (rename them to `submitSmsOptIn` /
   `submitSmsOptOut` while you're there). A reference implementation is in the
   comment directly above them.
2. Reject the promise on failure and add an error branch — the success views
   are already separate from the form views, so an error view slots in the same
   way.
3. Drop `SIMULATED_LATENCY_MS` and its `delay()` helper.
4. Change `connect-src 'none'` to `connect-src 'self'` in `_headers`.

Nothing else needs to be touched. Validation, inline errors, the loading state,
the success views, phone masking, focus management, and the reset flow are all
independent of the transport.

---

## Compliance notes (please read before editing)

This site backs an A2P 10DLC Sole Proprietor campaign that was previously
rejected under Twilio error 30909 (call-to-action / opt-in could not be
verified). The following are load-bearing — do not remove or soften them for
visual reasons:

- The **website form is the only advertised way to sign up**. Do not add
  "text JOIN/START to sign up", verbal, phone, email, or business-card opt-in
  anywhere on the site.
- The **SMS consent checkbox is unchecked by default** and is reset to
  unchecked on every page load in `sms-forms.js`. It must never be pre-checked.
- The consent checkbox is **separate from** accepting the Terms or the Privacy
  Policy, and is **not a condition of purchase or booking**.
- The consent disclosure must stay at readable body size, in full, directly
  beside the checkbox — never shrink it, truncate it, or move it behind an
  accordion, tooltip, modal, or "read more".
- These phrases must remain visible: *message frequency varies*, *message and
  data rates may apply*, *Reply STOP to unsubscribe*, *Reply HELP for help*.
- **Privacy Policy** and **Terms & Conditions** are linked directly from inside
  the opt-in disclosure, as well as from the header and footer.
- The Privacy Policy states that mobile numbers and SMS consent information are
  never sold, rented, or shared with third parties or affiliates for marketing
  or promotional purposes. No other section may contradict this.
- The program is **transactional/informational only** — booking confirmations,
  session reminders, scheduling changes, and booking-related support. Do not
  add promotions, sales, coupons, newsletters, or marketing language.

## Privacy of the site itself

No analytics, no tracking pixels, no third-party scripts, no web fonts fetched
from third parties, no cookies. Typography uses system and widely available
fonts so the site makes zero third-party requests.

## Support contact details

Published in the "Need help?" section of the homepage, and on both legal pages:

- Email: rhoffmanstudios@gmail.com
- Phone: 845-213-0776

These are supplied by the business owner. They are presented as **support**
contact methods only — every page states explicitly that emailing or calling
does not sign anyone up for text messages, because the website form must remain
the single opt-in path for the A2P 10DLC campaign.
