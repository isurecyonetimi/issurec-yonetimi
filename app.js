const menuItems = [
  ['⌂', 'Yönetim Paneli'],
  ['♙', 'Kullanıcı Yönetimi'],
  ['▣', 'Firma Yönetimi'],
  ['◷', 'Yıl / Dönem Yönetimi'],
  ['♟', 'Personel Yönetimi'],
  ['⚿', 'Yetkilendirme'],
  ['▥', 'Raporlar'],
  ['☏', 'Personel Soruları'],
  ['★', 'Ayın Elemanı'],
  ['◉', 'Duyurular'],
  ['✎', 'Notlar']
];

const app = document.querySelector('#app');

const DEFAULT_STAFF = ['Ayşe Yılmaz', 'Mehmet Kaya', 'Elif Demir', 'Ahmet Şahin', 'Zeynep Aras'];
const STAFF_STORAGE_KEY = 'isSurecStaffV1';
function loadStaff() { try { const raw = localStorage.getItem(STAFF_STORAGE_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p) && p.length) return p.filter((s) => typeof s === 'string' && s.trim()); } catch (err) {} return [...DEFAULT_STAFF]; }
function saveStaff(list) { try { localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list)); } catch (err) {} }
function getStaff() { return loadStaff(); }
const staffMembers = loadStaff();
const DEFAULT_COMPANIES = ['Artemis Teknoloji A.Ş.', 'Nova İnsan Kaynakları Ltd.', 'Yapıtaş Proje ve Danışmanlık'];
const COMPANY_STORAGE_KEY = 'isSurecCompaniesV1';
const ACCESS_STORAGE_KEY = 'isSurecStaffAccessV1';
const DEFAULT_ACCESS = {
  'Ayşe Yılmaz': ['Artemis Teknoloji A.Ş.', 'Nova İnsan Kaynakları Ltd.', 'Yapıtaş Proje ve Danışmanlık'],
  'Mehmet Kaya': ['Artemis Teknoloji A.Ş.', 'Yapıtaş Proje ve Danışmanlık'],
  'Elif Demir': ['Nova İnsan Kaynakları Ltd.'],
  'Ahmet Şahin': ['Artemis Teknoloji A.Ş.'],
  'Zeynep Aras': ['Yapıtaş Proje ve Danışmanlık']
};

function loadCompanies() {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed.filter((c) => typeof c === 'string' && c.trim());
  } catch (err) {}
  return [...DEFAULT_COMPANIES];
}
function saveCompanies(list) {
  try { localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(list)); } catch (err) {}
}
function loadAccess() {
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) {}
  return JSON.parse(JSON.stringify(DEFAULT_ACCESS));
}
function saveAccess(obj) {
  try { localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(obj)); } catch (err) {}
}
const COMPANY_META_KEY = 'isSurecCompanyMetaV1';
function loadCompanyMeta() { try { const raw = localStorage.getItem(COMPANY_META_KEY); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') return p; } catch (err) {} return {}; }
function saveCompanyMeta(o) { try { localStorage.setItem(COMPANY_META_KEY, JSON.stringify(o)); } catch (err) {} }
function getCompanyCreatedDate(company) {
  const meta = loadCompanyMeta();
  if (meta && meta[company] && meta[company].createdAt) return meta[company].createdAt;
  try {
    const recs = loadWork().filter((w) => w.company === company);
    if (recs.length) {
      const sorted = recs.map((r) => r.date).filter(Boolean).sort();
      if (sorted.length) return sorted[0];
    }
  } catch (err) {}
  return new Date().toISOString().slice(0, 10);
}
function formatDateTr(iso) { if (!iso) return '—'; const p = (iso || '').split('-'); if (p.length !== 3) return iso; return `${p[2]}.${p[1]}.${p[0]}`; }
function getAllowedTasks(staff) { try { if (typeof getVisibleTasks === 'function') return getVisibleTasks(staff); } catch (err) {} try { return getTaskTypes(); } catch (err) {} return []; }
function loadWork() {
  try {
    const store = typeof loadWorkStore === 'function' ? loadWorkStore() : {};
    const types = (() => { try { return getTaskTypes(); } catch (err) { return []; } })();
    return Object.keys(store || {}).map((k) => {
      const parts = k.split(' || ');
      const rec = store[k] || {};
      const byName = rec.tasksByName || {};
      const arr = Array.isArray(rec.tasks) ? rec.tasks : [];
      const state = {};
      types.forEach((t, i) => { state[t] = !!(byName[t] || arr[i]); });
      return { staff: parts[0] || '', company: parts[1] || '', date: parts[2] || '', state, updatedAt: rec.updatedAt || '' };
    });
  } catch (err) { return []; }
}
// Giriş yapan personele özel Yönetim Paneli özeti:
// - Sadece görebildiği cariler (yetki filtresi)
// - Her carinin tanımlandığı tarihten itibaren yapması gereken işler
// - Tamamlanan / eksik sayıları yalnızca o kullanıcıya ait kayıtlardan hesaplanır.
function normName(s) { try { return (s || '').toString().trim().toLocaleLowerCase('tr'); } catch (err) { return (s || '').toString().trim().toLowerCase(); } }
function getPermRecord(staff, company) {
  try {
    const p = loadPerms();
    const sn = normName(staff);
    const cn = normName(company);
    for (const k of Object.keys(p)) {
      const parts = k.split(' || ');
      if (parts.length < 2) continue;
      if (normName(parts[0]) === sn && normName(parts[1]) === cn) return p[k];
    }
  } catch (err) {}
  return undefined;
}
function getMyVisibleCompanies(staff) {
  try {
    const all = getCompanies();
    const perms = loadPerms();
    const keys = Object.keys(perms || {});
    const sn = normName(staff);
    const ownKeys = keys.filter((k) => normName((k.split(' || ')[0] || '')) === sn);
    // Bu personele Yetkilendirme ekranından en az 1 kayıt girilmişse tek kaynak orasıdır
    // (yönetici dahil herkes yalnızca islem/gor olanları görür).
    if (ownKeys.length) return all.filter((c) => {
      const v = getPermRecord(staff, c);
      return v === 'islem' || v === 'gor';
    });
    // Sistem genelinde yetkilendirme kullanılmaya başlanmışsa kaydı olmayan personel
    // eski listeden kalma firmaları görmesin (4 yerine 0/1 gösterimi için kritik).
    if (keys.length) return [];
    // Hiç yetkilendirme yapılmamışsa eski erişim listesine düş (ilk kurulum uyumluluğu).
    try {
      const acc = loadAccess();
      if (acc) {
        for (const k of Object.keys(acc)) {
          if (normName(k) === sn && Array.isArray(acc[k])) return all.filter((c) => acc[k].some((x) => normName(x) === normName(c)));
        }
      }
    } catch (err) {}
    return [];
  } catch (err) { return []; }
}
function getMyDashboardStats() {
  try {
  const me = currentUser ? currentUser.name : '';
  const allCompanies = getCompanies();
  const visibleCompanies = getMyVisibleCompanies(me);
  const allowedTasks = getAllowedTasks(me);
  const myWork = loadWork().filter((w) => w.staff === me && visibleCompanies.includes(w.company));
  const perCompany = visibleCompanies.map((company) => {
    const createdAt = getCompanyCreatedDate(company);
    const expected = allowedTasks.length;
    let done = 0;
    allowedTasks.forEach((t) => {
      const rec = myWork.find((w) => w.company === company && w.date >= createdAt && w.state && w.state[t]);
      if (rec) done += 1;
    });
    return { company, createdAt, expected, done, missing: Math.max(0, expected - done) };
  });
  const totalExpected = perCompany.reduce((s, r) => s + r.expected, 0);
  const totalDone = perCompany.reduce((s, r) => s + r.done, 0);
  const totalMissing = Math.max(0, totalExpected - totalDone);
  const pct = totalExpected ? Math.round((totalDone / totalExpected) * 100) : 0;
  let earliest = '';
  if (perCompany.length) { earliest = perCompany.map((r) => r.createdAt).filter(Boolean).sort()[0] || ''; }
  return { me, visibleCompanies, allowedTasks, perCompany, totalExpected, totalDone, totalMissing, pct, earliest };
  } catch (err) { return { me: (currentUser && currentUser.name) || '', visibleCompanies: [], allowedTasks: [], perCompany: [], totalExpected: 0, totalDone: 0, totalMissing: 0, pct: 0, earliest: '' }; }
}
function renderMyDashboardStats() {
  try {
  const s = getMyDashboardStats();
  const cards = [
    ['▣', 'Görebildiğim cari', `${s.visibleCompanies.length}`, s.earliest ? `${formatDateTr(s.earliest)} itibarıyla` : 'tanımlı cari'],
    ['◷', 'Yapmam gereken iş', `${s.totalExpected}`, `${s.visibleCompanies.length} cari × ${s.allowedTasks.length} iş türü`],
    ['✓', 'Tamamladığım', `${s.totalDone}`, `%${s.pct} tamamlanma`],
    ['!', 'Eksik / bekleyen', `${s.totalMissing}`, 'carinin tanımlandığı tarihten itibaren']
  ].map(([icon, title, value, change]) => `<article class="stat-card"><div class="stat-top"><span>${title}</span><span class="stat-icon">${icon}</span></div><div class="stat-number">${value}</div><span class="stat-change">${change}</span></article>`).join('');
  const rows = s.perCompany.length ? s.perCompany.map((r) => `
    <div class="task-row" style="cursor:default">
      <span class="task-box" style="${r.missing === 0 ? 'border-color:var(--teal);background:var(--teal);color:white;' : ''}">${r.missing === 0 ? '✓' : '▣'}</span>
      <div class="task-name"><strong>${r.company}</strong><small>Tanımlanma: ${formatDateTr(r.createdAt)} · Gereken: ${r.expected} · Yapılan: ${r.done} · Kalan: ${r.missing}</small></div>
      <span class="task-counter">${r.missing === 0 ? 'Tamam' : r.missing + ' eksik'}</span>
    </div>`).join('') : '<div class="permission-empty"><span class="permission-icon">▣</span><div><strong>Henüz görebildiğiniz cari yok.</strong><p>Yöneticinizden firma erişim yetkisi isteyin.</p></div></div>';
  return `
    <div class="page-heading"><div><h1>Yönetim Paneli</h1><p>Hoş geldin ${s.me} — bu sayfadaki tüm sayılar yalnızca sana ait. Carilerin ve tanımlanma tarihlerinden itibaren yapman gereken işler.</p></div><span class="access-badge">${s.me}</span></div>
    <section class="stats-grid">${cards}</section>
    <section class="panel"><div class="panel-header"><div><h2>Carilerime göre durum</h2><p class="panel-subtitle">Her cari, tanımlandığı tarihten sonraki kayıtlarına göre değerlendirilir.</p></div><span class="task-counter">${s.totalDone}/${s.totalExpected} tamamlandı</span></div>
      <div class="task-content">${rows}</div>
    </section>`;
  } catch (err) { return '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Panel yüklenemedi.</strong></div></div>'; }
}
function getCompanies() { return loadCompanies(); }
function getAccess() { return loadAccess(); }
function isAdminUser() { return currentUser && currentUser.title === 'Yönetici'; }
let companies = loadCompanies();
let staffCompanyAccess = loadAccess();
function refreshCompanyCache() { companies = loadCompanies(); staffCompanyAccess = loadAccess(); }
const PLAN_STORAGE_KEY = 'isSurecPlanlarV1';
function loadPlans() { try { const raw = localStorage.getItem(PLAN_STORAGE_KEY); const p = raw ? JSON.parse(raw) : []; if (Array.isArray(p)) return p; } catch (err) {} return []; }
function savePlans(list) { try { localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(list)); } catch (err) {} }
function getMyPlans() { const me = currentUser ? currentUser.name : ''; return loadPlans().filter((p) => p.staff === me); }
const TASK_TYPE_KEY = 'isSurecTaskTypesV1';
const DEFAULT_TASKS = ['Sevk tanımlandı', 'Evrak yüklendi'];
function loadTaskTypes() { try { const raw = localStorage.getItem(TASK_TYPE_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p) && p.length) return p.filter((t) => typeof t === 'string' && t.trim()); } catch (err) {} return [...DEFAULT_TASKS]; }
function saveTaskTypes(list) { try { localStorage.setItem(TASK_TYPE_KEY, JSON.stringify(list)); } catch (err) {} }
function getTaskTypes() { return loadTaskTypes(); }
const TASK_PERM_KEY = 'isSurecTaskPermsV1';
function loadTaskPerms() { try { const raw = localStorage.getItem(TASK_PERM_KEY); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') return p; } catch (err) {} return {}; }
function saveTaskPerms(o) { try { localStorage.setItem(TASK_PERM_KEY, JSON.stringify(o)); } catch (err) {} }
function getVisibleTasks(staff) { const p = loadTaskPerms(); const v = p[staff]; if (!Array.isArray(v)) return getTaskTypes(); return getTaskTypes().filter((t) => v.includes(t)); }
const dailyTasks = ['Sevk tanımlandı', 'Evrak yüklendi'];

// Tarih bazlı iş takip kayıtları (personel + firma + tarih üçlüsüne özel).
// localStorage'da saklanır: { "PERSONEL || FİRMA || YYYY-MM-DD": { tasks: [bool], updatedAt: iso } }
// Böylece 01.01.2026'da kaydedilen işlem 02.01.2026'da görünmez; her tarihe ayrı kayıt tutulur.
const WORK_STORAGE_KEY = 'isSurecIsTakipV1';
const DASH_PANEL_KEY = 'isTakipPanelAcik';
const LAST_WORK_KEY = 'isSurecLastWorkDateV1';
function rememberLastWorkDate(d) { try { if (d) localStorage.setItem(LAST_WORK_KEY, d); } catch (err) {} }
function getLastWorkDate(f) { try { const v = localStorage.getItem(LAST_WORK_KEY); if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v; } catch (err) {} return f; }

function loadWorkStore() {
  try {
    const raw = localStorage.getItem(WORK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function saveWorkStore(store) {
  try {
    localStorage.setItem(WORK_STORAGE_KEY, JSON.stringify(store));
  } catch (err) { /* depolama doluysa sessiz geç */ }
}

function getWorkKey(staff, company, date) {
  return `${staff} || ${company} || ${date}`;
}

function getWorkRecord(staff, company, date) {
  const store = loadWorkStore();
  const record = store[getWorkKey(staff, company, date)];
  if (!record || !Array.isArray(record.tasks)) return null;
  return record;
}

function saveWorkRecord(staff, company, date, tasks, byName) {
  const store = loadWorkStore();
  store[getWorkKey(staff, company, date)] = {
    tasks: tasks.slice(0, getTaskTypes().length),
    tasksByName: byName || {},
    updatedAt: new Date().toISOString()
  };
  saveWorkStore(store);
}

function formatUpdatedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Her personel kendi kullanıcı bilgileriyle (e-posta / şifre) giriş yapar.
// Böylece İş Takip ekranında personel alanı, giriş yapan kullanıcıya göre
// otomatik ve değiştirilemez şekilde doldurulur; başka bir isim seçilemez.
const users = [
  { email: 'ayse.yilmaz@firma.com', password: '1234', name: 'Ayşe Yılmaz', title: 'Yönetici' },
  { email: 'mehmet.kaya@firma.com', password: '1234', name: 'Mehmet Kaya', title: 'Personel' },
  { email: 'elif.demir@firma.com', password: '1234', name: 'Elif Demir', title: 'Personel' },
  { email: 'ahmet.sahin@firma.com', password: '1234', name: 'Ahmet Şahin', title: 'Personel' },
  { email: 'zeynep.aras@firma.com', password: '1234', name: 'Zeynep Aras', title: 'Personel' }
];
const USER_NAME_KEY = 'isSurecUserNamesV1';
function loadUserNames() { try { const raw = localStorage.getItem(USER_NAME_KEY); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') return p; } catch (err) {} return {}; }
function saveUserNames(o) { try { localStorage.setItem(USER_NAME_KEY, JSON.stringify(o)); } catch (err) {} }
function resolveUserName(u) { const m = loadUserNames(); return (m && m[u.email]) || u.name; }

let currentUser = null;

const QUESTION_KEY = 'isSurecQuestionsV1';
function loadQuestions() { try { const raw = localStorage.getItem(QUESTION_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p)) return p; } catch (err) {} return []; }
function saveQuestions(list) { try { localStorage.setItem(QUESTION_KEY, JSON.stringify(list)); } catch (err) {} }
function getVisibleQuestions() {
  const me = currentUser ? currentUser.name : '';
  const all = loadQuestions();
  if (isAdminUser()) return all;
  return all.filter((q) => q.from === me || q.to === me);
}

const NOTE_KEY = 'isSurecNotesV1';
function loadNotes() { try { const raw = localStorage.getItem(NOTE_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p)) return p; } catch (err) {} return []; }
function saveNotes(list) { try { localStorage.setItem(NOTE_KEY, JSON.stringify(list)); } catch (err) { window.alert('Not kaydedilemedi (depolama dolu olabilir, daha küçük dosya deneyin).'); } }
function getMyNotes() { const me = currentUser ? currentUser.name : ''; return loadNotes().filter((n) => n.staff === me); }

const AVATAR_KEY = 'isSurecAvatarsV1';
const AVATAR_MAX_SIZE = 512 * 1024;
function avatarKey(email) { return (email || '').toString().trim().toLowerCase(); }
(function migrateAvatars() {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) { localStorage.removeItem(AVATAR_KEY); return; }
    let dirty = false;
    Object.keys(data).forEach((k) => {
      const v = data[k];
      if (typeof v !== 'string' || v.indexOf('data:image/') !== 0) { delete data[k]; dirty = true; }
    });
    if (dirty) localStorage.setItem(AVATAR_KEY, JSON.stringify(data));
  } catch (err) { try { localStorage.removeItem(AVATAR_KEY); } catch (e2) {} }
})();

function getInitials(name) {
  return (name || '').split(' ').filter(Boolean).map((word) => word[0]).join('').slice(0, 2).toLocaleUpperCase('tr');
}

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

function setupProfileActions() {
  document.querySelectorAll('input[data-upload-avatar]').forEach((input) => {
    if (input.dataset.avatarBound === '1') return;
    input.dataset.avatarBound = '1';
    input.addEventListener('change', async (event) => {
      event.stopPropagation();
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        await handleAvatarUpload(input.dataset.uploadAvatar, file);
        renderDashboard(window._lastPage || 'Yönetim Paneli');
      } catch (err) {
        window.alert('Resim yüklenemedi: ' + (err.message || 'Bilinmeyen hata'));
        input.value = '';
      }
    });
  });
  document.querySelectorAll('[data-change-avatar]').forEach((button) => {
    if (button.dataset.avatarBound === '1') return;
    button.dataset.avatarBound = '1';
    button.addEventListener('click', () => {
      const fakeInput = document.createElement('input');
      fakeInput.type = 'file';
      fakeInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
      fakeInput.style.cssText = 'display:none';
      document.body.appendChild(fakeInput);
      fakeInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        try {
          if (file) {
            await handleAvatarUpload(button.dataset.changeAvatar, file);
            renderDashboard(window._lastPage || 'Yönetim Paneli');
          }
        } catch (err) {
          window.alert('Resim yüklenemedi: ' + (err.message || 'Bilinmeyen hata'));
        }
        if (fakeInput.parentNode) fakeInput.parentNode.removeChild(fakeInput);
      });
      fakeInput.click();
    });
  });
  document.querySelectorAll('[data-remove-avatar]').forEach((button) => {
    if (button.dataset.avatarBound === '1') return;
    button.dataset.avatarBound = '1';
    button.addEventListener('click', () => {
      if (!window.confirm('Profil resmini kaldirmak istiyor musunuz?')) return;
      const email = button.dataset.removeAvatar;
      if (removeUserAvatar(email)) renderDashboard(window._lastPage || 'Yönetim Paneli');
    });
  });
}

