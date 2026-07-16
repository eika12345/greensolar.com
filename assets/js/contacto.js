(function () {
	'use strict';

	var form = document.getElementById('contact-form');
	if (!form) return; // safety: script loaded on a page without the form

	var submitBtn = form.querySelector('input[type="submit"]');
	var status = document.getElementById('form-status');

	function setSubmitting(isSubmitting) {
		submitBtn.disabled = isSubmitting;
		submitBtn.value = isSubmitting ? 'Enviando...' : 'Enviar Mensaje';
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();

		setSubmitting(true);
		status.textContent = '';

		var formData = new FormData(form);

		fetch('contacto.php', {
			method: 'POST',
			body: formData
		})
			.then(function (response) {
				return response.json().then(function (json) {
					if (!response.ok || !json.success) {
						throw new Error(json.error || 'Ha ocurrido un error al enviar el mensaje.');
					}
					return json;
				});
			})
			.then(function () {
				status.textContent = '\u00A1Mensaje enviado! Te responderemos pronto.';
				status.classList.remove('error');
				status.classList.add('visible', 'success');
				form.reset();
			})
			.catch(function (err) {
				status.textContent = err.message || 'No se ha podido enviar el mensaje. Comprueba tu conexi\u00F3n e int\u00E9ntalo de nuevo.';
				status.classList.remove('success');
				status.classList.add('visible', 'error');
			})
			.finally(function () {
				setSubmitting(false);
			});
	});
})();