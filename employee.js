function renderEmployeeContent() {
  const month = validMonth(window._employeeMonth || '') ? window._employeeMonth : currentMonth();
  const ranking = getMonthlyPerformance(month);
  const admin = isAdminUser();
  return `<div class="page-heading"><div><h1>Ayın Elemanı</h1><p>Başarı, kayıtlı işlemler ve yönetici değerlendirmesiyle görünür olur.</p></div></div>
    <section class="panel"><form id="employee-month-form" class="work-form community-form"><label class="field">Değerlendirme ayı<input name="month" type="month" value="${month}" max="${currentMonth()}" required /></label><button class="primary-btn work-submit" type="submit">Göster</button></form></section>
    ${renderEmployeeSpotlight(month)}
    ${admin ? `<section class="panel"><div class="panel-header"><div><h2>Aylık işlem sıralaması</h2><p class="panel-subtitle">Tamamlanmış her iş türü, firma ve gün başına bir işlem sayılır. Eksik işler hata sayılmaz. Hatalı işlem sayısını inceleyip kaydedin; oran otomatik hesaplanır. En yüksek işlem sayısında eşitlik varsa yönetici bu personellerden birini seçebilir.</p></div></div>
      <div class="task-content">${ranking.map((row, index) => `<article class="employee-review"><div class="employee-review-heading"><span class="rank-number">${index + 1}</span>${staffIdentity(row.staff)}<span class="access-badge">${row.count} işlem</span></div>
        <p class="panel-subtitle">${row.reviewed ? `Hatalı: ${row.errors} · Hata oranı: ${row.rate === null ? '—' : '%' + row.rate.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` : 'Hata incelemesi bekleniyor (işlem sayısı değiştiyse tekrar kaydedin).'}</p>
        <form data-error-review="${escapeHtml(row.staff)}" class="work-form community-form"><label class="field">Hatalı işlem sayısı<input type="number" name="errors" min="0" max="${row.count}" step="1" value="${row.errors ?? ''}" required /></label><button class="primary-btn work-submit" type="submit">İncelemeyi kaydet</button></form>
        ${row.count > 0 && row.count === ranking[0].count ? `<button class="primary-btn" type="button" data-approve-employee="${escapeHtml(row.staff)}" ${row.reviewed ? '' : 'disabled'}>★ Onayla ve ayın elemanı olarak yayınla</button>` : ''}</article>`).join('') || '<div class="permission-empty">Kayıtlı personel yok.</div>'}</div></section>` : ''}
    <p class="save-status" id="employee-status" role="status"></p>`;
}
function setupEmployeeSelection() {
  const form = document.querySelector('#employee-month-form');
  if (!form) return;
  const month = form.elements.month.value;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = form.elements.month.value;
    if (!validMonth(selected) || selected > currentMonth()) return;
    window._employeeMonth = selected;
    renderDashboard('Ayın Elemanı');
  });
  if (!isAdminUser()) return;
  document.querySelectorAll('[data-error-review]').forEach((reviewForm) => reviewForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = new FormData(reviewForm).get('errors');
    if (value !== '' && saveErrorReview(month, reviewForm.dataset.errorReview, Number(value))) {
      renderDashboard('Ayın Elemanı');
      document.querySelector('#employee-status').textContent = '✓ Hata incelemesi kaydedildi. Yayınlamak için ayrıca onaylayın.';
    }
  }));
  document.querySelectorAll('[data-approve-employee]').forEach((button) => button.addEventListener('click', () => {
    if (!isAdminUser()) return;
    const staff = button.dataset.approveEmployee;
    if (!window.confirm(`${monthLabel(month)} için ${staff} ayın elemanı olarak yayınlansın mı? Varsa bu ayın önceki seçimi değişir.`)) return;
    if (approveEmployee(month, staff)) {
      renderDashboard('Ayın Elemanı');
      document.querySelector('#employee-status').textContent = '✓ Yönetici onayıyla yayınlandı.';
    } else document.querySelector('#employee-status').textContent = 'Kayıtlar değişmiş olabilir. Ayı yeniden gösterip incelemeyi kaydedin.';
  }));
}

function validStaffDetails(name, title) {
  return !!name && !!title && name.length <= 100 && title.length <= 100 && !name.includes(' || ') && !['__proto__', 'constructor', 'prototype'].includes(name);
}
// İsimle anahtarlanan kayıtları ad değişikliklerinde koru.
function updateStaffIdentity(oldName, newName, title) {
  if (!isAdminUser() || !validStaffDetails(newName, title)) return false;
  const meta = loadCommunity(STAFF_META_KEY);
  if (oldName !== newName) delete meta[oldName];
  meta[newName] = { title };
  if (!saveCommunity(STAFF_META_KEY, meta)) return false;
  if (oldName === newName) return true;
  for (const key of [WORK_STORAGE_KEY, PERM_KEY]) {
    const store = loadCommunity(key);
    Object.keys(store).forEach((entry) => {
      if (entry.split(' || ')[0] !== oldName) return;
      store[newName + entry.slice(oldName.length)] = store[entry]; delete store[entry];
    });
    if (!saveCommunity(key, store)) return false;
  }
  for (const key of [TASK_PERM_KEY, ANNOUNCEMENT_PERM_KEY]) {
    const store = loadCommunity(key);
    if (Object.hasOwn(store, oldName)) { store[newName] = store[oldName]; delete store[oldName]; }
    if (!saveCommunity(key, store)) return false;
  }
  const reviews = loadCommunity(ERROR_REVIEW_KEY);
  Object.values(reviews).forEach((month) => {
    if (Object.hasOwn(month, oldName)) { month[newName] = month[oldName]; delete month[oldName]; }
    Object.values(month).forEach((review) => { if (review.reviewedBy === oldName) review.reviewedBy = newName; });
  });
  if (!saveCommunity(ERROR_REVIEW_KEY, reviews)) return false;
  const awards = loadCommunity(EMPLOYEE_KEY);
  Object.values(awards).forEach((award) => {
    if (award.staff === oldName) award.staff = newName;
    if (award.approvedBy === oldName) award.approvedBy = newName;
  });
  if (!saveCommunity(EMPLOYEE_KEY, awards)) return false;
  for (const [key, fields] of [[ANNOUNCEMENT_KEY, ['author']], [QUESTION_KEY, ['from', 'to', 'answeredBy']], [NOTE_KEY, ['staff']]]) {
    const list = loadCommunity(key, []);
    list.forEach((item) => fields.forEach((field) => { if (item[field] === oldName) item[field] = newName; }));
    if (!saveCommunity(key, list)) return false;
  }
  return true;
}