function loadUserAvatar(email) {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const key = (email || '').toLowerCase();
    const stored = data[key] || data[email];
    if (typeof stored === 'string' && stored.indexOf('data:image/') === 0) return stored;
    return null;
  } catch (err) {
    console.warn('Avatar yüklenemedi:', err);
    return null;
  }
}

function saveUserAvatar(email, avatarData) {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const data = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    if (!data || typeof data !== 'object') return false;
    const key = (email || '').toLowerCase();
    data[key] = avatarData;
    if (email && email !== key) data[email] = avatarData;
    localStorage.setItem(AVATAR_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Avatar kaydedilemedi:', err);
    return false;
  }
}

function removeUserAvatar(email) {
  try {
    const raw = localStorage.getItem(AVATAR_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const data = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    if (!data || typeof data !== 'object') return true;
    const key = (email || '').toLowerCase();
    delete data[key];
    if (email) delete data[email];
    localStorage.setItem(AVATAR_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('Avatar kaldırılamadı:', err);
    return false;
  }
}

function handleAvatarUpload(email, file) {
  return new Promise((resolve, reject) => {
    if (!email) { reject(new Error('Oturum e-postasi bulunamadi. Lutfen tekrar giris yapin.')); return; }
    if (!file) { reject(new Error('Dosya seçilmedi')); return; }
    if (file.size > AVATAR_MAX_SIZE) { reject(new Error('Resim en fazla 512 KB olabilir.')); return; }
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (file.type && !validTypes.includes(file.type)) { reject(new Error('Desteklenmeyen dosya türü. PNG, JPG, WEBP veya GIF seçin.')); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUri = reader.result;
        if (typeof dataUri !== 'string' || dataUri.indexOf('data:image/') !== 0) { reject(new Error('Gecerli bir resim dosyasi secin.')); return; }
        if (saveUserAvatar(email, dataUri)) resolve(dataUri);
        else reject(new Error('Kaydedilemedi.'));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}
function getUserAvatarHtml(email, name) {
  const avatar = loadUserAvatar(email);
  if (avatar && avatar.indexOf('data:image/') === 0) {
    return '<img src="' + avatar + '" alt="Profil resmi" class="profile-avatar-img" />';
  }
  return '<span class="avatar">' + escapeHtml(getInitials(name || '?')) + '</span>';
}
function getProfileActionsHtml(email, name) {
  const avatar = loadUserAvatar(email);
  if (avatar) {
    return `
      <button class="profile-upload-btn" type="button" data-change-avatar="${escapeHtml(email)}" style="margin-right:6px;">Değiştir</button>
      <button class="profile-remove-btn" type="button" data-remove-avatar="${escapeHtml(email)}">Kaldır</button>
    `;
  }
  return `
    <label class="profile-upload-btn" style="cursor:pointer;margin-right:6px;">
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" data-upload-avatar="${escapeHtml(email)}" />
      Resim ekle
    </label>
  `;
}

function formatDate(date) {
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDateRange(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  const dates = [];
  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
  }
  return dates;
}

const PERM_KEY = 'isSurecPermsV1';
function loadPerms() { try { const raw = localStorage.getItem(PERM_KEY); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') return p; } catch (err) {} return {}; }
function savePerms(o) { try { localStorage.setItem(PERM_KEY, JSON.stringify(o)); } catch (err) {} }
function getPerm(staff, company) { const p = loadPerms(); const v = p[`${staff} || ${company}`]; return v === 'islem' ? 'islem' : v === 'gor' ? 'gor' : 'yok'; }
function canView(staff, company) { const v = getPermRecord(staff, company); return v === 'islem' || v === 'gor'; }
function canEdit(staff, company) { return getPermRecord(staff, company) === 'islem'; }

function renderAccessMatrixContent() {
  if (!isAdminUser()) return '<div class="permission-empty">Bu panel yalnızca yöneticilere açıktır.</div>';
  const firms = getCompanies();
  const people = getStaff();
  const perms = loadPerms();
  const focusStaff = window._permFocus || people[0] || '';
  const defined = Object.keys(perms).filter((k) => perms[k] && perms[k] !== 'yok' && k.indexOf(`${focusStaff} || `) === 0);
  const permLabel = (v) => v === 'islem' ? 'Görsün / İşlem yapsın' : v === 'gor' ? 'Görsün / İşlem yapamasın' : 'Görmesin / İşlem yapamasın';
  const listRows = defined.length ? defined.map((k) => {
    const [s, c] = k.split(' || ');
    return `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">⚿</span><span class="task-name"><strong>${s} → ${c}</strong><small>${permLabel(perms[k])}</small></span><span style="margin-left:auto;"><button class="primary-btn work-submit" data-del-perm="${k}" type="button" style="min-width:80px;background:#b5443c;">Sil</button></span></div>`;
  }).join('') : '<div class="permission-empty"><span class="permission-icon">⚿</span><div><strong>Henüz yetki tanımlanmadı.</strong><p>Yukarıdan firma + personel + yetki seçip Kaydet\'e basın.</p></div></div>';
  return `
    <div class="page-heading"><div><h1>Yetkilendirme</h1><p>Firma seçin, personel seçin, yetkiyi seçip Kaydet'e basın.</p></div><span class="access-badge">Yönetici</span></div>
    ${renderAnnouncementPermissions()}
    <section class="panel"><div class="panel-header"><div><h2>Yetki ver</h2><p class="panel-subtitle">Listelerden seçim yapın, tek tek kaydedin.</p></div></div>
      <form id="perm-form" class="work-form" style="grid-template-columns:1fr 1fr 1fr auto">
        <label class="field">Firma<select name="company">${firms.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label class="field">Personel<select name="staff">${people.map((s) => `<option>${s}</option>`).join('')}</select></label>
        <label class="field">Yetki<select name="perm"><option value="islem">Görsün / İşlem yapsın</option><option value="gor">Görsün / İşlem yapamasın</option><option value="yok">Görmesin / İşlem yapamasın</option></select></label>
        <button class="primary-btn work-submit" type="submit">Kaydet</button>
      </form>
      <div class="save-row"><span class="save-status" id="perm-save-status"></span></div>
    </section>
    <section class="panel"><div class="panel-header"><div><h2 id="perm-focus-title">Tanımlı yetkiler · ${focusStaff} (${defined.length})</h2><p class="panel-subtitle">Aşağıdan personel seçin, sadece onun yetkileri listelenir.</p></div></div>
      <form id="perm-focus-form" class="work-form" style="grid-template-columns:1fr auto">
        <label class="field">Personel<select name="staff" id="perm-focus-staff">${people.map((s) => `<option${s === focusStaff ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
        <button class="primary-btn work-submit" type="submit">Göster</button>
      </form>
      <div class="task-content">${listRows}</div>
    </section>
    <section class="panel"><div class="panel-header"><div><h2>İş türleri</h2><p class="panel-subtitle">Yeni iş türü ekleyin (örn: Sevk tanımlandı). Aşağıdan personele hangi işleri göreceğini seçin.</p></div></div>
      <form id="tasktype-form" class="work-form" style="grid-template-columns:1fr auto">
        <label class="field">İş türü<input type="text" name="taskName" placeholder="Örn: Fatura kesildi" required /></label>
        <button class="primary-btn work-submit" type="submit">Ekle</button>
      </form>
      <div class="task-content">${getTaskTypes().map((t) => `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">✓</span><span class="task-name"><strong>${t}</strong></span></div>`).join('')}</div>
    </section>
    <section class="panel"><div class="panel-header"><div><h2>Personel iş türü yetkisi</h2><p class="panel-subtitle">Personel seçin, göreceği işleri işaretleyip Kaydet'e basın.</p></div></div>
      <form id="taskperm-form" class="work-form" style="grid-template-columns:1fr auto">
        <label class="field">Personel<select name="staff" id="taskperm-staff">${people.map((s) => `<option>${s}</option>`).join('')}</select></label>
        <button class="primary-btn work-submit" type="submit">Kaydet</button>
      </form>
      <div class="task-content" id="taskperm-list"></div>
    </section>`;
}

function renderMatrixRows(start, end, people) {
  const dates = getDateRange(start, end);
  const head = document.querySelector('#matrix-head');
  const body = document.querySelector('#matrix-body');
  if (!dates.length || !people.length) {
    head.innerHTML = '<tr><th>Gün</th></tr>';
    body.innerHTML = '<tr><td class="matrix-empty" colspan="2">Görüntülemek için en az bir personel ve geçerli bir tarih aralığı seçin.</td></tr>';
    return;
  }
  head.innerHTML = `<tr><th>Gün</th>${people.map((person) => `<th>${person}</th>`).join('')}</tr>`;
  body.innerHTML = dates.map((date, dateIndex) => `<tr><th>${date}</th>${people.map((person, personIndex) => `<td><label class="matrix-check"><input type="checkbox" data-date="${date}" data-person="${person}" ${dateIndex === 0 || personIndex === 0 ? 'checked' : ''} /><span></span></label></td>`).join('')}</tr>`).join('');
  document.querySelector('#matrix-summary').textContent = `${dates.length} gün · ${people.length} yetkili personel · Kutuları işaretleyerek görünürlüğü düzenleyin.`;
}

function setupCompanyManagement() {
  if (!isAdminUser()) return;
  // Eski kayıtlarda tarih yoksa geriye dönük doldur: ilk iş kaydının tarihi, yoksa bugün.
  try {
    const m0 = loadCompanyMeta();
    let changed0 = false;
    getCompanies().forEach((c) => {
      if (!m0[c] || !m0[c].createdAt) {
        let d = new Date().toISOString().slice(0, 10);
        try {
          const recs = loadWork().filter((w) => w.company === c).map((r) => r.date).filter(Boolean).sort();
          if (recs.length) d = recs[0];
        } catch (err) {}
        m0[c] = { createdAt: d };
        changed0 = true;
      }
    });
    if (changed0) saveCompanyMeta(m0);
  } catch (err) {}
  const form = document.querySelector('#company-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const v = (fd.get('companyName') || '').toString().trim();
    const createdAt = (fd.get('createdAt') || '').toString().slice(0, 10) || new Date().toISOString().slice(0, 10);
    const st = document.querySelector('#company-save-status');
    if (!v) return;
    const list = getCompanies();
    if (list.some((c) => c.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr'))) {
      if (st) st.textContent = 'Bu cari zaten kayitli.';
      return;
    }
    list.push(v);
    saveCompanies(list);
    const mm = loadCompanyMeta();
    mm[v] = { createdAt };
    saveCompanyMeta(mm);
    refreshCompanyCache();
    window._companyEdit = '';
    renderDashboard('Firma Yönetimi');
  });
  document.querySelectorAll('[data-edit-company]').forEach((b) => b.addEventListener('click', () => {
    window._companyEdit = b.dataset.editCompany;
    renderDashboard('Firma Yönetimi');
  }));
  const ef = document.querySelector('#company-edit-form');
  if (ef) ef.addEventListener('submit', (e) => {
    e.preventDefault();
    const nv = (new FormData(ef).get('newName') || '').toString().trim();
    const old = window._companyEdit;
    if (!nv || !old) return;
    saveCompanies(getCompanies().map((c) => (c === old ? nv : c)));
    const mm2 = loadCompanyMeta();
    if (mm2[old]) { mm2[nv] = mm2[old]; delete mm2[old]; saveCompanyMeta(mm2); }
    const acc = getAccess();
    Object.keys(acc).forEach((s) => { acc[s] = acc[s].map((c) => (c === old ? nv : c)); });
    saveAccess(acc);
    savePlans(loadPlans().map((p) => (p.company === old ? { ...p, company: nv } : p)));
    const ws = loadWorkStore();
    Object.keys(ws).forEach((k) => {
      if (k.includes(` || ${old} || `)) {
        const nk = k.replace(` || ${old} || `, ` || ${nv} || `);
        ws[nk] = ws[k];
        delete ws[k];
      }
    });
    saveWorkStore(ws);
    window._companyEdit = '';
    refreshCompanyCache();
    renderDashboard('Firma Yönetimi');
  });
}

function setupAccessMatrix() {
  if (!isAdminUser()) return;
  const form = document.querySelector('#perm-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const o = loadPerms();
    // Aynı personel+firma için büyük/küçük harf veya boşluk farkıyla çift anahtar
    // oluşmasın diye önce eşleşen eski anahtarı temizle.
    try {
      const sn = normName(fd.get('staff'));
      const cn = normName(fd.get('company'));
      Object.keys(o).forEach((k) => {
        const parts = k.split(' || ');
        if (parts.length >= 2 && normName(parts[0]) === sn && normName(parts[1]) === cn) delete o[k];
      });
    } catch (err) {}
    o[`${fd.get('staff')} || ${fd.get('company')}`] = fd.get('perm');
    savePerms(o);
    const st = document.querySelector('#perm-save-status');
    if (st) { st.className = 'save-status is-ok'; st.textContent = `✓ Kaydedildi: ${fd.get('staff')} → ${fd.get('company')}`; }
    setTimeout(() => renderDashboard('Yetkilendirme'), 600);
  });
  document.querySelectorAll('[data-del-perm]').forEach((b) => b.addEventListener('click', () => {
    const o = loadPerms();
    delete o[b.dataset.delPerm];
    savePerms(o);
    renderDashboard('Yetkilendirme');
  }));
  const ff = document.querySelector('#perm-focus-form');
  if (ff) ff.addEventListener('submit', (e) => {
    e.preventDefault();
    window._permFocus = document.querySelector('#perm-focus-staff').value;
    renderDashboard('Yetkilendirme');
  });
  const tf = document.querySelector('#tasktype-form');
  if (tf) tf.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (new FormData(tf).get('taskName') || '').toString().trim();
    if (!v) return;
    const list = getTaskTypes();
    if (list.some((t) => t.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr'))) return;
    list.push(v);
    saveTaskTypes(list);
    const tp = loadTaskPerms();
    Object.keys(tp).forEach((s) => { if (Array.isArray(tp[s]) && !tp[s].includes(v)) tp[s].push(v); });
    saveTaskPerms(tp);
    renderDashboard('Yetkilendirme');
  });
  const renderTaskPermList = () => {
    const box = document.querySelector('#taskperm-list');
    const sel = document.querySelector('#taskperm-staff');
    if (!box || !sel) return;
    const cur = loadTaskPerms()[sel.value] || getTaskTypes();
    box.innerHTML = getTaskTypes().map((t) => `<label class="task-row"><input type="checkbox" class="task-check taskperm-check" value="${t}" ${cur.includes(t) ? 'checked' : ''} /><span class="task-box"></span><span class="task-name"><strong>${t}</strong></span></label>`).join('');
  };
  renderTaskPermList();
  const tps = document.querySelector('#taskperm-staff');
  if (tps) tps.addEventListener('change', renderTaskPermList);
  const tpf = document.querySelector('#taskperm-form');
  if (tpf) tpf.addEventListener('submit', (e) => {
    e.preventDefault();
    const staff = document.querySelector('#taskperm-staff').value;
    const checked = Array.from(document.querySelectorAll('.taskperm-check:checked')).map((c) => c.value);
    const o = loadTaskPerms();
    o[staff] = checked;
    saveTaskPerms(o);
    const st = document.querySelector('#perm-save-status');
    if (st) { st.className = 'save-status is-ok'; st.textContent = `✓ Kaydedildi: ${staff} ${checked.length} iş türü görür.`; }
  });
}

function renderStaffContent() {
  const list = getStaff();
  const admin = isAdminUser();
  const editName = window._staffEdit || '';
  const editRow = admin && editName ? `<form id="staff-edit-form" class="work-form community-form"><label class="field">Ad Soyad<input type="text" name="newName" value="${escapeHtml(editName)}" maxlength="100" required /></label><label class="field">Ünvan<input type="text" name="staffTitle" value="${escapeHtml(loadCommunity(STAFF_META_KEY)[editName]?.title || '')}" maxlength="100" required /></label><button class="primary-btn work-submit" type="submit">Kaydet</button></form>` : '';
  return `
    <div class="page-heading"><div><h1>Personel Yönetimi</h1><p>${admin ? 'Personel ekleyin; adını ve ünvanını düzenleyin. Ünvan, yönetici yetkisi vermez.' : 'Kayıtlı personeller ve ünvanları (sadece görüntüleme).'}</p></div><span class="access-badge">${admin ? 'Yönetici' : 'Personel'}</span></div>
    ${admin ? `<section class="panel"><div class="panel-header"><div><h2>Yeni personel ekle</h2><p class="panel-subtitle">Ad Soyad ve ünvan yazıp Ekle'ye basın.</p></div></div>
      <form id="staff-form" class="work-form community-form">
        <label class="field">Ad Soyad<input type="text" name="staffName" placeholder="Örn: Ali Veli" maxlength="100" required /></label>
        <label class="field">Ünvan<input type="text" name="staffTitle" placeholder="Örn: Muhasebe Uzmanı" maxlength="100" required /></label>
        <label class="field">E-posta (kullanıcı adı)<input type="email" name="staffEmail" placeholder="ali.veli@firma.com" required /></label>
        <label class="field">Şifre<input type="password" name="staffPassword" minlength="8" maxlength="128" required /></label>
        <label class="field">Şifre tekrar<input type="password" name="staffPasswordRepeat" minlength="8" maxlength="128" required /></label>
        <button class="primary-btn work-submit" type="submit">Ekle</button>
        <span class="field-hint">Şifre en az 8, en fazla 128 karakter olmalıdır.</span>
      </form>
      <div class="save-row"><span class="save-status" id="staff-save-status"></span></div>${editRow}</section>` : ``}
    <section class="panel"><div class="panel-header"><div><h2>Kayıtlı personeller (${list.length})</h2></div></div>
      <div class="task-content">${list.map((s) => `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">♟</span><span class="task-name">${staffIdentity(s)}</span>${admin ? `<span style="margin-left:auto;"><button class="primary-btn work-submit" data-edit-staff="${escapeHtml(s)}" type="button" style="min-width:90px;">Düzenle</button></span>` : ''}</div>`).join('')}</div>
    </section>`;
}

function setupStaffManagement() {
  if (!isAdminUser()) return;
  const form = document.querySelector('#staff-form');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdminUser()) return;
    const data = new FormData(form);
    const name = (data.get('staffName') || '').toString().trim();
    const title = (data.get('staffTitle') || '').toString().trim();
    const email = (data.get('staffEmail') || '').toString().trim();
    const password = (data.get('staffPassword') || '').toString();
    const passwordRepeat = (data.get('staffPasswordRepeat') || '').toString();
    if (!validStaffDetails(name, title)) return;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      document.getElementById('staff-save-status').textContent = 'Geçerli bir e-posta adresi girin.';
      document.getElementById('staff-save-status').className = 'save-status';
      return;
    }
    if (!password || password.length < 8 || password.length > 128) {
      document.getElementById('staff-save-status').textContent = 'Şifre 8–128 karakter olmalıdır.';
      document.getElementById('staff-save-status').className = 'save-status';
      return;
    }
    if (password !== passwordRepeat) {
      document.getElementById('staff-save-status').textContent = 'Şifre ve şifre tekrarı eşleşmiyor.';
      document.getElementById('staff-save-status').className = 'save-status';
      return;
    }
    const list = getStaff();
    if (list.some((s) => normName(s) === normName(name))) { window.alert('Bu personel zaten kayıtlı.'); return; }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      document.getElementById('staff-save-status').textContent = 'Bu e-posta adresi zaten bir kullanıcıya ait.';
      document.getElementById('staff-save-status').className = 'save-status';
      return;
    }
    try {
      const salt = passwordHex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
      const records = loadPasswordRecords();
      records[email.toLowerCase()] = {
        algorithm: 'PBKDF2-SHA256',
        iterations: PASSWORD_ITERATIONS,
        salt,
        hash
      };
      try { localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(records)); } catch (err) {
        document.getElementById('staff-save-status').textContent = 'Şifre kaydedilemedi. Tarayıcı depolama alanını kontrol edin.';
        document.getElementById('staff-save-status').className = 'save-status';
        return;
      }
      const newUser = { email: email.toLowerCase(), password: '', name, title };
      users.push(newUser);
      const meta = loadCommunity(STAFF_META_KEY);
      meta[name] = { title };
      if (!saveCommunity(STAFF_META_KEY, meta)) return;
      list.push(name);
      saveStaff(list);
      const acc = getAccess();
      if (!acc[name]) acc[name] = [];
      saveAccess(acc);
      const um = loadUserNames();
      um[email.toLowerCase()] = name;
      saveUserNames(um);
      window._staffEdit = '';
      const status = document.getElementById('staff-save-status');
      status.textContent = '✓ Personel ve sistem hesabı eklendi. Bu e-posta ve şifre ile giriş yapabilir.';
      status.className = 'save-status is-ok';
      renderDashboard('Personel Yönetimi');
    } catch (err) {
      document.getElementById('staff-save-status').textContent = 'Hesap oluşturulamadı: ' + (err.message || 'Bilinmeyen hata');
      document.getElementById('staff-save-status').className = 'save-status';
    }
  });
  document.querySelectorAll('[data-edit-staff]').forEach((b) => b.addEventListener('click', () => {
    window._staffEdit = b.dataset.editStaff;
    renderDashboard('Personel Yönetimi');
  }));
  const ef = document.querySelector('#staff-edit-form');
  if (ef) ef.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isAdminUser()) return;
    const data = new FormData(ef);
    const nv = (data.get('newName') || '').toString().trim();
    const title = (data.get('staffTitle') || '').toString().trim();
    const old = window._staffEdit;
    if (!old || !getStaff().includes(old) || !validStaffDetails(nv, title)) return;
    if (getStaff().some((s) => s !== old && normName(s) === normName(nv))) { window.alert('Bu adla başka bir personel var.'); return; }
    if (!updateStaffIdentity(old, nv, title)) return;
    saveStaff(getStaff().map((s) => (s === old ? nv : s)));
    const acc = getAccess();
    if (old !== nv && acc[old]) { acc[nv] = acc[old]; delete acc[old]; saveAccess(acc); }
    const um = loadUserNames();
    users.forEach((u) => { if ((um[u.email] || u.name) === old) um[u.email] = nv; });
    saveUserNames(um);
    if (currentUser && (um[currentUser.email] || '') === nv) currentUser.name = nv;
    const plans = loadPlans().map((p) => (p.staff === old ? { ...p, staff: nv } : p));
    savePlans(plans);
    window._staffEdit = '';
    refreshCompanyCache();
    renderDashboard('Personel Yönetimi');
  });
}

function renderPeriodContent() {
  const me = currentUser ? currentUser.name : '';
  const plans = getMyPlans().sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);
  // Plan formunda yalnızca giriş yapan personelin yetkili olduğu cariler listelenir.
  const myCompanies = getMyVisibleCompanies(me);
  const companyOptions = myCompanies.length
    ? myCompanies.map((c) => `<option>${c}</option>`).join('')
    : '<option value="">Yetkili cari yok</option>';
  const rows = plans.length ? plans.map((p) => {
    const due = p.date <= today;
    return `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">${due ? '!' : '◷'}</span><span class="task-name"><strong>${p.title}</strong><small>${p.date} · ${p.company}${p.remind ? ' · Hatırlat açık' : ''}${due ? ' · GÜNÜ GELDİ' : ''}</small></span><span style="margin-left:auto;display:flex;gap:8px;"><button class="primary-btn work-submit" data-remind="${p.id}" type="button" style="min-width:110px;">${p.remind ? 'Uyarma' : 'Beni uyar'}</button><button class="primary-btn work-submit" data-del="${p.id}" type="button" style="min-width:80px;background:#b5443c;">Sil</button></span></div>`;
  }).join('') : '<div class="permission-empty"><span class="permission-icon">◷</span><div><strong>Henüz plan yok.</strong><p>Yukarıdaki kutudan ilk planını ekleyin. Planlar yalnızca size görünür.</p></div></div>';
  return `
    <div class="page-heading"><div><h1>Yıl / Dönem Yönetimi</h1><p>Planlı işlerinizi tarihe planlayın. Her personel yalnızca kendi planını görür.</p></div><span class="access-badge">${me}</span></div>
    <section class="panel"><div class="panel-header"><div><h2>Yeni plan ekle</h2><p class="panel-subtitle">Yetkili olduğunuz cariler listelenir. Başlık, firma ve tarih seçip Ekle'ye basın.</p></div></div>
      <form id="plan-form" class="work-form" style="grid-template-columns:1.4fr 1.2fr 1fr auto">
        <label class="field">Plan<input type="text" name="title" placeholder="Örn: SGK bildirimi" required /></label>
        <label class="field">Firma<select name="company">${companyOptions}</select></label>
        <label class="field">Tarih<input type="date" name="date" value="${today}" required /></label>
        <button class="primary-btn work-submit" type="submit">Ekle</button>
      </form>
    </section>
    <section class="panel"><div class="panel-header"><div><h2>Planlarım (${plans.length})</h2><p class="panel-subtitle">Günü gelenler ! ile işaretlenir ve girişte uyarı çıkar.</p></div></div>
      <div class="task-content">${rows}</div>
    </section>`;
}

function setupPeriodPlans() {
  const form = document.querySelector('#plan-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = (fd.get('title') || '').toString().trim();
    if (!title || !fd.get('company')) return;
    const list = loadPlans();
    list.push({ id: 'p' + Date.now(), staff: currentUser ? currentUser.name : '', title, company: fd.get('company'), date: fd.get('date'), remind: true, createdAt: new Date().toISOString() });
    savePlans(list);
    renderDashboard('Yıl / Dönem Yönetimi');
  });
  document.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    savePlans(loadPlans().filter((p) => p.id !== b.dataset.del || p.staff !== (currentUser ? currentUser.name : '')));
    renderDashboard('Yıl / Dönem Yönetimi');
  }));
  document.querySelectorAll('[data-remind]').forEach((b) => b.addEventListener('click', () => {
    const list = loadPlans();
    const it = list.find((p) => p.id === b.dataset.remind && p.staff === (currentUser ? currentUser.name : ''));
    if (it) it.remind = !it.remind;
    savePlans(list);
    renderDashboard('Yıl / Dönem Yönetimi');
  }));
  const today = new Date().toISOString().slice(0, 10);
  const due = getMyPlans().filter((p) => p.remind && p.date <= today);
  if (due.length) setTimeout(() => window.alert(`Bugün ${due.length} planınızın günü geldi:\n- ` + due.map((p) => `${p.date} ${p.title}`).join('\n- ')), 400);
}

function getReportData(staff, start, end) {
  const store = loadWorkStore();
  const tasks = getVisibleTasks(staff);
  const rows = [];
  let done = 0;
  let total = 0;
  Object.keys(store).forEach((k) => {
    const parts = k.split(' || ');
    if (parts.length !== 3) return;
    const [s, c, d] = parts;
    if (s !== staff) return;
    if (start && d < start) return;
    if (end && d > end) return;
    const rec = store[k];
    tasks.forEach((t) => {
      const v = !!(rec.tasksByName && rec.tasksByName[t]);
      total += 1;
      if (v) done += 1;
      rows.push({ date: d, company: c, task: t, done: v });
    });
  });
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const pct = total ? Math.round((done / total) * 100) : 0;
  const byTask = {};
  tasks.forEach((t) => { byTask[t] = { total: 0, done: 0 }; });
  rows.forEach((r) => {
    if (!byTask[r.task]) byTask[r.task] = { total: 0, done: 0 };
    byTask[r.task].total += 1;
    if (r.done) byTask[r.task].done += 1;
  });
  return { rows, done, total, pct, missing: total - done, byTask, taskCount: tasks.length };
}

function renderReportContent() {
  const admin = isAdminUser();
  const me = currentUser ? currentUser.name : '';
  const people = admin ? getStaff() : [me];
  const focus = window._reportStaff || me;
  const start = window._reportStart || '';
  const end = window._reportEnd || '';
  const target = admin ? (focus || people[0]) : me;
  const data = getReportData(target, start, end);
  const dayMap = {};
  data.rows.forEach((r) => {
    if (!dayMap[r.date]) dayMap[r.date] = { total: 0, done: 0, companies: {} };
    dayMap[r.date].total += 1;
    if (r.done) dayMap[r.date].done += 1;
    dayMap[r.date].companies[r.company] = true;
  });
  const days = Object.keys(dayMap).sort();
  const dayRows = days.length ? days.map((d) => {
    const di = dayMap[d];
    const p = di.total ? Math.round((di.done / di.total) * 100) : 0;
    const miss = data.rows.filter((r) => r.date === d && !r.done);
    return `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">${p === 100 ? '✓' : '!'}</span><span class="task-name"><strong>${formatDate(new Date(`${d}T00:00:00`))} · %${p}</strong><small>${di.done}/${di.total} tamamlandı · ${Object.keys(di.companies).join(', ')}${miss.length ? ` · Yapılmayan: ${miss.map((m) => `${m.task} (${m.company})`).join(', ')}` : ''}</small></span><span style="margin-left:auto;min-width:120px;"><span class="progress-bar"><i style="width:${p}%"></i></span></span></div>`;
  }).join('') : '<div class="permission-empty"><span class="permission-icon">▥</span><div><strong>Kayıt yok.</strong><p>Seçili aralıkta bu personele ait iş kaydı bulunamadı.</p></div></div>';
  return `
    <div class="page-heading"><div><h1>Raporlar</h1><p>${admin ? 'Personel seçin, tarih aralığında tamamlanma raporunu görün.' : 'Kendi işlem raporunuz (tarih bazlı).'}</p></div><span class="access-badge">${admin ? 'Yönetici' : me}</span></div>
    <section class="panel"><div class="panel-header"><div><h2>Rapor filtresi</h2></div></div>
      <form id="report-form" class="work-form" style="grid-template-columns:1fr 1fr 1fr auto">
        ${admin ? `<label class="field">Personel<select name="staff" id="report-staff">${people.map((s) => `<option${s === target ? ' selected' : ''}>${s}</option>`).join('')}</select></label>` : `<label class="field">Personel<input type="text" value="${me}" disabled /></label>`}
        <label class="field">Başlangıç<input type="date" name="start" value="${start}" /></label>
        <label class="field">Bitiş<input type="date" name="end" value="${end}" /></label>
        <button class="primary-btn work-submit" type="submit">Getir</button>
      </form>
    </section>
    <section class="stats-grid">
      ${[['Tamamlanma', `%${data.pct}`, `${data.done}/${data.total} işlem`], ['Yapılan', `${data.done}`, 'tamamlanan işlem'], ['Yapılmayan', `${data.missing}`, 'eksik işlem'], ['Kayıtlı gün', `${days.length}`, 'işlem yapılan gün']].map(([t, v, c]) => `<article class="stat-card"><div class="stat-top"><span>${t} · ${target}</span></div><div class="stat-number">${v}</div><span class="stat-change">${c}</span></article>`).join('')}
    </section>
    <section class="panel"><div class="panel-header"><div><h2>Tamamlanma grafiği</h2><p class="panel-subtitle">Yapılan / yapılmayan dağılımı.</p></div></div>
      <div class="task-content" style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;">
        <svg width="170" height="170" viewBox="0 0 42 42" role="img" aria-label="Tamamlanma %${data.pct}">
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#edf2ef" stroke-width="7"></circle>
          <circle cx="21" cy="21" r="15.915" fill="none" stroke="#0f766e" stroke-width="7" stroke-dasharray="${data.pct} ${100 - data.pct}" stroke-dashoffset="25" stroke-linecap="round"></circle>
          <text x="21" y="22" text-anchor="middle" font-size="7" font-weight="800" fill="#173b3a">%${data.pct}</text>
        </svg>
        <div style="display:grid;gap:8px;font-size:.86rem;">
          <span><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#0f766e;margin-right:8px;"></i>Yapılan: <strong>${data.done}</strong></span>
          <span><i style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#edf2ef;border:1px solid #d9e5e0;margin-right:8px;"></i>Yapılmayan: <strong>${data.missing}</strong></span>
          <span style="color:var(--muted);font-size:.78rem;">${data.total} işlem · ${days.length} gün · ${target}</span>
        </div>
      </div>
    </section>
    <section class="panel"><div class="panel-header"><div><h2>İş türü bazında rapor · ${target}</h2><p class="panel-subtitle">Yetkili olduğu iş türlerinde hangi işlemde eksik var.</p></div></div>
      <div class="task-content">${Object.keys(data.byTask).map((t) => {
        const bi = data.byTask[t];
        const p = bi.total ? Math.round((bi.done / bi.total) * 100) : 0;
        const missDays = data.rows.filter((r) => r.task === t && !r.done).map((r) => `${formatDate(new Date(`${r.date}T00:00:00`))} (${r.company})`);
        return `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">${p === 100 ? '✓' : bi.done === 0 ? '✕' : '!'}</span><span class="task-name"><strong>${t} · %${p}</strong><small>${bi.done}/${bi.total} tamamlandı${missDays.length ? ` · Eksik günler: ${missDays.join(', ')}` : bi.total ? ' · Eksik yok' : ' · Bu aralıkta kayıt yok'}</small></span><span style="margin-left:auto;min-width:120px;"><span class="progress-bar"><i style="width:${p}%"></i></span></span></div>`;
      }).join('')}</div>
    </section>
    <section class="panel"><div class="panel-header"><div><h2>Günlük döküm</h2><p class="panel-subtitle">Hangi tarihte hangi işlem yapıldı / yapılmadı.</p></div></div>
      <div class="task-content">${dayRows}</div>
    </section>`;
}

function setupReports() {
  const form = document.querySelector('#report-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (isAdminUser()) window._reportStaff = fd.get('staff');
    window._reportStart = fd.get('start') || '';
    window._reportEnd = fd.get('end') || '';
    renderDashboard('Raporlar');
  });
}

function renderQuestionContent() {
  const me = currentUser ? currentUser.name : '';
  const admin = isAdminUser();
  const others = getStaff().filter((s) => s !== me);
  const list = getVisibleQuestions().sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1));
  const rows = list.length ? list.map((q) => {
    const canAnswer = admin || q.to === me;
    const answerBlock = q.answer
      ? `<div class="task-row" style="cursor:default;background:#f3f8f6;border-radius:8px;"><span class="task-box" style="border-radius:50%">✓</span><span class="task-name"><strong>Cevap — ${q.answeredBy}</strong><small>${formatUpdatedAt(q.answeredAt)}</small><span>${q.answer}</span></span></div>`
      : `<div class="permission-empty"><span class="permission-icon">?</span><div><strong>Henüz cevaplanmadı.</strong></div></div>`;
    const answerForm = canAnswer && !q.answer
      ? `<form data-answer-form="${q.id}" class="work-form" style="grid-template-columns:1fr auto;margin-top:10px;"><label class="field">Cevabınız<input type="text" name="answer" placeholder="Cevabı yazın" required /></label><button class="primary-btn work-submit" type="submit">Cevapla</button></form>`
      : '';
    return `<div class="panel" style="margin-bottom:14px;"><div class="panel-header"><div><h2>${q.from} → ${q.to}</h2><p class="panel-subtitle">Soru: ${formatUpdatedAt(q.askedAt)}</p></div></div><div class="task-content"><div class="task-row" style="cursor:default;"><span class="task-box" style="border-radius:50%">☏</span><span class="task-name"><strong>${q.title}</strong></span></div>${answerBlock}${answerForm}</div></div>`;
  }).join('') : '<div class="permission-empty"><span class="permission-icon">☏</span><div><strong>Soru yok.</strong><p>Yukarıdan personel seçip ilk sorunuzu sorun.</p></div></div>';
  return `
    <div class="page-heading"><div><h1>Personel Soruları</h1><p>${admin ? 'Tüm soruları görür, cevap verebilirsiniz.' : 'Sadece sizin sorduğunuz ve size sorulan sorular görünür.'}</p></div><span class="access-badge">${admin ? 'Yönetici' : me}</span></div>
    <section class="panel"><div class="panel-header"><div><h2>Soru sor</h2><p class="panel-subtitle">Personel seçin, sorunuzu yazın, Gönder'e basın. Tarih otomatik eklenir.</p></div></div>
      <form id="question-form" class="work-form" style="grid-template-columns:1fr 1.4fr auto">
        <label class="field">Personel<select name="to">${others.map((s) => `<option>${s}</option>`).join('')}</select></label>
        <label class="field">Sorunuz<input type="text" name="title" placeholder="Sorunuzu yazın" required /></label>
        <button class="primary-btn work-submit" type="submit">Gönder</button>
      </form>
      <div class="save-row"><span class="save-status" id="question-save-status"></span></div>
    </section>
    <div>${rows}</div>`;
}

function setupQuestions() {
  const form = document.querySelector('#question-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const to = fd.get('to');
    const title = (fd.get('title') || '').toString().trim();
    if (!to || !title) return;
    const list = loadQuestions();
    list.push({ id: 'q' + Date.now(), from: currentUser ? currentUser.name : '', to, title, askedAt: new Date().toISOString(), answer: '', answeredBy: '', answeredAt: '' });
    saveQuestions(list);
    renderDashboard('Personel Soruları');
  });
  document.querySelectorAll('[data-answer-form]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = f.dataset.answerForm;
    const answer = (new FormData(f).get('answer') || '').toString().trim();
    if (!answer) return;
    const list = loadQuestions();
    const q = list.find((x) => x.id === id);
    if (!q) return;
    const me = currentUser ? currentUser.name : '';
    if (!isAdminUser() && q.to !== me) return;
    q.answer = answer;
    q.answeredBy = me;
    q.answeredAt = new Date().toISOString();
    saveQuestions(list);
    renderDashboard('Personel Soruları');
  }));
}

function renderNoteContent() {
  const me = currentUser ? currentUser.name : '';
  const list = getMyNotes().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const rows = list.length ? list.map((n) => {
    const attach = n.fileName
      ? (n.fileType && n.fileType.startsWith('image/')
        ? `<a href="${n.fileData}" download="${n.fileName}" title="İndir"><img class="note-img" src="${n.fileData}" alt="${n.fileName}" /></a>`
        : `<div style="margin-top:8px;"><a href="${n.fileData}" download="${n.fileName}">📎 ${n.fileName}</a></div>`)
      : '';
    return `<div class="panel" style="margin-bottom:14px;"><div class="panel-header"><div><h2>${n.title}</h2><p class="panel-subtitle">${formatUpdatedAt(n.createdAt)}${n.fileName ? ` · 📎 ${n.fileName}` : ''}</p></div><button class="primary-btn work-submit" data-del-note="${n.id}" type="button" style="min-width:80px;background:#b5443c;">Sil</button></div><div class="task-content"><div class="task-name"><span class="note-body">${n.text || ''}</span></div>${attach}</div></div>`;
  }).join('') : `<div class="permission-empty"><span class="permission-icon">✎</span><div><strong>Not yok.</strong><p>Yukarıdaki formdan başlık + metin yazıp, isterseniz resim ekleyip Kaydet'e basın. Notlar yalnızca size görünür.</p></div></div>`;
  return `
    <div class="page-heading"><div><h1>Notlar</h1><p>Kişisel notlarınız — metin ve resim ekleyin. Sadece siz görürsünüz.</p></div><span class="access-badge">${me}</span></div>
    <div class="notes-layout">
      <section class="panel"><div class="panel-header"><div><h2>Yeni not</h2><p class="panel-subtitle">Başlık + geniş metin alanı + resim seçip Kaydet'e basın.</p></div></div>
      <form id="note-form" class="note-form">
        <label class="field">Başlık<input type="text" name="title" placeholder="Not başlığı" required /></label>
        <label class="field">Resim yükle<input type="file" name="file" id="note-file" accept="image/*" /><small class="field-hint" id="note-file-hint">JPG / PNG, en fazla 1.5 MB. Seçince önizleme çıkar.</small></label>
        <label class="field note-text-field">Not metni<textarea name="text" id="note-text" rows="9" placeholder="Notunuzu buraya yazın..."></textarea><small class="field-hint" id="note-char-count">0 karakter</small></label>
        <div class="note-save-cell"><img id="note-preview" class="note-preview" alt="" style="display:none;" /><button class="primary-btn work-submit" type="submit">Kaydet</button></div>
      </form>
      <div class="save-row"><span class="save-status" id="note-save-status"></span></div>
    </section>
    <section class="panel calc-panel"><div class="panel-header"><div><h2>Hesap Makinesi</h2><p class="panel-subtitle">Hızlı hesap yapıp sonucu nota aktarabilirsiniz.</p></div><span class="task-counter">Hesap</span></div>
      <div class="calc"><div class="calc-history" id="calc-history">&nbsp;</div><input class="calc-display" id="calc-display" value="0" readonly aria-label="Hesap sonucu" />
        <div class="calc-grid">
          <button type="button" class="calc-btn calc-fn" data-calc="C">C</button>
          <button type="button" class="calc-btn calc-fn" data-calc="back">&#8592;</button>
          <button type="button" class="calc-btn calc-op" data-calc="%">%</button>
          <button type="button" class="calc-btn calc-op" data-calc="/">/</button>
          <button type="button" class="calc-btn" data-calc="7">7</button>
          <button type="button" class="calc-btn" data-calc="8">8</button>
          <button type="button" class="calc-btn" data-calc="9">9</button>
          <button type="button" class="calc-btn calc-op" data-calc="*">*</button>
          <button type="button" class="calc-btn" data-calc="4">4</button>
          <button type="button" class="calc-btn" data-calc="5">5</button>
          <button type="button" class="calc-btn" data-calc="6">6</button>
          <button type="button" class="calc-btn calc-op" data-calc="-">-</button>
          <button type="button" class="calc-btn" data-calc="1">1</button>
          <button type="button" class="calc-btn" data-calc="2">2</button>
          <button type="button" class="calc-btn" data-calc="3">3</button>
          <button type="button" class="calc-btn calc-op" data-calc="+">+</button>
          <button type="button" class="calc-btn" data-calc="0">0</button>
          <button type="button" class="calc-btn" data-calc=".">.</button>
          <button type="button" class="calc-btn" data-calc="(">(</button>
          <button type="button" class="calc-btn" data-calc=")">)</button>
          <button type="button" class="calc-btn calc-eq" data-calc="=" style="grid-column:span 4;">=</button>
        </div>
        <button type="button" class="primary-btn" id="calc-to-note" style="width:100%;margin-top:12px;">Sonucu nota aktar</button>
      </div>
    </section>
  </div>
  <div style="margin-top:16px;">${rows}</div>`;
}

