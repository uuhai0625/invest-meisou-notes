(function () {
  var CATEGORY_LIMITS = {
    jieigyo: { label: '自営業等(第1号被保険者)', max: 68000 },
    kaisha_nashi: { label: '会社員(勤め先に企業年金なし)', max: 23000 },
    kaisha_ari: { label: '会社員(企業型DCのみ/DB等併存)・公務員', max: 20000 },
    fuyou: { label: '専業主婦・主夫(第3号被保険者)', max: 23000 }
  };

  var RECONSTRUCTION_SURTAX = 1.021; // 復興特別所得税(所得税額の2.1%)
  var RESIDENT_TAX_RATE = 0.10; // 住民税(所得割)は自治体を問わず一律10%と仮定

  function marginalIncomeTaxRate(taxableIncome) {
    if (taxableIncome <= 1949000) return 0.05;
    if (taxableIncome <= 3299000) return 0.10;
    if (taxableIncome <= 6949000) return 0.20;
    if (taxableIncome <= 8999000) return 0.23;
    if (taxableIncome <= 17999000) return 0.33;
    if (taxableIncome <= 39999000) return 0.40;
    return 0.45;
  }

  function yen(n) {
    return Math.round(n).toLocaleString('ja-JP') + '円';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var categorySelect = document.getElementById('ideco-sim-category');
    var contributionInput = document.getElementById('ideco-sim-contribution');
    var contributionHint = document.getElementById('ideco-sim-contribution-hint');
    var incomeInput = document.getElementById('ideco-sim-income');
    var yearsInput = document.getElementById('ideco-sim-years');
    var returnInput = document.getElementById('ideco-sim-return');
    var form = document.getElementById('ideco-sim-form');
    var resultBox = document.getElementById('ideco-sim-result');

    if (!form) return;

    function applyCategory() {
      var cat = CATEGORY_LIMITS[categorySelect.value];
      contributionInput.max = cat.max;
      contributionHint.textContent = '上限: 月額' + cat.max.toLocaleString('ja-JP') + '円(' + cat.label + ')。iDeCoの掛金は月5,000円以上・1,000円単位です。';
      if (!contributionInput.value || Number(contributionInput.value) > cat.max) {
        contributionInput.value = cat.max;
      }
    }

    categorySelect.addEventListener('change', applyCategory);
    applyCategory();

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var cat = CATEGORY_LIMITS[categorySelect.value];
      var monthly = Number(contributionInput.value) || 0;
      monthly = Math.max(5000, Math.min(monthly, cat.max));
      contributionInput.value = monthly;

      var taxableIncome = Math.max(Number(incomeInput.value) || 0, 0);

      var years = Number(yearsInput.value) || 0;
      years = Math.max(1, Math.min(years, 45));
      yearsInput.value = years;

      var annualReturnPct = Math.max(Number(returnInput.value) || 0, 0);

      var annualContribution = monthly * 12;
      var rate = marginalIncomeTaxRate(taxableIncome);
      var incomeTaxSaving = annualContribution * rate * RECONSTRUCTION_SURTAX;
      var residentTaxSaving = annualContribution * RESIDENT_TAX_RATE;
      var annualSaving = incomeTaxSaving + residentTaxSaving;
      var totalSaving = annualSaving * years;
      var totalContribution = annualContribution * years;

      var months = years * 12;
      var monthlyRate = Math.pow(1 + annualReturnPct / 100, 1 / 12) - 1;
      var futureValue;
      if (monthlyRate === 0) {
        futureValue = monthly * months;
      } else {
        futureValue = monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      }
      var investmentGain = futureValue - totalContribution;

      document.getElementById('ideco-sim-out-annual-saving').textContent = yen(annualSaving);
      document.getElementById('ideco-sim-out-breakdown').textContent =
        '内訳(年間): 所得税分 約' + yen(incomeTaxSaving) + '(税率' + Math.round(rate * 100) + '%、復興特別所得税込み) + 住民税分 約' + yen(residentTaxSaving) + '(税率10%)';
      document.getElementById('ideco-sim-out-total-saving').textContent = yen(totalSaving);
      document.getElementById('ideco-sim-out-total-contribution').textContent = yen(totalContribution);
      document.getElementById('ideco-sim-out-future-value').textContent = yen(futureValue);
      document.getElementById('ideco-sim-out-gain').textContent = yen(investmentGain);

      resultBox.classList.add('is-shown');
      resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();
