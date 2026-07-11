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

	// ── Estimate calculation (shown on the confirmation screen) ──
	function calculateEstimate() {
		var consumoMensual = state.data.consumoMensual;
		var tejadoAncho = state.data.tejadoAncho;
		var tejadoAlto = state.data.tejadoAlto;

		var consumoAnualKwh = consumoMensual * 12;
		var horasSolPico = 4.5; // average for Alicante/Murcia/Valencia region
		var eficienciaSistema = 0.8; // losses, inverter, wiring
		var potenciaWattPanel = 450;

		var potenciaNecesariaKw = consumoAnualKwh / (horasSolPico * 365 * eficienciaSistema);
		var numPaneles = Math.max(1, Math.ceil((potenciaNecesariaKw * 1000) / potenciaWattPanel));

		var superficieTejado = tejadoAncho * tejadoAlto;
		var superficieNecesaria = numPaneles * 1.7; // m2 per panel incl. spacing/mounting
		var cabeEnTejado = superficieTejado >= superficieNecesaria;

		var precioKwh = 0.15;
		var ahorroAnualEstimado = consumoAnualKwh * precioKwh * 0.7; // ~70% self-consumption offset

		return {
			potenciaKw: potenciaNecesariaKw.toFixed(2),
			numPaneles: numPaneles,
			superficieNecesaria: superficieNecesaria.toFixed(1),
			cabeEnTejado: cabeEnTejado,
			ahorroAnualEstimado: Math.round(ahorroAnualEstimado)
		};
	}

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
			? '\u2705 Tu tejado tiene espacio suficiente para esta instalaci\u00F3n.'
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

	function escapeHtml(str) {
		var div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		if (!isStepValid(TOTAL_STEPS)) return;

		collectFormData();
		var estimate = calculateEstimate();

		// TODO: send state.data + estimate to your backend/email endpoint here,
		// e.g. via fetch('/api/presupuesto', { method: 'POST', body: new FormData(form) })

		renderConfirmation(estimate);
	});

	// init
	goToStep(1);
})();