function setupNotes() {
  const form = document.querySelector('#note-form');
  const textArea = document.querySelector('#note-text');
  const charCount = document.querySelector('#note-char-count');
  const fileInput = document.querySelector('#note-file');
  const preview = document.querySelector('#note-preview');
  const fileHint = document.querySelector('#note-file-hint');
  if (textArea && charCount) {
    const upd = () => { charCount.textContent = `${textArea.value.length} karakter`; };
    textArea.addEventListener('input', upd);
    upd();
  }
  // Resim seçilince anında önizleme göster; 1.5 MB üzeri seçimleri reddet.
  if (fileInput && preview) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      preview.style.display = 'none';
      preview.removeAttribute('src');
      if (fileHint) fileHint.textContent = 'JPG / PNG, en fazla 1.5 MB. Seçince önizleme çıkar.';
      if (!f) return;
      if (f.size > 1500000) {
        fileInput.value = '';
        if (fileHint) fileHint.textContent = 'Seçilen resim 1.5 MB sınırını aşıyor. Daha küçük bir resim seçin.';
        return;
      }
      if (!(f.type || '').startsWith('image/')) {
        fileInput.value = '';
        preview.style.display = 'none';
        if (fileHint) fileHint.textContent = 'Yalnızca resim dosyası (JPG / PNG) yükleyebilirsiniz.';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.style.display = 'block';
        if (fileHint) fileHint.textContent = `${f.name} hazır — Kaydet'e basınca nota eklenir.`;
      };
      reader.readAsDataURL(f);
    });
  }
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = (fd.get('title') || '').toString().trim();
    const text = (fd.get('text') || '').toString().trim();
    const file = fd.get('file');
    if (!title) return;
    const push = (fileName, fileType, fileData) => {
      const list = loadNotes();
      list.push({ id: 'n' + Date.now(), staff: currentUser ? currentUser.name : '', title, text, fileName, fileType, fileData, createdAt: new Date().toISOString() });
      saveNotes(list);
      renderDashboard('Notlar');
    };
    if (file && file.size) {
      if (file.size > 1500000) { const st = document.querySelector('#note-save-status'); if (st) st.textContent = 'Dosya 1.5 MB sınırını aşıyor, daha küçük seçin.'; return; }
      const reader = new FileReader();
      reader.onload = () => push(file.name, file.type || '', reader.result);
      reader.readAsDataURL(file);
    } else {
      push('', '', '');
    }
  });
  document.querySelectorAll('[data-del-note]').forEach((b) => b.addEventListener('click', () => {
    const me = currentUser ? currentUser.name : '';
    saveNotes(loadNotes().filter((n) => !(n.id === b.dataset.delNote && n.staff === me)));
    renderDashboard('Notlar');
  }));
  setupCalculator();
}

