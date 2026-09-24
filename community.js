// Paylaşılan paneller: mevcut tarayıcı deposu ve oturum modeliyle çalışır.
const STAFF_META_KEY = 'isSurecStaffMetaV1';
const ANNOUNCEMENT_KEY = 'isSurecAnnouncementsV1';
const ANNOUNCEMENT_PERM_KEY = 'isSurecAnnouncementPermsV1';
const EMPLOYEE_KEY = 'isSurecEmployeeMonthV1';
const ERROR_REVIEW_KEY = 'isSurecErrorReviewsV1';
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function loadCommunity(key, fallback = {}) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (value && typeof value === 'object' && Array.isArray(value) === Array.isArray(fallback)) return value;
  } catch (err) {}
  return fallback;
}
function saveCommunity(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (err) { window.alert('Kayıt yapılamadı. Tarayıcı depolama alanını kontrol edin.'); return false; }
}
function getStaffTitle(name) {
  const meta = loadCommunity(STAFF_META_KEY);
  return meta[name]?.title || 'Ünvan belirtilmedi';
}
function staffIdentity(name) {
  return `<span class="staff-identity"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(getStaffTitle(name))}</small></span>`;
}
function canPublishAnnouncement() {
  return !!currentUser && (isAdminUser() || loadCommunity(ANNOUNCEMENT_PERM_KEY)[currentUser.name] === true);
}
function setAnnouncementPermission(staff, allowed) {
  if (!isAdminUser() || !getStaff().includes(staff)) return false;
  const perms = loadCommunity(ANNOUNCEMENT_PERM_KEY);
  perms[staff] = allowed === true;
  return saveCommunity(ANNOUNCEMENT_PERM_KEY, perms);
}
function renderAnnouncementPermissions() {
  if (!isAdminUser()) return '';
  const perms = loadCommunity(ANNOUNCEMENT_PERM_KEY);
  return `<section class="panel"><div class="panel-header"><div><h2>Duyuru ekleme yetkisi</h2><p class="panel-subtitle">Herkes duyuruları okur. Yönetici ve aşağıda izin verilen personel duyuru ekler. Bu izin Yetkilendirme paneline erişim sağlamaz.</p></div></div>
    <div class="task-content">${getStaff().map((staff) => `<label class="task-row"><input type="checkbox" data-announcement-permission="${escapeHtml(staff)}" ${perms[staff] === true ? 'checked' : ''} />${staffIdentity(staff)}</label>`).join('')}</div>
    <div class="save-row"><span id="announcement-permission-status" class="save-status" role="status">Değişiklikler otomatik kaydedilir. Yönetici her zaman duyuru ekleyebilir.</span></div></section>`;
}
function setupAnnouncementPermissions() {
  if (!isAdminUser()) return;
  document.querySelectorAll('[data-announcement-permission]').forEach((input) => input.addEventListener('change', () => {
    if (setAnnouncementPermission(input.dataset.announcementPermission, input.checked)) {
      document.querySelector('#announcement-permission-status').textContent = '✓ Duyuru yetkisi kaydedildi.';
    } else input.checked = !input.checked;
  }));
}
function publishAnnouncement(title, body) {
  if (!canPublishAnnouncement()) return false;
  title = String(title || '').trim(); body = String(body || '').trim();
  if (!title || !body || title.length > 160 || body.length > 5000) return false;
  const list = loadCommunity(ANNOUNCEMENT_KEY, []);
  list.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, body, author: currentUser.name, createdAt: new Date().toISOString() });
  return saveCommunity(ANNOUNCEMENT_KEY, list);
}

function editAnnouncement(id, title, body) {
  if (!canPublishAnnouncement()) return false;
  const list = loadCommunity(ANNOUNCEMENT_KEY, []);
  const item = list.find(a => a.id === id);
  if (!item) return false;
  if (!isAdminUser() && item.author !== currentUser?.name) return false;
  title = String(title || '').trim();
  body = String(body || '').trim();
  if (!title || !body || title.length > 160 || body.length > 5000) return false;
  item.title = title;
  item.body = body;
  item.updatedAt = new Date().toISOString();
  return saveCommunity(ANNOUNCEMENT_KEY, list);
}

