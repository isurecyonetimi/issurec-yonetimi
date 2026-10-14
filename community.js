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
  if (
    typeof sharedStaffMetaCache !== 'undefined' &&
    sharedStaffMetaCache &&
    sharedStaffMetaCache[name] &&
    sharedStaffMetaCache[name].title
  ) {
    return sharedStaffMetaCache[name].title;
  }

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
  const list = loadCommunity(ANNOUNCEMENT_KEY, [])
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const editId = window._announcementEdit?.id;
  const editItem = editId ? list.find((a) => a.id === editId) : null;
  const canPublish = canPublishAnnouncement();

  const esc = (value) => escapeHtml(value);

  const announcementCards = (compact ? list.slice(0, 3) : list)
    .map((item, index) => `
      <article class="announcement-premium-card"
        data-announcement-id="${esc(item.id)}">

        <div class="announcement-card-accent"></div>

        <div class="announcement-premium-inner">
          <div class="announcement-card-heading">
            <div class="announcement-card-symbol">
              ${index === 0 ? '✦' : '▤'}
            </div>

            <div class="announcement-card-meta">
              <span class="announcement-card-category">
                KURUMSAL DUYURU
              </span>
              <span class="announcement-card-date">
                ${esc(formatUpdatedAt(item.updatedAt || item.createdAt))}
              </span>
            </div>

            ${item.updatedAt
              ? '<span class="announcement-edited-label">Güncellendi</span>'
              : ''}
          </div>

          <h3 class="announcement-premium-title">
            ${esc(item.title)}
          </h3>

          <div class="announcement-premium-body">
            ${esc(item.body)}
          </div>

          <div class="announcement-premium-footer">
            <div class="announcement-author">
              <div class="announcement-author-avatar">
                ${esc((item.author || '?').trim().charAt(0).toLocaleUpperCase('tr-TR'))}
              </div>

              <div class="announcement-author-info">
                <span>Yayımlayan</span>
                ${staffIdentity(item.author || 'Belirtilmedi')}
              </div>
            </div>

            ${canPublish ? `
              <div class="announcement-premium-actions">
                <button
                  class="announcement-action-btn announcement-edit-btn"
                  type="button"
                  data-announcement-edit="${esc(item.id)}">
                  <span>✎</span> Düzenle
                </button>

                <button
                  class="announcement-action-btn announcement-delete-btn"
                  type="button"
                  data-announcement-delete="${esc(item.id)}">
                  <span>×</span> Sil
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </article>
    `).join('');

  const composer = !compact && canPublish ? `
    <section class="announcement-composer">
      <div class="announcement-section-heading">
        <div class="announcement-section-icon">✎</div>
        <div>
          <span class="announcement-eyebrow">İÇ İLETİŞİM</span>
          <h2>Yeni duyuru oluştur</h2>
          <p>Ekibinle paylaşmak istediğin bilgilendirmeyi hazırla.</p>
        </div>
      </div>

      <form id="announcement-form" class="announcement-compose-form">
        <label class="announcement-field">
          <span>Duyuru başlığı</span>
          <input
            name="title"
            type="text"
            maxlength="160"
            placeholder="Duyurunun başlığını yazın"
            required>
          <small>En fazla 160 karakter.</small>
        </label>

        <label class="announcement-field">
          <span>Duyuru içeriği</span>
          <textarea
            name="body"
            maxlength="5000"
            rows="5"
            placeholder="Duyurunun ayrıntılarını buraya yazın..."
            required></textarea>
          <small>En fazla 5.000 karakter.</small>
        </label>

        <div class="announcement-compose-footer">
          <span>✦ Ekibinle paylaşmaya hazır olduğunda yayımla.</span>
          <button class="announcement-publish-btn" type="submit">
            <span>↗</span> Duyuruyu yayımla
          </button>
        </div>
      </form>
    </section>
  ` : '';

  const editPanel = editItem && canPublish ? `
    <section class="announcement-composer announcement-edit-panel">
      <div class="announcement-section-heading">
        <div class="announcement-section-icon">✎</div>
        <div>
          <span class="announcement-eyebrow">DÜZENLEME MODU</span>
          <h2>Duyuruyu düzenle</h2>
          <p>Değişikliklerini tamamladıktan sonra kaydedebilirsin.</p>
        </div>
      </div>

      <form id="announcement-edit-form" class="announcement-compose-form">
        <label class="announcement-field">
          <span>Duyuru başlığı</span>
          <input
            name="title"
            type="text"
            maxlength="160"
            value="${esc(editItem.title)}"
            required>
        </label>

        <label class="announcement-field">
          <span>Duyuru içeriği</span>
          <textarea
            name="body"
            maxlength="5000"
            rows="5"
            required>${esc(editItem.body)}</textarea>
        </label>

        <div class="announcement-compose-footer">
          <button
            class="announcement-action-btn announcement-cancel-btn"
            type="button"
            data-announcement-edit-cancel>
            Vazgeç
          </button>

          <button class="announcement-publish-btn" type="submit">
            <span>✓</span> Değişiklikleri kaydet
          </button>
        </div>
      </form>
    </section>
  ` : '';

  return `
    <div class="announcement-page">

      ${compact ? '' : `
        <section class="announcement-hero">
          <div class="announcement-hero-content">
            <span class="announcement-hero-kicker">
              <span></span> KURUMSAL İLETİŞİM PLATFORMU
            </span>

            <h1>Duyurular</h1>

            <p>
              Ekibimizle aynı bilgiyi paylaşalım.
              Önemli bilgilendirmeler, güncellemeler ve şirket içi
              haberler burada bir arada.
            </p>

            <div class="announcement-hero-pills">
              <span>✦ Ortak bilgilendirme alanı</span>
              <span>▤ ${list.length} yayımlanmış duyuru</span>
            </div>
          </div>

          <div class="announcement-hero-art" aria-hidden="true">
            <div class="announcement-hero-orbit announcement-orbit-one"></div>
            <div class="announcement-hero-orbit announcement-orbit-two"></div>
            <div class="announcement-hero-document">
              <div class="announcement-document-top">✦</div>
              <div class="announcement-document-line announcement-line-long"></div>
              <div class="announcement-document-line"></div>
              <div class="announcement-document-line announcement-line-short"></div>
              <div class="announcement-document-check">✓</div>
            </div>
            <span class="announcement-art-spark announcement-spark-one">✦</span>
            <span class="announcement-art-spark announcement-spark-two">✧</span>
          </div>
        </section>

        <section class="announcement-summary">
          <div class="announcement-summary-card">
            <div class="announcement-summary-icon">▤</div>
            <div>
              <span>Toplam duyuru</span>
              <strong>${list.length}</strong>
              <small>Yayımlanmış kayıt</small>
            </div>
          </div>

          <div class="announcement-summary-card">
            <div class="announcement-summary-icon announcement-summary-icon-green">✓</div>
            <div>
              <span>İletişim alanı</span>
              <strong>Aktif</strong>
              <small>Yayınlanan duyurular</small>
            </div>
          </div>

          <div class="announcement-summary-card">
            <div class="announcement-summary-icon announcement-summary-icon-purple">◎</div>
            <div>
              <span>Görünürlük</span>
              <strong>Personel</strong>
              <small>Mevcut ekran yetkilerine göre</small>
            </div>
          </div>
        </section>
      `}

      ${composer}
      ${editPanel}

      <section class="announcement-feed">
        <div class="announcement-feed-heading">
          <div>
            <span class="announcement-eyebrow">
              ${compact ? 'GÜNCEL BİLGİLER' : 'DUYURU AKIŞI'}
            </span>
            <h2>${compact ? 'Son duyurular' : 'Yayımlanan duyurular'}</h2>
            <p>
              ${compact
                ? 'Ekibinle paylaşılan son bilgilendirmeler.'
                : 'Paylaşılan duyuruları tarihleri ve yayımlayan kişileriyle görüntüle.'}
            </p>
          </div>

          <span class="announcement-feed-count">${list.length} kayıt</span>
        </div>

        <div class="announcement-feed-list">
          ${announcementCards || `
            <div class="announcement-empty">
              <div class="announcement-empty-icon">▤</div>
              <h3>Henüz duyuru yayımlanmamış</h3>
              <p>
                ${canPublish
                  ? 'Ekibinle paylaşmak istediğin ilk duyuruyu yukarıdaki alandan oluşturabilirsin.'
                  : 'Yeni duyurular yayımlandığında burada görüntülenecek.'}
              </p>
            </div>
          `}
        </div>

        ${compact && list.length > 3 ? `
          <div class="announcement-view-all">
            <button class="announcement-view-all-btn" type="button" data-page="Duyurular">
              Tüm duyuruları görüntüle <span>→</span>
            </button>
          </div>
        ` : ''}
      </section>

      <footer class="announcement-bottom-note">
        <span>✦</span>
        <p>Doğru bilgi, güçlü iletişim ve birlikte daha düzenli iş süreçleri.</p>
      </footer>

    </div>
  `;
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

/* =========================================================
   AYIN ELEMANI - PUANLAMA SİSTEMİ
   Mevcut kodların altına eklenir.
   ========================================================= */

window.employeeScoringState = window.employeeScoringState || {
  rules: null,
  months: {},
  workRecords: null,
  loading: false,
  loadedMonths: {}
};

async function employeeScoringRead(collectionName, documentId) {
  if (!window.firebaseDb || !window.firebaseDoc || !window.firebaseGetDoc) {
    throw new Error('Firebase bağlantısı hazır değil.');
  }

  const ref = window.firebaseDoc(
    window.firebaseDb,
    collectionName,
    documentId
  );

  const snapshot = await window.firebaseGetDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

async function employeeScoringWrite(collectionName, documentId, data) {
  if (!window.firebaseDb || !window.firebaseDoc || !window.firebaseSetDoc) {
    throw new Error('Firebase kayıt bağlantısı hazır değil.');
  }

  const ref = window.firebaseDoc(
    window.firebaseDb,
    collectionName,
    documentId
  );

  await window.firebaseSetDoc(ref, data, { merge: true });
}

function employeeScoringTaskNames() {
  const tasks = typeof getTaskTypes === 'function' ? getTaskTypes() : [];

  return tasks.map((task) => {
    if (typeof task === 'string') return task;
    return task.name || task.title || task.label || '';
  }).filter(Boolean);
}

function employeeScoringDefaultRules() {
  const taskPoints = {};

  employeeScoringTaskNames().forEach((name) => {
    taskPoints[name] = 1;
  });

  return {
    taskPoints,
    errorTypes: []
  };
}

async function employeeScoringLoadRules() {
  const state = window.employeeScoringState;

  // Mevcut hata türlerini ayrı ayar belgesinden yükle.
  const savedRules =
    await employeeScoringRead(
      'settings',
      'employeeScoringRules'
    ) || {};

  // İş türlerini ve puanlarını asıl kaynağından yükle.
  const sharedTaskSettings =
    await employeeScoringRead(
      'settings',
      'taskTypes'
    ) || {};

  const taskNames = employeeScoringTaskNames();

  const sharedPoints =
    sharedTaskSettings.taskPoints &&
    typeof sharedTaskSettings.taskPoints === 'object' &&
    !Array.isArray(sharedTaskSettings.taskPoints)
      ? sharedTaskSettings.taskPoints
      : {};

  const oldPoints =
    savedRules.taskPoints &&
    typeof savedRules.taskPoints === 'object' &&
    !Array.isArray(savedRules.taskPoints)
      ? savedRules.taskPoints
      : {};

  const taskPoints = {};

  taskNames.forEach((taskName) => {
    // Öncelik, iş türü tanımlanırken kaydedilen puandadır.
    const hasSharedPoint =
      Object.prototype.hasOwnProperty.call(
        sharedPoints,
        taskName
      );

    const rawPoint = hasSharedPoint
      ? sharedPoints[taskName]
      : Object.prototype.hasOwnProperty.call(
          oldPoints,
          taskName
        )
        ? oldPoints[taskName]
        : 1;

    const point = Number(rawPoint);

    taskPoints[taskName] =
      Number.isFinite(point) && point >= 0
        ? point
        : 1;
  });

  const defaultRules = employeeScoringDefaultRules();

  const errorTypes = Array.isArray(savedRules.errorTypes)
    ? savedRules.errorTypes
    : defaultRules.errorTypes;

  state.rules = {
    taskPoints,
    errorTypes
  };

  console.log(
    'Ayın Elemanı görev puanları yüklendi:',
    taskPoints
  );

  return state.rules;
}

async function employeeScoringLoadMonth(month) {
  const state = window.employeeScoringState;

  if (state.loadedMonths[month]) {
    return state.months[month];
  }

  const saved = await employeeScoringRead('employeeMonths', month);

  state.months[month] = saved || {
    errorsByStaff: {},
    award: null
  };

  state.loadedMonths[month] = true;
  return state.months[month];
}

async function employeeScoringLoadWorkRecords() {
  const state = window.employeeScoringState;
  if (Array.isArray(state.workRecords)) return state.workRecords;

  if (typeof loadReportWorkRecordsFromFirebase !== 'function') {
    throw new Error('Firebase iş kayıtlarını yükleyen fonksiyon bulunamadı.');
  }

  state.workRecords = await loadReportWorkRecordsFromFirebase();

  if (!Array.isArray(state.workRecords)) {
    state.workRecords = [];
  }

  return state.workRecords;
}

function employeeScoringErrorsFor(month, staff) {
  const data = window.employeeScoringState.months[month] || {};
  const errors = data.errorsByStaff || {};
  return Array.isArray(errors[staff]) ? errors[staff] : [];
}

function employeeScoringCalculate(month) {
  const state = window.employeeScoringState;
  const rules = state.rules || employeeScoringDefaultRules();
  const records = Array.isArray(state.workRecords)
    ? state.workRecords
    : [];

  const staffList = typeof getStaff === 'function' ? getStaff() : [];
  const taskNames = employeeScoringTaskNames();

  const normalizeName = (value) =>
    String(value ?? '').trim().toLocaleLowerCase('tr-TR');

  const rows = staffList.map((staff) => {
    let earnedPoints = 0;
    let completedUnits = 0;
    const taskBreakdown = {};

    taskNames.forEach((taskName) => {
      taskBreakdown[taskName] = {
        units: 0,
        unitPoints: Number(rules.taskPoints?.[taskName] ?? 1),
        totalPoints: 0
      };
    });

    records.forEach((record) => {
      if (!record || !record.date) return;

      const recordMonth = String(record.date).slice(0, 7);
      const recordStaff = normalizeName(
        record.staff ??
        record.staffName ??
        record.personel ??
        record.employee ??
        ''
      );

      if (
        recordMonth !== month ||
        recordStaff !== normalizeName(staff)
      ) {
        return;
      }

      const named = record.tasksByName || {};
      const quantities = record.quantitiesByName || {};
      const tasks = Array.isArray(record.tasks) ? record.tasks : [];

      taskNames.forEach((taskName, index) => {
        let units = 0;

        if (
          Object.prototype.hasOwnProperty.call(quantities, taskName)
        ) {
          const quantity = Number(quantities[taskName]);

          if (Number.isFinite(quantity) && quantity > 0) {
            units = quantity;
          }
        } else if (
          Object.prototype.hasOwnProperty.call(named, taskName)
        ) {
          const value = named[taskName];

          if (value === true) {
            units = 1;
          } else if (
            typeof value === 'number' ||
            (typeof value === 'string' && value.trim() !== '')
          ) {
            const quantity = Number(value);

            if (Number.isFinite(quantity) && quantity > 0) {
              units = quantity;
            }
          }
        } else if (tasks[index] === true) {
          units = 1;
        } else if (
          typeof tasks[index] === 'number' ||
          typeof tasks[index] === 'string'
        ) {
          const quantity = Number(tasks[index]);

          if (Number.isFinite(quantity) && quantity > 0) {
            units = quantity;
          }
        }

        const points = Number(rules.taskPoints?.[taskName] ?? 1);

        if (Number.isFinite(points) && points >= 0) {
          completedUnits += units;
          earnedPoints += units * points;

          taskBreakdown[taskName].units += units;
          taskBreakdown[taskName].totalPoints += units * points;
        }
      });
    });

    const errors = employeeScoringErrorsFor(month, staff);

    const penaltyPoints = errors.reduce((sum, error) => {
      const penalty = Number(error.penalty);

      return sum + (
        Number.isFinite(penalty) && penalty >= 0
          ? penalty
          : 0
      );
    }, 0);

    return {
      staff,
      completedUnits,
      earnedPoints,
      penaltyPoints,
      score: earnedPoints - penaltyPoints,
      errorCount: errors.length,
      taskBreakdown
    };
  });

  console.log(
    'Ayın Elemanı hesaplama sonucu:',
    month,
    rows
  );

  return rows.sort((a, b) =>
    b.score - a.score ||
    b.earnedPoints - a.earnedPoints ||
    a.staff.localeCompare(b.staff, 'tr')
  );
}

function employeeScoringIsAdmin() {
  return typeof isAdminUser === 'function' && isAdminUser();
}

function employeeScoringFormat(value) {
  return Number(value).toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });
}

async function employeeScoringSaveRules(form) {
  const taskPoints = {};
  const errorTypes = (
    window.employeeScoringState.rules || employeeScoringDefaultRules()
  ).errorTypes;

  form.querySelectorAll('[data-scoring-task-point]').forEach((input) => {
    const name = input.dataset.scoringTaskPoint;
    const points = Number(input.value);

    if (!name || !Number.isFinite(points) || points < 0) {
      throw new Error('Görev puanları sıfır veya daha büyük bir sayı olmalıdır.');
    }

    taskPoints[name] = points;
  });

  const rules = { taskPoints, errorTypes };

  await employeeScoringWrite(
    'settings',
    'employeeScoringRules',
    rules
  );

  window.employeeScoringState.rules = rules;
}

async function employeeScoringAddErrorType(form) {
  const data = new FormData(form);
  const name = String(data.get('error-name') || '').trim();
  const penalty = Number(data.get('error-penalty'));

  if (!name) throw new Error('Hata türünün adını yazmalısın.');
  if (!Number.isFinite(penalty) || penalty < 0) {
    throw new Error('Hata puanı sıfır veya daha büyük olmalıdır.');
  }

  const rules = await employeeScoringLoadRules();

  if (rules.errorTypes.some((item) =>
    item.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')
  )) {
    throw new Error('Bu hata türü zaten kayıtlı.');
  }

  rules.errorTypes.push({
    id: 'error_' + Date.now(),
    name,
    penalty
  });

  await employeeScoringWrite('settings', 'employeeScoringRules', rules);
  window.employeeScoringState.rules = rules;
}

async function employeeScoringAddEmployeeError(form) {
  const data = new FormData(form);
  const month = String(data.get('month') || '');
  const staff = String(data.get('staff') || '');
  const errorTypeId = String(data.get('error-type') || '');
  const rules = await employeeScoringLoadRules();
  const errorType = rules.errorTypes.find((item) => item.id === errorTypeId);

  if (!validMonth(month) || !staff || !errorType) {
    throw new Error('Ay, personel ve hata türünü kontrol et.');
  }

  await employeeScoringLoadMonth(month);

  const state = window.employeeScoringState;
  const monthData = state.months[month];
  const errorsByStaff = { ...(monthData.errorsByStaff || {}) };
  const staffErrors = [...(errorsByStaff[staff] || [])];

  staffErrors.push({
    id: 'entry_' + Date.now(),
    type: errorType.name,
    penalty: Number(errorType.penalty),
    createdBy: currentUser?.name || '',
    createdAt: new Date().toISOString()
  });

  errorsByStaff[staff] = staffErrors;

  const updated = { ...monthData, errorsByStaff };

  await employeeScoringWrite('employeeMonths', month, updated);
  state.months[month] = updated;

  // Önceden onaylanmış sonuç varsa yeni hata sonrası yeniden değerlendirilmelidir.
  state.months[month].award = null;

  await employeeScoringWrite('employeeMonths', month, {
    errorsByStaff,
    award: null
  });
}

async function employeeScoringRemoveError(month, staff, errorId) {
  if (!employeeScoringIsAdmin()) {
    throw new Error('Bu işlem için yönetici yetkisi gerekir.');
  }

  await employeeScoringLoadMonth(month);

  const state = window.employeeScoringState;
  const monthData = state.months[month];
  const errorsByStaff = { ...(monthData.errorsByStaff || {}) };

  errorsByStaff[staff] = (errorsByStaff[staff] || [])
    .filter((item) => item.id !== errorId);

  const updated = { ...monthData, errorsByStaff, award: null };

  await employeeScoringWrite('employeeMonths', month, updated);
  state.months[month] = updated;
}

async function employeeScoringApprove(month) {
  if (!employeeScoringIsAdmin()) {
    throw new Error('Kazananı yalnızca yönetici onaylayabilir.');
  }

  if (!validMonth(month) || month > currentMonth()) {
    throw new Error('Henüz tamamlanmamış bir ay onaylanamaz.');
  }

  await employeeScoringLoadMonth(month);
  await employeeScoringLoadRules();
  await employeeScoringLoadWorkRecords();

  const ranking = employeeScoringCalculate(month);
  const winner = ranking[0];

  if (!winner || winner.completedUnits === 0) {
    throw new Error('Bu ay tamamlanmış görev kaydı bulunmuyor.');
  }

  const award = {
    month,
    staff: winner.staff,
    completedUnits: winner.completedUnits,
    earnedPoints: winner.earnedPoints,
    penaltyPoints: winner.penaltyPoints,
    score: winner.score,
    approvedBy: currentUser?.name || '',
    approvedAt: new Date().toISOString(),
    rulesSnapshot: JSON.parse(JSON.stringify(
      window.employeeScoringState.rules
    )),
    rankingSnapshot: ranking.map((row) => ({ ...row }))
  };

  const state = window.employeeScoringState;
  const updated = {
    ...state.months[month],
    award
  };

  await employeeScoringWrite('employeeMonths', month, updated);
  state.months[month] = updated;
}

function renderEmployeeScoringContent() {
  const state = window.employeeScoringState;
  const month = state.selectedMonth || currentMonth();
  const admin = employeeScoringIsAdmin();

  if (state.loading) {
    return '<section class="permission-empty"><p>Puanlama verileri yükleniyor...</p></section>';
  }

  if (!state.rules || !state.loadedMonths[month] || !Array.isArray(state.workRecords)) {
    state.loading = true;

    Promise.all([
      employeeScoringLoadRules(),
      employeeScoringLoadMonth(month),
      employeeScoringLoadWorkRecords()
    ]).then(() => {
      state.loading = false;
      renderDashboard('Ayın Elemanı');
    }).catch((error) => {
      state.loading = false;
      console.error('Ayın Elemanı yüklenemedi:', error);
      window.alert('Puanlama verileri yüklenemedi: ' + error.message);
      renderDashboard('Ayın Elemanı');
    });

    return '<section class="permission-empty"><p>Puanlama verileri yükleniyor...</p></section>';
  }

  const rules = state.rules;
  const ranking = employeeScoringCalculate(month);
  const monthData = state.months[month] || {};
  const award = monthData.award;
  const staffList = typeof getStaff === 'function' ? getStaff() : [];
  const taskNames = employeeScoringTaskNames();

  const medals = ['🥇', '🥈', '🥉'];
  const positions = ['Birinci', 'İkinci', 'Üçüncü'];

  const podiumRows = ranking.slice(0, 3).map((row, index) => `
    <article class="scoring-podium-card scoring-rank-${index + 1}">
      <div class="scoring-medal">${medals[index]}</div>
      <div class="scoring-rank-label">${positions[index]} sıra</div>
      <div class="scoring-person-name">${escapeHtml(row.staff)}</div>
      <div class="scoring-score">${employeeScoringFormat(row.score)}
        <small>puan</small>
      </div>
      <div class="scoring-person-stats">
        <span>✓ ${row.completedUnits} işlem</span>
        <span>− ${employeeScoringFormat(row.penaltyPoints)} kesinti</span>
      </div>
      ${award && award.staff === row.staff
        ? '<div class="scoring-approved-label">★ Ayın Elemanı</div>'
        : ''}
    </article>
  `).join('');

  const taskRows = taskNames.map((name) => `
    <label class="scoring-form-row">
      <span>${escapeHtml(name)}</span>
      <input type="number" min="0" step="0.5" required
        data-scoring-task-point="${escapeHtml(name)}"
        value="${Number(rules.taskPoints[name] ?? 1)}">
    </label>
  `).join('');

  const errorTypeRows = rules.errorTypes.length
    ? rules.errorTypes.map((item) => `
      <li>${escapeHtml(item.name)}
        <span class="scoring-penalty">−${employeeScoringFormat(item.penalty)} puan</span>
      </li>
    `).join('')
    : '<li>Henüz hata türü tanımlanmadı.</li>';

  const errorOptions = rules.errorTypes.map((item) => `
    <option value="${escapeHtml(item.id)}">
      ${escapeHtml(item.name)} (-${employeeScoringFormat(item.penalty)})
    </option>
  `).join('');

  const rankingRows = ranking.map((row, index) => {
  const detailRows = Object.entries(row.taskBreakdown || {})
    .filter(([, item]) => item.units > 0)
    .map(([taskName, item]) => `
      <tr>
        <td>${escapeHtml(taskName)}</td>
        <td>${employeeScoringFormat(item.units)}</td>
        <td>${employeeScoringFormat(item.unitPoints)}</td>
        <td><strong>${employeeScoringFormat(item.totalPoints)}</strong></td>
      </tr>
    `).join('');

  return `
    <tr class="${index < 3 ? 'scoring-table-top' : ''}">
      <td>
        <span class="scoring-table-medal">
          ${medals[index] || (index + 1)}
        </span>
      </td>
      <td>
        <button
          type="button"
          class="scoring-person-toggle"
          data-scoring-details-toggle="${index}"
          aria-expanded="false">
          <strong>${escapeHtml(row.staff)}</strong>
          <span>＋</span>
        </button>
      </td>
      <td>${employeeScoringFormat(row.earnedPoints)}</td>
      <td class="scoring-penalty">
        −${employeeScoringFormat(row.penaltyPoints)}
      </td>
      <td>
        <strong class="scoring-net-score">
          ${employeeScoringFormat(row.score)}
        </strong>
      </td>
      <td>${row.completedUnits}</td>
    </tr>

    <tr data-scoring-details="${index}" hidden>
      <td colspan="6">
        <div class="scoring-person-details">
          <h3>${escapeHtml(row.staff)} — İş ve Puan Detayları</h3>

          <div class="scoring-table-wrap">
            <table class="scoring-table">
              <thead>
                <tr>
                  <th>İş türü</th>
                  <th>İşlem adedi</th>
                  <th>Birim puan</th>
                  <th>Kazanılan puan</th>
                </tr>
              </thead>
              <tbody>
                ${detailRows || `
                  <tr>
                    <td colspan="4">Bu ay için tamamlanmış bir işlem bulunmuyor.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <div class="scoring-person-details-summary">
            <span>Toplam işlem: <strong>${employeeScoringFormat(row.completedUnits)}</strong></span>
            <span>Kazanılan puan: <strong>${employeeScoringFormat(row.earnedPoints)}</strong></span>
            <span>Kesinti: <strong>${employeeScoringFormat(row.penaltyPoints)}</strong></span>
            <span>Net puan: <strong>${employeeScoringFormat(row.score)}</strong></span>
          </div>
        </div>
      </td>
    </tr>
  `;
}).join('');

  const errorRows = admin ? staffList.map((staff) => {
    const errors = employeeScoringErrorsFor(month, staff);
    if (!errors.length) return '';

    return `<section class="scoring-error-person">
      <strong>${escapeHtml(staff)}</strong>
      <ul>${errors.map((item) => `
        <li>
          ${escapeHtml(item.type)}
          <span class="scoring-penalty">−${employeeScoringFormat(item.penalty)}</span>
          <button class="scoring-delete-btn" type="button"
            data-scoring-remove-error="${escapeHtml(item.id)}"
            data-scoring-staff="${escapeHtml(staff)}"
            data-scoring-month="${escapeHtml(month)}">
            Kaydı sil
          </button>
        </li>
      `).join('')}</ul>
    </section>`;
  }).join('') : '';

  return `
    <div class="scoring-page">

      <header class="scoring-hero">
        <div class="scoring-hero-decoration scoring-star-one">✦</div>
        <div class="scoring-hero-decoration scoring-star-two">✧</div>
        <div class="scoring-trophy">🏆</div>
        <div class="scoring-hero-kicker">BAŞARI • EMEK • TAKDİR</div>
        <h1>Ayın Elemanı</h1>
        <p>Başarı fark yaratır, emek değer kazanır.</p>
        <div class="scoring-hero-bottom">
          <span>⭐ Performans değerlendirmesi</span>
          <span>📅 ${escapeHtml(month)}</span>
        </div>
      </header>

      <section class="scoring-month-panel">
        <div class="scoring-section-icon">📆</div>
        <div class="scoring-month-copy">
          <strong>Değerlendirme dönemi</strong>
          <span>İncelemek istediğin ayı seç.</span>
        </div>
        <input id="employee-scoring-month" type="month"
          value="${escapeHtml(month)}" max="${escapeHtml(currentMonth())}">
      </section>

      ${award ? `
        <section class="scoring-winner-banner">
          <div class="scoring-winner-icon">🌟</div>
          <div>
            <span class="scoring-winner-kicker">YÖNETİCİ ONAYIYLA</span>
            <h2>Ayın Elemanı</h2>
            <div class="scoring-winner-name">${escapeHtml(award.staff)}</div>
            <p>Onaylanan puan: <strong>${employeeScoringFormat(award.score)}</strong></p>
            <p>Onaylayan: ${escapeHtml(award.approvedBy || 'Belirtilmedi')}</p>
            <small>Onay anındaki sonuç kaydı korunur.</small>
          </div>
          <div class="scoring-winner-star">★</div>
        </section>
      ` : ''}

      <section class="scoring-podium-section">
        <div class="scoring-section-heading">
          <div>
            <span class="scoring-eyebrow">AYLIK PERFORMANS</span>
            <h2>Başarı Kürsüsü</h2>
            <p>En yüksek net puana sahip ilk üç personel.</p>
          </div>
          <span class="scoring-heading-star">✦</span>
        </div>

        <div class="scoring-podium">
          ${podiumRows || '<div class="permission-empty">Henüz sıralanacak personel bulunmuyor.</div>'}
        </div>
      </section>

      ${admin ? `
        <section class="scoring-admin-section">
          <div class="scoring-section-heading">
            <div>
              <span class="scoring-eyebrow">YÖNETİCİ ALANI</span>
              <h2>⚙️ Puanlama ayarları</h2>
              <p>Görev puanlarını ve hata kesintilerini yönet.</p>
            </div>
          </div>

          <div class="scoring-admin-grid">
            <section class="scoring-admin-card">
              <div class="scoring-admin-card-title">
                <span>🎯</span>
                <h3>Görev puanları</h3>
              </div>
              <form id="employee-scoring-rules-form">
                ${taskRows || '<p>Tanımlı görev türü bulunamadı.</p>'}
                <button class="scoring-action-btn scoring-action-primary" type="submit">
                  ✓ Görev puanlarını kaydet
                </button>
              </form>
            </section>

            <section class="scoring-admin-card">
              <div class="scoring-admin-card-title">
                <span>📝</span>
                <h3>Hata türleri</h3>
              </div>
              <form id="employee-scoring-error-type-form" class="scoring-form-stack">
                <label>Hata türü
                  <input name="error-name" required maxlength="100"
                    placeholder="Örn. Evrak eksikliği">
                </label>
                <label>Kesilecek puan
                  <input name="error-penalty" type="number" min="0"
                    step="0.5" required value="1">
                </label>
                <button class="scoring-action-btn scoring-action-secondary" type="submit">
                  + Hata türünü kaydet
                </button>
              </form>
              <ul class="scoring-error-types">${errorTypeRows}</ul>
            </section>

            <section class="scoring-admin-card scoring-admin-card-wide">
              <div class="scoring-admin-card-title">
                <span>📋</span>
                <h3>Personele hata kaydı ekle</h3>
              </div>
              <form id="employee-scoring-add-error-form" class="scoring-error-entry">
                <input type="hidden" name="month" value="${escapeHtml(month)}">
                <label>Personel
                  <select name="staff" required>
                    ${staffList.map((staff) =>
                      `<option value="${escapeHtml(staff)}">${escapeHtml(staff)}</option>`
                    ).join('')}
                  </select>
                </label>
                <label>Hata türü
                  <select name="error-type" required>${errorOptions}</select>
                </label>
                <button class="scoring-action-btn scoring-action-danger" type="submit"
                  ${rules.errorTypes.length ? '' : 'disabled'}>
                  + Hata kaydını ekle
                </button>
              </form>
              ${errorRows || '<p class="scoring-muted">Bu ay için kayıtlı hata bulunmuyor.</p>'}
            </section>
          </div>
        </section>
      ` : ''}

      <section class="scoring-table-section">
        <div class="scoring-section-heading">
          <div>
            <span class="scoring-eyebrow">AYRINTILI RAPOR</span>
            <h2>📊 Aylık sıralama</h2>
            <p>Net puan = kazanılan puan − hata kesintileri.</p>
          </div>
        </div>

        <div class="scoring-table-wrap">
          <table class="scoring-table">
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Personel</th>
                <th>Kazanılan</th>
                <th>Kesinti</th>
                <th>Net puan</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              ${rankingRows || '<tr><td colspan="6">Personel kaydı bulunamadı.</td></tr>'}
            </tbody>
          </table>
        </div>

        ${admin ? `
          <div class="scoring-approval-area">
            <span>🏅 Sonuçları kontrol ettikten sonra onaylayabilirsin.</span>
            <button type="button" id="employee-scoring-approve"
              class="scoring-action-btn scoring-action-gold">
              ★ ${award ? 'Sonucu yeniden onayla' : 'Birinci sıradaki personeli onayla'}
            </button>
          </div>
        ` : ''}
      </section>

      <footer class="scoring-footer">
        <span>✦</span> Her başarı takdiri hak eder.
      </footer>

    </div>
  `;
}