function setupCalculator() {
  const display = document.querySelector('#calc-display');
  const history = document.querySelector('#calc-history');
  if (!display) return;
  let expr = '';
  const render = (histText) => {
    display.value = expr || '0';
    if (history) history.textContent = histText !== undefined ? histText : (expr || ' ');
  };
  const safeEval = (s) => {
    if (!s || !/^[0-9+\-*/.%\s()]+$/.test(s)) throw new Error('bad');
    const js = s.replace(/%/g, '/100');
    const v = Function('"use strict";return (' + js + ')')();
    if (typeof v !== 'number' || !isFinite(v)) throw new Error('bad');
    return Math.round(v * 100000000) / 100000000;
  };
  render();
  document.querySelectorAll('[data-calc]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.calc;
    try {
      if (k === 'C') { expr = ''; render(' '); }
      else if (k === 'back') { expr = expr.slice(0, -1); render(); }
      else if (k === '=') {
        if (!expr) return;
        const v = safeEval(expr);
        render(`${expr} =`);
        expr = String(v);
        display.value = expr;
      } else {
        if (expr === '' && (k === '*' || k === '/' || k === '%' || k === '+' || k === '=')) return;
        expr += k;
        render();
      }
    } catch (err) { render('Hatalı işlem'); expr = ''; }
  }));
  const toNote = document.querySelector('#calc-to-note');
  if (toNote) toNote.addEventListener('click', () => {
    const ta = document.querySelector('#note-text');
    const val = display.value;
    if (!ta || !val || val === '0' && !expr) return;
    ta.value = ta.value ? `${ta.value}\n[hesap: ${history ? history.textContent : ''} ${val}]` : `[hesap: ${history ? history.textContent : ''} ${val}]`;
    ta.dispatchEvent(new Event('input'));
    ta.focus();
  });
}

