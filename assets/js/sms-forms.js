/* ==========================================================================
 * SMS FORM SIMULATION MODE
 *
 * These handlers currently simulate successful enrollment/unsubscribe
 * entirely in the browser for UI testing.
 *
 * NO DATA IS TRANSMITTED OR STORED.
 *
 * BEFORE REAL PRODUCTION ENROLLMENT:
 * Replace simulateSmsOptIn() and simulateSmsOptOut()
 * with authenticated/safe same-origin API calls and update CSP.
 * ==========================================================================
 *
 * What "simulation" means here, precisely:
 *
 *   - The customer-facing UI behaves exactly like the finished product:
 *     validate -> brief loading state -> success state.
 *   - Nothing leaves the browser. There is no fetch(), no XMLHttpRequest,
 *     no sendBeacon, no WebSocket, no form POST (the page's CSP also sets
 *     connect-src 'none' and form-action 'none' as a hard backstop).
 *   - Nothing is persisted. No localStorage, no sessionStorage, no cookies.
 *   - Nothing is logged. The phone number never reaches console.*.
 *   - The entered number lives only in a local variable for the duration of
 *     one page view, is reduced to a masked form for display, and the raw
 *     input value is cleared from the DOM as soon as it is validated.
 *
 * THE SUCCESS SCREENS ARE NOT PROOF OF CONSENT. No consent record exists
 * until the backend described above is built. See README.md.
 * ========================================================================== */

