// ============================================================
// UPDATE 1: Undo (بازگردانی حذف) و انیمیشن قیمت‌ها
// ============================================================

(function() {
  // ۱. بازنویسی تابع حذف خودرو برای پشتیبانی از Undo
  const originalDelete = window.deleteCurrentCar;
  
  window.deleteCurrentCar = function() {
    if (!window.editingCarId && !editingCarId) return;
    const targetId = window.editingCarId || editingCarId;
    const car = state.cars.find(c => c.id === targetId);
    if (!car) return;
    
    // حذف موقت
    const carIndex = state.cars.findIndex(c => c.id === targetId);
    const deletedCar = state.cars[carIndex];
    state.cars.splice(carIndex, 1);
    saveState();
    
    // بستن مدال
    if (typeof closeCarForm === 'function') closeCarForm();
    if (typeof switchPage === 'function') switchPage(currentPage);
    
    // نمایش نوار Undo
    showUndoSnackbar('خودرو «' + deletedCar.brand + ' ' + deletedCar.model + '» حذف شد.', () => {
      state.cars.splice(carIndex, 0, deletedCar);
      saveState();
      if (typeof switchPage === 'function') switchPage(currentPage);
      if (typeof showToast === 'function') showToast('✅ خودرو بازگردانده شد');
    });
  };

  // ۲. ساخت سیستم نوار Snackbar
  window.showUndoSnackbar = function(message, undoCallback) {
    // حذف نوار قبلی اگر وجود دارد
    const old = document.getElementById('undo-snackbar');
    if (old) old.remove();

    const snack = document.createElement('div');
    snack.id = 'undo-snackbar';
    snack.style.cssText = `
      position: fixed;
      bottom: 90px;
      left: 16px;
      right: 16px;
      background: rgba(20, 20, 20, 0.95);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-strong);
      color: var(--silver);
      border-radius: 16px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2000;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Vazirmatn', sans-serif;
      font-size: 13px;
    `;

    const text = document.createElement('span');
    text.textContent = message;
    text.style.flex = '1';
    
    const undoBtn = document.createElement('button');
    undoBtn.textContent = 'بازگردانی';
    undoBtn.style.cssText = `
      background: transparent;
      border: none;
      color: var(--gold-light);
      font-family: inherit;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      padding: 4px 10px;
      margin-right: 10px;
    `;
    undoBtn.onclick = () => {
      snack.style.transform = 'translateY(100px)';
      snack.style.opacity = '0';
      setTimeout(() => snack.remove(), 400);
      if (undoCallback) undoCallback();
    };

    snack.appendChild(text);
    snack.appendChild(undoBtn);
    document.body.appendChild(snack);

    // انیمیشن ورود
    setTimeout(() => {
      snack.style.transform = 'translateY(0)';
      snack.style.opacity = '1';
    }, 50);

    // محو شدن خودکار بعد از ۵ ثانیه
    setTimeout(() => {
      if (document.getElementById('undo-snackbar')) {
        snack.style.transform = 'translateY(100px)';
        snack.style.opacity = '0';
        setTimeout(() => snack.remove(), 400);
      }
    }, 5000);
  };

  // ۳. گوش دادن به حذف از طریق لیست (برای خودروهایی که از فرم حذف نمی‌شوند)
  // (این بخش برای سازگاری با دکمه‌های حذف داخلی است)
  
  console.log('✅ آپدیت ۱ با موفقیت بارگذاری شد.');
  if (typeof showToast === 'function') {
    showToast('🧩 آپدیت Undo فعال شد!');
  }
})();