function renderCompanyContent() {
  const me = currentUser ? currentUser.name : '';
  const admin = isAdminUser();
  // Personel yalnızca kendisine yetkilendirilmiş carileri görür; yönetici tümünü görür.
  const list = admin ? getCompanies() : getMyVisibleCompanies(me);
  const meta = loadCompanyMeta();
  const editName = window._companyEdit || '';
  const editRow = admin && editName ? `<form id="company-edit-form" class="work-form" style="grid-template-columns:1fr 1fr auto"><label class="field">Firma<input type="text" value="${editName}" disabled /></label><label class="field">Yeni unvan<input type="text" name="newName" value="${editName}" required /></label><button class="primary-btn work-submit" type="submit">Kaydet</button></form>` : '';
  return `
    <div class="page-heading"><div><h1>Firma Yönetimi</h1><p>${admin ? 'Cari ünvanı + tanımlanma tarihi yazıp Kaydet ile ekleyin. Bu tarih, personelin Yönetim Panelinde işlerinin başlangıcı sayılır.' : 'Size tanımlı cariler görünür (sadece görüntüleme).'}</p></div><span class="access-badge">${admin ? 'Yönetici' : me}</span></div>
    ${admin ? `<section class="panel"><div class="panel-header"><div><h2>Yeni cari ekle</h2><p class="panel-subtitle">Kutucuğa ünvan + tanımlanma tarihi yazın, Kaydet'e basın.</p></div></div>
      <form id="company-form" class="work-form" style="grid-template-columns:1.2fr 1fr auto">
        <label class="field">Cari ünvanı<input type="text" name="companyName" placeholder="Örn: Yeni Cari A.Ş." required /></label>
        <label class="field">Tanımlanma tarihi<input type="date" name="createdAt" value="${new Date().toISOString().slice(0, 10)}" required /></label>
        <button class="primary-btn work-submit" type="submit">Kaydet</button>
      </form>
      <div class="save-row"><span class="save-status" id="company-save-status"></span></div>${editRow}
    </section>` : ``}
    <section class="panel"><div class="panel-header"><div><h2>${admin ? 'Kayıtlı firmalar' : 'Yetkili olduğum cariler'} (${list.length})</h2><p class="panel-subtitle">Tanımlanma tarihi, personelin Yönetim Panelindeki sayaçların başlangıcıdır.</p></div></div>
      <div class="task-content">${list.length ? list.map((c) => { const d = (meta[c] && meta[c].createdAt) || getCompanyCreatedDate(c); return `<div class="task-row" style="cursor:default"><span class="task-box" style="border-radius:50%">▣</span><span class="task-name"><strong>${c}</strong><small>Tanımlanma: ${formatDateTr(d)}</small></span>${admin ? `<span style="margin-left:auto;"><button class="primary-btn work-submit" data-edit-company="${c}" type="button" style="min-width:90px;">Düzenle</button></span>` : ''}</div>`; }).join('') : '<div class="permission-empty"><span class="permission-icon">▣</span><div><strong>Yetkili olduğunuz cari yok.</strong><p>Yöneticinizden firma erişim yetkisi isteyin.</p></div></div>'}</div>
    </section>`;
}