(function () {
  "use strict";

  /* Loading-state duration for the simulated round trip. Roughly what a real
     same-origin API call will feel like; delete once the API is wired up. */
  var SIMULATED_LATENCY_MS = 750;

  /* ------------------------------------------------------------------------
     1. Phone validation (North American Numbering Plan)
     ---------------------------------------------------------------------- */

  /**
   * Validates a US/Canadian mobile number without pulling in a parsing
   * library. Accepts common human formats: (845) 555-0123, 845-555-0123,
   * 8455550123, +1 845 555 0123.
   *
   * @param {string} raw
   * @returns {{ ok: boolean, e164?: string, masked?: string, reason?: string }}
   */
  function validatePhone(raw) {
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

    return {
      ok: true,
      e164: "+1" + digits,
      masked: "(***) ***-" + digits.slice(-4)
    };
  }

  /* ------------------------------------------------------------------------
     2. SIMULATION LAYER — the only part that changes when the backend lands
     ------------------------------------------------------------------------
     Both functions take the validated E.164 number and return a promise that
     resolves when the (simulated) request completes.

     Real implementation, for reference:

       function simulateSmsOptIn(phone) {          // -> submitSmsOptIn
         return fetch("/api/sms/opt-in", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ phone: phone, consent: true })
         }).then(function (res) {
           if (!res.ok) throw new Error("Request failed");
           return res.json();
         });
       }

     Note the parameter is deliberately unused below: nothing is sent.
     ---------------------------------------------------------------------- */

  function simulateSmsOptIn(/* phone */) {
    return delay(SIMULATED_LATENCY_MS);
  }

  function simulateSmsOptOut(/* phone */) {
    return delay(SIMULATED_LATENCY_MS);
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
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

  /**
   * Puts a submit button into its loading state. Uses aria-disabled rather
   * than the disabled attribute so the button keeps keyboard focus while the
   * request is in flight; the submit handler guards against double sends.
   */
  function setBusy(button, isBusy, busyLabel) {
    if (!button) return;
    var label = button.querySelector("span:not(.visually-hidden)") || button;
    if (isBusy) {
      button.dataset.idleLabel = label.textContent.trim();
      label.textContent = busyLabel;
      button.classList.add("is-busy");
      button.setAttribute("aria-disabled", "true");
      button.setAttribute("aria-busy", "true");
    } else {
      if (button.dataset.idleLabel) label.textContent = button.dataset.idleLabel;
      button.classList.remove("is-busy");
      button.removeAttribute("aria-disabled");
      button.removeAttribute("aria-busy");
    }
  }

  /** Swaps a card between its form view and its success view. */
  function showView(hideEl, showEl) {
    hideEl.hidden = true;
    showEl.hidden = false;

    // Move focus so keyboard and screen-reader users land on the new content.
    // preventScroll + an explicit scroll keeps the result centred: the success
    // view is shorter than the form it replaced, so the browser's own minimal
    // scrolling would otherwise leave the reader below the message.
    try {
      showEl.focus({ preventScroll: true });
    } catch (err) {
      showEl.focus();
    }
    if (showEl.scrollIntoView) {
      showEl.scrollIntoView({ block: "center" });
    }
  }

  function setMaskedPhone(view, masked) {
    var target = view.querySelector("[data-masked-phone]");
    if (target) target.textContent = masked;
  }

  /* ------------------------------------------------------------------------
     4. Opt-in
     ---------------------------------------------------------------------- */

  function initOptInForm() {
    var form = document.getElementById("sms-opt-in-form");
    if (!form) return;

    var formView = document.getElementById("optin-form-view");
    var successView = document.getElementById("optin-success-view");
    var phone = document.getElementById("optin-phone");
    var phoneError = document.getElementById("optin-phone-error");
    var consent = document.getElementById("optin-consent");
    var consentBlock = document.getElementById("optin-consent-block");
    var consentError = document.getElementById("optin-consent-error");
    var submit = form.querySelector('button[type="submit"]');
    var resetLink = document.getElementById("optin-reset");

    var busy = false;

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

    function showOptInSuccess(masked) {
      setMaskedPhone(successView, masked);
      showView(formView, successView);
    }

    function resetOptInForm() {
      phone.value = "";
      consent.checked = false;
      setInvalid(phone, false);
      clearError(phoneError);
      clearError(consentError);
      consentBlock.removeAttribute("data-invalid");
      setBusy(submit, false);
      busy = false;
      successView.hidden = true;
      formView.hidden = false;
      phone.focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (busy) return;

      var firstInvalid = null;

      var result = validatePhone(phone.value);
      if (result.ok) {
        setInvalid(phone, false);
        clearError(phoneError);
      } else {
        setInvalid(phone, true);
        showError(phoneError, result.reason);
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

      // Keep only what is needed for display, then clear the raw value from
      // the DOM. The full number exists solely in this local variable.
      var e164 = result.e164;
      var masked = result.masked;
      phone.value = "";

      busy = true;
      setBusy(submit, true, "Signing you up…");

      simulateSmsOptIn(e164).then(function () {
        e164 = null;
        busy = false;
        setBusy(submit, false);
        showOptInSuccess(masked);
      });
    });

    if (resetLink) {
      resetLink.addEventListener("click", function (event) {
        event.preventDefault();
        resetOptInForm();
      });
    }
  }

  /* ------------------------------------------------------------------------
     5. Opt-out
     ---------------------------------------------------------------------- */

  function initOptOutForm() {
    var form = document.getElementById("sms-opt-out-form");
    if (!form) return;

    var formView = document.getElementById("optout-form-view");
    var successView = document.getElementById("optout-success-view");
    var phone = document.getElementById("optout-phone");
    var phoneError = document.getElementById("optout-phone-error");
    var submit = form.querySelector('button[type="submit"]');
    var resetLink = document.getElementById("optout-reset");

    var busy = false;

    phone.addEventListener("input", function () {
      setInvalid(phone, false);
      clearError(phoneError);
    });

    function showOptOutSuccess(masked) {
      setMaskedPhone(successView, masked);
      showView(formView, successView);
    }

    function resetOptOutForm() {
      phone.value = "";
      setInvalid(phone, false);
      clearError(phoneError);
      setBusy(submit, false);
      busy = false;
      successView.hidden = true;
      formView.hidden = false;
      phone.focus();
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (busy) return;

      var result = validatePhone(phone.value);
      if (!result.ok) {
        setInvalid(phone, true);
        showError(phoneError, result.reason);
        phone.focus();
        return;
      }

      setInvalid(phone, false);
      clearError(phoneError);

      var e164 = result.e164;
      var masked = result.masked;
      phone.value = "";

      busy = true;
      setBusy(submit, true, "Processing…");

      simulateSmsOptOut(e164).then(function () {
        e164 = null;
        busy = false;
        setBusy(submit, false);
        showOptOutSuccess(masked);
      });
    });

    if (resetLink) {
      resetLink.addEventListener("click", function (event) {
        event.preventDefault();
        resetOptOutForm();
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. Receive / Stop tabs
     ------------------------------------------------------------------------
     Progressive enhancement. The markup ships with both panels visible and the
     tab strip hidden, so with no JavaScript nothing is unreachable and no
     control is dead. This turns that into a proper ARIA tablist.
     ---------------------------------------------------------------------- */

  function initTabs() {
    var root = document.getElementById("sms-tabs");
    if (!root) return;

    var tablist = root.querySelector("[data-tablist]");
    var tabs = [].slice.call(root.querySelectorAll("[data-tab-for]"));
    if (!tablist || tabs.length < 2) return;

    var panels = [];
    for (var i = 0; i < tabs.length; i++) {
      var panel = document.getElementById(tabs[i].getAttribute("data-tab-for"));
      if (!panel) return;
      panels.push(panel);
    }

    tablist.hidden = false;
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Receive or stop text messages");

    function select(index, moveFocus) {
      for (var i = 0; i < tabs.length; i++) {
        var isActive = i === index;
        tabs[i].setAttribute("aria-selected", isActive ? "true" : "false");
        tabs[i].tabIndex = isActive ? 0 : -1;
        panels[i].hidden = !isActive;
      }
      if (moveFocus) tabs[index].focus();
    }

    tabs.forEach(function (tab, index) {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panels[index].id);
      panels[index].setAttribute("role", "tabpanel");
      panels[index].setAttribute("aria-labelledby", tab.id);

      tab.addEventListener("click", function () {
        select(index, false);
      });

      // Standard tablist keys: arrows move and activate, Home/End jump.
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          next = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          next = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = tabs.length - 1;
        }
        if (next !== null) {
          event.preventDefault();
          select(next, true);
        }
      });
    });

    // "Receive Texts" is the default view.
    select(0, false);
  }

  /* ------------------------------------------------------------------------
     7. Mobile navigation
     ---------------------------------------------------------------------- */

  function initMobileNavigation() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".menu-toggle");
    var navigation = document.getElementById("primary-navigation");
    if (!header || !toggle || !navigation) return;

    function setOpen(isOpen) {
      header.setAttribute("data-menu-open", isOpen ? "true" : "false");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      var label = toggle.querySelector(".visually-hidden");
      if (label) label.textContent = isOpen ? "Close menu" : "Open menu";
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     8. Boot
     ------------------------------------------------------------------------
     Each feature is booted independently: if one ever throws, the others still
     work rather than the whole page going inert.
     ---------------------------------------------------------------------- */

  function boot(name, fn) {
    try {
      fn();
    } catch (err) {
      // Never log user input — only which feature failed and why.
      if (window.console && console.error) {
        console.error("sms-forms: " + name + " failed to initialise", err);
      }
    }
  }

  function init() {
    boot("mobile navigation", initMobileNavigation);
    boot("tabs", initTabs);
    boot("opt-in form", initOptInForm);
    boot("opt-out form", initOptOutForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