function deleteAnnouncement(id) {
  if (!canPublishAnnouncement()) return false;
  const list = loadCommunity(ANNOUNCEMENT_KEY, []);
  const item = list.find(a => a.id === id);
  if (!item) return false;
  if (!isAdminUser() && item.author !== currentUser?.name) return false;
  const filtered = list.filter(a => a.id !== id);
  return saveCommunity(ANNOUNCEMENT_KEY, filtered);
}
function renderAnnouncementsContent(compact = false) {
  const list = loadCommunity(ANNOUNCEMENT_KEY, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const editId = window._announcementEdit?.id;
  const editItem = editId ? list.find(a => a.id === editId) : null;
  return `${compact ? '' : '<div class="page-heading"><div><h1>Duyurular</h1><p>Ekibin ortak duyuru alanı.</p></div></div>'}
    ${!compact && canPublishAnnouncement() ? `<section class="panel"><div class="panel-header"><h2>Duyuru yayınla</h2></div><form id="announcement-form" class="work-form community-form">
      <label class="field">Başlık<input name="title" maxlength="160" required /></label>
      <label class="field note-text-field">Duyuru<textarea name="body" maxlength="5000" required></textarea></label><button class="primary-btn work-submit" type="submit">Yayınla</button></form></section>` : ''}
    ${editItem && canPublishAnnouncement() ? `<section class="panel"><div class="panel-header"><h2>Duyuru düzenle</h2></div><form id="announcement-edit-form" class="work-form community-form">
      <label class="field">Başlık<input name="title" maxlength="160" value="${escapeHtml(editItem.title)}" required /></label>
      <label class="field note-text-field">Duyuru<textarea name="body" maxlength="5000" required>${escapeHtml(editItem.body)}</textarea></label>
      <button class="primary-btn work-submit" type="submit">Kaydet</button>
      <button class="primary-btn" type="button" data-announcement-edit-cancel style="background:var(--muted);">İptal</button></form></section>` : ''}
    <section class="panel"><div class="panel-header"><div><h2>${compact ? 'Son duyurular' : 'Yayınlanan duyurular'}</h2><p class="panel-subtitle">${list.length} duyuru · Tüm personel görebilir.</p></div>${compact ? '<button class="primary-btn work-submit" data-page="Duyurular">Tümünü gör</button>' : ''}</div>
      <div class="task-content">${(compact ? list.slice(0, 3) : list).map((item) => `<article class="announcement-card" data-announcement-id="${escapeHtml(item.id)}">
        <h3>${escapeHtml(item.title)}</h3>
        <p class="note-body">${escapeHtml(item.body)}</p>
        <div class="announcement-footer">
          <div>${staffIdentity(item.author)}<small>${escapeHtml(item.updatedAt ? `Güncellenme: ${formatUpdatedAt(item.updatedAt)}` : formatUpdatedAt(item.createdAt))}</small></div>
          <div class="announcement-actions">
            ${canPublishAnnouncement() ? `<button class="primary-btn work-submit" type="button" data-announcement-edit="${escapeHtml(item.id)}" style="min-width:90px;">Düzenle</button>` : ''}
            ${canPublishAnnouncement() ? `<button class="primary-btn" type="button" data-announcement-delete="${escapeHtml(item.id)}" style="min-width:90px;background:#b5443c;">Sil</button>` : ''}
          </div>
        </div>
      </article>`).join('') || '<div class="permission-empty">Henüz duyuru yayınlanmadı.</div>'}</div></section>`;
}
function setupAnnouncements() {
  const form = document.querySelector('#announcement-form');
  if (form) form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (publishAnnouncement(data.get('title'), data.get('body'))) renderDashboard('Duyurular');
  });

  document.querySelectorAll('[data-announcement-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!canPublishAnnouncement()) return;
      const id = button.dataset.announcementDelete;
      const item = loadCommunity(ANNOUNCEMENT_KEY, []).find(a => a.id === id);
      const canDelete = isAdminUser() || item?.author === currentUser?.name;
      if (!canDelete) return;
      if (window.confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) {
        if (deleteAnnouncement(id)) renderDashboard('Duyurular');
      }
    });
  });

  document.querySelectorAll('[data-announcement-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!canPublishAnnouncement()) return;
      window._announcementEdit = { id: button.dataset.announcementEdit };
      renderDashboard('Duyurular');
    });
  });

  const editForm = document.querySelector('#announcement-edit-form');
  if (editForm) {
    editForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(editForm);
      const id = window._announcementEdit?.id;
      if (id && editAnnouncement(id, data.get('title'), data.get('body'))) {
        window._announcementEdit = null;
        renderDashboard('Duyurular');
      }
    });
    editForm.querySelector('[data-announcement-edit-cancel]')?.addEventListener('click', () => {
      window._announcementEdit = null;
      renderDashboard('Duyurular');
    });
  }

  setupAnnouncementPermissions();
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function validMonth(month) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(month); }
function monthLabel(month) {
  return validMonth(month) ? new Date(`${month}-01T00:00:00`).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : '';
}
// Bir personel + firma + gün + tamamlanmış iş türü = bir işlem.
// Aynı kaydı tekrar kaydetmek sayıyı artırmaz. Yetki değişiklikleri geçmişi silmez.
function getMonthlyPerformance(month) {
  if (!validMonth(month)) return [];
  const counts = Object.fromEntries(getStaff().map((staff) => [staff, 0]));
  Object.entries(loadWorkStore()).forEach(([key, record]) => {
    const [staff, , date] = key.split(' || ');
    if (!Object.hasOwn(counts, staff) || !date || date.slice(0, 7) !== month || !record) return;
    const named = record.tasksByName;
    const values = named && typeof named === 'object' && Object.keys(named).length
      ? Object.values(named) : (Array.isArray(record.tasks) ? record.tasks : []);
    counts[staff] += values.filter((value) => value === true).length;
  });
  const reviews = loadCommunity(ERROR_REVIEW_KEY)[month] || {};
  return getStaff().map((staff) => {
    const count = counts[staff];
    const review = reviews[staff];
    // İşlem sayısı değişirse önceki hata incelemesi yeniden onaylanmalıdır.
    const reviewed = !!review && review.count === count && Number.isInteger(review.errors) && review.errors >= 0 && review.errors <= count;
    return { staff, count, reviewed, errors: reviewed ? review.errors : null, rate: reviewed && count ? review.errors / count * 100 : null };
  }).sort((a, b) => b.count - a.count || a.staff.localeCompare(b.staff, 'tr'));
}
function saveErrorReview(month, staff, errors) {
  if (!isAdminUser() || !validMonth(month) || !Number.isInteger(errors)) return false;
  const row = getMonthlyPerformance(month).find((item) => item.staff === staff);
  if (!row || errors < 0 || errors > row.count) return false;
  const reviews = loadCommunity(ERROR_REVIEW_KEY);
  if (!reviews[month]) reviews[month] = {};
  reviews[month][staff] = { errors, count: row.count, reviewedBy: currentUser.name, reviewedAt: new Date().toISOString() };
  return saveCommunity(ERROR_REVIEW_KEY, reviews);
}
function approveEmployee(month, staff) {
  if (!isAdminUser() || !validMonth(month) || month > currentMonth()) return false;
  const ranking = getMonthlyPerformance(month);
  const row = ranking.find((item) => item.staff === staff);
  if (!row || !row.count || !row.reviewed || row.count !== ranking[0].count) return false;
  const awards = loadCommunity(EMPLOYEE_KEY);
  awards[month] = { staff, count: row.count, errors: row.errors, rate: row.rate, approvedBy: currentUser.name, approvedAt: new Date().toISOString() };
  return saveCommunity(EMPLOYEE_KEY, awards);
}
function renderEmployeeSpotlight(month = currentMonth()) {
  const award = loadCommunity(EMPLOYEE_KEY)[month];
  return `<section class="employee-spotlight ${award ? 'is-awarded' : ''}" aria-label="Ayın elemanı">
    <span class="employee-star" aria-hidden="true">★</span><div class="employee-copy"><span class="employee-eyebrow">${escapeHtml(monthLabel(month))} · AYIN ELEMANI</span>
    ${award ? `<h2>${escapeHtml(award.staff)}</h2><p class="employee-title">${escapeHtml(getStaffTitle(award.staff))}</p><div class="employee-metrics"><span><strong>${award.count}</strong> tamamlanan işlem</span><span><strong>%${Number(award.rate).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</strong> hata oranı</span></div><p class="employee-approval">✓ ${escapeHtml(award.approvedBy)} onayladı · ${escapeHtml(formatUpdatedAt(award.approvedAt))}<br>Değerler onay anındaki kayıtlardır.</p>` : '<h2>Bu ayın yıldızı henüz seçilmedi</h2><p>İşlem kayıtları değerlendirilerek yönetici onayıyla burada yayınlanır.</p>'}
    </div><button type="button" class="employee-link" data-page="Ayın Elemanı">${isAdminUser() ? 'Değerlendirme paneli' : 'Aylara göre görüntüle'} →</button></section>`;
}

