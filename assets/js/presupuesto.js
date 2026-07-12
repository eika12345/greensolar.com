(function () {
	'use strict';

	var form = document.getElementById('presupuesto-form');
	if (!form) return; // safety: script loaded on a page without the form

	var TOTAL_STEPS = 6;

	var state = {
		step: 1,
		data: {
			tipoInstalacion: '',
			tipoTejado: '',
			consumoMensual: 300,
			tejadoAncho: 10,
			tejadoAlto: 10,
			ubicacion: '',
			direccion: '',
			factura: null,
			nombre: '',
			telefono: '',
			email: ''
		}
	};

	var steps = form.querySelectorAll('.form-step');
	var progressFill = document.getElementById('progress-fill');
	var currentStepNum = document.getElementById('current-step-num');
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

	function formatNumber(n) {
		return n.toLocaleString('es-ES');
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
		currentStepNum.textContent = n;
		progressFill.style.width = ((n - 1) / (TOTAL_STEPS - 1)) * 100 + '%';

		btnPrev.classList.toggle('visible', n > 1);

		if (n === TOTAL_STEPS) {
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
		if (state.step < TOTAL_STEPS) goToStep(state.step + 1);
	});

	btnPrev.addEventListener('click', function () {
		if (state.step > 1) goToStep(state.step - 1);
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
		state.data.tipoTejado = fd.get('tipoTejado') || '';
		state.data.ubicacion = fd.get('ubicacion') || '';
		state.data.direccion = fd.get('direccion') || '';
		state.data.nombre = fd.get('nombre') || '';
		state.data.telefono = fd.get('telefono') || '';
		state.data.email = fd.get('email') || '';
		state.data.factura = fd.get('factura');
	}

	function renderConfirmation(estimate) {
		var roofNote = estimate.cabeEnTejado
			? 'Tu tejado tiene espacio suficiente para esta instalaci\u00F3n.'
			: '\u26A0\uFE0F El espacio es ajustado \u2014 uno de nuestros t\u00E9cnicos confirmar\u00E1 la distribuci\u00F3n exacta en la visita.';

		confirmationScreen.innerHTML =
			'<h3>\u00A1Formulario enviado!</h3>' +
			'<p>Gracias, ' + escapeHtml(state.data.nombre.split(' ')[0] || '') + '. Nuestros agentes se pondr\u00E1n en contacto contigo lo antes posible.</p>' +
			'<div class="estimate-card">' +
			'<h4>Tu estimaci\u00F3n orientativa</h4>' +
			'<p><strong>' + estimate.numPaneles + '</strong> paneles solares (\u2248 ' + estimate.potenciaKw + ' kW de potencia)</p>' +
			'<p>Superficie necesaria: ' + estimate.superficieNecesaria + ' m\u00B2 \u2014 ' + roofNote + '</p>' +
			'<p>Ahorro anual estimado: <strong>' + formatNumber(estimate.ahorroAnualEstimado) + ' \u20AC</strong></p>' +
			'<small>Esta es una estimaci\u00F3n orientativa calculada a partir de los datos que nos has facilitado. Un t\u00E9cnico confirmar\u00E1 los datos exactos tras la visita.</small>' +
			'</div>';

		form.style.display = 'none';
		document.querySelector('#presupuesto .progress-bar').style.display = 'none';
		document.querySelector('#presupuesto .step-counter').style.display = 'none';
		confirmationScreen.classList.add('active');
	}

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
		btnSubmit.textContent = isSubmitting ? 'Enviando...' : 'Enviar';
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		if (!isStepValid(TOTAL_STEPS)) return;

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
						throw new Error(json.error || 'Ha ocurrido un error al enviar el formulario.');
					}
					return json;
				});
			})
			.then(function (json) {
				renderConfirmation(json.estimate);
			})
			.catch(function (err) {
				showError(err.message || 'No se ha podido enviar el formulario. Comprueba tu conexi\u00F3n e int\u00E9ntalo de nuevo.');
			})
			.finally(function () {
				setSubmitting(false);
			});
	});

	// init
	goToStep(1);
})();