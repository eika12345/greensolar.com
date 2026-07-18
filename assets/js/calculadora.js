/* =========================================================================
   Green Solar — Calculadora Solar
   =========================================================================
   Todos los valores que dependen de precios/negocio de Green Solar están
   reunidos en el objeto CONFIG de abajo. Edita solo estos números; no hace
   falta tocar el resto del archivo.
   ========================================================================= */

var GS_CALC_CONFIG = {

    // Horas de Sol Pico (HSP) media diaria por provincia, en kWh/m²/día.
    hsp: {
        valencia: 4.6,
        alicante: 4.8,
        murcia: 4.9
    },

    // Coste de la instalación por cada kWp instalado (€/kWp).
    costPerKwp: 1300,

    // Rendimiento global del sistema.
    performanceRatio: 0.78,

    // Porcentaje de la energía producida que se autoconsume directamente.
    selfConsumptionRatio: 0.70,

    // Precio de compensación por excedentes vertidos a la red (€/kWh).
    exportPrice: 0.05,

    // Años de vida útil considerados para el cálculo de ahorro a largo plazo.
    lifetimeYears: 25

};

// -------------------------------------------------------------------------
// i18n: locale + unit strings per language. Add a new entry here whenever
// idioma.js supports a new language.
// -------------------------------------------------------------------------
var GS_CALC_I18N = {
    es: {
        locale: 'es-ES',
        currency: 'EUR',
        yearsUnit: 'años',
        yearUnit: 'año',
        perYear: '/ año'
    },
    en: {
        locale: 'en-GB',
        currency: 'EUR',
        yearsUnit: 'years',
        yearUnit: 'year',
        perYear: '/ year'
    },
    fr: {
        locale: 'fr-FR',
        currency: 'EUR',
        yearsUnit: 'ans',
        yearUnit: 'an',
        perYear: '/ an'
    }
};

(function () {
    'use strict';

    // Returns the current 2-letter language code (es/en/fr).
    // idioma.js stores the chosen language synchronously in localStorage
    // under 'green_solar_lang', and also mirrors it onto
    // document.documentElement.lang once the dictionary fetch resolves.
    // We check localStorage first since it's available immediately;
    // the lang attribute is a fallback for the very first page load.
    function getLang() {
        try {
            var saved = localStorage.getItem('green_solar_lang');
            if (saved && GS_CALC_I18N[saved]) {
                return saved;
            }
        } catch (e) {
            // localStorage unavailable (private browsing, etc.) — fall through
        }

        var htmlLang = document.documentElement.lang;
        if (htmlLang && GS_CALC_I18N[htmlLang]) {
            return htmlLang;
        }

        return 'es';
    }

    function i18n() {
        return GS_CALC_I18N[getLang()];
    }

    function euros(value) {
        var t = i18n();
        return value.toLocaleString(t.locale, {
            style: 'currency',
            currency: t.currency,
            maximumFractionDigits: 0
        });
    }

    function kwh(value) {
        var t = i18n();
        return value.toLocaleString(t.locale, { maximumFractionDigits: 0 }) + ' kWh';
    }

    function kwp(value) {
        var t = i18n();
        return value.toLocaleString(t.locale, { maximumFractionDigits: 2 }) + ' kWp';
    }

    function years(value) {
        var t = i18n();
        return value.toLocaleString(t.locale, { maximumFractionDigits: 1 }) + ' ' + t.yearsUnit;
    }

    function calculate(monthlyBill, pricePerKwh, province) {

        var config = GS_CALC_CONFIG;
        var hsp = config.hsp[province];

        // 1. Consumo anual estimado a partir de la factura mensual.
        var annualConsumptionKwh = (monthlyBill / pricePerKwh) * 12;

        // 2. Potencia recomendada para cubrir ese consumo.
        var recommendedKwp = annualConsumptionKwh / (hsp * 365 * config.performanceRatio);

        // 3. Producción anual estimada de esa instalación.
        var annualOutputKwh = recommendedKwp * hsp * 365 * config.performanceRatio;

        // 4. Coste estimado de la instalación.
        var installCost = recommendedKwp * config.costPerKwp;

        // 5. Ahorro anual.
        var selfConsumedKwh = annualOutputKwh * config.selfConsumptionRatio;
        var exportedKwh = annualOutputKwh * (1 - config.selfConsumptionRatio);
        var annualSavings = (selfConsumedKwh * pricePerKwh) + (exportedKwh * config.exportPrice);

        // 6. Periodo de amortización.
        var paybackYears = installCost / annualSavings;

        // 7. Ahorro neto estimado a lo largo de la vida útil del sistema.
        var lifetimeSavings = (annualSavings * config.lifetimeYears) - installCost;

        return {
            annualConsumptionKwh: annualConsumptionKwh,
            recommendedKwp: recommendedKwp,
            annualOutputKwh: annualOutputKwh,
            installCost: installCost,
            annualSavings: annualSavings,
            paybackYears: paybackYears,
            lifetimeSavings: lifetimeSavings
        };
    }

    function onSubmit(event) {
        event.preventDefault();

        var bill = parseFloat(document.getElementById('gs-calc-bill').value);
        var price = parseFloat(document.getElementById('gs-calc-price').value);
        var province = document.getElementById('gs-calc-province').value;

        if (!bill || !price || !province || bill <= 0 || price <= 0) {
            return;
        }

        var result = calculate(bill, price, province);
        var t = i18n();

        document.getElementById('gs-calc-consumption').textContent = kwh(result.annualConsumptionKwh);
        document.getElementById('gs-calc-power').textContent = kwp(result.recommendedKwp);
        document.getElementById('gs-calc-output').textContent = kwh(result.annualOutputKwh);
        document.getElementById('gs-calc-cost').textContent = euros(result.installCost);
        document.getElementById('gs-calc-savings').textContent = euros(result.annualSavings) + ' ' + t.perYear;
        document.getElementById('gs-calc-payback').textContent = years(result.paybackYears);
        document.getElementById('gs-calc-lifetime').textContent = euros(Math.max(result.lifetimeSavings, 0));

        var resultsPanel = document.getElementById('gs-calc-results');
        resultsPanel.hidden = false;
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function onProvinceButtonClick(event) {
        var clicked = event.currentTarget;
        var province = clicked.getAttribute('data-province');

        document.getElementById('gs-calc-province').value = province;

        var buttons = document.querySelectorAll('.gs-calc-province-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('is-active');
        }
        clicked.classList.add('is-active');
    }

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('gs-calc-form');
        if (form) {
            form.addEventListener('submit', onSubmit);
        }

        var provinceButtons = document.querySelectorAll('.gs-calc-province-btn');
        for (var i = 0; i < provinceButtons.length; i++) {
            provinceButtons[i].addEventListener('click', onProvinceButtonClick);
        }
    });

})();