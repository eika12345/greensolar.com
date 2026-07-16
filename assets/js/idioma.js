(function () {
	"use strict";

	function init() {
		var picker = document.getElementById("lang-picker");
		var toggle = document.getElementById("lang-picker-toggle");
		var list = document.getElementById("lang-picker-list");
		if (!picker || !toggle || !list) return;

		var flagIcon = toggle.querySelector(".lang-picker-flag");
		var textCode = toggle.querySelector(".lang-picker-code");

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
				list.querySelectorAll("li").forEach(function (li) {
					li.setAttribute("aria-selected", "false");
				});
				option.setAttribute("aria-selected", "true");

				var optionFlagClass = option.querySelector(".lang-picker-flag").className;
				flagIcon.className = optionFlagClass;
				textCode.textContent = option.getAttribute("data-lang").toUpperCase();
				close();

				// TODO: once EN/FR pages or a translation layer exist, trigger
				// the actual language switch here, e.g.:
				// window.location.href = buildLocalizedUrl(option.dataset.lang);
			});
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();