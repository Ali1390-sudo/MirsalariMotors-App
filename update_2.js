// ============================================================
// UPDATE 2: هوشمندسازی، تحلیل، نمودار و یادآور
// ============================================================

(function() {
  
  // ==========================================================
  // ۱. جست‌وجوی هوشمند (تشخیص قیمت و سال در متن)
  // ==========================================================
  const originalRenderCarsList = window.renderCarsList;
  window.renderCarsList = function() {
    let cars = [...state.cars];
    
    if (currentSearch) {
      let q = currentSearch.toLowerCase().trim();
      
      // تشخیص «زیر X میلیارد/میلیون»
      const priceRegex = /(زیر|کمتر از|حداکثر)\s+([۰-۹0-9.,]+)\s*(میلیارد|ملیون|میلیون)/;
      const priceMatch = q.match(priceRegex);
      let maxPrice = null;
      
      if (priceMatch) {
        let num = parseFloat(toEnDigits(priceMatch[2]).replace(/,/g, ''));
        if (priceMatch[3].includes('میلیارد')) num *= 1e9;
        else num *= 1e6;
        maxPrice = num;
        q = q.replace(priceMatch[0], '').trim();
      }
      
      // تشخیص سال (مثلاً ۱۴۰۲)
      const yearRegex = /سال\s+([۰-۹0-9]{4})/;
      const yearMatch = q.match(yearRegex);
      let targetYear = null;
      if (yearMatch) {
        targetYear = parseInt(toEnDigits(yearMatch[1]), 10);
        q = q.replace(yearMatch[0], '').trim();
      }

      cars = cars.filter(c => {
        // فیلتر متنی
        if (q) {
          const hay = [c.brand, c.model, c.trim, c.year, c.color, c.asking_price_text, c.market_price_text, c.notes, c.tags_text].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        // فیلتر قیمت
        if (maxPrice !== null) {
          const p = parsePrice(c.asking_price_text);
          if (!p || p.currency !== 'IRT' || p.amount > maxPrice) return false;
        }
        // فیلتر سال
        if (targetYear !== null) {
          if (c.year !== targetYear) return false;
        }
        return true;
      });
    }

    if (currentStatusFilter) {
      cars = cars.filter(c => (c.status || 'موجود') === currentStatusFilter);
    }
    
    const sortVal = document.getElementById('sort-select') ? document.getElementById('sort-select').value : 'newest';
    if (sortVal === 'newest') cars.sort((a, b) => b.id - a.id);
    else if (sortVal === 'price-asc' || sortVal === 'price-desc') {
      cars.sort((a, b) => {
        const pa = parsePrice(a.asking_price_text);
        const pb = parsePrice(b.asking_price_text);
        if (!pa && !pb) return 0;
        if (!pa) return 1;
        if (!pb) return -1;
        if (pa.currency !== pb.currency) return 0;
        return sortVal === 'price-asc' ? pa.amount - pb.amount : pb.amount - pa.amount;
      });
    } else if (sortVal === 'year-desc') {
      cars.sort((a, b) => (b.year || 0) - (a.year || 0));
    }

    const list = document.getElementById('cars-list');
    if (cars.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div>خودرویی پیدا نشد</div></div>';
      return;
    }
    list.innerHTML = cars.map(carCardHtml).join('');
    list.querySelectorAll('.car-card').forEach(el => el.classList.add('ripple'));
  };

  // ==========================================================
  // ۲. تحلیل سود و ضرر روی کارت خودرو
  // ==========================================================
  const originalCarCardHtml = window.carCardHtml;
  window.carCardHtml = function(car) {
    let profitHtml = '';
    const buy = parsePrice(car.buy_price_text);
    const sell = parsePrice(car.sell_price_text);
    
    if (buy && sell && buy.currency === sell.currency) {
      const diff = sell.amount - buy.amount;
      const percent = (diff / buy.amount) * 100;
      const isProfit = diff >= 0;
      const color = isProfit ? 'var(--success)' : 'var(--danger)';
      const bg = isProfit ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 107, 107, 0.1)';
      const sign = isProfit ? 'سود' : 'ضرر';
      
      profitHtml = `<div style="margin-top: 8px; padding: 6px 10px; border-radius: 8px; background: ${bg}; color: ${color}; font-size: 11px; font-weight: 700; display: flex; justify-content: space-between;">
        <span>💰 ${sign} معامله:</span>
        <span>${formatMoney({amount: Math.abs(diff), currency: buy.currency})} (${toFaDigits(Math.abs(percent).toFixed(1))}٪)</span>
      </div>`;
    }
    
    const baseHtml = originalCarCardHtml(car);
    return baseHtml.replace('</div>\n  ', profitHtml + '</div>\n  ').replace(/(<div class="price-diff[^>]*>[\s\S]*?<\/div>)/, '$1' + profitHtml);
  };

  // ==========================================================
  // ۳. نمودارهای داشبورد (دایره‌ای و میله‌ای با SVG)
  // ==========================================================
  const originalRenderDashboard = window.renderDashboard;
  window.renderDashboard = function() {
    originalRenderDashboard();
    
    const dashboard = document.getElementById('page-dashboard');
    if (!dashboard) return;
    
    // حذف نمودارهای قبلی اگر وجود دارند
    const oldCharts = document.getElementById('custom-charts');
    if (oldCharts) oldCharts.remove();
    
    const chartContainer = document.createElement('div');
    chartContainer.id = 'custom-charts';
    
    // -- نمودار دایره‌ای برندها --
    const brandCounts = {};
    state.cars.forEach(c => { if (c.brand) brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1; });
    const brands = Object.entries(brandCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const totalCars = state.cars.length;
    
    let pieHtml = '';
    if (totalCars > 0) {
      const colors = ['#D4AF37', '#8B5CF6', '#4ADE80', '#FBBF24', '#06B6D4'];
      let cumulativePercent = 0;
      let circles = '';
      brands.forEach(([brand, count], i) => {
        const percent = count / totalCars;
        const dashArray = `${percent * 100} ${100 - percent * 100}`;
        const dashOffset = 25 - cumulativePercent * 100;
        circles += `<circle cx="21" cy="21" r="15.9" fill="transparent" stroke="${colors[i]}" stroke-width="6" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}"></circle>`;
        cumulativePercent += percent;
      });
      
      pieHtml = `<div class="card">
        <div class="card-title">🍩 سهم برندها</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
          <svg viewBox="0 0 42 42" style="width: 120px; height: 120px; transform: rotate(-90deg);">
            <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="6"></circle>
            ${circles}
          </svg>
          <div style="font-size: 11px; line-height: 2;">
            ${brands.map(([b, c], i) => `<div><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${colors[i]}; margin-left:6px;"></span>${escapeHtml(b)} (${toFaDigits(c)})</div>`).join('')}
          </div>
        </div>
      </div>`;
    }
    
    // -- نمودار میله‌ای فروش (۳ ماه اخیر) --
    const soldCars = state.cars.filter(c => c.status === 'فروخته‌شده' && c.created_at);
    const monthlySales = {};
    soldCars.forEach(c => {
      const d = new Date(c.created_at);
      const jy_jm = gregorianToJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
      const key = `${jy_jm[0]}/${String(jy_jm[1]).padStart(2,'0')}`;
      monthlySales[key] = (monthlySales[key] || 0) + 1;
    });
    
    const sortedMonths = Object.entries(monthlySales).sort().slice(-3);
    if (sortedMonths.length > 0) {
      const maxVal = Math.max(...sortedMonths.map(m => m[1]));
      const bars = sortedMonths.map(([month, count]) => {
        const height = maxVal > 0 ? (count / maxVal) * 80 : 0;
        return `<div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
          <div style="color: var(--gold-light); font-size: 11px; font-weight: 700;">${toFaDigits(count)}</div>
          <div style="width: 100%; max-width: 40px; height: ${height}px; background: linear-gradient(to top, var(--gold-deep), var(--gold-light)); border-radius: 6px 6px 0 0; transition: height 0.8s ease;"></div>
          <div style="color: var(--silver-muted); font-size: 10px;">${month}</div>
        </div>`;
      }).join('');
      
      pieHtml += `<div class="card">
        <div class="card-title">📊 فروش ماهانه</div>
        <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 120px; padding: 10px 0; gap: 10px;">
          ${bars}
        </div>
      </div>`;
    }
    
    chartContainer.innerHTML = pieHtml;
    const statsCard = dashboard.querySelector('.card');
    if (statsCard) statsCard.parentNode.insertBefore(chartContainer, statsCard);
  };

  // ==========================================================
  // ۴. یادآور هوشمند بیمه و معاینه
  // ==========================================================
  const originalOpenCarForm = window.openCarForm;
  window.openCarForm = function(id) {
    originalOpenCarForm(id);
    
    // اضافه کردن دکمه‌های یادآور سریع (فقط برای خودروهای ذخیره‌شده)
    if (id) {
      const car = state.cars.find(c => c.id === id);
      if (car) {
        const modalBody = document.getElementById('car-form');
        const quickReminderHtml = `
          <div style="margin-bottom: 18px; margin-top: 10px;">
            <div class="card-title" style="font-size: 13px; margin-bottom: 10px;">⏰ یادآور سریع</div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn" style="flex: 1; padding: 8px; font-size: 11px;" onclick="quickReminder(${car.id}, 'بیمه')">📄 بیمه</button>
              <button type="button" class="btn" style="flex: 1; padding: 8px; font-size: 11px;" onclick="quickReminder(${car.id}, 'معاینه فنی')">🔧 معاینه فنی</button>
            </div>
          </div>
        `;
        modalBody.insertAdjacentHTML('beforeend', quickReminderHtml);
      }
    }
  };
  
  // تابع ساخت یادآور سریع
  window.quickReminder = function(carId, type) {
    const title = type + ' خودرو ' + (state.cars.find(c => c.id === carId)?.brand || '');
    // هشدار با استفاده از prompt مرورگر (ساده و مطمئن)
    const days = prompt(`چند روز دیگر یادآوری «${title}» تنظیم شود؟ (مثلاً ۳۰)`, '30');
    if (!days || isNaN(days)) return;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(days));
    const isoDate = targetDate.toISOString().split('T')[0];
    
    state.reminders.push({
      id: state.nextReminderId++,
      title: title,
      date: isoDate,
      done: false,
      created_at: new Date().toISOString()
    });
    saveState();
    showToast(`✅ یادآوری ${type} برای ${days} روز دیگر تنظیم شد`);
  };

  // ==========================================================
  // ۵. پرینت و PDF پرونده خودرو
  // ==========================================================
  window.printCar = function(carId) {
    const car = state.cars.find(c => c.id === carId);
    if (!car) return;
    
    const printWindow = window.open('', '_blank');
    const rows = [
      ['برند', car.brand], ['مدل', car.model], ['تیپ', car.trim || '—'],
      ['سال', car.year || '—'], ['رنگ', car.color || '—'], ['کارکرد', car.mileage || '—'],
      ['وضعیت', car.status || 'موجود'],
      ['قیمت آگهی', car.asking_price_text || '—'],
      ['قیمت بازار', car.market_price_text || '—'],
      ['قیمت خرید', car.buy_price_text || '—'],
      ['قیمت فروش', car.sell_price_text || '—'],
      ['تگ‌ها', car.tags_text || '—'],
      ['توضیحات', car.notes || '—']
    ];
    
    let photoHtml = '';
    if (car.photos && car.photos.length > 0) {
      photoHtml = `<div style="margin-top: 20px; text-align: center;">
        <img src="${car.photos[0]}" style="max-width: 100%; max-height: 300px; border-radius: 12px;">
      </div>`;
    }
    
    const html = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>پرونده ${car.brand} ${car.model}</title>
        <style>
          body { font-family: Tahoma, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
          .header { text-align: center; border-bottom: 3px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #D4AF37; margin: 0; letter-spacing: 2px; }
          .header p { color: #666; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          td { padding: 12px; border: 1px solid #ddd; }
          td:first-child { background: #f8f5e8; font-weight: bold; width: 30%; color: #8B6508; }
          .footer { text-align: center; color: #999; font-size: 11px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MIRSALARI MOTORS</h1>
          <p>پرونده خودرو</p>
        </div>
        <table>
          ${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
        </table>
        ${photoHtml}
        <div class="footer">
          تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}
        </div>
        <script>setTimeout(() => window.print(), 500);<\/script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // اضافه کردن دکمه پرینت به فرم خودرو
  const originalOpenCarForm2 = window.openCarForm;
  window.openCarForm = function(id) {
    originalOpenCarForm2(id);
    if (id) {
      const modalFooter = document.querySelector('#car-modal .modal-footer');
      if (modalFooter && !document.getElementById('print-btn')) {
        const printBtn = document.createElement('button');
        printBtn.id = 'print-btn';
        printBtn.className = 'btn';
        printBtn.textContent = '🖨 پرینت';
        printBtn.onclick = () => printCar(id);
        modalFooter.insertBefore(printBtn, modalFooter.firstChild);
      }
    } else {
      const oldPrint = document.getElementById('print-btn');
      if (oldPrint) oldPrint.remove();
    }
  };

  // ==========================================================
  // به‌روزرسانی صفحه فعلی برای دیدن تغییرات
  // ==========================================================
  if (typeof switchPage === 'function') {
    switchPage(currentPage);
  }
  
  console.log('✅ آپدیت ۲ (نسخه بزرگ) با موفقیت بارگذاری شد.');
  if (typeof showToast === 'function') {
    showToast('🚀 آپدیت ۲ فعال شد!');
  }
  
})();