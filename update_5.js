// ============================================================
// UPDATE 5: گالری، ویس، تنظیمات و CRM
// ============================================================

(function() {
  
  // ==========================================================
  // ۱. گالری اختصاصی (اسلایدر عکس در کارت خودرو)
  // ==========================================================
  const originalCarCardHtml = window.carCardHtml;
  window.carCardHtml = function(car) {
    let baseHtml = originalCarCardHtml(car);
    
    // اگر خودرو عکس دارد، یک اسلایدر کوچک به آن اضافه کن
    if (car.photos && car.photos.length > 0) {
      let sliderHtml = `<div class="car-slider" style="display: flex; gap: 6px; overflow-x: auto; margin-top: 10px; scrollbar-width: none;">`;
      car.photos.forEach(photo => {
        sliderHtml += `<img src="${photo}" style="height: 60px; width: 80px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(212,175,55,0.3); flex-shrink: 0;">`;
      });
      sliderHtml += `</div>`;
      
      baseHtml = baseHtml.replace('</div>\n  ', sliderHtml + '</div>\n  ');
    }
    return baseHtml;
  };

  // ==========================================================
  // ۲. یادداشت صوتی (Voice Note)
  // ==========================================================
  
  // دکمه ضبط صدا رو به فرم خودرو اضافه کن
  const originalOpenCarForm = window.openCarForm;
  window.openCarForm = function(id) {
    originalOpenCarForm(id);
    if (id) {
      const car = state.cars.find(c => c.id === id);
      const modalBody = document.getElementById('car-form');
      
      let voiceHtml = `<div style="margin-bottom: 18px; margin-top: 10px;">
        <div class="card-title" style="font-size: 13px; margin-bottom: 10px;">🎙 یادداشت صوتی</div>`;
      
      if (car.voice) {
        voiceHtml += `<audio controls src="${car.voice}" style="width: 100%; height: 40px; border-radius: 10px; outline: none; margin-bottom: 10px;"></audio>`;
      }
      
      voiceHtml += `<button type="button" class="btn" id="record-btn" style="width: 100%;" onclick="toggleVoiceRecord(${car.id})">
        ${car.voice ? '🔄 ضبط مجدد' : '🔴 شروع ضبط صدا'}
      </button>
      </div>`;
      
      modalBody.insertAdjacentHTML('beforeend', voiceHtml);
    }
  };

  // تابع ضبط صدا
  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;
  let currentRecordingCarId = null;

  window.toggleVoiceRecord = async function(carId) {
    const btn = document.getElementById('record-btn');
    
    if (!isRecording) {
      // شروع ضبط
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        currentRecordingCarId = carId;
        
        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = e => {
            const base64Audio = e.target.result;
            const car = state.cars.find(c => c.id === currentRecordingCarId);
            if (car) {
              car.voice = base64Audio;
              saveState();
              showToast('✅ یادداشت صوتی ذخیره شد');
              closeCarForm();
              openCarForm(currentRecordingCarId); // باز کردن مجدد برای نمایش پلیر
            }
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop()); // خاموش کردن میکروفون
        };
        
        mediaRecorder.start();
        isRecording = true;
        btn.innerHTML = '⏹ توقف و ذخیره';
        btn.style.background = 'rgba(255, 107, 107, 0.3)';
        btn.style.borderColor = 'var(--danger)';
        btn.style.color = 'var(--danger)';
        showToast('در حال ضبط...');
        
      } catch (err) {
        console.error(err);
        showToast('خطا در دسترسی به میکروفون');
      }
    } else {
      // توقف ضبط
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        isRecording = false;
        btn.innerHTML = '⏳ در حال ذخیره...';
        btn.disabled = true;
      }
    }
  };

  // ==========================================================
  // ۳. تنظیمات پیشرفته (شخصی‌سازی)
  // ==========================================================
  
  // متغیرهای تنظیمات
  if (!state.settings) {
    state.settings = { appName: 'MIRSALARI', showroomName: 'MOTORS · PRO', accentColor: '#D4AF37' };
  }

  // تابع اعمال تنظیمات
  window.applySettings = function() {
    if (state.settings.appName) {
      document.querySelector('.header-title').textContent = state.settings.appName;
    }
    if (state.settings.showroomName) {
      document.querySelector('.header-sub').textContent = state.settings.showroomName;
    }
    if (state.settings.accentColor) {
      // تغییر متغیرهای رنگ در روت
      const root = document.documentElement;
      const color = state.settings.accentColor;
      root.style.setProperty('--gold', color);
      
      // ساخت نسخه روشن‌تر برای هایلایت
      if (color === '#D4AF37') root.style.setProperty('--gold-light', '#F9E076');
      else if (color === '#8B5CF6') root.style.setProperty('--gold-light', '#C4B5FD');
      else if (color === '#4ADE80') root.style.setProperty('--gold-light', '#86EFAC');
      else if (color === '#06B6D4') root.style.setProperty('--gold-light', '#67E8F9');
      else root.style.setProperty('--gold-light', color);
    }
  };

  // دکمه تنظیمات رو به تب گزارش اضافه کن
  const reportsCard = document.querySelector('#page-reports .card:nth-child(2)');
  if (reportsCard && !document.getElementById('settings-btn')) {
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn';
    settingsBtn.className = 'btn btn-block';
    settingsBtn.innerHTML = '⚙️ تنظیمات ظاهر و نام';
    settingsBtn.onclick = window.openSettingsModal;
    reportsCard.appendChild(settingsBtn);
  }

  // ساخت مدال تنظیمات
  window.openSettingsModal = function() {
    const html = `
      <div class="modal-overlay active" id="settings-modal" style="z-index: 250;">
        <div class="modal" style="max-height: 80vh;">
          <div class="modal-header">
            <div class="modal-title">⚙️ تنظیمات برنامه</div>
            <button class="modal-close" onclick="document.getElementById('settings-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">نام نمایشگاه (بالای صفحه)</label>
              <input type="text" class="form-input" id="set-app-name" value="${escapeHtml(state.settings.appName)}">
            </div>
            <div class="form-group">
              <label class="form-label">زیرنویس (مثلاً Motors)</label>
              <input type="text" class="form-input" id="set-sub-name" value="${escapeHtml(state.settings.showroomName)}">
            </div>
            <div class="form-group">
              <label class="form-label">رنگ اصلی برنامه</label>
              <select class="form-select" id="set-color">
                <option value="#D4AF37" ${state.settings.accentColor === '#D4AF37' ? 'selected' : ''}>طلایی (پیش‌فرض)</option>
                <option value="#8B5CF6" ${state.settings.accentColor === '#8B5CF6' ? 'selected' : ''}>بنفش</option>
                <option value="#4ADE80" ${state.settings.accentColor === '#4ADE80' ? 'selected' : ''}>سبز</option>
                <option value="#06B6D4" ${state.settings.accentColor === '#06B6D4' ? 'selected' : ''}>آبی</option>
                <option value="#F43F5E" ${state.settings.accentColor === '#F43F5E' ? 'selected' : ''}>قرمز</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="document.getElementById('settings-modal').remove()">انصراف</button>
            <button class="btn btn-primary" onclick="saveSettings()">ذخیره تنظیمات</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  };

  window.saveSettings = function() {
    state.settings.appName = document.getElementById('set-app-name').value.trim() || 'MIRSALARI';
    state.settings.showroomName = document.getElementById('set-sub-name').value.trim() || 'MOTORS · PRO';
    state.settings.accentColor = document.getElementById('set-color').value;
    saveState();
    applySettings();
    document.getElementById('settings-modal').remove();
    showToast('✅ تنظیمات ذخیره شد');
  };

  // اعمال تنظیمات هنگام لود
  applySettings();

  // ==========================================================
  // ۴. CRM (رهگیری مشتریان)
  // ==========================================================
  
  if (!state.customers) state.customers = [];
  if (!state.nextCustomerId) state.nextCustomerId = 1;

  // اضافه کردن تب مشتریان به منوی پایین
  const nav = document.querySelector('.nav');
  if (nav && !document.getElementById('nav-customers')) {
    const newBtn = document.createElement('button');
    newBtn.className = 'nav-btn ripple';
    newBtn.id = 'nav-customers';
    newBtn.setAttribute('data-page', 'customers');
    newBtn.innerHTML = '<span class="icon">👥</span><span>مشتریان</span>';
    newBtn.onclick = () => switchPage('customers');
    
    // درج قبل از دکمه گزارش
    const reportBtn = nav.querySelector('[data-page="reports"]');
    nav.insertBefore(newBtn, reportBtn);
    
    // کوچک کردن فونت‌ها برای جا شدن ۷ تب
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.style.fontSize = '9px';
      btn.style.padding = '6px 2px';
      const icon = btn.querySelector('.icon');
      if (icon) icon.style.fontSize = '18px';
    });
  }

  // ساخت صفحه HTML مشتریان
  const content = document.querySelector('.content');
  if (content && !document.getElementById('page-customers')) {
    const pageHtml = `
      <div class="page" id="page-customers">
        <div class="search-bar">
          <input type="text" class="search-input" id="cust-search" placeholder="جست‌وجوی مشتری (نام، شماره)..." oninput="renderCustomers()">
          <button class="btn btn-primary btn-small" onclick="openCustomerForm()">+ جدید</button>
        </div>
        <div id="customers-list"></div>
      </div>
    `;
    content.insertAdjacentHTML('beforeend', pageHtml);
  }

  // رندر لیست مشتریان
  window.renderCustomers = function() {
    const list = document.getElementById('customers-list');
    const q = (document.getElementById('cust-search').value || '').toLowerCase();
    
    let customers = [...state.customers];
    if (q) {
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.phone && c.phone.includes(q)) ||
        (c.interest && c.interest.toLowerCase().includes(q))
      );
    }

    if (customers.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">👥</div><div>مشتری‌ای پیدا نشد</div></div>';
      return;
    }

    list.innerHTML = customers.map(c => `
      <div class="car-card ripple" onclick="openCustomerForm(${c.id})">
        <div class="car-header">
          <div>
            <div class="car-title">${escapeHtml(c.name)}</div>
            <div class="car-subtitle">📞 ${escapeHtml(c.phone || '—')} ${c.interest ? '· 🚗 ' + escapeHtml(c.interest) : ''}</div>
          </div>
          <div class="car-badge badge-reserved">مشتری</div>
        </div>
        ${c.budget ? `<div class="price-diff diff-equal" style="margin-top: 8px;">💰 بودجه: ${escapeHtml(c.budget)}</div>` : ''}
      </div>
    `).join('');
    
    list.querySelectorAll('.car-card').forEach(el => el.classList.add('ripple'));
  };

  // فرم افزودن/ویرایش مشتری
  window.openCustomerForm = function(id) {
    const cust = id ? state.customers.find(c => c.id === id) : null;
    const title = cust ? 'ویرایش مشتری' : 'مشتری جدید';
    
    const html = `
      <div class="modal-overlay active" id="customer-modal" style="z-index: 250;">
        <div class="modal" style="max-height: 85vh;">
          <div class="modal-header">
            <div class="modal-title">${title}</div>
            <button class="modal-close" onclick="document.getElementById('customer-modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">نام مشتری *</label>
              <input type="text" class="form-input" id="cust-name" value="${cust ? escapeHtml(cust.name) : ''}" placeholder="مثلاً: آقای احمدی">
            </div>
            <div class="form-group">
              <label class="form-label">شماره تماس</label>
              <input type="tel" class="form-input" id="cust-phone" value="${cust ? escapeHtml(cust.phone || '') : ''}" placeholder="۰۹۱۲...">
            </div>
            <div class="form-group">
              <label class="form-label">خودروی مورد علاقه</label>
              <input type="text" class="form-input" id="cust-interest" value="${cust ? escapeHtml(cust.interest || '') : ''}" placeholder="مثلاً: پژو پارس، تویوتا">
            </div>
            <div class="form-group">
              <label class="form-label">بودجه</label>
              <input type="text" class="form-input" id="cust-budget" value="${cust ? escapeHtml(cust.budget || '') : ''}" placeholder="مثلاً: ۱ میلیارد تومان">
            </div>
            <div class="form-group">
              <label class="form-label">توضیحات / یادآوری</label>
              <textarea class="form-textarea" id="cust-notes" placeholder="مثلاً: فردا تماس بگیرم">${cust ? escapeHtml(cust.notes || '') : ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            ${cust ? `<button class="btn btn-danger" onclick="deleteCustomer(${cust.id})">حذف</button>` : ''}
            <button class="btn" onclick="document.getElementById('customer-modal').remove()">انصراف</button>
            <button class="btn btn-primary" onclick="saveCustomer(${cust ? cust.id : 'null'})">ذخیره</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  };

  window.saveCustomer = function(id) {
    const name = document.getElementById('cust-name').value.trim();
    if (!name) { showToast('نام مشتری الزامی است'); return; }
    
    const data = {
      name: name,
      phone: document.getElementById('cust-phone').value.trim(),
      interest: document.getElementById('cust-interest').value.trim(),
      budget: document.getElementById('cust-budget').value.trim(),
      notes: document.getElementById('cust-notes').value.trim()
    };

    if (id) {
      const idx = state.customers.findIndex(c => c.id === id);
      if (idx >= 0) state.customers[idx] = Object.assign({}, state.customers[idx], data);
    } else {
      state.customers.push(Object.assign({ id: state.nextCustomerId++, created_at: new Date().toISOString() }, data));
    }
    
    saveState();
    document.getElementById('customer-modal').remove();
    renderCustomers();
    showToast('✅ مشتری ذخیره شد');
  };

  window.deleteCustomer = function(id) {
    if (!confirm('مشتری حذف شود؟')) return;
    state.customers = state.customers.filter(c => c.id !== id);
    saveState();
    document.getElementById('customer-modal').remove();
    renderCustomers();
    showToast('مشتری حذف شد');
  };

  // به‌روزرسانی switchPage برای مشتریان
  const originalSwitchPage2 = window.switchPage;
  window.switchPage = function(page) {
    originalSwitchPage2(page);
    if (page === 'customers') {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-customers').classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('nav-customers').classList.add('active');
      renderCustomers();
    }
  };

  console.log('✅ آپدیت ۵ (گالری، ویس، تنظیمات، CRM) اعمال شد.');
  if (typeof showToast === 'function') {
    showToast('🚀 آپدیت ۵ فعال شد!');
  }
  
  // رفرش نوار پایین
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.add('ripple'));

})();