# Ruchie Landau Photography — SMS Messaging site

The public SMS consent and compliance website for **Ruchie Landau Photography**.

Ruchie Landau Photography is operated by Wolf Landau, sole proprietor.

The site exists so that customers — and messaging-compliance reviewers
(Twilio / TCR, A2P 10DLC Sole Proprietor) — can see exactly how someone signs
up for text messages, what messages they will get, and how to stop them.

Intended production hostname: **https://sms.ruchielandau.com**

---

## ⚠️ This is currently FRONTEND ONLY

There is **no backend of any kind** in this repository — no API, no Worker, no
database, no D1, no KV, no Twilio integration, no authentication.

Actual SMS opt-in and opt-out processing has intentionally **not** been
implemented yet. It will be added after the Twilio campaign is approved.

What that means in practice:

- Both forms validate **in the browser only**.
- No phone number is transmitted, stored, or logged. There is no `fetch`, no
  `localStorage` / `sessionStorage` / cookie write, and no `console` output
  containing user input.
- Neither form ever claims that consent was recorded. On a valid submission
  they show a plain notice instead:
  - Opt-in → *"SMS enrollment is not yet active. No consent has been recorded."*
  - Opt-out → *"Online SMS unsubscribe is not yet active. No changes have been made."*

The `_headers` file enforces this at the browser level too: the
Content-Security-Policy sets `connect-src 'none'` and `form-action 'none'`, so
the deployed page *cannot* make a network request even by accident.

---

## Pages

| Route                   | File                              | Title                                          |
| ----------------------- | --------------------------------- | ---------------------------------------------- |
| `/`                     | `index.html`                      | SMS Messaging \| Ruchie Landau Photography     |
| `/privacy-policy`       | `privacy-policy/index.html`       | Privacy Policy \| Ruchie Landau Photography    |
| `/terms-and-conditions` | `terms-and-conditions/index.html` | Terms & Conditions \| Ruchie Landau Photography |

The homepage contains, in order: an introduction, the **Receive SMS Updates**
opt-in form, the **Stop SMS Messages** opt-out section, a **Need help?**
section, and the **SMS Program Information** FAQ.

Every page links to all three routes plus `https://www.ruchielandau.com` from
both the header navigation and the footer.

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

Everything that needs to change lives at the **top of
`assets/js/sms-forms.js`**, in the section marked `BACKEND SEAM`:

```js
function submitOptIn(phone) { ... }   // phone arrives as validated E.164, e.g. "+18455550123"
function submitOptOut(phone) { ... }  // same
```

Both are async (they return a promise) and resolve with `{ title, body }`,
which is rendered into the form's status region. To connect a real API you only
need to:

1. Replace the two function bodies with `fetch()` calls.
2. Return success/failure wording that reflects what actually happened.
3. Change `connect-src 'none'` to `connect-src 'self'` in `_headers`.

Nothing else in the site needs to be touched. The phone-number parsing,
validation, inline error handling, and accessible status messaging already work
and are independent of the transport.

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
- The consent disclosure must stay at readable body size — never shrink it.
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

## Known gap

Business contact details (email address, phone number, mailing address) are
intentionally **omitted** from the "Need help?" section. They could not be
verified against the live ruchielandau.com site when this was built, and
unverified contact details do not belong on a compliance page. Add them to the
marked spot in `index.html` once confirmed — a reviewer-visible email or phone
number is a nice-to-have, not a requirement, since HELP is handled over SMS.