function renderWorkTrackingContent() {
  const today = new Date().toISOString().slice(0, 10);
  const initialDate = getLastWorkDate(today);
  const staffName = currentUser ? currentUser.name : getStaff()[0];
  const visibleCompanies = getMyVisibleCompanies(staffName);
  const companyOptions = (visibleCompanies.length ? visibleCompanies : [`Yetkiniz yok — yöneticiye başvurun`]).map((c) => `<option>${c}</option>`).join('');
  return `
    <div class="page-heading"><div><h1>İş Takip</h1><p>Yetkiniz olan firmalarda günlük işlemlerinizi takip edin.</p></div><span class="access-badge">Personel çalışma alanı</span></div>
    <section class="panel work-filter">
      <div class="panel-header"><div><h2>Çalışma günleri seçimi</h2><p class="panel-subtitle">Personel alanı hesabınıza kilitlidir ve değiştirilemez. Firma ve tarih aralığını seçerek işlemleri görüntüleyin veya kaydedin.</p></div></div>
      <form id="work-form" class="work-form">
        <label class="field">Personel<input type="text" name="staff-display" value="${staffName}" disabled /><input type="hidden" name="staff" value="${staffName}" /></label>
        <label class="field">Firma<select name="company">${companyOptions}</select></label>
        <label class="field">Başlangıç tarihi<input type="date" name="date-from" value="${initialDate}" required /></label>
        <label class="field">Bitiş tarihi<input type="date" name="date-to" value="${initialDate}" required /></label>
        <button class="primary-btn work-submit" type="submit">İşlemleri göster</button>
      </form>
    </section>
    <section class="panel task-panel"><div class="panel-header"><div><h2 id="task-title">Günlük işlemler</h2><p class="panel-subtitle" id="task-summary">Personel ve firma seçimi bekleniyor.</p></div><span class="task-counter" id="task-counter">0 / 0 tamamlandı</span></div><div id="task-content" class="task-content"></div><div class="save-row" id="task-save-row"><span class="save-status" id="task-save-status"></span><button class="primary-btn save-btn" id="task-save-btn" type="button">Kaydet</button></div></section>`;
}

