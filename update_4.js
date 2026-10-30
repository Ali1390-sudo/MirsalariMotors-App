// ============================================================
// UPDATE 4: رفع مشکل محاسبه اقساط + دکمه محاسبه
// ============================================================

(function() {
  
  // ۱. تقویت تشخیص قیمت برای اعداد ساده (مثل 4 میلیارد)
  const originalParsePrice = window.parsePrice;
  window.parsePrice = function(text) {
    if (!text) return null;
    let s = toEnDigits(text).replace(/[\u200c\u200f\u200e]/g, '');
    s = s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase().trim();
    
    // اگر فقط عدد و کلمه (مثل 4 میلیارد) بود، خودمان تشخیص می‌دهیم
    if (/^\d+(\.\d+)?\s*(میلیارد|ملیارد|میلیون|ملیون|هزار)(\s*تومان)?$/.test(s)) {
      const match = s.match(/^(\d+(?:\.\d+)?)\s*(میلیارد|ملیارد|میلیون|ملیون|هزار)/);
      if (match) {
        let num = parseFloat(match[1]);
        let mult = 1;
        if (match[2].includes('میلیارد') || match[2].includes('ملیارد')) mult = 1e9;
        else if (match[2].includes('میلیون') || match[2].includes('ملیون')) mult = 1e6;
        else if (match[2].includes('هزار')) mult = 1e3;
        
        return { amount: num * mult, currency: 'IRT' };
      }
    }
    
    return originalParsePrice(text);
  };

  // ۲. به‌روزرسانی صفحه ماشین‌حساب (اضافه کردن دکمه)
  const pageHtml = document.getElementById('page-installment');
  if (pageHtml) {
    // حذف دکمه قبلی اگر وجود دارد
    const oldBtn = document.getElementById('calc-btn');
    if (oldBtn) oldBtn.remove();

    // ساخت دکمه جدید
    const btn = document.createElement('button');
    btn.id = 'calc-btn';
    btn.className = 'btn btn-primary btn-block';
    btn.style.marginTop = '16px';
    btn.style.fontSize = '16px';
    btn.style.minHeight = '50px';
    btn.innerHTML = '🧮 محاسبه کن';
    btn.onclick = window.calcInstallment;

    // اضافه کردن قبل از کارت نتیجه
    const resultDiv = document.getElementById('inst-result');
    if (resultDiv) {
      resultDiv.parentNode.insertBefore(btn, resultDiv);
    }
  }

  // ۳. اطمینان از اینکه تابع محاسبه درست کار می‌کند
  const originalCalc = window.calcInstallment;
  window.calcInstallment = function() {
    const priceText = document.getElementById('inst-price').value.trim();
    const downText = document.getElementById('inst-down').value.trim();
    const months = parseInt(document.getElementById('inst-months').value, 10);
    const rate = parseFloat(document.getElementById('inst-rate').value);
    
    // استفاده از تابع اصلاح‌شده parsePrice
    const price = window.parsePrice(priceText);
    if (!price || price.currency !== 'IRT') {
      showToast('قیمت خودرو را معتبر وارد کنید (مثلاً: ۴ میلیارد تومان)');
      return;
    }
    
    let down = { amount: 0, currency: 'IRT' };
    if (downText) {
      const d = window.parsePrice(downText);
      if (d && d.currency === 'IRT') down = d;
    }
    
    const loanAmount = price.amount - down.amount;
    if (loanAmount <= 0) {
      showToast('پیش‌پرداخت نمی‌تواند بیشتر از قیمت خودرو باشد');
      return;
    }
    
    // محاسبه
    const totalInterest = (loanAmount * rate * months) / 1200;
    const totalRepay = loanAmount + totalInterest;
    const monthly = totalRepay / months;
    
    document.getElementById('inst-loan-amount').textContent = formatMoney({amount: loanAmount, currency: 'IRT'});
    document.getElementById('inst-total-interest').textContent = formatMoney({amount: totalInterest, currency: 'IRT'});
    document.getElementById('inst-total-repay').textContent = formatMoney({amount: totalRepay, currency: 'IRT'});
    document.getElementById('inst-monthly').textContent = formatMoney({amount: Math.round(monthly), currency: 'IRT'});
    
    document.getElementById('inst-result').style.display = 'block';
    
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
    
    // اسکرول به پایین برای دیدن نتیجه
    document.getElementById('inst-result').scrollIntoView({ behavior: 'smooth' });
  };

  // برای اطمینان، توابع روی window تنظیم می‌شوند
  window.calcInstallment = window.calcInstallment;
  window.copyInstallmentToNotes = window.copyInstallmentToNotes;

  console.log('✅ آپدیت ۴ (رفع محاسبه اقساط) اعمال شد.');
  if (typeof showToast === 'function') {
    showToast('✅ دکمه محاسبه اقساط فعال شد');
  }
})();