// ============================================================
// UPDATE 3: ماشین‌حساب اقساط (Installment Calculator)
// ============================================================

(function() {
  
  // ۱. اضافه کردن دکمه تب جدید به منوی پایین
  const nav = document.querySelector('.nav');
  if (nav && !document.getElementById('nav-installment')) {
    // تغییر عرض دکمه‌ها که ۶ تا بشن و جا بشن
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.style.fontSize = '9px'; // کمی کوچک‌تر برای جا شدن
      btn.querySelector('.icon').style.fontSize = '19px';
    });

    const newBtn = document.createElement('button');
    newBtn.className = 'nav-btn ripple';
    newBtn.id = 'nav-installment';
    newBtn.setAttribute('data-page', 'installment');
    newBtn.innerHTML = '<span class="icon">🧮</span><span>اقساط</span>';
    newBtn.onclick = () => switchPage('installment');
    
    // درج قبل از دکمه گزارش
    const reportBtn = nav.querySelector('[data-page="reports"]');
    nav.insertBefore(newBtn, reportBtn);
  }

  // ۲. ساختن صفحه HTML ماشین‌حساب
  const content = document.querySelector('.content');
  if (content && !document.getElementById('page-installment')) {
    const pageHtml = `
      <div class="page" id="page-installment">
        <div class="card">
          <div class="card-title">🧮 ماشین‌حساب اقساط</div>
          
          <div class="form-group">
            <label class="form-label">قیمت کل خودرو</label>
            <input type="text" class="form-input" id="inst-price" placeholder="مثلاً: ۲ میلیارد تومان" oninput="calcInstallment()">
          </div>
          
          <div class="form-group">
            <label class="form-label">پیش‌پرداخت (آپشن)</label>
            <input type="text" class="form-input" id="inst-down" placeholder="مثلاً: ۵۰۰ میلیون تومان" oninput="calcInstallment()">
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
              <label class="form-label">تعداد اقساط (ماه)</label>
              <select class="form-select" id="inst-months" onchange="calcInstallment()">
                <option value="6">۶ ماه</option>
                <option value="12">۱۲ ماه</option>
                <option value="18">۱۸ ماه</option>
                <option value="24" selected>۲۴ ماه</option>
                <option value="36">۳۶ ماه</option>
                <option value="48">۴۸ ماه</option>
                <option value="60">۶۰ ماه</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">نرخ سود سالانه (٪)</label>
              <input type="number" class="form-input" id="inst-rate" value="23" oninput="calcInstallment()">
            </div>
          </div>

          <div id="inst-result" style="display: none; margin-top: 20px;">
            <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid var(--gold); border-radius: 16px; padding: 16px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed rgba(212,175,55,0.3);">
                <span style="color: var(--silver);">مبلغ وام (بعد از پیش‌پرداخت):</span>
                <strong id="inst-loan-amount" style="color: var(--text);">—</strong>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--silver);">سود کل:</span>
                <strong id="inst-total-interest" style="color: var(--warn);">—</strong>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: var(--silver);">مجموع بازپرداخت:</span>
                <strong id="inst-total-repay" style="color: var(--text);">—</strong>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px solid var(--gold);">
                <span style="color: var(--gold-light); font-weight: 800; font-size: 15px;">مبلغ هر قسط:</span>
                <strong id="inst-monthly" style="color: var(--gold); font-size: 18px;">—</strong>
              </div>
            </div>
            
            <button class="btn btn-primary btn-block" style="margin-top: 16px;" onclick="copyInstallmentToNotes()">
              📋 کپی نتیجه برای توضیحات خودرو
            </button>
          </div>
          
          <div class="form-group" style="margin-top: 20px;">
            <label class="form-label">انتخاب خودرو (اختیاری - برای افزودن به توضیحات)</label>
            <select class="form-select" id="inst-car-id">
              <option value="">— انتخاب کنید —</option>
              ${state.cars.map(c => `<option value="${c.id}">${c.brand} ${c.model} (${c.year || '—'})</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;
    content.insertAdjacentHTML('beforeend', pageHtml);
  }

  // ۳. تابع محاسبه اقساط
  window.calcInstallment = function() {
    const priceText = document.getElementById('inst-price').value.trim();
    const downText = document.getElementById('inst-down').value.trim();
    const months = parseInt(document.getElementById('inst-months').value, 10);
    const rate = parseFloat(document.getElementById('inst-rate').value);
    
    const price = parsePrice(priceText);
    if (!price || price.currency !== 'IRT') {
      document.getElementById('inst-result').style.display = 'none';
      return;
    }
    
    let down = { amount: 0, currency: 'IRT' };
    if (downText) {
      const d = parsePrice(downText);
      if (d && d.currency === 'IRT') down = d;
    }
    
    const loanAmount = price.amount - down.amount;
    if (loanAmount <= 0) {
      document.getElementById('inst-result').style.display = 'none';
      return;
    }
    
    // فرمول سود ساده برای اقساط (روش بانک‌ها)
    // سود کل = (مبلغ وام × نرخ سود × تعداد ماه) / 1200
    const totalInterest = (loanAmount * rate * months) / 1200;
    const totalRepay = loanAmount + totalInterest;
    const monthly = totalRepay / months;
    
    document.getElementById('inst-loan-amount').textContent = formatMoney({amount: loanAmount, currency: 'IRT'});
    document.getElementById('inst-total-interest').textContent = formatMoney({amount: totalInterest, currency: 'IRT'});
    document.getElementById('inst-total-repay').textContent = formatMoney({amount: totalRepay, currency: 'IRT'});
    document.getElementById('inst-monthly').textContent = formatMoney({amount: Math.round(monthly), currency: 'IRT'});
    
    document.getElementById('inst-result').style.display = 'block';
    
    // ذخیره نتیجه برای کپی
    window._lastInstallment = {
      price: price.amount,
      down: down.amount,
      months: months,
      rate: rate,
      loanAmount: loanAmount,
      totalInterest: totalInterest,
      totalRepay: totalRepay,
      monthly: Math.round(monthly)
    };
  };

  // ۴. کپی نتیجه به توضیحات خودرو
  window.copyInstallmentToNotes = function() {
    if (!window._lastInstallment) return;
    const carId = parseInt(document.getElementById('inst-car-id').value, 10);
    if (!carId) {
      showToast('ابتدا یک خودرو انتخاب کنید');
      return;
    }
    const car = state.cars.find(c => c.id === carId);
    if (!car) return;
    
    const inst = window._lastInstallment;
    const text = `
--- طرح فروش اقساطی ---
قیمت کل: ${formatMoney({amount: inst.price, currency: 'IRT'})}
پیش‌پرداخت: ${formatMoney({amount: inst.down, currency: 'IRT'})}
تعداد اقساط: ${toFaDigits(inst.months)} ماه
نرخ سود: ${toFaDigits(inst.rate)}٪
مبلغ هر قسط: ${formatMoney({amount: inst.monthly, currency: 'IRT'})}
مجموع سود: ${formatMoney({amount: inst.totalInterest, currency: 'IRT'})}
مجموع بازپرداخت: ${formatMoney({amount: inst.totalRepay, currency: 'IRT'})}
    `.trim();
    
    if (car.notes && !car.notes.includes('طرح فروش اقساطی')) {
      car.notes += '\n\n' + text;
    } else if (!car.notes) {
      car.notes = text;
    } else {
      // اگر قبلاً طرح اقساطی اضافه شده بود، جایگزین شود
      car.notes = car.notes.replace(/--- طرح فروش اقساطی ---[\s\S]*$/, text);
    }
    
    saveState();
    showToast('✅ طرح اقساط به توضیحات خودرو اضافه شد');
    switchPage('cars');
  };

  // ۵. به‌روزرسانی switchPage برای پشتیبانی از صفحه جدید
  const originalSwitchPage = window.switchPage;
  window.switchPage = function(page) {
    originalSwitchPage(page);
    if (page === 'installment') {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-installment').classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('nav-installment').classList.add('active');
      // به‌روزرسانی لیست خودروهای ماشین‌حساب
      const sel = document.getElementById('inst-car-id');
      if (sel) {
        sel.innerHTML = '<option value="">— انتخاب کنید —</option>' + 
          state.cars.map(c => `<option value="${c.id}">${escapeHtml(c.brand)} ${escapeHtml(c.model)} (${c.year || '—'})</option>`).join('');
      }
    }
  };

  // ۶. هنگام باز شدن فرم خودرو، دکمه «محاسبه اقساط» هم اضافه شود
  const originalOpenCarForm = window.openCarForm;
  window.openCarForm = function(id) {
    originalOpenCarForm(id);
    // این بخش برای وقتی است که کاربر در فرم خودروست، می‌خواهد سریع محاسبه اقساط کند
    // (اختیاری - نیازی به این نیست، چون ماشین‌حساب مستقل داریم)
  };

  console.log('✅ آپدیت ۳ (ماشین‌حساب اقساط) بارگذاری شد.');
  if (typeof showToast === 'function') {
    showToast('🧮 آپدیت ماشین‌حساب اقساط فعال شد!');
  }
  
  // رفرش نوار پایین (تا آیکون‌های جدید اعمال شوند)
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.add('ripple'));

})();