function updateTaskCounter(contentEl, counterEl, statusEl, initialSaved) {
  const boxes = contentEl.querySelectorAll('.task-check');
  const completed = contentEl.querySelectorAll('.task-check:checked').length;
  counterEl.textContent = `${completed} / ${boxes.length} tamamlandı`;
  if (!statusEl) return;
  const current = Array.from(boxes).map((box) => box.checked);
  const dirty = JSON.stringify(current) !== JSON.stringify(initialSaved);
  statusEl.dataset.dirty = dirty ? 'true' : 'false';
  if (dirty) {
    statusEl.innerHTML = '<span class="unsaved-dot"></span>Kaydedilmemiş değişiklik var — Kaydet\'e basın.';
    statusEl.className = 'save-status is-dirty';
  }
}

function setSaveStatus(statusEl, mode, message) {
  if (!statusEl) return;
  statusEl.dataset.dirty = mode === 'dirty' ? 'true' : 'false';
  statusEl.className = `save-status${mode === 'dirty' ? ' is-dirty' : mode === 'ok' ? ' is-ok' : ''}`;
  statusEl.innerHTML = mode === 'dirty'
    ? '<span class="unsaved-dot"></span>' + message
    : message;
}

function renderWorkTasks(staff, company, dateFrom, dateTo) {
  const taskContent = document.querySelector('#task-content');
  const taskTitle = document.querySelector('#task-title');
  const taskSummary = document.querySelector('#task-summary');
  const taskCounter = document.querySelector('#task-counter');
  const saveStatus = document.querySelector('#task-save-status');
  const saveBtn = document.querySelector('#task-save-btn');
  const saveRow = document.querySelector('#task-save-row');

  const allowedCompanies = getMyVisibleCompanies(staff);
  const dates = getDateRange(dateFrom, dateTo);
  if (!dates.length) {
    if (taskTitle) taskTitle.textContent = `${staff} · Günlük işlemler`;
    if (taskSummary) taskSummary.textContent = `${company} · Seçili tarih aralığı yok`;
    if (taskCounter) taskCounter.textContent = '0 / 0 tamamlandı';
    if (taskContent) taskContent.innerHTML = '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Tarih aralığı seçilmemiş veya geçersiz.</strong><p>Başlangıç ve bitiş tarihlerini doğru şekilde seçin.</p></div></div>';
    if (saveRow) saveRow.style.display = 'none';
    if (saveStatus) setSaveStatus(saveStatus, '', '');
    return;
  }

  if (!canView(staff, company)) {
    if (taskCounter) taskCounter.textContent = 'Yetki yok';
    if (saveRow) saveRow.style.display = 'none';
    if (taskContent) taskContent.innerHTML = '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Bu firma için görüntüleme yetkiniz bulunmuyor.</strong><p>Yöneticinizden firmaya erişim yetkisi istemeniz gerekir.</p></div></div>';
    if (saveStatus) setSaveStatus(saveStatus, '', '');
    return;
  }

  if (saveRow) saveRow.style.display = '';
  const tasks = getVisibleTasks(staff);
  const formattedRange = (dateFrom && dateTo) ? `<span class="date-from">${formatDateTr(dateFrom)}</span> — <span class="date-to">${formatDateTr(dateTo)}</span>` : formatDateTr(dateFrom || dateTo);

  // Her tarih için ayrı bölüm oluştur
  let totalTasks = 0;
  let totalCompleted = 0;
  let lastRecordDate = '';

  const dateBlocks = dates.map((date) => {
    const record = getWorkRecord(staff, company, date);
    const saved = record ? tasks.map((t) => !!(record.tasksByName && record.tasksByName[t])) : tasks.map(() => false);
    const completedSaved = saved.filter(Boolean).length;
    totalTasks += tasks.length;
    totalCompleted += completedSaved;
    lastRecordDate = record && record.updatedAt ? record.updatedAt : lastRecordDate;

    const dateFormatted = formatDateTr(date);
    return `
      <div class="task-date-block">
        <div class="task-date-head"><span class="task-date-label">${dateFormatted}</span><span class="task-date-summary">${completedSaved} / ${tasks.length} tamamlandı</span></div>
        <div class="task-date-content">
          ${tasks.map((task, idx) => `<label class="task-row"><input type="checkbox" class="task-check" data-date="${date}" data-task="${task}" ${saved[idx] ? 'checked' : ''} /><span class="task-box"></span><span class="task-name"><strong>${task}</strong><small>${dateFormatted} · ${company}</small></span></label>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  if (taskTitle) taskTitle.textContent = `${staff} · Günlük işlemler`;
  if (taskSummary) taskSummary.innerHTML = `${company} · ${formattedRange}`;
  if (taskCounter) taskCounter.textContent = `${totalCompleted} / ${totalTasks} tamamlandı`;
  if (taskContent) taskContent.innerHTML = dateBlocks;

  if (saveStatus) {
    if (lastRecordDate) {
      setSaveStatus(saveStatus, 'ok', `✓ ${dates.length} gün için kayıtlı veri yüklendi. Son kayıt: ${formatUpdatedAt(lastRecordDate)}`);
    } else {
      setSaveStatus(saveStatus, '', `${dates.length} gün için henüz kayıt yok — işaretleyip Kaydet'e basın.`);
    }
  }

  if (taskContent) {
    taskContent.querySelectorAll('.task-check').forEach((checkbox) => checkbox.addEventListener('change', () => {
      const completed = taskContent.querySelectorAll('.task-check:checked').length;
      const total = taskContent.querySelectorAll('.task-check').length;
      if (taskCounter) taskCounter.textContent = `${completed} / ${total} tamamlandı`;
      if (saveStatus) {
        const dirty = Array.from(taskContent.querySelectorAll('.task-check')).some((box) => box.checked);
        setSaveStatus(saveStatus, dirty ? 'dirty' : 'ok', dirty ? 'Kaydedilmemiş değişiklik var — Kaydet\'e basın.' : `${dates.length} gün için kayıt yüklendi.`);
      }
    }));
  }

  if (saveBtn) {
    saveBtn.onclick = () => {
      if (!canEdit(staff, company)) {
        setSaveStatus(saveStatus, 'dirty', 'İşlem yetkiniz yok — sadece görüntüleyebilirsiniz.');
        return;
      }
      const checkedBoxes = Array.from(taskContent.querySelectorAll('.task-check:checked'));
      const totalBoxes = taskContent.querySelectorAll('.task-check').length;
      let savedCount = 0;

      dates.forEach((date) => {
        const dateBoxes = Array.from(taskContent.querySelectorAll(`.task-check[data-date="${date}"]`));
        const current = dateBoxes.map((box) => box.checked);
        const byName = {};
        dateBoxes.forEach((box, idx) => {
          const taskName = box.getAttribute('data-task');
          if (taskName) byName[taskName] = current[idx];
        });
        saveWorkRecord(staff, company, date, current, byName);
        rememberLastWorkDate(date);
        savedCount += current.filter(Boolean).length;
      });

      if (taskCounter) taskCounter.textContent = `${savedCount} / ${totalBoxes} tamamlandı`;
      setSaveStatus(saveStatus, 'ok', `✓ ${dates.length} gün kaydedildi — ${savedCount}/${totalBoxes} tamamlandı. Her tarih ayrı saklandı.`);
    };
  }
}

function setupWorkTracking() {
  const form = document.querySelector('#work-form');
  if (form) {
    const initial = new FormData(form);
    renderWorkTasks(initial.get('staff'), initial.get('company'), initial.get('date-from'), initial.get('date-to'));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const statusEl = document.querySelector('#task-save-status');
      if (statusEl && statusEl.dataset.dirty === 'true' && !window.confirm('Kaydedilmemiş değişiklik var. Yine de başka tarihe geçilsin mi?')) return;
      renderWorkTasks(formData.get('staff'), formData.get('company'), formData.get('date-from'), formData.get('date-to'));
    });
  }
  const dashForm = document.querySelector('#dash-work-form');
  if (dashForm) {
    const initial = new FormData(dashForm);
    renderWorkTasks(initial.get('staff'), initial.get('company'), initial.get('date-from'), initial.get('date-to'));
    dashForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(dashForm);
      const statusEl = document.querySelector('#dash-save-status');
      if (statusEl && statusEl.dataset.dirty === 'true' && !window.confirm('Kaydedilmemiş değişiklik var. Yine de başka tarihe geçilsin mi?')) return;
      renderWorkTasks(formData.get('staff'), formData.get('company'), formData.get('date-from'), formData.get('date-to'));
    });
  }
}
function setupDashboardWorkPanel() {
  const body = document.querySelector('#dash-work-body');
  const toggle = document.querySelector('#dash-work-toggle');
  const counter = document.querySelector('#dash-task-counter');
  const title = document.querySelector('#dash-task-title');
  const summary = document.querySelector('#dash-task-summary');
  const content = document.querySelector('#dash-task-content');
  const saveStatus = document.querySelector('#dash-save-status');
  const saveBtn = document.querySelector('#dash-save-btn');
  const saveRow = document.querySelector('#dash-save-row');
  if (!body) return;
  if (toggle) {
    toggle.addEventListener('click', () => {
      body.classList.toggle('is-collapsed');
      const open = !body.classList.contains('is-collapsed');
      toggle.setAttribute('aria-expanded', String(open));
      const text = document.querySelector('#dash-work-toggle-text');
      if (text) text.textContent = open ? 'Kapat' : 'Aç';
      toggle.querySelector('.collapse-chevron').textContent = open ? '▾' : '▸';
      if (open) renderDashboardWorkContent();
    });
  }
  if (body.classList.contains('is-collapsed')) return;
  renderDashboardWorkContent();
  function renderDashboardWorkContent() {
    const form = document.querySelector('#dash-work-form');
    if (!form) return;
    const initial = new FormData(form);
    renderWorkTasks(initial.get('staff'), initial.get('company'), initial.get('date-from'), initial.get('date-to'), {
      taskContent: document.querySelector('#dash-task-content'),
      taskTitle: document.querySelector('#dash-task-title'),
      taskSummary: document.querySelector('#dash-task-summary'),
      taskCounter: document.querySelector('#dash-task-counter'),
      saveStatus: document.querySelector('#dash-save-status'),
      saveBtn: document.querySelector('#dash-save-btn'),
      saveRow: document.querySelector('#dash-save-row')
    });
  }
}
function renderDashboardWorkContent() {
  const form = document.querySelector('#dash-work-form');
  if (!form) return;
  const initial = new FormData(form);
  renderWorkTasks(initial.get('staff'), initial.get('company'), initial.get('date-from'), initial.get('date-to'), {
    taskContent: document.querySelector('#dash-task-content'),
    taskTitle: document.querySelector('#dash-task-title'),
    taskSummary: document.querySelector('#dash-task-summary'),
    taskCounter: document.querySelector('#dash-task-counter'),
    saveStatus: document.querySelector('#dash-save-status'),
    saveBtn: document.querySelector('#dash-save-btn'),
    saveRow: document.querySelector('#dash-save-row')
  });
}