/* Ekrandaki formların ve butonların olayları */
if (!window.employeeScoringEventsInstalled) {
  window.employeeScoringEventsInstalled = true;

  document.addEventListener('change', (event) => {
    if (event.target?.id !== 'employee-scoring-month') return;

    const month = event.target.value;
    if (!validMonth(month)) return;

    window.employeeScoringState.selectedMonth = month;

    if (typeof renderDashboard === 'function') {
      renderDashboard('Ayın Elemanı');
    }
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;

    if (!form || ![
      'employee-scoring-rules-form',
      'employee-scoring-error-type-form',
      'employee-scoring-add-error-form'
    ].includes(form.id)) return;

    event.preventDefault();

    try {
      if (!employeeScoringIsAdmin()) {
        throw new Error('Bu işlem için yönetici yetkisi gerekir.');
      }

      if (form.id === 'employee-scoring-rules-form') {
        await employeeScoringSaveRules(form);
      } else if (form.id === 'employee-scoring-error-type-form') {
        await employeeScoringAddErrorType(form);
      } else {
        await employeeScoringAddEmployeeError(form);
      }

      window.alert('Kayıt başarıyla tamamlandı.');

      if (typeof renderDashboard === 'function') {
        renderDashboard('Ayın Elemanı');
      }
    } catch (error) {
      console.error('Puanlama işlemi başarısız:', error);
      window.alert('İşlem yapılamadı: ' + error.message);
    }
  });

  document.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('[data-scoring-remove-error]');

    if (removeButton) {
      try {
        const month = removeButton.dataset.scoringMonth;
        const staff = removeButton.dataset.scoringStaff;
        const errorId = removeButton.dataset.scoringRemoveError;

        if (!window.confirm('Bu hata kaydını silmek istiyor musun?')) return;

        await employeeScoringRemoveError(month, staff, errorId);
        window.alert('Hata kaydı silindi.');

        if (typeof renderDashboard === 'function') {
          renderDashboard('Ayın Elemanı');
        }
      } catch (error) {
        window.alert('Hata kaydı silinemedi: ' + error.message);
      }
      return;
    }
    const scoringToggle = event.target.closest(
  '[data-scoring-details-toggle]'
);

if (scoringToggle) {
  const index = scoringToggle.dataset.scoringDetailsToggle;
  const detailRow = document.querySelector(
    `[data-scoring-details="${index}"]`
  );

  if (detailRow) {
    const isOpening = detailRow.hidden;
    detailRow.hidden = !isOpening;

    scoringToggle.setAttribute(
      'aria-expanded',
      String(isOpening)
    );

    const symbol = scoringToggle.querySelector('span');

    if (symbol) {
      symbol.textContent = isOpening ? '−' : '＋';
    }
  }

  return;
}

    if (event.target.closest('#employee-scoring-approve')) {
      try {
        const month = window.employeeScoringState.selectedMonth || currentMonth();

        if (!window.confirm('Bu ayın birinci sıradaki personelini onaylamak istiyor musun?')) return;

        await employeeScoringApprove(month);
        window.alert('Ayın Elemanı sonucu Firebase’e kaydedildi.');

        if (typeof renderDashboard === 'function') {
          renderDashboard('Ayın Elemanı');
        }
      } catch (error) {
        window.alert('Onay işlemi yapılamadı: ' + error.message);
      }
    }
  });
}