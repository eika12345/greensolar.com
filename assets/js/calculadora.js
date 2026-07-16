/* =========================================================================
   Green Solar — Calculadora Solar
   =========================================================================
   Todos los valores que dependen de precios/negocio de Green Solar están
   reunidos en el objeto CONFIG de abajo. Edita solo estos números; no hace
   falta tocar el resto del archivo.
   ========================================================================= */

var GS_CALC_CONFIG = {

    // Horas de Sol Pico (HSP) media diaria por provincia, en kWh/m²/día.
    // Son valores aproximados de irradiancia media anual. Si Green Solar
    // dispone de datos más precisos (p. ej. de PVGIS para las zonas donde
    // trabajáis), sustituidlos aquí.
    hsp: {
        valencia: 4.6,
        alicante: 4.8,
        murcia: 4.9
    },

    // Coste de la instalación por cada kWp instalado (€/kWp).
    // ⚠️ ESTE ES UN VALOR DE NEGOCIO — Green Solar debe indicar el precio
    // real que aplica (incluye paneles, inversor, mano de obra, etc.).
    // El valor de abajo es solo un marcador de posición orientativo.
    costPerKwp: 1300,

    // Rendimiento global del sistema (pérdidas por cableado, inversor,
    // suciedad, temperatura, etc.). Valor típico entre 0.75 y 0.80.
    performanceRatio: 0.78,

    // Porcentaje de la energía producida que se autoconsume directamente
    // (el resto se vierte a la red). Depende del perfil de consumo del
    // cliente; 0.70 es una estimación típica para vivienda residencial.
    selfConsumptionRatio: 0.70,

    // Precio de compensación por excedentes vertidos a la red (€/kWh).
    // Green Solar debe confirmar la tarifa de compensación que ofrece
    // la comercializadora con la que trabaja.
    exportPrice: 0.05,

    // Años de vida útil considerados para el cálculo de ahorro a largo plazo.
    lifetimeYears: 25

};

(function () {
    'use strict';

    function euros(value) {
        return value.toLocaleString('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        });
    }

    function kwh(value) {
        return value.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' kWh';
    }

    function kwp(value) {
        return value.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' kWp';
    }

    function years(value) {
        return value.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' años';
    }

    function calculate(monthlyBill, pricePerKwh, province) {

        var config = GS_CALC_CONFIG;
        var hsp = config.hsp[province];

        // 1. Consumo anual estimado a partir de la factura mensual.
        var annualConsumptionKwh = (monthlyBill / pricePerKwh) * 12;

        // 2. Potencia recomendada para cubrir ese consumo.
        //    kWp = consumo_anual / (HSP * 365 * rendimiento)
        var recommendedKwp = annualConsumptionKwh / (hsp * 365 * config.performanceRatio);

        // 3. Producción anual estimada de esa instalación.
        var annualOutputKwh = recommendedKwp * hsp * 365 * config.performanceRatio;

        // 4. Coste estimado de la instalación.
        var installCost = recommendedKwp * config.costPerKwp;

        // 5. Ahorro anual: parte autoconsumida (ahorra el precio del kWh)
        //    + parte exportada (se paga a precio de compensación).
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

        document.getElementById('gs-calc-consumption').textContent = kwh(result.annualConsumptionKwh);
        document.getElementById('gs-calc-power').textContent = kwp(result.recommendedKwp);
        document.getElementById('gs-calc-output').textContent = kwh(result.annualOutputKwh);
        document.getElementById('gs-calc-cost').textContent = euros(result.installCost);
        document.getElementById('gs-calc-savings').textContent = euros(result.annualSavings) + ' / año';
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