// Yönetim Paneli altında açılır/kapanır iş takip paneli.
// Aynı personel+firma+tarih deposunu kullanır; her tarih kendi kaydını saklar.
function renderDashboardWorkPanel() {
  const staffName = currentUser ? currentUser.name : staffMembers[0];
  let open = true;
  try { open = localStorage.getItem(DASH_PANEL_KEY) !== 'closed'; } catch (err) {}
  return `
    <section class="panel dash-work-panel${open ? '' : ' is-collapsed'}" id="dash-work-panel">
      <div class="panel-header dash-work-head">
        <div><h2>İş Takip — Günlük İşlemler</h2><p class="panel-subtitle">Tarih seçin, o güne ait görevleri işaretleyip Kaydet'e basın. Her tarih ayrı saklanır.</p></div>
        <div class="dash-work-head-actions"><span class="task-counter" id="dash-task-counter">0 / 0 tamamlandı</span><button class="collapse-toggle" id="dash-work-toggle" type="button" aria-expanded="${open}"><span class="collapse-chevron">▾</span><span id="dash-work-toggle-text">${open ? 'Kapat' : 'Aç'}</span></button></div>
      </div>
      <div class="dash-work-body" id="dash-work-body">
        <form id="dash-work-form" class="work-form">
          <label class="field">Personel<input type="text" name="staff-display" value="${staffName}" disabled /><input type="hidden" name="staff" value="${staffName}" /></label>
          <label class="field">Firma<select name="company">${companies.map((company) => `<option>${company}</option>`).join('')}</select></label>
          <label class="field">İşlem tarihi<input type="date" name="date" value="2026-01-01" max="2026-12-31" required /></label>
          <button class="primary-btn work-submit" type="submit">İşlemleri göster</button>
        </form>
        <div class="panel-header task-subhead"><div><h2 id="dash-task-title">Günlük işlemler</h2><p class="panel-subtitle" id="dash-task-summary">Tarih seçimi bekleniyor.</p></div></div>
        <div id="dash-task-content" class="task-content"></div>
        <div class="save-row" id="dash-save-row"><span class="save-status" id="dash-save-status"></span><button class="primary-btn save-btn" id="dash-save-btn" type="button">Kaydet</button></div>
      </div>
    </section>`;
}

function renderLogin() {
  currentUser = null;
  app.innerHTML = `
    <section class="login-shell">
      <div class="login-art">
        <div class="brand"><span class="brand-mark">İŞ</span><span>İş Süreç Yönetimi</span></div>
        <div class="art-copy"><h1>Süreçlerinize netlik kazandırın.</h1><p>Ekibinizin iş akışlarını tek merkezden yönetin, ölçün ve geliştirin.</p></div>
      </div>
      <div class="login-panel">
        <form class="login-card" id="login-form">
          <h2>Tekrar hoş geldiniz</h2>
          <p>Yönetim panelinize erişmek için giriş yapın.</p>
          <label class="field">E-posta adresi<input type="email" name="email" placeholder="ad@firma.com" required /></label>
          <label class="field">Şifre<input type="password" name="password" placeholder="••••••••" required /></label>
          <button class="primary-btn" type="submit">Panele giriş yap</button>
          <div class="demo-note" id="login-note">Kendi kullanıcı bilgilerinizle giriş yapın. Örn: ad@firma.com</div>
        </form>
      </div>
    </section>`;
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button');
    if (button.disabled) return;
    button.disabled = true;
    const formData = new FormData(form);
    const email = formData.get('email').trim().toLowerCase();
    const password = formData.get('password');
    const matchedUser = users.find((user) => user.email.toLowerCase() === email);
    const note = document.querySelector('#login-note');
    try {
      const verification = verifyAccountPassword(matchedUser, password);
      const valid = typeof verification === 'boolean' ? verification : await verification;
      if (!form.isConnected) return;
      if (!valid) {
        note.textContent = 'E-posta veya şifre hatalı. Lütfen kendi kullanıcı bilgilerinizle tekrar deneyin.';
        note.style.background = '#fdecec';
        note.style.color = '#a33a3a';
        return;
      }
      currentUser = { email: matchedUser.email, title: matchedUser.title, name: resolveUserName(matchedUser) };
      renderDashboard();
    } catch (err) {
      note.textContent = 'Giriş doğrulanamadı. Tarayıcınızın şifre deposuna erişimini kontrol edin.';
    } finally { button.disabled = false; }
  });
}

function renderPageBody(active) {
  try {
    if (active === 'Yetkilendirme') return renderAccessMatrixContent();
    if (active === 'İş Takip') return renderWorkTrackingContent();
    if (active === 'Firma Yönetimi') return renderCompanyContent();
    if (active === 'Yıl / Dönem Yönetimi') return renderPeriodContent();
    if (active === 'Personel Yönetimi') return renderStaffContent();
    if (active === 'Raporlar') return renderReportContent();
    if (active === 'Personel Soruları') return renderQuestionContent();
    if (active === 'Notlar') return renderNoteContent();
    if (active === 'Kullanıcı Yönetimi') return renderMyDashboardStats();
    if (active === 'Duyurular') return renderAnnouncementsContent();
    if (active === 'Ayın Elemanı') return renderEmployeeContent();
    if (active === 'Yönetim Paneli') return renderMyDashboardStats() + renderPasswordPanel() + renderEmployeeSpotlight() + renderAnnouncementsContent(true);
    return '<div class="page-heading"><div><h1>' + active + '</h1><p>Bugünkü iş akışınıza genel bakış.</p></div></div>'
      + '<section class="stats-grid">'
      + [['Aktif kullanıcı', '128'], ['Kayıtlı firma', '46'], ['Toplam personel', '1.284'], ['Bekleyen işlem', '23']].map(function (row) {
        return '<article class="stat-card"><div class="stat-top"><span>' + row[0] + '</span></div><div class="stat-number">' + row[1] + '</div></article>';
      }).join('') + '</section>';
  } catch (err) {
    return '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Sayfa yüklenirken hata oluştu.</strong><p>' + ((err && err.message) || err) + '</p></div></div>';
  }
}

function renderDashboard(active = 'Yönetim Paneli') {
  try {
  if (!currentUser) { renderLogin(); return; }
  const user = currentUser;
  const requested = active || 'Yönetim Paneli';
  const safeActive = requested === 'Yetkilendirme' && !isAdminUser() ? 'Yönetim Paneli' : requested;
  window._lastPage = safeActive;
  app.innerHTML = `
    <section class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><span class="brand-mark">İŞ</span><span>İş Süreç Yönetimi</span></div>
        <p class="nav-label">Çalışma alanı</p>
        <nav class="nav">${menuItems.filter(([, label]) => label !== 'Yetkilendirme' || isAdminUser()).map(([icon, label]) => {
if (label === 'Kullanıcı Yönetimi') {
const parentCls = safeActive === 'Kullanıcı Yönetimi' ? ' active' : '';
const childCls = safeActive === 'İş Takip' ? ' active' : '';
return `<div class="nav-group is-open"><button type="button" class="nav-item${parentCls}" data-page="Kullanıcı Yönetimi"><span class="nav-icon">${icon}</span><span>${label}</span><span class="nav-caret">▾</span></button><div class="nav-submenu"><button type="button" class="nav-item nav-child${childCls}" data-page="İş Takip"><span class="nav-icon">✓</span><span>İş Takip</span></button></div></div>`;
}
const cls = label === safeActive ? ' active' : '';
return `<button type="button" class="nav-item${cls}" data-page="${label}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`;
}).join('')}</nav>
        <div class="sidebar-footer"><div class="profile"><div>${getUserAvatarHtml(user.email, user.name)}<div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(getStaffTitle(user.name))}</small></div></div><div class="profile-actions">${getProfileActionsHtml(user.email, user.name)}</div></div><button class="logout" id="logout">↪ &nbsp; Güvenli çıkış</button></div>
      </aside>
      <div class="content">
        <header class="topbar"><button class="mobile-menu" id="menu-toggle" aria-label="Menüyü aç">☰</button><div class="breadcrumb">Ana sayfa&nbsp; / &nbsp;<strong>${safeActive}</strong></div><div class="top-actions"><button class="notification" aria-label="Bildirimler">♧</button><span class="date-chip">10 Eylül 2026</span></div></header>
        ${renderPageBody(safeActive)}
      </div>
    </section>`;
  document.querySelector('#logout').addEventListener('click', renderLogin);
  document.querySelector('#menu-toggle').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelectorAll('[data-page]').forEach((item) => item.addEventListener('click', (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } const p = item.getAttribute('data-page'); renderDashboard(p || 'Yönetim Paneli'); }));
  document.querySelector('.nav').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (!b) return; e.preventDefault(); e.stopPropagation(); renderDashboard(b.getAttribute('data-page') || 'Yönetim Paneli'); });
  if (safeActive === 'Yetkilendirme') { setupAccessMatrix(); setupAnnouncementPermissions(); }
  if (safeActive === 'Yönetim Paneli') setupPasswordPanel();
  if (safeActive === 'Duyurular') setupAnnouncements();
  if (safeActive === 'Ayın Elemanı') setupEmployeeSelection();
  if (safeActive === 'Firma Yönetimi') setupCompanyManagement();
  if (safeActive === 'Yıl / Dönem Yönetimi') setupPeriodPlans();
  if (safeActive === 'Personel Yönetimi') setupStaffManagement();
  if (safeActive === 'Raporlar') setupReports();
  if (safeActive === 'Personel Soruları') setupQuestions();
  if (safeActive === 'Notlar') setupNotes();
  if (safeActive === 'İş Takip') setupWorkTracking();
  setupProfileActions();
  } catch (err) {
    app.innerHTML = '<div class="permission-empty" style="margin:40px;"><span class="permission-icon">!</span><div><strong>Sayfa açılamadı.</strong><p>' + ((err && err.message) || err) + '</p><button class="primary-btn" onclick="location.reload()">Yenile</button></div></div>';
  }
}

renderLogin();
