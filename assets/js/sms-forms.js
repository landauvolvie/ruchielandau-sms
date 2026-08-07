/* ==========================================================================
   Ruchie Landau Photography — SMS form behaviour
   --------------------------------------------------------------------------
   FRONTEND ONLY.

   Nothing in this file transmits, stores, or logs a phone number. There is no
   fetch/XHR call, no localStorage/sessionStorage/cookie write, and no
   console output containing user input. The two handlers at the top of this
   file are deliberate stubs — they are the ONLY place a real backend call
   needs to be added later.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     1. BACKEND SEAM
     ------------------------------------------------------------------------
     Replace the bodies of these two functions when the API exists. Each takes
     the validated E.164 phone number and resolves with a message to display.

     Example of the eventual implementation:

       async function submitOptIn(phone) {
         const res = await fetch("/api/sms/opt-in", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ phone: phone, consent: true })
         });
         if (!res.ok) throw new Error("Request failed");
         return {
           title: "You're signed up.",
           body: "Check your phone for a confirmation text message."
         };
       }

     Until then they must NOT imply that anything was recorded.
     ---------------------------------------------------------------------- */

  function submitOptIn(/* phone */) {
    return Promise.resolve({
      title: "SMS enrollment is not yet active. No consent has been recorded.",
      body:
        "This sign-up form is not connected yet. Your phone number was not sent " +
        "anywhere and was not saved. Please check back soon."
    });
  }

  function submitOptOut(/* phone */) {
    return Promise.resolve({
      title:
        "Online SMS unsubscribe is not yet active. No changes have been made.",
      body:
        "Your phone number was not sent anywhere and was not saved. If you are " +
        "already receiving text messages, reply STOP to any Ruchie Landau " +
        "Photography message to unsubscribe."
    });
  }

  /* ------------------------------------------------------------------------
     2. Phone validation (North American Numbering Plan)
     ---------------------------------------------------------------------- */

  /**
   * Validates a US/Canadian mobile number without pulling in a parsing
   * library. Accepts common human formats: (845) 555-0123, 845-555-0123,
   * 8455550123, +1 845 555 0123.
   *
   * @param {string} raw
   * @returns {{ ok: boolean, e164?: string, reason?: string }}
   */
  function parseNorthAmericanNumber(raw) {
    var trimmed = String(raw || "").trim();

    if (trimmed === "") {
      return { ok: false, reason: "Please enter your mobile phone number." };
    }

    var digits = trimmed.replace(/\D/g, "");

    // Allow a leading country code of 1.
    if (digits.length === 11 && digits.charAt(0) === "1") {
      digits = digits.slice(1);
    }

    if (digits.length !== 10) {
      return {
        ok: false,
        reason:
          "Please enter a 10-digit US or Canadian mobile number, including the area code."
      };
    }

    // NANP rules: area code and exchange code both start with 2-9.
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) {
      return {
        ok: false,
        reason:
          "That does not look like a valid US or Canadian mobile number. Please check it and try again."
      };
    }

    return { ok: true, e164: "+1" + digits };
  }

  /* ------------------------------------------------------------------------
     3. Small DOM helpers
     ---------------------------------------------------------------------- */

  function showError(errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.setAttribute("data-visible", "true");
  }

  function clearError(errorEl) {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.removeAttribute("data-visible");
  }

  function setInvalid(input, isInvalid) {
    if (!input) return;
    if (isInvalid) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function renderNotice(statusEl, result) {
    if (!statusEl) return;
    statusEl.innerHTML = "";

    var notice = document.createElement("div");
    notice.className = "notice";

    var title = document.createElement("p");
    title.className = "notice__title";
    title.textContent = result.title;
    notice.appendChild(title);

    if (result.body) {
      var body = document.createElement("p");
      body.textContent = result.body;
      notice.appendChild(body);
    }

    statusEl.appendChild(notice);
  }

  function clearNotice(statusEl) {
    if (statusEl) statusEl.innerHTML = "";
  }

  /* ------------------------------------------------------------------------
     4. Opt-in form
     ---------------------------------------------------------------------- */

  function initOptInForm() {
    var form = document.getElementById("sms-opt-in-form");
    if (!form) return;

    var phone = document.getElementById("optin-phone");
    var phoneError = document.getElementById("optin-phone-error");
    var consent = document.getElementById("optin-consent");
    var consentBlock = document.getElementById("optin-consent-block");
    var consentError = document.getElementById("optin-consent-error");
    var status = document.getElementById("optin-status");

    // COMPLIANCE: the consent checkbox must never arrive pre-checked. Browsers
    // restore checkbox state on soft reload / back-navigation, so it is reset
    // explicitly on every load. It is only ever checked by a real user action.
    consent.checked = false;

    phone.addEventListener("input", function () {
      setInvalid(phone, false);
      clearError(phoneError);
    });

    consent.addEventListener("change", function () {
      consentBlock.removeAttribute("data-invalid");
      clearError(consentError);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearNotice(status);

      var firstInvalid = null;

      var parsed = parseNorthAmericanNumber(phone.value);
      if (parsed.ok) {
        setInvalid(phone, false);
        clearError(phoneError);
      } else {
        setInvalid(phone, true);
        showError(phoneError, parsed.reason);
        firstInvalid = phone;
      }

      if (consent.checked) {
        consentBlock.removeAttribute("data-invalid");
        clearError(consentError);
      } else {
        consentBlock.setAttribute("data-invalid", "true");
        showError(
          consentError,
          "Please check the box to agree to receive SMS messages before signing up."
        );
        if (!firstInvalid) firstInvalid = consent;
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      submitOptIn(parsed.e164).then(function (result) {
        renderNotice(status, result);
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. Opt-out form
     ---------------------------------------------------------------------- */

  function initOptOutForm() {
    var form = document.getElementById("sms-opt-out-form");
    if (!form) return;

    var phone = document.getElementById("optout-phone");
    var phoneError = document.getElementById("optout-phone-error");
    var status = document.getElementById("optout-status");

    phone.addEventListener("input", function () {
      setInvalid(phone, false);
      clearError(phoneError);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearNotice(status);

      var parsed = parseNorthAmericanNumber(phone.value);
      if (!parsed.ok) {
        setInvalid(phone, true);
        showError(phoneError, parsed.reason);
        phone.focus();
        return;
      }

      setInvalid(phone, false);
      clearError(phoneError);

      submitOptOut(parsed.e164).then(function (result) {
        renderNotice(status, result);
      });
    });
  }

  /* ------------------------------------------------------------------------
     6. Boot
     ---------------------------------------------------------------------- */

  function init() {
    initOptInForm();
    initOptOutForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
