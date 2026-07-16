(function () {
	"use strict";

	var SUPPORTED_LANGS = ["es", "en", "fr"];
	var STORAGE_KEY = "green_solar_lang";
	var dictionaries = {};

	var flagIcon, textCode, list;

	function getSavedLang() {
		var saved = localStorage.getItem(STORAGE_KEY);
		return SUPPORTED_LANGS.indexOf(saved) !== -1 ? saved : "es";
	}

	function loadDictionary(lang) {
		if (dictionaries[lang]) return Promise.resolve(dictionaries[lang]);
		return fetch("assets/lang/" + lang + ".json")
			.then(function (res) { return res.json(); })
			.then(function (data) {
				dictionaries[lang] = data;
				return data;
			});
	}

	function applyDictionary(dict) {
		document.querySelectorAll("[data-i18n]").forEach(function (el) {
			var key = el.getAttribute("data-i18n");
			var value = dict[key];
			if (value === undefined) return;

			var attr = el.getAttribute("data-i18n-attr");
			if (attr) {
				el.setAttribute(attr, value);
			} else {
				el.textContent = value;
			}
		});
	}

	function syncPickerUI(lang) {
		if (!list || !flagIcon || !textCode) return;
		var options = list.querySelectorAll("li");
		options.forEach(function (li) {
			var isMatch = li.getAttribute("data-lang") === lang;
			li.setAttribute("aria-selected", isMatch ? "true" : "false");
			if (isMatch) {
				flagIcon.className = li.querySelector(".lang-picker-flag").className;
				textCode.textContent = lang.toUpperCase();
			}
		});
	}

	function setLanguage(lang) {
		if (SUPPORTED_LANGS.indexOf(lang) === -1) lang = "es";
		loadDictionary(lang)
			.then(function (dict) {
				applyDictionary(dict);
				document.documentElement.setAttribute("lang", lang);
				localStorage.setItem(STORAGE_KEY, lang);
				syncPickerUI(lang);
			})
			.catch(function (err) {
				console.error("Failed to load language file:", lang, err);
			});
	}

	function init() {
		var picker = document.getElementById("lang-picker");
		var toggle = document.getElementById("lang-picker-toggle");
		list = document.getElementById("lang-picker-list");
		if (!picker || !toggle || !list) return;

		flagIcon = toggle.querySelector(".lang-picker-flag");
		textCode = toggle.querySelector(".lang-picker-code");

		function close() {
			picker.classList.remove("open");
			toggle.setAttribute("aria-expanded", "false");
		}

		function open() {
			picker.classList.add("open");
			toggle.setAttribute("aria-expanded", "true");
		}

		toggle.addEventListener("click", function (e) {
			e.stopPropagation();
			if (picker.classList.contains("open")) close();
			else open();
		});

		document.addEventListener("click", function (e) {
			if (!picker.contains(e.target)) close();
		});

		list.querySelectorAll("li").forEach(function (option) {
			option.addEventListener("click", function () {
				close();
				setLanguage(option.getAttribute("data-lang"));
			});
		});

		// Apply + reflect the saved language every time, regardless
		// of when this script happens to run relative to DOM parsing.
		setLanguage(getSavedLang());
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();

