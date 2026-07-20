(function () {
	'use strict';

	var form = document.getElementById('presupuesto-form');
	if (!form) return; // safety: script loaded on a page without the form

	var ALL_STEPS = [1, 2, 3, 4, 5, 6, 7];
	var SOLAR_ONLY_STEPS = [3, 4, 5]; // tipo de tejado, consumo, superficie tejado

	var state = {
		step: 1,
		data: {
			tipoInstalacion: '',
			tipoServicio: '',
			tipoTejado: '',
			consumoMensual: 300,
			tejadoAncho: 10,
			tejadoAlto: 10,
			ubicacion: '',
			direccion: '',
			factura: null,
			nombre: '',
			telefono: '',
			email: '',
			comentarios: ''
		}
	};

	function getSelectedService() {
		var checked = form.querySelector('input[name="tipoServicio"]:checked');
		return checked ? checked.value : '';
	}

	// Roof/consumption questions only make sense for a solar installation —
	// every other service skips straight from "tipo de servicio" to "ubicacion".
	function getVisibleSteps() {
		if (getSelectedService() === 'fotovoltaica') return ALL_STEPS;
		return ALL_STEPS.filter(function (s) {
			return SOLAR_ONLY_STEPS.indexOf(s) === -1;
		});
	}

	var steps = form.querySelectorAll('.form-step');
	var progressFill = document.getElementById('progress-fill');
	var currentStepNum = document.getElementById('current-step-num');
	var totalStepsNum = document.getElementById('total-steps-num');
	var btnPrev = document.getElementById('btn-prev');
	var btnNext = document.getElementById('btn-next');
	var btnSubmit = document.getElementById('btn-submit');
	var confirmationScreen = document.getElementById('confirmation-screen');

	// ── Slider elements ──
	var consumoSlider = document.getElementById('consumo-slider');
	var consumoValue = document.getElementById('consumo-value');
	var consumoAnual = document.getElementById('consumo-anual');

	var anchoSlider = document.getElementById('ancho-slider');
	var anchoValue = document.getElementById('ancho-value');
	var altoSlider = document.getElementById('alto-slider');
	var altoValue = document.getElementById('alto-value');
	var superficieValue = document.getElementById('superficie-value');

	// Thin wrapper around window.i18n.t() so this file never hard-crashes if
	// idioma.js hasn't initialized yet, and falls back to the key itself.
	function t(key, params) {
		if (window.i18n && typeof window.i18n.t === 'function') {
			return window.i18n.t(key, params);
		}
		return key;
	}

	function getNumberLocale() {
		return (window.i18n && window.i18n.getNumberLocale) ? window.i18n.getNumberLocale() : 'es-ES';
	}

	function formatNumber(n) {
		return n.toLocaleString(getNumberLocale());
	}

	function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
	}

	// ── Step navigation ──
	function goToStep(n) {
		steps.forEach(function (el) {
			el.classList.toggle('active', Number(el.dataset.step) === n);
		});
		state.step = n;

		var visible = getVisibleSteps();
		var index = visible.indexOf(n);
		if (index === -1) index = 0; // safety fallback

		currentStepNum.textContent = index + 1;
		totalStepsNum.textContent = visible.length;
		progressFill.style.width = (visible.length > 1 ? (index / (visible.length - 1)) * 100 : 0) + '%';

		btnPrev.classList.toggle('visible', index > 0);

		if (index === visible.length - 1) {
			btnNext.classList.add('hidden');
			btnSubmit.classList.add('visible');
		} else {
			btnNext.classList.remove('hidden');
			btnSubmit.classList.remove('visible');
		}

		// move focus to the new step's heading for keyboard/screen-reader users
		var heading = form.querySelector('.form-step.active h3');
		if (heading) {
			heading.setAttribute('tabindex', '-1');
			heading.focus();
		}
	}

	function isStepValid(n) {
		var stepEl = form.querySelector('.form-step[data-step="' + n + '"]');
		var inputs = stepEl.querySelectorAll('input[required]');
		var valid = true;

		// group radios by name so we only need one checked per group
		var radioGroups = {};
		inputs.forEach(function (input) {
			if (input.type === 'radio') {
				radioGroups[input.name] = radioGroups[input.name] || [];
				radioGroups[input.name].push(input);
			} else if (!input.checkValidity()) {
				input.reportValidity();
				valid = false;
			}
		});

		Object.keys(radioGroups).forEach(function (name) {
			var group = radioGroups[name];
			var checked = group.some(function (r) { return r.checked; });
			if (!checked) {
				valid = false;
				group[0].closest('.option-cards').classList.add('shake');
				setTimeout(function () {
					group[0].closest('.option-cards').classList.remove('shake');
				}, 400);
			}
		});

		return valid;
	}

	btnNext.addEventListener('click', function () {
		if (!isStepValid(state.step)) return;
		var visible = getVisibleSteps();
		var index = visible.indexOf(state.step);
		if (index > -1 && index < visible.length - 1) goToStep(visible[index + 1]);
	});

	btnPrev.addEventListener('click', function () {
		var visible = getVisibleSteps();
		var index = visible.indexOf(state.step);
		if (index > 0) goToStep(visible[index - 1]);
	});

	// ── Step 2: tipo de servicio (affects whether solar-only steps 3-5 are shown) ──
	form.querySelectorAll('input[name="tipoServicio"]').forEach(function (radio) {
		radio.addEventListener('change', function () {
			state.data.tipoServicio = radio.value;
			goToStep(state.step); // re-render counter/progress bar against the new visible-steps list
		});
	});

	// ── Step 3: consumo slider ──
	consumoSlider.addEventListener('input', function (e) {
		var kw = Number(e.target.value);
		state.data.consumoMensual = kw;
		consumoValue.textContent = formatNumber(kw);
		consumoAnual.textContent = formatNumber(kw * 12) + ' kWh';
	});

	// ── Step 4: roof surface sliders ──
	function updateSuperficie() {
		var ancho = Number(anchoSlider.value);
		var alto = Number(altoSlider.value);
		state.data.tejadoAncho = ancho;
		state.data.tejadoAlto = alto;
		anchoValue.textContent = ancho;
		altoValue.textContent = alto;
		superficieValue.textContent = formatNumber(Math.round(ancho * alto * 10) / 10) + ' m\u00B2';
	}
	anchoSlider.addEventListener('input', updateSuperficie);
	altoSlider.addEventListener('input', updateSuperficie);

	function collectFormData() {
		var fd = new FormData(form);
		state.data.tipoInstalacion = fd.get('tipoInstalacion') || '';
		state.data.tipoServicio = fd.get('tipoServicio') || '';
		state.data.tipoTejado = fd.get('tipoTejado') || '';
		state.data.ubicacion = fd.get('ubicacion') || '';
		state.data.direccion = fd.get('direccion') || '';
		state.data.nombre = fd.get('nombre') || '';
		state.data.telefono = fd.get('telefono') || '';
		state.data.email = fd.get('email') || '';
		state.data.comentarios = fd.get('comentarios') || '';
		state.data.factura = fd.get('factura');
	}

	// Kept so the confirmation screen can be re-rendered in the new language
	// if the user switches languages after submitting (see i18n:change below).
	var lastEstimate = null;

	function renderConfirmation(estimate) {
		lastEstimate = estimate;

		var greeting = '<h3>' + t('presupuesto.confirmation.title') + '</h3>' +
			'<p>' + t('presupuesto.confirmation.thanks', { nombre: escapeHtml(state.data.nombre.split(' ')[0] || '') }) + '</p>';

		var estimateCard = '';
		if (estimate.esFotovoltaica) {
			var roofNote = estimate.cabeEnTejado
				? t('presupuesto.confirmation.roof_fits')
				: t('presupuesto.confirmation.roof_tight');

			var panelsLine = t('presupuesto.confirmation.panels_line', {
				num: '<strong>' + estimate.numPaneles + '</strong>',
				kw: estimate.potenciaKw
			});
			var surfaceLine = t('presupuesto.confirmation.surface_line', {
				surface: estimate.superficieNecesaria,
				roofNote: roofNote
			});
			var savingsLine = t('presupuesto.confirmation.savings_line', {
				amount: '<strong>' + formatNumber(estimate.ahorroAnualEstimado) + ' \u20AC</strong>'
			});

			estimateCard =
				'<div class="estimate-card">' +
				'<h4>' + t('presupuesto.confirmation.estimate_title') + '</h4>' +
				'<p>' + panelsLine + '</p>' +
				'<p>' + surfaceLine + '</p>' +
				'<p>' + savingsLine + '</p>' +
				'<small>' + t('presupuesto.confirmation.disclaimer') + '</small>' +
				'</div>';
		}

		confirmationScreen.innerHTML = greeting + estimateCard;

		form.style.display = 'none';
		document.querySelector('#presupuesto .progress-bar').style.display = 'none';
		document.querySelector('#presupuesto .step-counter').style.display = 'none';
		confirmationScreen.classList.add('active');
	}

	// If the confirmation screen is already showing and the user switches
	// language via the picker, re-render it so it isn't left stuck in
	// whatever language it was originally submitted in.
	document.addEventListener('i18n:change', function () {
		if (lastEstimate && confirmationScreen.classList.contains('active')) {
			renderConfirmation(lastEstimate);
		}
	});

	var formError = document.getElementById('form-error');

	function showError(message) {
		formError.textContent = message;
		formError.classList.add('visible');
	}

	function clearError() {
		formError.textContent = '';
		formError.classList.remove('visible');
	}

	function setSubmitting(isSubmitting) {
		btnSubmit.disabled = isSubmitting;
		btnPrev.disabled = isSubmitting;
		// Restoring to t('presupuesto.nav.submit') (rather than a hardcoded
		// 'Enviar') keeps this correct even if the user changed language
		// while the request was in flight.
		btnSubmit.textContent = isSubmitting ? t('presupuesto.nav.sending') : t('presupuesto.nav.submit');
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var visible = getVisibleSteps();
		var lastStep = visible[visible.length - 1];
		if (!isStepValid(lastStep)) return;

		collectFormData();
		clearError();
		setSubmitting(true);

		var formData = new FormData(form);

		fetch('procesar-presupuesto.php', {
			method: 'POST',
			body: formData
		})
			.then(function (response) {
				return response.json().then(function (json) {
					if (!response.ok || !json.success) {
						// errorCode is a machine-readable key from the server
						// (e.g. 'invalid_email', 'file_too_large') that we can
						// translate; json.error is a Spanish-only fallback in
						// case the server sends a code we don't have a key for.
						var translated = json.errorCode ? t('presupuesto.error.' + json.errorCode) : null;
						var message = (translated && translated.indexOf('presupuesto.error.') !== 0)
							? translated
							: (json.error || t('presupuesto.error.generic'));
						throw new Error(message);
					}
					return json;
				});
			})
			.then(function (json) {
				renderConfirmation(json.estimate);
			})
			.catch(function (err) {
				showError(err.message || t('presupuesto.error.generic'));
			})
			.finally(function () {
				setSubmitting(false);
			});
	});

	// init
	goToStep(1);
})();