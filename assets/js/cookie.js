/* ============================================================
   Cookie Consent Manager
   - Categories match politica-de-cookies.html exactly:
     tecnicas, analisis, funcionalidad, publicidad, publicidad_comportamental
   - Consent is stored in a first-party cookie as JSON.
   - Nothing in category 4/5 below is loading anything yet
     (no Analytics/Ads on this site currently) — when you add
     Google Analytics later, put the loader call inside
     loadScriptsForCategory('analisis') and it will only ever
     fire after the visitor has actually consented to it.
   ============================================================ */

(function () {
	"use strict";

	var COOKIE_NAME = "cookie_consent";
	var COOKIE_DAYS = 365;

	var CATEGORIES = [
		{
			key: "tecnicas",
			locked: true,
			defaultValue: true
		},
		{
			key: "analisis",
			locked: false,
			defaultValue: false
		},
		{
			key: "funcionalidad",
			locked: false,
			defaultValue: false
		},
		{
			key: "publicidad",
			locked: false,
			defaultValue: false
		},
		{
			key: "publicidad_comportamental",
			locked: false,
			defaultValue: false
		}
	];

	/* ---------- cookie helpers ---------- */

	function setCookie(name, value, days) {
		var d = new Date();
		d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
		document.cookie = name + "=" + encodeURIComponent(value) +
			"; expires=" + d.toUTCString() +
			"; path=/; SameSite=Lax" +
			(location.protocol === "https:" ? "; Secure" : "");
	}

	function getCookie(name) {
		var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
		return match ? decodeURIComponent(match[2]) : null;
	}

	function deleteCookie(name) {
		document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
	}

	function readConsent() {
		var raw = getCookie(COOKIE_NAME);
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch (e) {
			return null;
		}
	}

	function writeConsent(consent) {
		consent.updatedAt = new Date().toISOString();
		setCookie(COOKIE_NAME, JSON.stringify(consent), COOKIE_DAYS);
	}

	/* ---------- script gating ----------
	   Call this after consent is known/changed. Add real script
	   injection per category as you adopt new tools. Each branch
	   should only ever run once (guard with a flag) since this
	   can be called multiple times in a session. */

	var loadedCategories = {};

	function loadScriptsForCategory(categoryKey) {
		if (loadedCategories[categoryKey]) return;
		loadedCategories[categoryKey] = true;

		switch (categoryKey) {
			case "analisis":
				// Example for later, once you have a GA4 ID:
				// var s = document.createElement("script");
				// s.src = "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX";
				// s.async = true;
				// document.head.appendChild(s);
				// window.dataLayer = window.dataLayer || [];
				// function gtag(){ dataLayer.push(arguments); }
				// gtag("js", new Date());
				// gtag("config", "G-XXXXXXX");
				break;
			case "publicidad":
			case "publicidad_comportamental":
				// Meta Pixel / Google Ads tags would go here later.
				break;
			case "funcionalidad":
				// Social share widgets, feedback widgets, etc. would go here.
				break;
			default:
				break;
		}
	}

	function applyConsent(consent) {
		CATEGORIES.forEach(function (cat) {
			if (consent[cat.key]) {
				loadScriptsForCategory(cat.key);
			}
		});
	}

	/* ---------- UI wiring ---------- */

	function buildConsentFromToggles() {
		var consent = {};
		CATEGORIES.forEach(function (cat) {
			if (cat.locked) {
				consent[cat.key] = true;
				return;
			}
			var input = document.getElementById("cookie-toggle-" + cat.key);
			consent[cat.key] = !!(input && input.checked);
		});
		return consent;
	}

	function setToggles(consent) {
		CATEGORIES.forEach(function (cat) {
			var input = document.getElementById("cookie-toggle-" + cat.key);
			if (!input) return;
			input.checked = cat.locked ? true : !!consent[cat.key];
		});
	}

	function allConsent(value) {
		var consent = {};
		CATEGORIES.forEach(function (cat) {
			consent[cat.key] = cat.locked ? true : value;
		});
		return consent;
	}

	function showModal() {
		var overlay = document.getElementById("cookie-modal-overlay");
		if (!overlay) return;
		var current = readConsent() || allConsent(false);
		setToggles(current);
		overlay.classList.add("visible");
		// Force a reflow, then add "open" on the next frame so the
		// transform/opacity transition actually animates instead of
		// jumping straight to its end state.
		requestAnimationFrame(function () {
			requestAnimationFrame(function () {
				overlay.classList.add("open");
			});
		});
	}

	function hideModal() {
		var overlay = document.getElementById("cookie-modal-overlay");
		if (!overlay) return;
		overlay.classList.remove("open");
		setTimeout(function () {
			overlay.classList.remove("visible");
		}, 300);
	}

	function showBanner() {
		var banner = document.getElementById("cookie-banner");
		if (!banner) return;
		banner.classList.add("visible");
		requestAnimationFrame(function () {
			requestAnimationFrame(function () {
				banner.classList.add("open");
			});
		});
	}

	function hideBanner() {
		var banner = document.getElementById("cookie-banner");
		if (!banner) return;
		banner.classList.remove("open");
		setTimeout(function () {
			banner.classList.remove("visible");
		}, 250);
	}

	function showReopenTab() {
		var tab = document.getElementById("cookie-reopen-tab");
		if (tab) tab.classList.add("visible");
	}

	function finalizeConsent(consent) {
		writeConsent(consent);
		applyConsent(consent);
		hideBanner();
		hideModal();
		showReopenTab();
	}

	function initAccordion() {
		var headers = document.querySelectorAll(".cookie-category-header");
		headers.forEach(function (header) {
			header.addEventListener("click", function (e) {
				// Don't toggle the accordion when the click was on the switch itself.
				if (e.target.closest(".cookie-toggle")) return;
				header.closest(".cookie-category").classList.toggle("open");
			});
		});
	}

	function init() {
		initAccordion();

		var existing = readConsent();
		if (existing) {
			applyConsent(existing);
			showReopenTab();
		} else {
			showBanner();
		}

		var acceptAllBtns = document.querySelectorAll("[data-cookie-action='accept-all']");
		acceptAllBtns.forEach(function (btn) {
			btn.addEventListener("click", function () {
				finalizeConsent(allConsent(true));
			});
		});

		var rejectAllBtns = document.querySelectorAll("[data-cookie-action='reject-all']");
		rejectAllBtns.forEach(function (btn) {
			btn.addEventListener("click", function () {
				finalizeConsent(allConsent(false));
			});
		});

		var saveBtn = document.querySelector("[data-cookie-action='save']");
		if (saveBtn) {
			saveBtn.addEventListener("click", function () {
				finalizeConsent(buildConsentFromToggles());
			});
		}

		var customizeBtns = document.querySelectorAll("[data-cookie-action='customize']");
		customizeBtns.forEach(function (btn) {
			btn.addEventListener("click", function () {
				hideBanner();
				showModal();
			});
		});

		var closeBtn = document.getElementById("cookie-modal-close");
		if (closeBtn) {
			closeBtn.addEventListener("click", hideModal);
		}

		var overlay = document.getElementById("cookie-modal-overlay");
		if (overlay) {
			overlay.addEventListener("click", function (e) {
				if (e.target === overlay) hideModal();
			});
		}

		var reopenTab = document.getElementById("cookie-reopen-tab");
		if (reopenTab) {
			reopenTab.addEventListener("click", showModal);
		}
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();