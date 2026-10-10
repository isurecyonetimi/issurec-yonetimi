const menuItems = [

  ['⌂', 'Yönetim Paneli'],

  ['♙', 'Kullanıcı Yönetimi'],

  ['▣', 'Firma Yönetimi'],

  ['◷', 'Yıl / Dönem Yönetimi'],

  ['♟', 'Personel Yönetimi'],

  ['▤', 'Personel İzin ve Özlük'],

  ['⚿', 'Yetkilendirme'],

  ['▥', 'Raporlar'],

  ['☏', 'Personel Soruları'],

  ['★', 'Ayın Elemanı'],

  ['◉', 'Duyurular'],

  ['✎', 'Notlar']

];

const app = document.querySelector('#app');

const DEFAULT_STAFF = [
  'Ayşe Yılmaz',
  'Mehmet Kaya',
  'Elif Demir',
  'Ahmet Şahin',
  'Zeynep Aras'
];

const STAFF_STORAGE_KEY = 'isSurecStaffV1';

// Firebase'den gelen ortak personel listesi burada tutulur.
// getStaff() senkron çalışmaya devam ettiği için mevcut ekranları bozmaz.
let sharedStaffCache = null;

// ---------------------------------------------------------
// PERSONEL LİSTESİ - GEÇİCİ YEREL ÖNBELLEK
// ---------------------------------------------------------

function loadStaff() {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    const p = raw ? JSON.parse(raw) : null;

    if (
      Array.isArray(p) &&
      p.length
    ) {
      return p.filter(
        (s) => typeof s === 'string' && s.trim()
      );
    }
  } catch (err) { }

  return [...DEFAULT_STAFF];
}

function saveStaff(list) {
  try {
    const cleanList = Array.from(
      new Set(
        (Array.isArray(list) ? list : [])
          .filter((s) => typeof s === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    localStorage.setItem(
      STAFF_STORAGE_KEY,
      JSON.stringify(cleanList)
    );

    // Aynı anda bellekteki ortak listeyi de güncelle.
    sharedStaffCache = [...cleanList];

    return true;
  } catch (err) {
    console.error('Personel listesi kaydedilemedi:', err);
    return false;
  }
}

// ---------------------------------------------------------
// MERKEZİ PERSONEL LİSTESİ
// ---------------------------------------------------------

function getStaff() {
  if (Array.isArray(sharedStaffCache)) {
    return [...sharedStaffCache];
  }

  return loadStaff();
}

// Firebase'deki ortak personel belgesinin adresi.
// Daha sonra firmalar, yetkiler ve diğer ortak veriler için
// benzer merkezi yapılar oluşturacağız.
const STAFF_FIREBASE_DOC = 'staff';
const STAFF_FIREBASE_COLLECTION = 'settings';
const STAFF_META_FIREBASE_DOC = 'staffMeta';

let sharedStaffMetaCache = null;

async function loadSharedStaffMetaFromFirebase() {
  try {
    if (!window.firebaseDb || !window.firebaseDoc || !window.firebaseGetDoc) {
      return false;
    }

    const metaRef = window.firebaseDoc(
      window.firebaseDb,
      'settings',
      STAFF_META_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(metaRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data();

    if (!data.staffMeta || typeof data.staffMeta !== 'object') {
      return false;
    }

    sharedStaffMetaCache = { ...data.staffMeta };

    console.log(
      'Firebase ortak personel ünvanları yüklendi:',
      sharedStaffMetaCache
    );

    return true;
  } catch (err) {
    console.error('Firebase personel ünvanları okunamadı:', err);
    return false;
  }
}

async function saveSharedStaffMetaToFirebase(meta) {
  try {
    if (!window.firebaseDb || !window.firebaseDoc || !window.firebaseSetDoc) {
      return false;
    }

    const cleanMeta = {};

    Object.entries(meta || {}).forEach(([name, value]) => {
      if (!name || !value || typeof value !== 'object') return;

      cleanMeta[name] = {
        title: String(value.title || '').trim()
      };
    });

    const metaRef = window.firebaseDoc(
      window.firebaseDb,
      'settings',
      STAFF_META_FIREBASE_DOC
    );

    await window.firebaseSetDoc(
      metaRef,
      {
        staffMeta: cleanMeta,
        updatedAt: new Date().toISOString()
      }
    );

    sharedStaffMetaCache = { ...cleanMeta };

    console.log(
      'Firebase ortak personel ünvanları kaydedildi:',
      cleanMeta
    );

    return true;
  } catch (err) {
    console.error('Firebase personel ünvanları kaydedilemedi:', err);
    return false;
  }
}
async function saveSharedStaffToFirebase(list) {
  try {
    if (!window.firebaseDb || !window.firebaseDoc || !window.firebaseSetDoc) {
      return false;
    }

    const cleanList = Array.from(
      new Set(
        (Array.isArray(list) ? list : [])
          .filter((s) => typeof s === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    const staffRef = window.firebaseDoc(
      window.firebaseDb,
      STAFF_FIREBASE_COLLECTION,
      STAFF_FIREBASE_DOC
    );

    await window.firebaseSetDoc(
      staffRef,
      {
        staff: cleanList,
        updatedAt: new Date().toISOString()
      }
    );

    sharedStaffCache = [...cleanList];

    try {
      localStorage.setItem(
        STAFF_STORAGE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) { }

    console.log(
      'Firebase ortak personel listesi kaydedildi:',
      cleanList
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase personel listesi kaydedilemedi:',
      err
    );

    return false;
  }
}
function listenSharedStaffFromFirebase() {

  if (
    !window.firebaseDb ||
    !window.firebaseDoc ||
    !window.firebaseOnSnapshot
  ) {

    console.error(
      'Firebase canlı personel bağlantısı hazır değil.'
    );

    return null;

  }


  const staffRef =
    window.firebaseDoc(
      window.firebaseDb,
      STAFF_FIREBASE_COLLECTION,
      STAFF_FIREBASE_DOC
    );


  const unsubscribe =
    window.firebaseOnSnapshot(
      staffRef,
      (snapshot) => {

        if (!snapshot.exists()) {
          return;
        }


        const data =
          snapshot.data();


        if (
          !Array.isArray(
            data.staff
          )
        ) {
          return;
        }


        const cleanList =
          Array.from(
            new Set(
              data.staff
                .filter(
                  (s) =>
                    typeof s === 'string'
                )
                .map(
                  (s) =>
                    s.trim()
                )
                .filter(Boolean)
            )
          );


        sharedStaffCache =
          [...cleanList];


        try {

          localStorage.setItem(
            STAFF_STORAGE_KEY,
            JSON.stringify(
              cleanList
            )
          );

        } catch (err) { }


        console.log(
          'Firebase canlı personel listesi güncellendi:',
          cleanList
        );


        const activePage =
          document.querySelector(
            '.nav-item.active'
          );


        if (
          activePage &&
          activePage.textContent.includes(
            'Personel Yönetimi'
          )
        ) {

          renderDashboard(
            'Personel Yönetimi'
          );

        }

      },
      (error) => {

        console.error(
          'Firebase canlı personel dinleyicisi çalışmadı:',
          error
        );

      }
    );


  return unsubscribe;

}

// Firebase'deki ortak personel listesini okur.
async function loadSharedStaffFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      return false;
    }

    const staffRef = window.firebaseDoc(
      window.firebaseDb,
      STAFF_FIREBASE_COLLECTION,
      STAFF_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(staffRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data();

    if (!Array.isArray(data.staff)) {
      return false;
    }

    const cleanList = Array.from(
      new Set(
        data.staff
          .filter((s) => typeof s === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    if (!cleanList.length) {
      return false;
    }

    sharedStaffCache = [...cleanList];

    try {
      localStorage.setItem(
        STAFF_STORAGE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) { }

    console.log(
      'Firebase ortak personel listesi yüklendi:',
      cleanList
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase personel listesi okunamadı:',
      err
    );

    return false;
  }
}

const staffMembers = loadStaff();

loadSharedStaffMetaFromFirebase();

const DEFAULT_COMPANIES = [
  'Artemis Teknoloji A.Ş.',
  'Nova İnsan Kaynakları Ltd.',
  'Yapıtaş Proje ve Danışmanlık'
];

const COMPANY_STORAGE_KEY = 'isSurecCompaniesV1';

const ACCESS_STORAGE_KEY = 'isSurecStaffAccessV1';

const DEFAULT_ACCESS = {
  'Ayşe Yılmaz': [
    'Artemis Teknoloji A.Ş.',
    'Nova İnsan Kaynakları Ltd.',
    'Yapıtaş Proje ve Danışmanlık'
  ],

  'Mehmet Kaya': [
    'Artemis Teknoloji A.Ş.',
    'Yapıtaş Proje ve Danışmanlık'
  ],

  'Elif Demir': [
    'Nova İnsan Kaynakları Ltd.'
  ],

  'Ahmet Şahin': [
    'Artemis Teknoloji A.Ş.'
  ],

  'Zeynep Aras': [
    'Yapıtaş Proje ve Danışmanlık'
  ]
};

function loadCompanies() {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed.filter((c) => typeof c === 'string' && c.trim());
  } catch (err) { }
  return [...DEFAULT_COMPANIES];
}
function saveCompanies(list) {
  try { localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(list)); } catch (err) { }
}
function loadAccess() {
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) { }
  return JSON.parse(JSON.stringify(DEFAULT_ACCESS));
}
function saveAccess(obj) {
  try { localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(obj)); } catch (err) { }
}
const COMPANY_FIREBASE_COLLECTION = 'settings';
const COMPANY_FIREBASE_DOC = 'companies';

let sharedCompaniesCache = null;

async function loadSharedCompaniesFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      return false;
    }

    const companiesRef = window.firebaseDoc(
      window.firebaseDb,
      COMPANY_FIREBASE_COLLECTION,
      COMPANY_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(companiesRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data();

    if (!Array.isArray(data.companies)) {
      return false;
    }

    const cleanList = Array.from(
      new Set(
        data.companies
          .filter((c) => typeof c === 'string')
          .map((c) => c.trim())
          .filter(Boolean)
      )
    );

    if (!cleanList.length) {
      return false;
    }

    sharedCompaniesCache = [...cleanList];

    try {
      localStorage.setItem(
        COMPANY_STORAGE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) { }

    console.log(
      'Firebase ortak firma listesi yüklendi:',
      cleanList
    );


    return true;
  } catch (err) {
    console.error(
      'Firebase firma listesi okunamadı:',
      err
    );

    return false;
  }
}
function listenSharedCompaniesFromFirebase() {

  if (
    !window.firebaseDb ||
    !window.firebaseDoc ||
    !window.firebaseOnSnapshot
  ) {
    console.error(
      'Firebase canlı firma bağlantısı hazır değil.'
    );

    return null;
  }


  const companiesRef =
    window.firebaseDoc(
      window.firebaseDb,
      COMPANY_FIREBASE_COLLECTION,
      COMPANY_FIREBASE_DOC
    );


  const unsubscribe =
    window.firebaseOnSnapshot(
      companiesRef,
      (snapshot) => {

        if (!snapshot.exists()) {
          return;
        }


        const data =
          snapshot.data();


        if (
          !Array.isArray(
            data.companies
          )
        ) {
          return;
        }


        const cleanList =
          Array.from(
            new Set(
              data.companies
                .filter(
                  (c) =>
                    typeof c === 'string'
                )
                .map(
                  (c) =>
                    c.trim()
                )
                .filter(Boolean)
            )
          );


        sharedCompaniesCache =
          [...cleanList];


        try {

          localStorage.setItem(
            COMPANY_STORAGE_KEY,
            JSON.stringify(
              cleanList
            )
          );

        } catch (err) { }


        console.log(
          'Firebase canlı firma listesi güncellendi:',
          cleanList
        );


        /*
         * Firma Yönetimi ekranı açıksa
         * listeyi yenile.
         */

        const activePage =
          document.querySelector(
            '.nav-item.active'
          );


        if (
          activePage &&
          activePage.textContent.includes(
            'Firma Yönetimi'
          )
        ) {

          renderDashboard(
            'Firma Yönetimi'
          );

        }

      },
      (error) => {

        console.error(
          'Firebase canlı firma dinleyicisi çalışmadı:',
          error
        );

      }
    );


  return unsubscribe;

}

async function saveSharedCompaniesToFirebase(list) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      return false;
    }

    const cleanList = Array.from(
      new Set(
        (Array.isArray(list) ? list : [])
          .filter((c) => typeof c === 'string')
          .map((c) => c.trim())
          .filter(Boolean)
      )
    );

    const companiesRef = window.firebaseDoc(
      window.firebaseDb,
      COMPANY_FIREBASE_COLLECTION,
      COMPANY_FIREBASE_DOC
    );

    await window.firebaseSetDoc(
      companiesRef,
      {
        companies: cleanList,
        updatedAt: new Date().toISOString()
      }
    );

    sharedCompaniesCache = [...cleanList];

    try {
      localStorage.setItem(
        COMPANY_STORAGE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) { }

    console.log(
      'Firebase ortak firma listesi kaydedildi:',
      cleanList
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase firma listesi kaydedilemedi:',
      err
    );

    return false;
  }
}
const COMPANY_META_KEY = 'isSurecCompanyMetaV1';
function loadCompanyMeta() { try { const raw = localStorage.getItem(COMPANY_META_KEY); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') return p; } catch (err) { } return {}; }
function saveCompanyMeta(o) { try { localStorage.setItem(COMPANY_META_KEY, JSON.stringify(o)); } catch (err) { } }
function getCompanyCreatedDate(company) {
  const meta = loadCompanyMeta();
  if (meta && meta[company] && meta[company].createdAt) return meta[company].createdAt;
  try {
    const recs = loadWork().filter((w) => w.company === company);
    if (recs.length) {
      const sorted = recs.map((r) => r.date).filter(Boolean).sort();
      if (sorted.length) return sorted[0];
    }
  } catch (err) { }
  return new Date().toISOString().slice(0, 10);
}
function formatDateTr(iso) { if (!iso) return '—'; const p = (iso || '').split('-'); if (p.length !== 3) return iso; return `${p[2]}.${p[1]}.${p[0]}`; }
function getAllowedTasks(staff) { try { if (typeof getVisibleTasks === 'function') return getVisibleTasks(staff); } catch (err) { } try { return getTaskTypes(); } catch (err) { } return []; }
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

      if (
        normName(parts[0]) === sn &&
        normName(parts[1]) === cn
      ) {
        return p[k];
      }
    }
  } catch (err) {
    console.error('Yetki kontrolünde hata:', err);
  }

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
    } catch (err) { }
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
function getCompanies() {
  let result = [];

  if (
    typeof sharedCompaniesCache !== 'undefined' &&
    Array.isArray(sharedCompaniesCache) &&
    sharedCompaniesCache.length
  ) {
    result = [...sharedCompaniesCache];
  } else {
    result = loadCompanies();
  }

  console.log('GET COMPANIES TEST:', result);

  return result;
}

function getAccess() { return loadAccess(); }
function isAdminUser() { return currentUser && currentUser.title === 'Yönetici'; }
let companies = Array.isArray(sharedCompaniesCache)
  ? [...sharedCompaniesCache]
  : loadCompanies();
let staffCompanyAccess = loadAccess();
function refreshCompanyCache() { companies = loadCompanies(); staffCompanyAccess = loadAccess(); }
const PLAN_STORAGE_KEY = 'isSurecPlanlarV1';
const PLAN_FIREBASE_COLLECTION = 'settings';
const PLAN_FIREBASE_DOC = 'plans';

let sharedPlansCache = null;

async function loadSharedPlansFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      console.error(
        'Firebase plan bağlantısı hazır değil.'
      );
      return false;
    }

    const ref = window.firebaseDoc(
      window.firebaseDb,
      PLAN_FIREBASE_COLLECTION,
      PLAN_FIREBASE_DOC
    );

    const snapshot =
      await window.firebaseGetDoc(ref);

    if (!snapshot.exists()) {
      sharedPlansCache = [];
      return true;
    }

    const data = snapshot.data();

    const plans =
      Array.isArray(data.plans)
        ? data.plans
        : [];

    sharedPlansCache = [...plans];

    console.log(
      'Ortak planlar Firebase\'den yüklendi:',
      sharedPlansCache
    );

    return true;

  } catch (err) {
    console.error(
      'Ortak planlar Firebase\'den okunamadı:',
      err
    );

    sharedPlansCache = [];

    return false;
  }
}


async function saveSharedPlansToFirebase(list) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      console.error(
        'Firebase plan bağlantısı hazır değil.'
      );
      return false;
    }

    const cleanList =
      Array.isArray(list)
        ? list
        : [];

    const ref = window.firebaseDoc(
      window.firebaseDb,
      PLAN_FIREBASE_COLLECTION,
      PLAN_FIREBASE_DOC
    );

    await window.firebaseSetDoc(
      ref,
      {
        plans: cleanList,
        updatedAt:
          new Date().toISOString()
      }
    );

    sharedPlansCache =
      [...cleanList];

    console.log(
      'Ortak planlar Firebase\'e kaydedildi:',
      sharedPlansCache
    );

    return true;

  } catch (err) {
    console.error(
      'Ortak planlar Firebase\'e kaydedilemedi:',
      err
    );

    return false;
  }
}
function loadPlans() {
  if (
    typeof sharedPlansCache !== 'undefined' &&
    Array.isArray(sharedPlansCache)
  ) {
    return [...sharedPlansCache];
  }

  try {
    const raw =
      localStorage.getItem(
        PLAN_STORAGE_KEY
      );

    const p =
      raw
        ? JSON.parse(raw)
        : [];

    if (Array.isArray(p)) {
      return p;
    }

  } catch (err) { }

  return [];
}

function savePlans(list) {
  try {
    const cleanList =
      Array.isArray(list)
        ? [...list]
        : [];

    localStorage.setItem(
      PLAN_STORAGE_KEY,
      JSON.stringify(cleanList)
    );

    sharedPlansCache =
      [...cleanList];

    return true;

  } catch (err) {

    console.error(
      'Planlar yerel olarak kaydedilemedi:',
      err
    );

    return false;
  }
}

function getMyPlans() {
  const me =
    currentUser
      ? currentUser.name
      : '';

  return loadPlans().filter(
    (p) =>
      p.staff === me
  );
}
const TASK_TYPE_KEY = 'isSurecTaskTypesV1';

const DEFAULT_TASKS = [
  'Sevk tanımlandı',
  'Evrak yüklendi'
];

const TASK_TYPE_FIREBASE_COLLECTION = 'settings';
const TASK_TYPE_FIREBASE_DOC = 'taskTypes';

let sharedTaskTypesCache = null;

function loadTaskTypes() {
  if (
    Array.isArray(sharedTaskTypesCache) &&
    sharedTaskTypesCache.length
  ) {
    return [...sharedTaskTypesCache];
  }

  try {
    const raw = localStorage.getItem(TASK_TYPE_KEY);
    const p = raw ? JSON.parse(raw) : null;

    if (Array.isArray(p) && p.length) {
      return p.filter(
        (t) =>
          typeof t === 'string' &&
          t.trim()
      );
    }
  } catch (err) { }

  return [...DEFAULT_TASKS];
}
function saveTaskTypes(list) {
  try {
    const cleanList = Array.from(
      new Set(
        (Array.isArray(list) ? list : [])
          .filter((t) => typeof t === 'string')
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );

    localStorage.setItem(
      TASK_TYPE_KEY,
      JSON.stringify(cleanList)
    );

    sharedTaskTypesCache = [...cleanList];

    return true;
  } catch (err) {
    console.error('İş türleri kaydedilemedi:', err);
    return false;
  }
}

function getTaskTypes() {
  return loadTaskTypes();
}

async function loadSharedTaskTypesFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      return false;
    }

    const taskTypesRef = window.firebaseDoc(
      window.firebaseDb,
      TASK_TYPE_FIREBASE_COLLECTION,
      TASK_TYPE_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(taskTypesRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data();

    if (!Array.isArray(data.taskTypes)) {
      return false;
    }

    const cleanList = Array.from(
      new Set(
        data.taskTypes
          .filter((t) => typeof t === 'string')
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );

    if (!cleanList.length) {
      return false;
    }

    sharedTaskTypesCache = [...cleanList];

    try {
      localStorage.setItem(
        TASK_TYPE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) {}

    console.log(
      'Firebase ortak iş türleri yüklendi:',
      cleanList
    );

    return true;
  } catch (err) {
    console.error('Firebase iş türleri okunamadı:', err);
    return false;
  }
}

async function saveSharedTaskTypesToFirebase(list) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      return false;
    }

    const cleanList = Array.from(
      new Set(
        (Array.isArray(list) ? list : [])
          .filter((t) => typeof t === 'string')
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );

    const taskTypesRef = window.firebaseDoc(
      window.firebaseDb,
      TASK_TYPE_FIREBASE_COLLECTION,
      TASK_TYPE_FIREBASE_DOC
    );

    await window.firebaseSetDoc(taskTypesRef, {
      taskTypes: cleanList,
      updatedAt: new Date().toISOString()
    });

    sharedTaskTypesCache = [...cleanList];

    try {
      localStorage.setItem(
        TASK_TYPE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) {}

    console.log(
      'Firebase ortak iş türleri kaydedildi:',
      cleanList
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase iş türleri kaydedilemedi:',
      err
    );
    return false;
  }
}

function listenSharedTaskTypesFromFirebase() {
  if (
    !window.firebaseDb ||
    !window.firebaseDoc ||
    !window.firebaseOnSnapshot
  ) {
    console.error(
      'Firebase canlı iş türleri bağlantısı hazır değil.'
    );
    return null;
  }

  const taskTypesRef = window.firebaseDoc(
    window.firebaseDb,
    TASK_TYPE_FIREBASE_COLLECTION,
    TASK_TYPE_FIREBASE_DOC
  );

  const unsubscribe = window.firebaseOnSnapshot(
    taskTypesRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data();

      if (!Array.isArray(data.taskTypes)) {
        return;
      }

      const cleanList = Array.from(
        new Set(
          data.taskTypes
            .filter((t) => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );

      sharedTaskTypesCache = [...cleanList];

      try {
        localStorage.setItem(
          TASK_TYPE_KEY,
          JSON.stringify(cleanList)
        );
      } catch (err) {}

      console.log(
        'Firebase canlı iş türleri güncellendi:',
        cleanList
      );

      const activePage = document.querySelector(
        '.nav-item.active'
      );

      // Yetki kaydı sırasında ekranın yeniden çizilmesini önle.
      if (
        !window._savingPermissionMatrix &&
        activePage &&
        (
          activePage.textContent.includes('Yıl / Dönem Yönetimi') ||
          activePage.textContent.includes('Yetkilendirme')
        )
      ) {
        renderDashboard(
          window._lastPage || 'Yönetim Paneli'
        );
      }
    },
    (error) => {
      console.error(
        'Firebase canlı iş türleri dinleyicisi çalışmadı:',
        error
      );
    }
  );

  return unsubscribe;
}

const TASK_PERM_KEY = 'isSurecTaskPermsV1';

const TASK_PERM_FIREBASE_COLLECTION = 'settings';
const TASK_PERM_FIREBASE_DOC = 'taskPermissions';
const PERMISSION_MATRIX_FIREBASE_COLLECTION = 'settings';
const PERMISSION_MATRIX_FIREBASE_DOC = 'permissionMatrix';

let sharedPermissionMatrixCache = null;

async function loadPermissionMatrixFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      throw new Error(
        'Firebase bağlantısı veya okuma fonksiyonları hazır değil.'
      );
    }

    const ref = window.firebaseDoc(
      window.firebaseDb,
      PERMISSION_MATRIX_FIREBASE_COLLECTION,
      PERMISSION_MATRIX_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(ref);

    if (!snapshot.exists()) {
      sharedPermissionMatrixCache = {};

      console.warn('Firebase yetki belgesi bulunamadı.');

      return {};
    }

    const data = snapshot.data();

    if (
      !data ||
      !data.permissions ||
      typeof data.permissions !== 'object' ||
      Array.isArray(data.permissions)
    ) {
      throw new Error(
        'Firebase içindeki yetki verisinin biçimi geçersiz.'
      );
    }

    sharedPermissionMatrixCache = JSON.parse(
      JSON.stringify(data.permissions)
    );

    console.log(
      'Firebase yetki matrisi başarıyla yüklendi:',
      sharedPermissionMatrixCache
    );

    return sharedPermissionMatrixCache;
  } catch (err) {
    console.error(
      'Firebase yetki matrisi okunamadı:',
      err
    );

    throw err;
  }
}

async function savePermissionMatrixToFirebase(matrix) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      throw new Error(
        'Firebase bağlantısı veya kayıt fonksiyonları hazır değil.'
      );
    }

    if (
      !matrix ||
      typeof matrix !== 'object' ||
      Array.isArray(matrix)
    ) {
      throw new Error(
        'Kaydedilecek yetki matrisi geçersiz.'
      );
    }

    const permissionsCopy = JSON.parse(
      JSON.stringify(matrix)
    );

    const ref = window.firebaseDoc(
      window.firebaseDb,
      PERMISSION_MATRIX_FIREBASE_COLLECTION,
      PERMISSION_MATRIX_FIREBASE_DOC
    );

    await window.firebaseSetDoc(ref, {
      permissions: permissionsCopy,
      updatedAt: new Date().toISOString()
    });

    sharedPermissionMatrixCache = permissionsCopy;

    console.log(
      'Firebase yetki matrisi başarıyla kaydedildi:',
      sharedPermissionMatrixCache
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase yetki matrisi kaydedilemedi:',
      err
    );

    return false;
  }
}

let sharedTaskPermsCache = null;

function loadTaskPerms() {
  if (
    sharedTaskPermsCache &&
    typeof sharedTaskPermsCache === 'object'
  ) {
    return { ...sharedTaskPermsCache };
  }

  try {
    const raw = localStorage.getItem(TASK_PERM_KEY);
    const p = raw ? JSON.parse(raw) : null;

    if (p && typeof p === 'object') {
      return p;
    }
  } catch (err) {}

  return {};
}

function saveTaskPerms(o) {
  try {
    const cleanPerms = {};

    Object.entries(o || {}).forEach(([staff, tasks]) => {
      if (
        typeof staff !== 'string' ||
        !staff.trim() ||
        !Array.isArray(tasks)
      ) {
        return;
      }

      cleanPerms[staff] = Array.from(
        new Set(
          tasks
            .filter((t) => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );
    });

    localStorage.setItem(
      TASK_PERM_KEY,
      JSON.stringify(cleanPerms)
    );

    sharedTaskPermsCache = { ...cleanPerms };

    return true;
  } catch (err) {
    console.error(
      'İş türü yetkileri kaydedilemedi:',
      err
    );

    return false;
  }
}

async function loadSharedTaskPermsFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      return false;
    }

    const taskPermRef = window.firebaseDoc(
      window.firebaseDb,
      TASK_PERM_FIREBASE_COLLECTION,
      TASK_PERM_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(taskPermRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data();

    if (
      !data.taskPermissions ||
      typeof data.taskPermissions !== 'object'
    ) {
      return false;
    }

    sharedTaskPermsCache = {
      ...data.taskPermissions
    };

    try {
      localStorage.setItem(
        TASK_PERM_KEY,
        JSON.stringify(sharedTaskPermsCache)
      );
    } catch (err) {}

    console.log(
      'Firebase ortak iş türü yetkileri yüklendi:',
      sharedTaskPermsCache
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase iş türü yetkileri okunamadı:',
      err
    );

    return false;
  }
}

async function saveSharedTaskPermsToFirebase(o) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      return false;
    }

    const cleanPerms = {};

    Object.entries(o || {}).forEach(([staff, tasks]) => {
      if (
        typeof staff !== 'string' ||
        !staff.trim() ||
        !Array.isArray(tasks)
      ) {
        return;
      }

      cleanPerms[staff] = Array.from(
        new Set(
          tasks
            .filter((t) => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );
    });

    const taskPermRef = window.firebaseDoc(
      window.firebaseDb,
      TASK_PERM_FIREBASE_COLLECTION,
      TASK_PERM_FIREBASE_DOC
    );

    await window.firebaseSetDoc(taskPermRef, {
      taskPermissions: cleanPerms,
      updatedAt: new Date().toISOString()
    });

    sharedTaskPermsCache = { ...cleanPerms };

    try {
      localStorage.setItem(
        TASK_PERM_KEY,
        JSON.stringify(cleanPerms)
      );
    } catch (err) {}

    console.log(
      'Firebase ortak iş türü yetkileri kaydedildi:',
      cleanPerms
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase iş türü yetkileri kaydedilemedi:',
      err
    );

    return false;
  }
}

function listenSharedTaskPermsFromFirebase() {
  if (
    !window.firebaseDb ||
    !window.firebaseDoc ||
    !window.firebaseOnSnapshot
  ) {
    console.error(
      'Firebase canlı iş türü yetkileri bağlantısı hazır değil.'
    );
    return null;
  }

  const taskPermRef = window.firebaseDoc(
    window.firebaseDb,
    TASK_PERM_FIREBASE_COLLECTION,
    TASK_PERM_FIREBASE_DOC
  );

  const unsubscribe = window.firebaseOnSnapshot(
    taskPermRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data();

      if (
        !data.taskPermissions ||
        typeof data.taskPermissions !== 'object'
      ) {
        return;
      }

      const cleanPerms = {};

      Object.entries(data.taskPermissions).forEach(
        ([staff, tasks]) => {
          if (
            typeof staff !== 'string' ||
            !staff.trim() ||
            !Array.isArray(tasks)
          ) {
            return;
          }

          cleanPerms[staff] = Array.from(
            new Set(
              tasks
                .filter((t) => typeof t === 'string')
                .map((t) => t.trim())
                .filter(Boolean)
            )
          );
        }
      );

      sharedTaskPermsCache = { ...cleanPerms };

      try {
        localStorage.setItem(
          TASK_PERM_KEY,
          JSON.stringify(cleanPerms)
        );
      } catch (err) {}

      console.log(
        'Firebase canlı iş türü yetkileri güncellendi:',
        cleanPerms
      );

      const activePage = document.querySelector(
        '.nav-item.active'
      );

      // Yetki kaydı sırasında ekranın yeniden çizilmesini önle.
      if (
        !window._savingPermissionMatrix &&
        activePage &&
        (
          activePage.textContent.includes('Yetkilendirme') ||
          activePage.textContent.includes('İş Takip')
        )
      ) {
        renderDashboard(
          window._lastPage || 'Yönetim Paneli'
        );
      }
    },
    (error) => {
      console.error(
        'Firebase canlı iş türü yetkileri dinleyicisi çalışmadı:',
        error
      );
    }
  );

  return unsubscribe;
}

function getVisibleTasks(staff) {
  const p = loadTaskPerms();
  const v = p[staff];

  if (!Array.isArray(v)) {
    return getTaskTypes();
  }

  return getTaskTypes().filter((t) => v.includes(t));
}

const dailyTasks = [
  'Sevk tanımlandı',
  'Evrak yüklendi'
];

// Tarih bazlı iş takip kayıtları (personel + firma + tarih üçlüsüne özel).
// localStorage'da saklanır: { "PERSONEL || FİRMA || YYYY-MM-DD": { tasks: [bool], updatedAt: iso } }
// Böylece farklı tarihlerdeki işlemler birbirinden ayrı tutulur.
const WORK_STORAGE_KEY = 'isSurecIsTakipV1';
const DASH_PANEL_KEY = 'isTakipPanelAcik';
const LAST_WORK_KEY = 'isSurecLastWorkDateV1';

function rememberLastWorkDate(d) {
  try {
    if (d) {
      localStorage.setItem(LAST_WORK_KEY, d);
    }
  } catch (err) {}
}

function getLastWorkDate(f) {
  try {
    const v = localStorage.getItem(LAST_WORK_KEY);

    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return v;
    }
  } catch (err) {}

  return f;
}

function loadWorkStore() {
  try {
    const raw = localStorage.getItem(WORK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return parsed && typeof parsed === 'object'
      ? parsed
      : {};
  } catch (err) {
    return {};
  }
}

function saveWorkStore(store) {
  try {
    localStorage.setItem(
      WORK_STORAGE_KEY,
      JSON.stringify(store)
    );
  } catch (err) {
    // Depolama doluysa sessiz geç.
  }
}

function getWorkKey(staff, company, date) {
  return `${company} || ${date}`;
}

async function getWorkRecord(staff, company, date) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      console.error('Firebase bağlantısı hazır değil.');
      return null;
    }

    const recordKey = getWorkKey(staff, company, date);

    const workRef = window.firebaseDoc(
      window.firebaseDb,
      window.firebaseWorkRecordCollection || 'workRecords',
      recordKey
    );

    const snapshot = await window.firebaseGetDoc(workRef);

    if (!snapshot.exists()) {
      return null;
    }

    const record = snapshot.data();

    if (!Array.isArray(record.tasks)) {
      return null;
    }

    console.log(
      'Firebase firma bazlı günlük iş kaydı yüklendi:',
      recordKey,
      record
    );

    return record;
  } catch (err) {
    console.error(
      'Firebase günlük iş kaydı okunamadı:',
      err
    );

    return null;
  }
}
async function saveWorkRecord(
  staff,
  company,
  date,
  tasks,
  byName,
  quantitiesByName
) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      console.error('Firebase bağlantısı hazır değil.');
      return false;
    }

    const recordKey = getWorkKey(
      staff,
      company,
      date
    );

    const record = {
      company: company,
      date: date,
      tasks: tasks.slice(0, getTaskTypes().length),
      tasksByName: byName || {},
      updatedAt: new Date().toISOString(),
      updatedBy: staff
    };

    if (
      quantitiesByName !== undefined &&
      quantitiesByName !== null &&
      typeof quantitiesByName === 'object' &&
      !Array.isArray(quantitiesByName)
    ) {
      record.quantitiesByName = quantitiesByName;
    }

    const workRef = window.firebaseDoc(
      window.firebaseDb,
      window.firebaseWorkRecordCollection || 'workRecords',
      recordKey
    );

    await window.firebaseSetDoc(
      workRef,
      record,
      { merge: true }
    );

    console.log(
      'Firebase günlük iş kaydı kaydedildi:',
      recordKey,
      record
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase günlük iş kaydı kaydedilemedi:',
      err
    );

    return false;
  }
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
function loadUserNames() { try { const raw = localStorage.getItem(USER_NAME_KEY); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') return p; } catch (err) { } return {}; }
function saveUserNames(o) { try { localStorage.setItem(USER_NAME_KEY, JSON.stringify(o)); } catch (err) { } }
function resolveUserName(u) { const m = loadUserNames(); return (m && m[u.email]) || u.name; }

let currentUser = null;

const QUESTION_KEY = 'isSurecQuestionsV1';
function loadQuestions() { try { const raw = localStorage.getItem(QUESTION_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p)) return p; } catch (err) { } return []; }
function saveQuestions(list) { try { localStorage.setItem(QUESTION_KEY, JSON.stringify(list)); } catch (err) { } }
function getVisibleQuestions() {
  const me = currentUser ? currentUser.name : '';
  const all = loadQuestions();
  if (isAdminUser()) return all;
  return all.filter((q) => q.from === me || q.to === me);
}

const NOTE_KEY = 'isSurecNotesV1';
function loadNotes() { try { const raw = localStorage.getItem(NOTE_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p)) return p; } catch (err) { } return []; }
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
  } catch (err) { try { localStorage.removeItem(AVATAR_KEY); } catch (e2) { } }
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
function loadPerms() {
  if (
    typeof sharedPermsCache !== 'undefined' &&
    sharedPermsCache &&
    typeof sharedPermsCache === 'object'
  ) {
    return { ...sharedPermsCache };
  }

  try {
    const raw = localStorage.getItem(PERM_KEY);
    const p = raw ? JSON.parse(raw) : null;

    if (p && typeof p === 'object') {
      return p;
    }
  } catch (err) { }

  return {};
}
function savePerms(o) { try { localStorage.setItem(PERM_KEY, JSON.stringify(o)); } catch (err) { } }
const PERM_FIREBASE_COLLECTION = 'settings';
const PERM_FIREBASE_DOC = 'permissions';

let sharedPermsCache = null;

async function loadSharedPermsFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      return false;
    }

    const permsRef = window.firebaseDoc(
      window.firebaseDb,
      PERM_FIREBASE_COLLECTION,
      PERM_FIREBASE_DOC
    );

    const snapshot = await window.firebaseGetDoc(permsRef);

    if (!snapshot.exists()) {
      return false;
    }

    const data = snapshot.data();

    if (!data.permissions || typeof data.permissions !== 'object') {
      return false;
    }

    sharedPermsCache = { ...data.permissions };

    try {
      localStorage.setItem(
        PERM_KEY,
        JSON.stringify(sharedPermsCache)
      );
    } catch (err) { }

    console.log(
      'Firebase ortak yetkiler yüklendi:',
      sharedPermsCache
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase yetkileri okunamadı:',
      err
    );

    return false;
  }
}

async function saveSharedPermsToFirebase(obj) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      return false;
    }

    const cleanPerms = {};

    Object.entries(obj || {}).forEach(([key, value]) => {
      if (
        typeof key !== 'string' ||
        !key.trim()
      ) {
        return;
      }

      if (
        value !== 'islem' &&
        value !== 'gor' &&
        value !== 'yok'
      ) {
        return;
      }

      cleanPerms[key] = value;
    });

    const permsRef = window.firebaseDoc(
      window.firebaseDb,
      PERM_FIREBASE_COLLECTION,
      PERM_FIREBASE_DOC
    );

    await window.firebaseSetDoc(
      permsRef,
      {
        permissions: cleanPerms,
        updatedAt: new Date().toISOString()
      }
    );

    sharedPermsCache = { ...cleanPerms };

    try {
      localStorage.setItem(
        PERM_KEY,
        JSON.stringify(cleanPerms)
      );
    } catch (err) { }

    console.log(
      'Firebase ortak yetkiler kaydedildi:',
      cleanPerms
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase yetkileri kaydedilemedi:',
      err
    );

    return false;
  }
}

function listenSharedPermsFromFirebase() {
  if (
    !window.firebaseDb ||
    !window.firebaseDoc ||
    !window.firebaseOnSnapshot
  ) {
    console.error(
      'Firebase canlı yetki bağlantısı hazır değil.'
    );
    return null;
  }

  const permsRef = window.firebaseDoc(
    window.firebaseDb,
    PERM_FIREBASE_COLLECTION,
    PERM_FIREBASE_DOC
  );

  const unsubscribe = window.firebaseOnSnapshot(
    permsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data();

      if (
        !data.permissions ||
        typeof data.permissions !== 'object'
      ) {
        return;
      }

      const cleanPerms = {};

      Object.entries(data.permissions).forEach(
        ([key, value]) => {
          if (
            typeof key !== 'string' ||
            !key.trim()
          ) {
            return;
          }

          if (
            value !== 'islem' &&
            value !== 'gor' &&
            value !== 'yok'
          ) {
            return;
          }

          cleanPerms[key] = value;
        }
      );

      sharedPermsCache = { ...cleanPerms };

      try {
        localStorage.setItem(
          PERM_KEY,
          JSON.stringify(cleanPerms)
        );
      } catch (err) {}

      console.log(
        'Firebase canlı yetkiler güncellendi:',
        cleanPerms
      );

      const activePage = document.querySelector(
        '.nav-item.active'
      );

      // Yetki kaydı devam ederken ekranı yeniden oluşturma.
      if (
        !window._savingPermissionMatrix &&
        activePage &&
        activePage.textContent.includes('Yetkilendirme')
      ) {
        renderDashboard('Yetkilendirme');
      }
    },
    (error) => {
      console.error(
        'Firebase canlı yetki dinleyicisi çalışmadı:',
        error
      );
    }
  );

  return unsubscribe;
}

function getPerm(staff, company) { const p = loadPerms(); const v = p[`${staff} || ${company}`]; return v === 'islem' ? 'islem' : v === 'gor' ? 'gor' : 'yok'; }
function canView(staff, company) {
  const v = getPermRecord(staff, company);

  console.log(
    'CAN VIEW TEST:',
    'personel =', staff,
    '| firma =', company,
    '| yetki =', v
  );

  return v === 'islem' || v === 'gor';
}
function canEdit(staff, company) { return getPermRecord(staff, company) === 'islem'; }
function renderAccessMatrixContent() {
  if (!isAdminUser()) {
    return '<div class="permission-empty">Bu panel yalnızca yöneticilere açıktır.</div>';
  }

  const firms = getCompanies();

  const people = Array.from(
    new Set([
      ...getStaff(),
      ...(currentUser && currentUser.name
        ? [currentUser.name]
        : [])
    ])
  );

  const focusStaff =
    window._permFocus ||
    people[0] ||
    '';

  return `
    <div class="page-heading">
      <div>
        <h1>Yetkilendirme</h1>
        <p>Personel seçin, firma ve görev yetkilerini tek ekrandan yönetin.</p>
      </div>
      <span class="access-badge">Yönetici</span>
    </div>

    ${renderAnnouncementPermissions()}

    <!-- PERSONEL SEÇİMİ -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Personel Yetkileri</h2>
          <p class="panel-subtitle">
            Yetkilerini düzenlemek istediğiniz personeli seçin.
          </p>
        </div>
      </div>

      <form id="perm-focus-form" class="work-form" style="grid-template-columns:1fr auto">
        <label class="field">
          Personel
          <select name="staff" id="perm-focus-staff">
            ${people.map((s) =>
    `<option${s === focusStaff ? ' selected' : ''}>${s}</option>`
  ).join('')}
          </select>
        </label>

        <button class="primary-btn work-submit" type="submit">
          Göster
        </button>
      </form>
    </section>

    <!-- FİRMA YETKİLERİ -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Firma Yetkileri</h2>
          <p class="panel-subtitle">
            Personelin görebileceği firmaları seçin.
          </p>
        </div>
      </div>

      <div class="task-content">
        ${firms.length
      ? firms.map((company) => `
              <label class="task-row">
                <input
                  type="checkbox"
                  class="company-permission-check"
                  data-company="${company}"
                />
                <span class="task-box"></span>
                <span class="task-name">
                  <strong>${company}</strong>
                  <small>Firmayı görmesine izin ver</small>
                </span>
              </label>
            `).join('')
      : `
              <div class="permission-empty">
                <span class="permission-icon">!</span>
                <div>
                  <strong>Henüz firma bulunmuyor.</strong>
                  <p>Önce Firma Yönetimi bölümünden firma ekleyin.</p>
                </div>
              </div>
            `
    }
      </div>
    </section>

    <!-- İŞ TÜRÜ YETKİLERİ -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>İş Türü Yetkileri</h2>
          <p class="panel-subtitle">
            Her firma için personelin hangi görevleri görebileceğini ve
            hangi görevlerde işlem yapabileceğini belirleyin.
          </p>
        </div>
      </div>

      ${firms.length
      ? firms.map((company) => `
            <div
              class="panel"
              style="margin:16px 0 0;border:1px solid var(--border-color,#e5e7eb);"
            >
              <div class="panel-header">
                <div>
                  <h3>${company}</h3>
                </div>
              </div>

              <div class="task-content">
                <div
                  class="task-row"
                  style="cursor:default;font-weight:600;"
                >
                  <span
                    class="task-name"
                    style="flex:1;"
                  >
                    İş türü
                  </span>

                  <span
                    style="width:70px;text-align:center;"
                  >
                    Gör
                  </span>

                  <span
                    style="width:70px;text-align:center;"
                  >
                    İşlem
                  </span>
                </div>

                ${getTaskTypes().length
          ? getTaskTypes().map((task) => `
                      <div
                        class="task-row"
                        style="cursor:default;"
                      >
                        <span
                          class="task-name"
                          style="flex:1;"
                        >
                          <strong>${task}</strong>
                        </span>

                        <span
                          style="width:70px;text-align:center;"
                        >
                          <input
                            type="checkbox"
                            class="task-view-check"
                            data-company="${company}"
                            data-task="${task}"
                            title="Görevi görsün"
                          />
                        </span>

                        <span
                          style="width:70px;text-align:center;"
                        >
                          <input
                            type="checkbox"
                            class="task-edit-check"
                            data-company="${company}"
                            data-task="${task}"
                            title="Görev üzerinde işlem yapabilsin"
                          />
                        </span>
                      </div>
                    `).join('')
          : `
                      <div class="permission-empty">
                        Henüz iş türü tanımlanmadı.
                      </div>
                    `
        }
              </div>
            </div>
          `).join('')
      : ''
    }
    </section>

    <!-- DUYURU YETKİLERİ -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Duyuru Yetkileri</h2>
          <p class="panel-subtitle">
            Personelin duyurularla ilgili yetkilerini belirleyin.
          </p>
        </div>
      </div>

      <div class="task-content">

        <label class="task-row">
          <input
            type="checkbox"
            class="announcement-permission-check"
            data-permission="view"
          />
          <span class="task-box"></span>
          <span class="task-name">
            <strong>Duyuruları görsün</strong>
          </span>
        </label>

        <label class="task-row">
          <input
            type="checkbox"
            class="announcement-permission-check"
            data-permission="create"
          />
          <span class="task-box"></span>
          <span class="task-name">
            <strong>Duyuru oluştursun</strong>
          </span>
        </label>

        <label class="task-row">
          <input
            type="checkbox"
            class="announcement-permission-check"
            data-permission="edit"
          />
          <span class="task-box"></span>
          <span class="task-name">
            <strong>Duyuru düzenlesin</strong>
          </span>
        </label>

        <label class="task-row">
          <input
            type="checkbox"
            class="announcement-permission-check"
            data-permission="delete"
          />
          <span class="task-box"></span>
          <span class="task-name">
            <strong>Duyuru silsin</strong>
          </span>
        </label>

      </div>
    </section>

    <!-- İŞ TÜRÜ YÖNETİMİ -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>İş Türleri</h2>
          <p class="panel-subtitle">
            Sistemde kullanılacak yeni iş türlerini buradan ekleyin veya silin.
          </p>
        </div>
      </div>

      <form
        id="tasktype-form"
        class="work-form"
        style="grid-template-columns:1fr auto"
      >
        <label class="field">
          İş türü
          <input
            type="text"
            name="taskName"
            placeholder="Örn: Fatura kesildi"
            required
          />
        </label>

        <button
          class="primary-btn work-submit"
          type="submit"
        >
          Ekle
        </button>
      </form>

      <div class="task-content">
        ${getTaskTypes().map((task) => `
            <div
              class="task-row"
              style="cursor:default"
            >
              <span
                class="task-box"
                style="border-radius:50%"
              >
                ✓
              </span>

              <span class="task-name">
                <strong>${task}</strong>
              </span>

              <button
                type="button"
                class="primary-btn work-submit"
                data-del-task="${task}"
                style="margin-left:auto;min-width:80px;background:#b5443c;"
              >
                Sil
              </button>
            </div>
          `).join('')
    }
      </div>

      <div class="save-row">
        <span
          class="save-status"
          id="perm-save-status"
        ></span>
      </div>
    </section>

    <!-- KAYDET -->
<section class="panel">
  <div class="save-row">
    <span
      class="save-status"
      id="permission-matrix-status"
      role="status"
      aria-live="polite"
      style="display: inline-block; min-width: 220px; white-space: normal;"
    ></span>

    <button
      type="button"
      class="primary-btn work-submit"
      id="permission-matrix-save"
    >
      Yetkileri Kaydet
    </button>
  </div>
</section>
`;
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
        } catch (err) { }
        m0[c] = { createdAt: d };
        changed0 = true;
      }
    });
    if (changed0) saveCompanyMeta(m0);
  } catch (err) { }
  const form = document.querySelector('#company-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
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

    const firebaseCompanySaved = await saveSharedCompaniesToFirebase(list);

    if (!firebaseCompanySaved) {
      if (st) {
        st.textContent =
          "Firma bilgisayardaki listede oluşturuldu ancak Firebase ortak listesine kaydedilemedi.";
      }
      return;
    }

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
} function setupAccessMatrix() {
  if (!isAdminUser()) return;

  const staffSelect =
    document.querySelector('#perm-focus-staff');

  const saveBtn =
    document.querySelector('#permission-matrix-save');

  const status =
    document.querySelector('#permission-matrix-status');

  if (!staffSelect || !saveBtn) return;

  function getSelectedStaff() {
    return staffSelect.value;
  }

  /*
   * ---------------------------------------------------------
   * FİRMA YETKİLERİNİ YÜKLE
   * ---------------------------------------------------------
   */

  function loadCompanyChecks() {
    const staff = getSelectedStaff();
    const perms = loadPerms();

    document
      .querySelectorAll('.company-permission-check')
      .forEach((checkbox) => {
        const company =
          checkbox.dataset.company;

        const key =
          `${staff} || ${company}`;

        const value =
          perms[key];

        checkbox.checked =
          value === 'islem' ||
          value === 'gor';
      });
  }

  /*
   * ---------------------------------------------------------
   * YENİ YETKİ MATRİSİNİ FIREBASE'DEN OKU
   *
   * Yapı:
   *
   * permissionMatrix
   *   Semih Aydın
   *     companies
   *       Artemis Teknoloji A.Ş. : true
   *
   *     tasks
   *       Artemis Teknoloji A.Ş.
   *         Sevk tanımlandı : "gor"
   *         Fatura Kesildi  : "islem"
   *         Mutabakat       : "yok"
   * ---------------------------------------------------------
   */

  async function loadTaskMatrix() {
    try {
      return await loadPermissionMatrixFromFirebase();
    } catch (err) {
      console.error(
        'Yeni iş türü yetki matrisi okunamadı:',
        err
      );

      return {};
    }
  }

  /*
   * ---------------------------------------------------------
   * İŞ TÜRÜ CHECKBOX'LARINI DOLDUR
   * ---------------------------------------------------------
   */

  async function loadTaskChecks() {
    const staff =
      getSelectedStaff();

    const matrix =
      await loadTaskMatrix();

    const staffMatrix =
      matrix[staff] || {};

    const taskMatrix =
      staffMatrix.tasks || {};

    document
      .querySelectorAll('.task-view-check')
      .forEach((checkbox) => {
        const company =
          checkbox.dataset.company;

        const task =
          checkbox.dataset.task;

        const value =
          taskMatrix?.[company]?.[task];

        checkbox.checked =
          value === 'gor' ||
          value === 'islem';
      });

    document
      .querySelectorAll('.task-edit-check')
      .forEach((checkbox) => {
        const company =
          checkbox.dataset.company;

        const task =
          checkbox.dataset.task;

        const value =
          taskMatrix?.[company]?.[task];

        checkbox.checked =
          value === 'islem';
      });

    /*
     * İşlem seçiliyse Gör de seçili olmalı.
     */

    document
      .querySelectorAll('.task-edit-check')
      .forEach((editCheckbox) => {
        const company =
          editCheckbox.dataset.company;

        const task =
          editCheckbox.dataset.task;

        const viewCheckbox =
          document.querySelector(
            `.task-view-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
          );

        if (
          editCheckbox.checked &&
          viewCheckbox
        ) {
          viewCheckbox.checked = true;
        }
      });
  }

  /*
   * ---------------------------------------------------------
   * GÖR / İŞLEM İLİŞKİSİ
   * ---------------------------------------------------------
   */

  document
    .querySelectorAll('.task-edit-check')
    .forEach((checkbox) => {
      checkbox.addEventListener(
        'change',
        () => {
          const company =
            checkbox.dataset.company;

          const task =
            checkbox.dataset.task;

          const viewCheckbox =
            document.querySelector(
              `.task-view-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
            );

          if (!viewCheckbox) return;

          /*
           * İşlem seçilirse Gör otomatik seçilir.
           */

          if (checkbox.checked) {
            viewCheckbox.checked = true;
          }
        }
      );
    });

  /*
   * ---------------------------------------------------------
   * GÖR KALDIRILIRSA İŞLEM DE KALDIRILSIN
   * ---------------------------------------------------------
   */

  document
    .querySelectorAll('.task-view-check')
    .forEach((checkbox) => {
      checkbox.addEventListener(
        'change',
        () => {
          if (checkbox.checked) return;

          const company =
            checkbox.dataset.company;

          const task =
            checkbox.dataset.task;

          const editCheckbox =
            document.querySelector(
              `.task-edit-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
            );

          if (editCheckbox) {
            editCheckbox.checked = false;
          }
        }
      );
    });

  /*
   * ---------------------------------------------------------
   * PERSONEL DEĞİŞTİRME
   * ---------------------------------------------------------
   */

  staffSelect.addEventListener(
    'change',
    async () => {
      window._permFocus =
        getSelectedStaff();

      loadCompanyChecks();

      await loadTaskChecks();
    }
  );

  /*
   * ---------------------------------------------------------
   * GÖSTER BUTONU
   * ---------------------------------------------------------
   */

  const focusForm =
    document.querySelector(
      '#perm-focus-form'
    );

  if (focusForm) {
    focusForm.addEventListener(
      'submit',
      async (e) => {
        e.preventDefault();

        window._permFocus =
          getSelectedStaff();

        loadCompanyChecks();

        await loadTaskChecks();
      }
    );
  }

  /*
 * ---------------------------------------------------------
 * TÜM YETKİLERİ KAYDET
 * ---------------------------------------------------------
 */

saveBtn.addEventListener(
  'click',
  async () => {
    const staff = getSelectedStaff();

    if (!staff) return;

    if (window._permissionMatrixUnlockTimer) {
      clearTimeout(window._permissionMatrixUnlockTimer);
      window._permissionMatrixUnlockTimer = null;
    }

    window._savingPermissionMatrix = true;
    saveBtn.disabled = true;

    if (status) {
      status.className = 'save-status';
      status.textContent = 'Yetkiler kaydediliyor...';
      status.style.display = 'inline-block';
    }

    let saveSucceeded = false;

    try {
      /*
       * =====================================================
       * 1. FİRMA YETKİLERİ
       * =====================================================
       */

      const companyPerms = loadPerms();

      getCompanies().forEach((company) => {
        const key = `${staff} || ${company}`;

        const checkbox = document.querySelector(
          `.company-permission-check[data-company="${CSS.escape(company)}"]`
        );

        if (!checkbox) return;

        companyPerms[key] = checkbox.checked ? 'gor' : 'yok';
      });

      const companySaved =
        await saveSharedPermsToFirebase(companyPerms);

      if (!companySaved) {
        throw new Error(
          'Firma yetkileri Firebase\'e kaydedilemedi.'
        );
      }

      /*
       * =====================================================
       * 2. YENİ YETKİ MATRİSİ
       * =====================================================
       */

      const permissionMatrix =
        await loadPermissionMatrixFromFirebase();

      if (
        !permissionMatrix[staff] ||
        typeof permissionMatrix[staff] !== 'object'
      ) {
        permissionMatrix[staff] = {};
      }

      if (
        !permissionMatrix[staff].companies ||
        typeof permissionMatrix[staff].companies !== 'object'
      ) {
        permissionMatrix[staff].companies = {};
      }

      if (
        !permissionMatrix[staff].tasks ||
        typeof permissionMatrix[staff].tasks !== 'object'
      ) {
        permissionMatrix[staff].tasks = {};
      }

      /*
       * =====================================================
       * 3. FİRMA YETKİLERİNİ MATRİSE YAZ
       * =====================================================
       */

      getCompanies().forEach((company) => {
        const companyCheckbox = document.querySelector(
          `.company-permission-check[data-company="${CSS.escape(company)}"]`
        );

        permissionMatrix[staff].companies[company] =
          companyCheckbox ? companyCheckbox.checked : false;
      });

      /*
       * =====================================================
       * 4. İŞ TÜRÜ YETKİLERİNİ MATRİSE YAZ
       * =====================================================
       */

      getCompanies().forEach((company) => {
        if (
          !permissionMatrix[staff].tasks[company] ||
          typeof permissionMatrix[staff].tasks[company] !== 'object'
        ) {
          permissionMatrix[staff].tasks[company] = {};
        }

        getTaskTypes().forEach((task) => {
          const viewCheckbox = document.querySelector(
            `.task-view-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
          );

          const editCheckbox = document.querySelector(
            `.task-edit-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
          );

          let permission = 'yok';

          if (editCheckbox && editCheckbox.checked) {
            permission = 'islem';
          } else if (viewCheckbox && viewCheckbox.checked) {
            permission = 'gor';
          }

          permissionMatrix[staff].tasks[company][task] =
            permission;
        });
      });

      /*
       * =====================================================
       * 5. YENİ MATRİSİ FIREBASE'E KAYDET
       * =====================================================
       */

      const matrixSaved =
        await savePermissionMatrixToFirebase(permissionMatrix);

      if (!matrixSaved) {
        throw new Error(
          'Yeni yetki matrisi Firebase\'e kaydedilemedi.'
        );
      }

      /*
       * =====================================================
       * 6. CACHE
       * =====================================================
       */

      sharedPermsCache = { ...companyPerms };

      try {
        localStorage.setItem(
          PERM_KEY,
          JSON.stringify(companyPerms)
        );
      } catch (err) {}

      sharedPermissionMatrixCache =
        JSON.parse(JSON.stringify(permissionMatrix));

      saveSucceeded = true;

      /*
       * =====================================================
       * 7. BAŞARILI
       * =====================================================
       */

      if (status) {
        status.className = 'save-status is-ok';
        status.textContent =
          `✓ ${staff} personelinin yetkileri kaydedildi.`;
        status.style.display = 'inline-block';
      }

      console.log(
        'Yetki kaydı tamamlandı:',
        staff
      );

    } catch (err) {
      console.error(
        'Yetki matrisi kaydedilemedi:',
        err
      );

      if (status) {
        status.className = 'save-status';
        status.textContent =
          `Yetkiler kaydedilemedi: ${err.message}`;
        status.style.display = 'inline-block';
      }

    } finally {
      saveBtn.disabled = false;

      /*
       * Firebase canlı dinleyicilerinin ekranı hemen
       * yeniden oluşturmasını engelle. Mesajın okunması
       * için kayıt sonrasında da kısa bir süre bekle.
       */

      window._permissionMatrixUnlockTimer =
        setTimeout(() => {
          window._savingPermissionMatrix = false;
          window._permissionMatrixUnlockTimer = null;
        }, 5000);
    }
  }
);

/*
 * ---------------------------------------------------------
 * İLK AÇILIŞ
 * ---------------------------------------------------------
 */

loadCompanyChecks();

loadTaskChecks();

/*
 * ---------------------------------------------------------
 * İŞ TÜRÜ SİLME
 * ---------------------------------------------------------
 */

document
  .querySelectorAll('[data-del-task]')
  .forEach((button) => {
    button.addEventListener(
      'click',
      async () => {
        const taskName = button.dataset.delTask;

        if (!taskName) return;

        const list = getTaskTypes().filter(
          (t) => t !== taskName
        );

        saveTaskTypes(list);

        const firebaseTaskSaved =
          await saveSharedTaskTypesToFirebase(list);

        if (!firebaseTaskSaved) {
          if (status) {
            status.className = 'save-status';
            status.textContent =
              'İş türü Firebase listesinden silinemedi.';
          }

          return;
        }

        /*
         * Silinen iş türünü yeni yetki matrisinden temizle.
         */

        const matrix =
          await loadPermissionMatrixFromFirebase();

        Object.keys(matrix).forEach((person) => {
          if (
            !matrix[person] ||
            typeof matrix[person] !== 'object'
          ) {
            return;
          }

          const tasks = matrix[person].tasks;

          if (
            !tasks ||
            typeof tasks !== 'object'
          ) {
            return;
          }

          Object.keys(tasks).forEach((company) => {
            if (
              tasks[company] &&
              typeof tasks[company] === 'object'
            ) {
              delete tasks[company][taskName];
            }
          });
        });

        const matrixSaved =
          await savePermissionMatrixToFirebase(matrix);

        if (!matrixSaved) {
          if (status) {
            status.className = 'save-status';
            status.textContent =
              'İş türü yetki matrisinden silinemedi.';
          }

          return;
        }

        renderDashboard('Yetkilendirme');
      }
    );
  });

/*
 * ---------------------------------------------------------
 * YENİ İŞ TÜRÜ EKLEME
 * ---------------------------------------------------------
 */

const taskForm = document.querySelector('#tasktype-form');

if (taskForm) {
  taskForm.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();

      const value = (
        new FormData(taskForm).get('taskName') || ''
      )
        .toString()
        .trim();

      if (!value) return;

      const list = getTaskTypes();

      /*
       * Aynı iş türünü tekrar ekleme.
       */

      if (
        list.some(
          (t) =>
            t.toLocaleLowerCase('tr') ===
            value.toLocaleLowerCase('tr')
        )
      ) {
        return;
      }

      list.push(value);

      saveTaskTypes(list);

      const saved =
        await saveSharedTaskTypesToFirebase(list);

      if (!saved) {
        if (status) {
          status.className = 'save-status';
          status.textContent =
            'İş türü Firebase\'e kaydedilemedi.';
        }

        return;
      }

      /*
       * Yeni iş türü hiçbir personele otomatik yetki
       * verilmeden oluşturulur.
       */

      if (status) {
        status.className = 'save-status is-ok';
        status.textContent = `✓ İş türü eklendi: ${value}`;
      }

      setTimeout(
        () => renderDashboard('Yetkilendirme'),
        500
      );
    }
  );
}
}

function renderStaffContent() {
  const list = getStaff();
  const admin = isAdminUser();
  const editName = window._staffEdit || '';

  const editRow = admin && editName
    ? `<form id="staff-edit-form" class="work-form community-form">
        <label class="field">
          Ad Soyad
          <input type="text" name="newName" value="${escapeHtml(editName)}" maxlength="100" required />
        </label>

        <label class="field">
          Ünvan
          <input type="text" name="staffTitle" value="${escapeHtml(loadCommunity(STAFF_META_KEY)[editName]?.title || '')}" maxlength="100" required />
        </label>

        <button class="primary-btn work-submit" type="submit">Kaydet</button>
      </form>`
    : '';

  return `
    <div class="page-heading">
      <div>
        <h1>Personel Yönetimi</h1>
        <p>${admin
      ? 'Personel ekleyin; adını ve ünvanını düzenleyin. Ünvan, yönetici yetkisi vermez.'
      : 'Kayıtlı personeller ve ünvanları (sadece görüntüleme).'}
        </p>
      </div>
      <span class="access-badge">${admin ? 'Yönetici' : 'Personel'}</span>
    </div>

    ${admin ? `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Yeni personel ekle</h2>
            <p class="panel-subtitle">Ad Soyad ve ünvan yazıp Ekle'ye basın.</p>
          </div>
        </div>

        <form id="staff-form" class="work-form community-form">
          <label class="field">
            Ad Soyad
            <input type="text" name="staffName" placeholder="Örn: Ali Veli" maxlength="100" required />
          </label>

          <label class="field">
            Ünvan
            <input type="text" name="staffTitle" placeholder="Örn: Muhasebe Uzmanı" maxlength="100" required />
          </label>

          <label class="field">
            E-posta (kullanıcı adı)
            <input type="email" name="staffEmail" placeholder="ali.veli@firma.com" required />
          </label>

          <label class="field">
            Şifre
            <input type="password" name="staffPassword" minlength="8" maxlength="128" required />
          </label>

          <label class="field">
            Şifre tekrar
            <input type="password" name="staffPasswordRepeat" minlength="8" maxlength="128" required />
          </label>

          <button class="primary-btn work-submit" type="submit">Ekle</button>

          <span class="field-hint">
            Şifre en az 8, en fazla 128 karakter olmalıdır.
          </span>
        </form>

        <div class="save-row">
          <span class="save-status" id="staff-save-status"></span>
        </div>

        ${editRow}
      </section>
    ` : ''}

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Kayıtlı personeller (${list.length})</h2>
        </div>
      </div>

      <div class="task-content">
        ${list.map((s) => `
          <div class="task-row" style="cursor:default">
            <span class="task-box" style="border-radius:50%">♟</span>

            <span class="task-name">
              ${staffIdentity(s)}
            </span>

            ${admin ? `
              <span style="margin-left:auto; display:flex; gap:8px;">
                <button
                  class="primary-btn work-submit"
                  data-edit-staff="${escapeHtml(s)}"
                  type="button"
                  style="min-width:90px;">
                  Düzenle
                </button>

                <button
                  class="primary-btn work-submit"
                  data-delete-staff="${escapeHtml(s)}"
                  type="button"
                  style="min-width:70px; background:#b42318;">
                  Sil
                </button>
              </span>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
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
      const credential = await window.firebaseCreateUser(
        window.firebaseAuth,
        email.toLowerCase(),
        password
      );

      console.log('FIREBASE KULLANICI OLUŞTURULDU:', credential.user.email);

      const firebaseUser = credential.user;

      await window.firebaseSetDoc(
        window.firebaseDoc(window.firebaseDb, 'users', firebaseUser.uid),
        {
          email: email.toLowerCase(),
          name: name,
          title: title
        }
      );

      const newUser = {
        email: email.toLowerCase(),
        password: '',
        name,
        title
      };

      users.push(newUser);

      const meta = loadCommunity(STAFF_META_KEY);

      meta[name] = { title };

      if (!saveCommunity(STAFF_META_KEY, meta)) return;

      // Personel ünvanını ortak Firebase kaynağına kaydet
      const firebaseMetaSaved = await saveSharedStaffMetaToFirebase(meta);

      if (!firebaseMetaSaved) {
        document.getElementById('staff-save-status').textContent =
          "Personel oluşturuldu ancak ünvan bilgisi Firebase'e kaydedilemedi.";
        document.getElementById('staff-save-status').className = 'save-status';
        return;
      }

      list.push(name);

      saveStaff(list);

      // Personel listesini ortak Firebase kaynağına kaydet
      const firebaseStaffSaved = await saveSharedStaffToFirebase(list);

      if (!firebaseStaffSaved) {
        document.getElementById('staff-save-status').textContent =
          "Personel hesabı oluşturuldu ancak ortak personel listesi Firebase'e kaydedilemedi.";
        document.getElementById('staff-save-status').className = 'save-status';
        return;
      }

      const acc = getAccess();
      if (!acc[name]) acc[name] = [];
      saveAccess(acc);

      const um = loadUserNames();
      um[email.toLowerCase()] = name;
      saveUserNames(um);

      window._staffEdit = '';

      const status = document.getElementById('staff-save-status');
      status.textContent = '✓ Personel ve Firebase hesabı oluşturuldu.';
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
  document.querySelectorAll('[data-delete-staff]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!isAdminUser()) return;

      const name = b.dataset.deleteStaff;

      const confirmed = window.confirm(
        `"${name}" isimli personeli silmek istediğinize emin misiniz?`
      );

      if (!confirmed) return;

      // Personel listesinden sil
      const list = getStaff().filter((s) => s !== name);
      saveStaff(list);

      // Personel listesini ortak Firebase kaynağına da kaydet
      const firebaseStaffSaved = await saveSharedStaffToFirebase(list);

      if (!firebaseStaffSaved) {
        alert("Personel yerel listeden silindi ancak ortak Firebase listesi güncellenemedi.");
        return;
      }

      // Personel bilgilerini sil
      const meta = loadCommunity(STAFF_META_KEY);
      delete meta[name];
      saveCommunity(STAFF_META_KEY, meta);

      // Yetkilerini sil
      const acc = getAccess();
      delete acc[name];
      saveAccess(acc);

      // Kullanıcı adı eşleşmesini sil
      const um = loadUserNames();

      Object.keys(um).forEach((email) => {
        if (um[email] === name) {
          delete um[email];
        }
      });

      saveUserNames(um);

      // Planlardaki personel kayıtlarını sil
      const plans = loadPlans().filter((p) => p.staff !== name);
      savePlans(plans);

      window._staffEdit = '';

      refreshCompanyCache();
      renderDashboard('Personel Yönetimi');
    })
  );
  const ef = document.querySelector('#staff-edit-form');
  if (ef) ef.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdminUser()) return;
    const data = new FormData(ef);
    const nv = (data.get('newName') || '').toString().trim();
    const title = (data.get('staffTitle') || '').toString().trim();
    const old = window._staffEdit;
    if (!old || !getStaff().includes(old) || !validStaffDetails(nv, title)) return;
    if (getStaff().some((s) => s !== old && normName(s) === normName(nv))) { window.alert('Bu adla başka bir personel var.'); return; }
    if (!updateStaffIdentity(old, nv, title)) return;
    const updatedStaffList = getStaff().map((s) => (s === old ? nv : s));
    saveStaff(updatedStaffList);

    const firebaseStaffSaved = await saveSharedStaffToFirebase(updatedStaffList);

    if (!firebaseStaffSaved) {
      alert("Personel adı bilgisayardaki listede değiştirildi ancak Firebase ortak listesi güncellenemedi.");
      return;
    }
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
  const form =
    document.querySelector('#plan-form');

  if (form) {
    form.addEventListener(
      'submit',
      async (e) => {
        e.preventDefault();

        const fd =
          new FormData(form);

        const title =
          (fd.get('title') || '')
            .toString()
            .trim();

        const company =
          (fd.get('company') || '')
            .toString()
            .trim();

        const date =
          (fd.get('date') || '')
            .toString()
            .trim();

        if (
          !title ||
          !company ||
          !date
        ) {
          return;
        }

        const list =
          loadPlans();

        const newPlan = {
          id:
            'p' +
            Date.now(),

          staff:
            currentUser
              ? currentUser.name
              : '',

          title:
            title,

          company:
            company,

          date:
            date,

          remind:
            true,

          createdAt:
            new Date().toISOString()
        };

        list.push(newPlan);

        savePlans(list);

        const saved =
          await saveSharedPlansToFirebase(
            list
          );

        if (!saved) {
          alert(
            'Plan Firebase\'e kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
          );
          return;
        }

        renderDashboard(
          'Yıl / Dönem Yönetimi'
        );
      }
    );
  }

  document
    .querySelectorAll('[data-del]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        async () => {

          const planId =
            button.dataset.del;

          const me =
            currentUser
              ? currentUser.name
              : '';

          if (!planId || !me) {
            return;
          }

          const list =
            loadPlans();

          const newList =
            list.filter(
              (p) =>
                !(
                  p.id === planId &&
                  p.staff === me
                )
            );

          savePlans(
            newList
          );

          const saved =
            await saveSharedPlansToFirebase(
              newList
            );

          if (!saved) {
            alert(
              'Plan Firebase\'den silinemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
            );
            return;
          }

          renderDashboard(
            'Yıl / Dönem Yönetimi'
          );
        }
      );
    });

  document
    .querySelectorAll('[data-remind]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        async () => {

          const planId =
            button.dataset.remind;

          const me =
            currentUser
              ? currentUser.name
              : '';

          if (!planId || !me) {
            return;
          }

          const list =
            loadPlans();

          const item =
            list.find(
              (p) =>
                p.id === planId &&
                p.staff === me
            );

          if (!item) {
            return;
          }

          item.remind =
            !item.remind;

          savePlans(
            list
          );

          const saved =
            await saveSharedPlansToFirebase(
              list
            );

          if (!saved) {
            alert(
              'Plan hatırlatma ayarı Firebase\'e kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
            );
            return;
          }

          renderDashboard(
            'Yıl / Dönem Yönetimi'
          );
        }
      );
    });

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const due =
    getMyPlans().filter(
      (p) =>
        p.remind &&
        p.date <= today
    );

  if (due.length) {
    setTimeout(
      () => {
        window.alert(
          `Bugün ${due.length} planınızın günü geldi:\n- ` +
          due
            .map(
              (p) =>
                `${p.date} ${p.title}`
            )
            .join('\n- ')
        );
      },
      400
    );
  }
}
let sharedReportWorkRecordsCache = [];

async function loadReportWorkRecordsFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseCollection ||
      !window.firebaseGetDocs
    ) {
      console.error(
        'Firebase rapor bağlantısı hazır değil.'
      );

      return [];
    }

    const recordsRef =
      window.firebaseCollection(
        window.firebaseDb,
        'workRecords'
      );

    const snapshot =
      await window.firebaseGetDocs(
        recordsRef
      );

    const records = [];

    snapshot.forEach((docSnapshot) => {
      const data =
        docSnapshot.data();

      if (!data || !data.company || !data.date) {
        return;
      }

      records.push({
        id:
          docSnapshot.id,

        staff:
          data.updatedBy || '',

        company:
          data.company,

        date:
          data.date,

        tasks:
          Array.isArray(data.tasks)
            ? data.tasks
            : [],

        tasksByName:
          data.tasksByName &&
            typeof data.tasksByName === 'object'
            ? data.tasksByName
            : {},

        updatedAt:
          data.updatedAt || ''
      });
    });

    console.log(
      'Rapor için Firebase iş kayıtları yüklendi:',
      records
    );

    sharedReportWorkRecordsCache = [...records];

    return records;

  } catch (err) {

    console.error(
      'Firebase rapor kayıtları okunamadı:',
      err
    );

    return [];
  }
} function getReportData(staff, start, end) {
  const store =
    Array.isArray(sharedReportWorkRecordsCache)
      ? sharedReportWorkRecordsCache
      : [];

  const tasks =
    getTaskTypes();

  const rows = [];

  let done = 0;
  let total = 0;

  store.forEach((rec) => {

    if (!rec) {
      return;
    }

    const s =
      rec.staff || '';

    const c =
      rec.company || '';

    const d =
      rec.date || '';

    if (s !== staff) {
      return;
    }

    if (start && d < start) {
      return;
    }

    if (end && d > end) {
      return;
    }

    tasks.forEach((task) => {

      const value =
        !!(
          rec.tasksByName &&
          rec.tasksByName[task]
        );

      total += 1;

      if (value) {
        done += 1;
      }

      rows.push({
        date: d,
        company: c,
        task: task,
        done: value
      });
    });
  });

  rows.sort(
    (a, b) =>
      a.date < b.date
        ? -1
        : a.date > b.date
          ? 1
          : 0
  );

  const pct =
    total
      ? Math.round(
        (done / total) * 100
      )
      : 0;

  const byTask = {};

  tasks.forEach((task) => {
    byTask[task] = {
      total: 0,
      done: 0
    };
  });

  rows.forEach((row) => {

    if (!byTask[row.task]) {
      byTask[row.task] = {
        total: 0,
        done: 0
      };
    }

    byTask[row.task].total += 1;

    if (row.done) {
      byTask[row.task].done += 1;
    }
  });

  return {
    rows,
    done,
    total,
    pct,
    missing: total - done,
    byTask,
    taskCount: tasks.length
  };
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
function renderPersonnelLeaveContent() {
  if (!isAdminUser()) {
    return '<div class="permission-empty">Bu panel yalnızca yöneticilere açıktır.</div>';
  }

  const people = getStaff();

  return `
    <div class="page-heading">
      <div>
        <h1>Personel İzin ve Özlük</h1>
        <p>Personel bilgileri, izin kullanımları ve izin planlamalarını yönetin.</p>
      </div>
      <span class="access-badge">Yönetici</span>
    </div>

    <!-- PERSONEL SEÇİMİ -->
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Personel Seçimi</h2>
          <p class="panel-subtitle">
            İşlem yapmak istediğiniz personeli seçin.
          </p>
        </div>
      </div>

      <form id="personnel-leave-form" class="work-form">

        <label class="field">
          Personel
          <select name="staff" id="personnel-leave-staff">
            ${people.length
      ? people.map((person) =>
        `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`
      ).join('')
      : '<option value="">Personel bulunmuyor</option>'
    }
          </select>
        </label>

        <button
          class="primary-btn work-submit"
          type="submit"
        >
          Görüntüle
        </button>

      </form>
    </section>

    <!-- PERSONEL ÖZLÜK BİLGİLERİ -->
    <section class="panel">

      <div class="panel-header">
        <div>
          <h2>Personel Bilgileri</h2>
          <p class="panel-subtitle">
            Seçilen personele ait sabit özlük bilgileri.
          </p>
        </div>
      </div>

      <form id="personnel-info-form" class="work-form">

        <label class="field">
          Ad Soyad
          <input
            type="text"
            id="personnel-info-name"
            name="name"
            disabled
          />
        </label>

        <label class="field">
          Doğum Tarihi
          <input
            type="date"
            id="personnel-info-birth"
            name="birthDate"
          />
        </label>

        <label class="field">
          İşe Giriş Tarihi
          <input
            type="date"
            id="personnel-info-start"
            name="startDate"
          />
        </label>

        <label class="field">
          Yıllık İzin Hakkı
          <input
            type="number"
            id="personnel-info-annual"
            name="annualLeave"
            min="0"
            step="0.5"
            placeholder="Örn: 14"
          />
        </label>

        <label class="field">
          Not
          <input
            type="text"
            id="personnel-info-note"
            name="note"
            placeholder="Personel hakkında not"
          />
        </label>

        <div class="save-row">
          <span
            class="save-status"
            id="personnel-info-status"
          ></span>

          <button
            class="primary-btn work-submit"
            type="submit"
          >
            Bilgileri Kaydet
          </button>
        </div>

      </form>

    </section>

    <!-- İZİN ÖZETİ -->
    <section class="panel">

      <div class="panel-header">
        <div>
          <h2>İzin Özeti</h2>
          <p class="panel-subtitle">
            Seçilen personelin izin kullanım durumu.
          </p>
        </div>
      </div>

      <div class="stats-grid">

        <article class="stat-card">
          <div class="stat-top">
            <span>Yıllık İzin Hakkı</span>
          </div>
          <div
            class="stat-number"
            id="leave-summary-entitlement"
          >
            0
          </div>
          <small>Gün</small>
        </article>

        <article class="stat-card">
          <div class="stat-top">
            <span>Kullanılan Yıllık İzin</span>
          </div>
          <div
            class="stat-number"
            id="leave-summary-annual-used"
          >
            0
          </div>
          <small>Gün</small>
        </article>

        <article class="stat-card">
          <div class="stat-top">
            <span>Kalan Yıllık İzin</span>
          </div>
          <div
            class="stat-number"
            id="leave-summary-annual-remaining"
          >
            0
          </div>
          <small>Gün</small>
        </article>

        <article class="stat-card">
          <div class="stat-top">
            <span>Saatlik İzin</span>
          </div>
          <div
            class="stat-number"
            id="leave-summary-hourly-used"
          >
            0
          </div>
          <small>Saat</small>
        </article>

      </div>

    </section>

    <!-- YENİ İZİN KAYDI -->
    <section class="panel">

      <div class="panel-header">
        <div>
          <h2>Yeni İzin Kaydı</h2>
          <p class="panel-subtitle">
            Seçilen personelin kullandığı izni kaydedin.
          </p>
        </div>
      </div>

      <form id="leave-record-form" class="work-form">

        <label class="field">
          İzin Tarihi
          <input
            type="date"
            id="leave-record-date"
            name="date"
            required
          />
        </label>

        <label class="field">
          İzin Türü
          <select
            id="leave-record-type"
            name="type"
            required
          >
            <option value="Yıllık İzin">Yıllık İzin</option>
            <option value="Saatlik İzin">Saatlik İzin</option>
            <option value="Mazeret İzni">Mazeret İzni</option>
            <option value="Ücretsiz İzin">Ücretsiz İzin</option>
            <option value="Rapor">Rapor</option>
            <option value="Diğer">Diğer</option>
          </select>
        </label>

        <label class="field">
          Başlangıç Saati
          <input
            type="time"
            id="leave-record-start"
            name="startTime"
          />
        </label>

        <label class="field">
          Bitiş Saati
          <input
            type="time"
            id="leave-record-end"
            name="endTime"
          />
        </label>

        <label class="field">
          Süre
          <input
            type="number"
            id="leave-record-duration"
            name="duration"
            min="0"
            step="0.5"
            placeholder="Gün veya saat"
            required
          />
        </label>

        <label class="field">
          Açıklama
          <input
            type="text"
            id="leave-record-note"
            name="note"
            placeholder="İzin açıklaması"
          />
        </label>

        <div class="save-row">

          <span
            class="save-status"
            id="leave-record-status"
          ></span>

          <button
            class="primary-btn work-submit"
            type="submit"
          >
            İzin Kaydet
          </button>

        </div>

      </form>

    </section>

    <!-- İZİN GEÇMİŞİ -->
    <section class="panel">

      <div class="panel-header">
        <div>
          <h2>İzin Geçmişi</h2>
          <p class="panel-subtitle">
            Seçilen personelin kayıtlı izinleri.
          </p>
        </div>
      </div>

      <div id="personnel-leave-history">
        <div class="permission-empty">
          Henüz izin kaydı bulunmuyor.
        </div>
      </div>

    </section>


    <!-- GELECEK YIL İZİN PLANI -->
    <section class="panel">

      <div class="panel-header">
        <div>
          <h2>Gelecek Yıl İzin Planı</h2>
          <p class="panel-subtitle">
            Seçilen personelin gelecek yıl için planlanan ve tahmini izinlerini yönetin.
          </p>
        </div>
      </div>

      <form id="leave-plan-form" class="work-form">

        <label class="field">
          İzin Tarihi
          <input
            type="date"
            id="leave-plan-date"
            name="date"
            required
          />
        </label>

        <label class="field">
          Süre
          <input
            type="number"
            id="leave-plan-duration"
            name="duration"
            min="0.5"
            step="0.5"
            placeholder="Örn: 5"
            required
          />
        </label>

        <label class="field">
          Durum
          <select
            id="leave-plan-status"
            name="status"
          >
            <option value="Tahmini">Tahmini</option>
            <option value="Planlandı">Planlandı</option>
          </select>
        </label>

        <label class="field">
          Açıklama
          <input
            type="text"
            id="leave-plan-note"
            name="note"
            placeholder="Örn: Yaz tatili"
          />
        </label>

        <div class="save-row">

          <span
            class="save-status"
            id="leave-plan-status-message"
          ></span>

          <button
            class="primary-btn work-submit"
            type="submit"
          >
            Planı Kaydet
          </button>

        </div>

      </form>

      <div
        id="personnel-leave-plan-history"
        style="margin-top: 20px;"
      >
        <div class="permission-empty">
          Henüz izin planı bulunmuyor.
        </div>
      </div>

    </section>

  `;
}
const PERSONNEL_INFO_FIREBASE_COLLECTION = 'settings';
const PERSONNEL_INFO_FIREBASE_DOC = 'personnelInfo';

let sharedPersonnelInfoCache = {};

async function loadPersonnelInfoFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseGetDoc
    ) {
      console.error(
        'Firebase personel bilgi bağlantısı hazır değil.'
      );

      return {};
    }

    const ref =
      window.firebaseDoc(
        window.firebaseDb,
        PERSONNEL_INFO_FIREBASE_COLLECTION,
        PERSONNEL_INFO_FIREBASE_DOC
      );

    const snapshot =
      await window.firebaseGetDoc(ref);

    if (!snapshot.exists()) {
      sharedPersonnelInfoCache = {};
      return {};
    }

    const data =
      snapshot.data();

    sharedPersonnelInfoCache =
      data.personnel &&
        typeof data.personnel === 'object'
        ? { ...data.personnel }
        : {};

    console.log(
      'Personel bilgileri Firebase\'den yüklendi:',
      sharedPersonnelInfoCache
    );

    return {
      ...sharedPersonnelInfoCache
    };

  } catch (err) {

    console.error(
      'Personel bilgileri Firebase\'den okunamadı:',
      err
    );

    return {};
  }
}

async function savePersonnelInfoToFirebase(personnel) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      console.error(
        'Firebase personel bilgi bağlantısı hazır değil.'
      );

      return false;
    }

    const ref =
      window.firebaseDoc(
        window.firebaseDb,
        PERSONNEL_INFO_FIREBASE_COLLECTION,
        PERSONNEL_INFO_FIREBASE_DOC
      );

    await window.firebaseSetDoc(
      ref,
      {
        personnel:
          personnel,

        updatedAt:
          new Date().toISOString()
      }
    );

    sharedPersonnelInfoCache =
      { ...personnel };

    console.log(
      'Personel bilgileri Firebase\'e kaydedildi:',
      sharedPersonnelInfoCache
    );

    return true;

  } catch (err) {

    console.error(
      'Personel bilgileri Firebase\'e kaydedilemedi:',
      err
    );

    return false;
  }
}
const PERSONNEL_LEAVE_FIREBASE_COLLECTION =
  'personnelLeaves';

let sharedPersonnelLeaveCache = [];

async function loadPersonnelLeaveRecordsFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseCollection ||
      !window.firebaseGetDocs
    ) {
      console.error(
        'Firebase personel izin bağlantısı hazır değil.'
      );

      return [];
    }

    const ref =
      window.firebaseCollection(
        window.firebaseDb,
        PERSONNEL_LEAVE_FIREBASE_COLLECTION
      );

    const snapshot =
      await window.firebaseGetDocs(ref);

    const records = [];

    snapshot.forEach((docSnapshot) => {
      const data =
        docSnapshot.data();

      if (!data) return;

      records.push({
        id:
          data.id ||
          docSnapshot.id,

        staff:
          data.staff || '',

        date:
          data.date || '',

        type:
          data.type || '',

        startTime:
          data.startTime || '',

        endTime:
          data.endTime || '',

        duration:
          Number(data.duration || 0),

        note:
          data.note || '',

        createdAt:
          data.createdAt || '',

        createdBy:
          data.createdBy || ''
      });
    });

    sharedPersonnelLeaveCache =
      [...records];

    console.log(
      'Personel izin kayıtları Firebase\'den yüklendi:',
      sharedPersonnelLeaveCache
    );

    return [
      ...sharedPersonnelLeaveCache
    ];

  } catch (err) {

    console.error(
      'Personel izin kayıtları Firebase\'den okunamadı:',
      err
    );

    return [];
  }
}

async function savePersonnelLeaveRecordToFirebase(record) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      console.error(
        'Firebase personel izin bağlantısı hazır değil.'
      );

      return false;
    }

    if (!record || !record.id) {
      return false;
    }

    const ref =
      window.firebaseDoc(
        window.firebaseDb,
        PERSONNEL_LEAVE_FIREBASE_COLLECTION,
        record.id
      );

    await window.firebaseSetDoc(
      ref,
      record
    );

    sharedPersonnelLeaveCache =
      [
        ...sharedPersonnelLeaveCache.filter(
          (item) =>
            item.id !== record.id
        ),
        { ...record }
      ];

    console.log(
      'Personel izin kaydı Firebase\'e kaydedildi:',
      record
    );

    return true;

  } catch (err) {

    console.error(
      'Personel izin kaydı Firebase\'e kaydedilemedi:',
      err
    );

    return false;
  }
}
const PERSONNEL_LEAVE_PLAN_COLLECTION =
  'personnelLeavePlans';

let sharedPersonnelLeavePlanCache = [];

async function loadPersonnelLeavePlansFromFirebase() {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseCollection ||
      !window.firebaseGetDocs
    ) {
      console.error(
        'Firebase izin planı bağlantısı hazır değil.'
      );

      return [];
    }

    const ref =
      window.firebaseCollection(
        window.firebaseDb,
        PERSONNEL_LEAVE_PLAN_COLLECTION
      );

    const snapshot =
      await window.firebaseGetDocs(ref);

    const plans = [];

    snapshot.forEach((docSnapshot) => {
      const data =
        docSnapshot.data();

      if (!data) return;

      plans.push({
        id:
          data.id ||
          docSnapshot.id,

        staff:
          data.staff || '',

        date:
          data.date || '',

        duration:
          Number(
            data.duration || 0
          ),

        status:
          data.status || 'Tahmini',

        note:
          data.note || '',

        createdAt:
          data.createdAt || '',

        createdBy:
          data.createdBy || ''
      });
    });

    sharedPersonnelLeavePlanCache =
      [...plans];

    return [
      ...sharedPersonnelLeavePlanCache
    ];

  } catch (err) {

    console.error(
      'Firebase izin planları okunamadı:',
      err
    );

    return [];
  }
}

async function savePersonnelLeavePlanToFirebase(plan) {
  try {
    if (
      !window.firebaseDb ||
      !window.firebaseDoc ||
      !window.firebaseSetDoc
    ) {
      console.error(
        'Firebase izin planı bağlantısı hazır değil.'
      );

      return false;
    }

    if (!plan || !plan.id) {
      return false;
    }

    const ref =
      window.firebaseDoc(
        window.firebaseDb,
        PERSONNEL_LEAVE_PLAN_COLLECTION,
        plan.id
      );

    await window.firebaseSetDoc(
      ref,
      plan
    );

    sharedPersonnelLeavePlanCache =
      [
        ...sharedPersonnelLeavePlanCache.filter(
          (item) =>
            item.id !== plan.id
        ),
        { ...plan }
      ];

    return true;

  } catch (err) {

    console.error(
      'Firebase izin planı kaydedilemedi:',
      err
    );

    return false;
  }
}
async function setupPersonnelLeave() {

  if (!isAdminUser()) return;


  const staffSelect =
    document.querySelector(
      '#personnel-leave-staff'
    );


  const infoForm =
    document.querySelector(
      '#personnel-info-form'
    );


  const nameInput =
    document.querySelector(
      '#personnel-info-name'
    );


  const birthInput =
    document.querySelector(
      '#personnel-info-birth'
    );


  const startInput =
    document.querySelector(
      '#personnel-info-start'
    );


  const annualInput =
    document.querySelector(
      '#personnel-info-annual'
    );


  const noteInput =
    document.querySelector(
      '#personnel-info-note'
    );


  const infoStatus =
    document.querySelector(
      '#personnel-info-status'
    );


  const leaveForm =
    document.querySelector(
      '#leave-record-form'
    );


  const leaveDate =
    document.querySelector(
      '#leave-record-date'
    );


  const leaveType =
    document.querySelector(
      '#leave-record-type'
    );


  const leaveStart =
    document.querySelector(
      '#leave-record-start'
    );


  const leaveEnd =
    document.querySelector(
      '#leave-record-end'
    );


  const leaveDuration =
    document.querySelector(
      '#leave-record-duration'
    );


  const leaveNote =
    document.querySelector(
      '#leave-record-note'
    );


  const leaveStatus =
    document.querySelector(
      '#leave-record-status'
    );


  const leaveHistory =
    document.querySelector(
      '#personnel-leave-history'
    );


  /*
   * GÖRÜNTÜLE BUTONU FORM GÖNDERİMİNİ ENGELLE
   */

  const personnelLeaveForm =
    document.querySelector(
      '#personnel-leave-form'
    );


  if (
    personnelLeaveForm
  ) {

    personnelLeaveForm.addEventListener(
      'submit',
      (e) => {

        e.preventDefault();

        loadSelectedPerson();

      }
    );

  }


  if (
    !staffSelect ||
    !infoForm
  ) {

    return;

  }

  /*
   * PERSONEL ÖZLÜK BİLGİLERİ
   */

  const personnel =
    await loadPersonnelInfoFromFirebase();

  /*
   * İZİN KAYITLARI
   */

  let leaveRecords =
    await loadPersonnelLeaveRecordsFromFirebase();

  function getSelectedStaff() {
    return staffSelect.value || '';
  }

  function loadSelectedPerson() {
    const staff =
      getSelectedStaff();

    const data =
      personnel[staff] &&
        typeof personnel[staff] === 'object'
        ? personnel[staff]
        : {};

    if (nameInput) {
      nameInput.value =
        staff || '';
    }

    if (birthInput) {
      birthInput.value =
        data.birthDate || '';
    }

    if (startInput) {
      startInput.value =
        data.startDate || '';
    }

    if (annualInput) {
      annualInput.value =
        data.annualLeave ?? '';
    }

    if (noteInput) {
      noteInput.value =
        data.note || '';
    }

    if (infoStatus) {
      infoStatus.className =
        'save-status';

      infoStatus.textContent =
        '';
    }

    renderLeaveSummary();
    renderLeaveHistory();
  }

  /*
   * ÖZLÜK BİLGİLERİNİ KAYDET
   */

  infoForm.addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();

      const staff =
        getSelectedStaff();

      if (!staff) return;

      personnel[staff] = {
        birthDate:
          birthInput
            ? birthInput.value
            : '',

        startDate:
          startInput
            ? startInput.value
            : '',

        annualLeave:
          annualInput &&
            annualInput.value !== ''
            ? Number(annualInput.value)
            : 0,

        note:
          noteInput
            ? noteInput.value.trim()
            : ''
      };

      if (infoStatus) {
        infoStatus.className =
          'save-status';

        infoStatus.textContent =
          'Bilgiler kaydediliyor...';
      }

      const saved =
        await savePersonnelInfoToFirebase(
          personnel
        );

      if (!saved) {
        if (infoStatus) {
          infoStatus.textContent =
            'Bilgiler kaydedilemedi.';
        }

        return;
      }

      if (infoStatus) {
        infoStatus.className =
          'save-status is-ok';

        infoStatus.textContent =
          `✓ ${staff} personelinin bilgileri kaydedildi.`;
      }

      renderLeaveSummary();
    }
  );

  /*
   * YENİ İZİN KAYDI
   */

  if (leaveForm) {
    leaveForm.addEventListener(
      'submit',
      async (e) => {
        e.preventDefault();

        const staff =
          getSelectedStaff();

        if (!staff) return;

        const record = {
          id:
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          staff:
            staff,

          date:
            leaveDate
              ? leaveDate.value
              : '',

          type:
            leaveType
              ? leaveType.value
              : '',

          startTime:
            leaveStart
              ? leaveStart.value
              : '',

          endTime:
            leaveEnd
              ? leaveEnd.value
              : '',

          duration:
            leaveDuration &&
              leaveDuration.value !== ''
              ? Number(leaveDuration.value)
              : 0,

          note:
            leaveNote
              ? leaveNote.value.trim()
              : '',

          createdAt:
            new Date().toISOString(),

          createdBy:
            currentUser
              ? currentUser.name
              : ''
        };

        if (!record.date) {
          if (leaveStatus) {
            leaveStatus.textContent =
              'İzin tarihi seçilmelidir.';
          }

          return;
        }

        if (!record.type) {
          if (leaveStatus) {
            leaveStatus.textContent =
              'İzin türü seçilmelidir.';
          }

          return;
        }

        if (
          !Number.isFinite(record.duration) ||
          record.duration <= 0
        ) {
          if (leaveStatus) {
            leaveStatus.textContent =
              'Süre 0’dan büyük olmalıdır.';
          }

          return;
        }

        if (leaveStatus) {
          leaveStatus.className =
            'save-status';

          leaveStatus.textContent =
            'İzin kaydediliyor...';
        }

        const saved =
          await savePersonnelLeaveRecordToFirebase(
            record
          );

        if (!saved) {
          if (leaveStatus) {
            leaveStatus.textContent =
              'İzin Firebase\'e kaydedilemedi.';
          }

          return;
        }

        leaveRecords.push(record);

        if (leaveStatus) {
          leaveStatus.className =
            'save-status is-ok';

          leaveStatus.textContent =
            '✓ İzin kaydı kaydedildi.';
        }

        if (leaveDate) {
          leaveDate.value = '';
        }

        if (leaveStart) {
          leaveStart.value = '';
        }

        if (leaveEnd) {
          leaveEnd.value = '';
        }

        if (leaveDuration) {
          leaveDuration.value = '';
        }

        if (leaveNote) {
          leaveNote.value = '';
        }

        renderLeaveSummary();
        renderLeaveHistory();
      }
    );
  }

  /*
   * PERSONEL DEĞİŞTİRME
   */

  staffSelect.addEventListener(
    'change',
    () => {
      loadSelectedPerson();
    }
  );

  /*
   * ÖZET
   */

  function renderLeaveSummary() {
    const staff =
      getSelectedStaff();

    const records =
      leaveRecords.filter(
        (record) =>
          record &&
          record.staff === staff
      );

    const selectedYear =
      window._personnelLeaveYear ||
      new Date().getFullYear();

    const yearRecords =
      records.filter(
        (record) =>
          record.date &&
          record.date.startsWith(
            String(selectedYear)
          )
      );

    const annualUsed =
      yearRecords
        .filter(
          (record) =>
            record.type === 'Yıllık İzin'
        )
        .reduce(
          (sum, record) =>
            sum +
            Number(record.duration || 0),
          0
        );

    const hourlyUsed =
      yearRecords
        .filter(
          (record) =>
            record.type === 'Saatlik İzin'
        )
        .reduce(
          (sum, record) =>
            sum +
            Number(record.duration || 0),
          0
        );

    const entitlement =
      personnel[staff] &&
      Number(
        personnel[staff].annualLeave || 0
      );

    const remaining =
      Math.max(
        entitlement - annualUsed,
        0
      );

    const entitlementEl =
      document.querySelector(
        '#leave-summary-entitlement'
      );

    const annualUsedEl =
      document.querySelector(
        '#leave-summary-annual-used'
      );

    const remainingEl =
      document.querySelector(
        '#leave-summary-annual-remaining'
      );

    const hourlyUsedEl =
      document.querySelector(
        '#leave-summary-hourly-used'
      );

    if (entitlementEl) {
      entitlementEl.textContent =
        entitlement;
    }

    if (annualUsedEl) {
      annualUsedEl.textContent =
        annualUsed;
    }

    if (remainingEl) {
      remainingEl.textContent =
        remaining;
    }

    if (hourlyUsedEl) {
      hourlyUsedEl.textContent =
        hourlyUsed;
    }
  }

  /*
   * İZİN GEÇMİŞİ
   */

  function renderLeaveHistory() {
    if (!leaveHistory) return;

    const staff =
      getSelectedStaff();

    const records =
      leaveRecords
        .filter(
          (record) =>
            record &&
            record.staff === staff
        )
        .sort(
          (a, b) =>
            (b.date || '').localeCompare(
              a.date || ''
            )
        );

    if (!records.length) {
      leaveHistory.innerHTML =
        '<div class="permission-empty">Henüz izin kaydı bulunmuyor.</div>';

      return;
    }

    leaveHistory.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>İzin Türü</th>
              <th>Başlangıç</th>
              <th>Bitiş</th>
              <th>Süre</th>
              <th>Açıklama</th>
            </tr>
          </thead>

          <tbody>
            ${records.map(
      (record) => `
                  <tr>
                    <td>
                      ${escapeHtml(
        record.date || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.type || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.startTime || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.endTime || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        String(
          record.duration ?? '-'
        )
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.note || '-'
      )}
                    </td>
                  </tr>
                `
    ).join('')
      }
          </tbody>
        </table>
      </div>
    `;
  }

  /*
   * AYLIK İZİN RAPORU
   */

  const reportYear =
    document.querySelector(
      '#personnel-report-year'
    );

  const reportMonth =
    document.querySelector(
      '#personnel-report-month'
    );

  const reportButton =
    document.querySelector(
      '#personnel-report-button'
    );

  const monthlyReport =
    document.querySelector(
      '#personnel-monthly-report'
    );

  const now =
    new Date();

  if (reportYear) {
    reportYear.value =
      String(
        now.getFullYear()
      );
  }

  if (reportMonth) {
    reportMonth.value =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');
  }

  function showMonthlyReport() {
    const staff =
      getSelectedStaff();

    const year =
      reportYear
        ? reportYear.value
        : String(
          now.getFullYear()
        );

    const month =
      reportMonth
        ? reportMonth.value
        : String(
          now.getMonth() + 1
        ).padStart(2, '0');

    window._personnelLeaveYear =
      Number(year);

    const prefix =
      `${year}-${month}`;

    const records =
      leaveRecords
        .filter(
          (record) =>
            record &&
            record.staff === staff &&
            record.date &&
            record.date.startsWith(
              prefix
            )
        )
        .sort(
          (a, b) =>
            (a.date || '').localeCompare(
              b.date || ''
            )
        );

    if (!monthlyReport) {
      return;
    }

    if (!records.length) {
      monthlyReport.innerHTML = `
        <div class="permission-empty">
          ${escapeHtml(staff)} için
          ${escapeHtml(year)}-${escapeHtml(month)}
          döneminde izin kaydı bulunmuyor.
        </div>
      `;

      renderLeaveSummary();

      return;
    }

    const annualDays =
      records
        .filter(
          (record) =>
            record.type === 'Yıllık İzin'
        )
        .reduce(
          (sum, record) =>
            sum +
            Number(record.duration || 0),
          0
        );

    const hourlyHours =
      records
        .filter(
          (record) =>
            record.type === 'Saatlik İzin'
        )
        .reduce(
          (sum, record) =>
            sum +
            Number(record.duration || 0),
          0
        );

    monthlyReport.innerHTML = `
      <div class="stats-grid">

        <article class="stat-card">
          <div class="stat-top">
            <span>Yıllık İzin</span>
          </div>

          <div class="stat-number">
            ${annualDays}
          </div>

          <small>Gün</small>
        </article>

        <article class="stat-card">
          <div class="stat-top">
            <span>Saatlik İzin</span>
          </div>

          <div class="stat-number">
            ${hourlyHours}
          </div>

          <small>Saat</small>
        </article>

        <article class="stat-card">
          <div class="stat-top">
            <span>Toplam Kayıt</span>
          </div>

          <div class="stat-number">
            ${records.length}
          </div>

          <small>İzin kaydı</small>
        </article>

      </div>

      <div class="table-wrap">

        <table class="data-table">

          <thead>
            <tr>
              <th>Tarih</th>
              <th>İzin Türü</th>
              <th>Başlangıç</th>
              <th>Bitiş</th>
              <th>Süre</th>
              <th>Açıklama</th>
            </tr>
          </thead>

          <tbody>
            ${records.map(
      (record) => `
                  <tr>

                    <td>
                      ${escapeHtml(
        record.date || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.type || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.startTime || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.endTime || '-'
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        String(
          record.duration ?? '-'
        )
      )}
                    </td>

                    <td>
                      ${escapeHtml(
        record.note || '-'
      )}
                    </td>

                  </tr>
                `
    ).join('')
      }
          </tbody>

        </table>

      </div>
    `;

    renderLeaveSummary();
  }

  if (reportButton) {

    reportButton.addEventListener(
      'click',
      showMonthlyReport
    );

  }
/*
   * GELECEK YIL İZİN PLANI
   */

  const leavePlanForm =
    document.querySelector(
      '#leave-plan-form'
    );

  const leavePlanDate =
    document.querySelector(
      '#leave-plan-date'
    );

  const leavePlanDuration =
    document.querySelector(
      '#leave-plan-duration'
    );

  const leavePlanStatus =
    document.querySelector(
      '#leave-plan-status'
    );

  const leavePlanNote =
    document.querySelector(
      '#leave-plan-note'
    );

  const leavePlanMessage =
    document.querySelector(
      '#leave-plan-status-message'
    );

  const leavePlanHistory =
    document.querySelector(
      '#personnel-leave-plan-history'
    );

  let leavePlans =
    await loadPersonnelLeavePlansFromFirebase();

  let editingLeavePlanId = null;
function renderLeavePlans() {

    if (!leavePlanHistory) {
      return;
    }

    const staff =
      getSelectedStaff();

    const plans =
      leavePlans
        .filter(
          (plan) =>
            plan &&
            plan.staff === staff
        )
        .sort(
          (a, b) =>
            (a.date || '').localeCompare(
              b.date || ''
            )
        );


    /*
     * İZİN PLANI ÖZETİ
     */

    const totalDays =
      plans.reduce(
        (total, plan) =>
          total +
          Number(
            plan.duration || 0
          ),
        0
      );

    const estimatedDays =
      plans
        .filter(
          (plan) =>
            plan.status === 'Tahmini'
        )
        .reduce(
          (total, plan) =>
            total +
            Number(
              plan.duration || 0
            ),
          0
        );

    const plannedDays =
      plans
        .filter(
          (plan) =>
            plan.status === 'Planlandı'
        )
        .reduce(
          (total, plan) =>
            total +
            Number(
              plan.duration || 0
            ),
          0
        );


    /*
     * KAYIT YOKSA
     */

    if (!plans.length) {

      leavePlanHistory.innerHTML = `

        <div
          style="
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          "
        >

          <div class="panel">

            <strong>
              Toplam Planlanan
            </strong>

            <div
              style="
                font-size: 24px;
                margin-top: 6px;
              "
            >
              0 Gün
            </div>

          </div>


          <div class="panel">

            <strong>
              Tahmini
            </strong>

            <div
              style="
                font-size: 24px;
                margin-top: 6px;
              "
            >
              0 Gün
            </div>

          </div>


          <div class="panel">

            <strong>
              Planlandı
            </strong>

            <div
              style="
                font-size: 24px;
                margin-top: 6px;
              "
            >
              0 Gün
            </div>

          </div>

        </div>


        <div class="permission-empty">
          Henüz izin planı bulunmuyor.
        </div>

      `;

      return;
    }


    /*
     * AYLARA GÖRE GRUPLAMA
     */

    const monthNames = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık'
    ];

    const groupedPlans = {};


    plans.forEach(
      (plan) => {

        const monthIndex =
          plan.date
            ? Number(
                plan.date.slice(5, 7)
              ) - 1
            : -1;

        const monthName =
          monthIndex >= 0 &&
          monthIndex < 12
            ? monthNames[
                monthIndex
              ]
            : 'Tarihsiz';


        if (
          !groupedPlans[
            monthName
          ]
        ) {

          groupedPlans[
            monthName
          ] = [];

        }


        groupedPlans[
          monthName
        ].push(plan);

      }
    );


    /*
     * ÖZET
     */

    let html = `

      <div
        style="
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        "
      >

        <div class="panel">

          <strong>
            Toplam Planlanan
          </strong>

          <div
            style="
              font-size: 24px;
              margin-top: 6px;
            "
          >
            ${totalDays} Gün
          </div>

        </div>


        <div class="panel">

          <strong>
            Tahmini
          </strong>

          <div
            style="
              font-size: 24px;
              margin-top: 6px;
            "
          >
            ${estimatedDays} Gün
          </div>

        </div>


        <div class="panel">

          <strong>
            Planlandı
          </strong>

          <div
            style="
              font-size: 24px;
              margin-top: 6px;
            "
          >
            ${plannedDays} Gün
          </div>

        </div>

      </div>

    `;


    /*
     * AYLARA GÖRE İZİNLER
     */

    Object.keys(
      groupedPlans
    ).forEach(
      (monthName) => {

        const monthPlans =
          groupedPlans[
            monthName
          ];

        const monthTotal =
          monthPlans.reduce(
            (total, plan) =>
              total +
              Number(
                plan.duration || 0
              ),
            0
          );


        html += `

          <div
            class="panel"
            style="
              margin-bottom: 16px;
            "
          >

            <div
              class="panel-header"
            >

              <div>

                <h3>
                  ${monthName}
                </h3>

                <p
                  class="panel-subtitle"
                >
                  Toplam:
                  ${monthTotal}
                  Gün
                </p>

              </div>

            </div>


            <div class="table-wrap">

              <table class="data-table">

                <thead>

                  <tr>

                    <th>
                      Tarih
                    </th>

                    <th>
                      Süre
                    </th>

                    <th>
                      Durum
                    </th>

                    <th>
                      Açıklama
                    </th>

                    <th>
                      İşlem
                    </th>

                  </tr>

                </thead>


                <tbody>

                  ${
                    monthPlans
                      .map(
                        (plan) => `

                          <tr>

                            <td>
                              ${escapeHtml(
                                plan.date ||
                                '-'
                              )}
                            </td>

                            <td>
                              ${escapeHtml(
                                String(
                                  plan.duration ??
                                  '-'
                                )
                              )}
                              Gün
                            </td>

                            <td>
                              ${escapeHtml(
                                plan.status ||
                                '-'
                              )}
                            </td>

                            <td>
                              ${escapeHtml(
                                plan.note ||
                                '-'
                              )}
                            </td>

                            <td>

                              <button
                                type="button"
                                class="secondary-btn leave-plan-edit"
                                data-id="${escapeHtml(
                                  plan.id
                                )}"
                              >
                                Düzenle
                              </button>


                              <button
                                type="button"
                                class="secondary-btn leave-plan-delete"
                                data-id="${escapeHtml(
                                  plan.id
                                )}"
                                style="
                                  margin-left: 6px;
                                "
                              >
                                Sil
                              </button>

                            </td>

                          </tr>

                        `
                      )
                      .join('')
                  }

                </tbody>

              </table>

            </div>

          </div>

        `;

      }
    );


    leavePlanHistory.innerHTML =
      html;


    /*
     * DÜZENLE BUTONLARI
     */

    leavePlanHistory
      .querySelectorAll(
        '.leave-plan-edit'
      )
      .forEach(
        (button) => {

          button.addEventListener(
            'click',
            () => {

              const id =
                button.dataset.id;

              const plan =
                leavePlans.find(
                  (item) =>
                    item.id === id
                );

              if (!plan) {
                return;
              }


              editingLeavePlanId =
                plan.id;


              if (leavePlanDate) {

                leavePlanDate.value =
                  plan.date || '';

              }


              if (leavePlanDuration) {

                leavePlanDuration.value =
                  plan.duration || '';

              }


              if (leavePlanStatus) {

                leavePlanStatus.value =
                  plan.status ||
                  'Tahmini';

              }


              if (leavePlanNote) {

                leavePlanNote.value =
                  plan.note || '';

              }


              if (leavePlanMessage) {

                leavePlanMessage.className =
                  'save-status';

                leavePlanMessage.textContent =
                  'İzin planı düzenleme modunda.';

              }


              const submitButton =
                leavePlanForm
                  ? leavePlanForm.querySelector(
                      'button[type="submit"]'
                    )
                  : null;


              if (submitButton) {

                submitButton.textContent =
                  'Değişikliği Kaydet';

              }

            }
          );

        }
      );


    /*
     * SİL BUTONLARI
     */

    leavePlanHistory
      .querySelectorAll(
        '.leave-plan-delete'
      )
      .forEach(
        (button) => {

          button.addEventListener(
            'click',
            async () => {

              const id =
                button.dataset.id;

              const plan =
                leavePlans.find(
                  (item) =>
                    item.id === id
                );

              if (!plan) {
                return;
              }


              const confirmed =
                confirm(
                  'Bu izin planını silmek istediğinizden emin misiniz?'
                );


              if (!confirmed) {
                return;
              }


              if (leavePlanMessage) {

                leavePlanMessage.className =
                  'save-status';

                leavePlanMessage.textContent =
                  'İzin planı siliniyor...';

              }


              try {

                if (
                  !window.firebaseDb ||
                  !window.firebaseDoc ||
                  !window.firebaseDeleteDoc
                ) {

                  throw new Error(
                    'Firebase silme bağlantısı hazır değil.'
                  );

                }


                const ref =
                  window.firebaseDoc(
                    window.firebaseDb,
                    PERSONNEL_LEAVE_PLAN_COLLECTION,
                    id
                  );


                await window.firebaseDeleteDoc(
                  ref
                );


                leavePlans =
                  leavePlans.filter(
                    (item) =>
                      item.id !== id
                  );


                if (
                  editingLeavePlanId === id
                ) {

                  editingLeavePlanId =
                    null;

                }


                if (leavePlanMessage) {

                  leavePlanMessage.className =
                    'save-status is-ok';

                  leavePlanMessage.textContent =
                    '✓ İzin planı silindi.';

                }


                renderLeavePlans();


              } catch (err) {

                console.error(
                  'İzin planı silinemedi:',
                  err
                );


                if (leavePlanMessage) {

                  leavePlanMessage.className =
                    'save-status';

                  leavePlanMessage.textContent =
                    'İzin planı silinemedi.';

                }

              }

            }
          );

        }
      );

  }


  /*
   * İZİN PLANI KAYDET / GÜNCELLE
   */

  if (leavePlanForm) {

    leavePlanForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        const staff =
          getSelectedStaff();


        if (!staff) {
          return;
        }


        const plan = {

          id:
            editingLeavePlanId ||
            `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          staff:
            staff,

          date:
            leavePlanDate
              ? leavePlanDate.value
              : '',

          duration:
            leavePlanDuration &&
            leavePlanDuration.value !== ''
              ? Number(
                  leavePlanDuration.value
                )
              : 0,

          status:
            leavePlanStatus
              ? leavePlanStatus.value
              : 'Tahmini',

          note:
            leavePlanNote
              ? leavePlanNote.value.trim()
              : '',

          createdAt:
            editingLeavePlanId
              ? (
                  leavePlans.find(
                    (item) =>
                      item.id ===
                      editingLeavePlanId
                  )?.createdAt ||
                  new Date().toISOString()
                )
              : new Date().toISOString(),

          createdBy:
            editingLeavePlanId
              ? (
                  leavePlans.find(
                    (item) =>
                      item.id ===
                      editingLeavePlanId
                  )?.createdBy ||
                  (
                    currentUser
                      ? currentUser.name
                      : ''
                  )
                )
              : (
                  currentUser
                    ? currentUser.name
                    : ''
                )

        };


        if (!plan.date) {

          if (leavePlanMessage) {

            leavePlanMessage.textContent =
              'İzin tarihi seçilmelidir.';

          }

          return;
        }


        if (
          !Number.isFinite(
            plan.duration
          ) ||
          plan.duration <= 0
        ) {

          if (leavePlanMessage) {

            leavePlanMessage.textContent =
              'Süre 0’dan büyük olmalıdır.';

          }

          return;
        }


        if (leavePlanMessage) {

          leavePlanMessage.className =
            'save-status';

          leavePlanMessage.textContent =
            editingLeavePlanId
              ? 'Değişiklik kaydediliyor...'
              : 'İzin planı kaydediliyor...';

        }


        const saved =
          await savePersonnelLeavePlanToFirebase(
            plan
          );


        if (!saved) {

          if (leavePlanMessage) {

            leavePlanMessage.textContent =
              'İzin planı Firebase\'e kaydedilemedi.';

          }

          return;
        }


        if (editingLeavePlanId) {

          leavePlans =
            leavePlans.map(
              (item) =>
                item.id === plan.id
                  ? { ...plan }
                  : item
            );

        } else {

          leavePlans.push(
            plan
          );

        }


        editingLeavePlanId =
          null;


        if (leavePlanMessage) {

          leavePlanMessage.className =
            'save-status is-ok';

          leavePlanMessage.textContent =
            '✓ İzin planı kaydedildi.';

        }


        if (leavePlanDate) {
          leavePlanDate.value = '';
        }

        if (leavePlanDuration) {
          leavePlanDuration.value = '';
        }

        if (leavePlanNote) {
          leavePlanNote.value = '';
        }

        if (leavePlanStatus) {
          leavePlanStatus.value =
            'Tahmini';
        }


        const submitButton =
          leavePlanForm.querySelector(
            'button[type="submit"]'
          );


        if (submitButton) {

          submitButton.textContent =
            'Planı Kaydet';

        }


        renderLeavePlans();

      }
    );

  }


  renderLeavePlans();

  loadSelectedPerson();

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
async function renderWorkTasks(staff, company, dateFrom, dateTo) {
    /*
   * Önceki canlı Firebase dinleyicilerini kapat.
   */
  if (
    Array.isArray(
      window._workRecordUnsubscribers
    )
  ) {

    window._workRecordUnsubscribers.forEach(
      (unsubscribe) => {

        try {
          unsubscribe();
        } catch (err) {
          console.error(
            'Önceki iş kaydı dinleyicisi kapatılamadı:',
            err
          );
        }

      }
    );

  }

  window._workRecordUnsubscribers = [];
  const taskContent =
    document.querySelector('#dash-task-content') ||
    document.querySelector('#task-content');

  const taskTitle =
    document.querySelector('#dash-task-title') ||
    document.querySelector('#task-title');

  const taskSummary =
    document.querySelector('#dash-task-summary') ||
    document.querySelector('#task-summary');

  const taskCounter =
    document.querySelector('#dash-task-counter') ||
    document.querySelector('#task-counter');

  const saveStatus =
    document.querySelector('#dash-save-status') ||
    document.querySelector('#task-save-status');

  const saveBtn =
    document.querySelector('#dash-save-btn') ||
    document.querySelector('#task-save-btn');

  const saveRow =
    document.querySelector('#dash-save-row') ||
    document.querySelector('#task-save-row');

  const dates = getDateRange(dateFrom, dateTo);

  /*
   * Yeni Firebase yetki matrisi yükleniyor.
   */
  let permissionMatrix = {};

  try {
    permissionMatrix =
      await loadPermissionMatrixFromFirebase();
  } catch (err) {
    console.error(
      'İş takip yetki matrisi yüklenemedi:',
      err
    );
  }

  const staffMatrix =
    permissionMatrix[staff] &&
      typeof permissionMatrix[staff] === 'object'
      ? permissionMatrix[staff]
      : {};

  /*
   * Firma yetkisi
   */
  const companyPermissions =
    staffMatrix.companies &&
      typeof staffMatrix.companies === 'object'
      ? staffMatrix.companies
      : {};

  const companyAllowed =
    companyPermissions[company] === true;

  /*
   * Tarih kontrolü
   */
  if (!dates.length) {
    if (taskTitle) {
      taskTitle.textContent =
        `${staff} · Günlük işlemler`;
    }

    if (taskSummary) {
      taskSummary.textContent =
        `${company} · Seçili tarih aralığı yok`;
    }

    if (taskCounter) {
      taskCounter.textContent =
        '0 / 0 tamamlandı';
    }

    if (taskContent) {
      taskContent.innerHTML =
        '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Tarih aralığı seçilmemiş veya geçersiz.</strong><p>Başlangıç ve bitiş tarihlerini doğru şekilde seçin.</p></div></div>';
    }

    if (saveRow) {
      saveRow.style.display = 'none';
    }

    if (saveStatus) {
      setSaveStatus(
        saveStatus,
        '',
        ''
      );
    }

    return;
  }

  /*
   * Firma yetkisi yoksa hiçbir iş türü gösterilmez.
   */
  if (!companyAllowed) {
    if (taskTitle) {
      taskTitle.textContent =
        `${staff} · Günlük işlemler`;
    }

    if (taskSummary) {
      taskSummary.textContent =
        `${company} · Yetki yok`;
    }

    if (taskCounter) {
      taskCounter.textContent =
        'Yetki yok';
    }

    if (saveRow) {
      saveRow.style.display =
        'none';
    }

    if (taskContent) {
      taskContent.innerHTML =
        '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Bu firma için görüntüleme yetkiniz bulunmuyor.</strong><p>Yöneticinizden bu firmaya erişim yetkisi istemeniz gerekir.</p></div></div>';
    }

    if (saveStatus) {
      setSaveStatus(
        saveStatus,
        '',
        ''
      );
    }

    return;
  }

  /*
   * Yeni iş türü yetkileri
   *
   * yok    = gösterme
   * gor    = göster ama değiştirme
   * islem  = göster ve değiştirebil
   */
  const taskPermissions =
    staffMatrix.tasks &&
      staffMatrix.tasks[company] &&
      typeof staffMatrix.tasks[company] === 'object'
      ? staffMatrix.tasks[company]
      : {};

  const allTasks =
    getTaskTypes();

  const visibleTasks =
    allTasks.filter(
      (task) => {
        const permission =
          taskPermissions[task];

        return (
          permission === 'gor' ||
          permission === 'islem'
        );
      }
    );

  const editableTasks =
    visibleTasks.filter(
      (task) =>
        taskPermissions[task] === 'islem'
    );

  /*
   * Firma var fakat hiçbir iş türüne yetki yok.
   */
  if (!visibleTasks.length) {
    if (taskTitle) {
      taskTitle.textContent =
        `${staff} · Günlük işlemler`;
    }

    if (taskSummary) {
      taskSummary.textContent =
        `${company} · İş türü yetkisi yok`;
    }

    if (taskCounter) {
      taskCounter.textContent =
        '0 / 0';
    }

    if (saveRow) {
      saveRow.style.display =
        'none';
    }

    if (taskContent) {
      taskContent.innerHTML =
        '<div class="permission-empty"><span class="permission-icon">!</span><div><strong>Bu firma için görüntüleyebileceğiniz iş türü bulunmuyor.</strong><p>Yöneticinizden iş türü görüntüleme yetkisi istemeniz gerekir.</p></div></div>';
    }

    if (saveStatus) {
      setSaveStatus(
        saveStatus,
        '',
        ''
      );
    }

    return;
  }

  /*
   * En az bir iş türü işlem yetkisine sahipse
   * Kaydet alanını gösteriyoruz.
   *
   * Sadece görüntüleme yetkisi varsa Kaydet gizlenir.
   */
  if (saveRow) {
    saveRow.style.display =
      editableTasks.length
        ? ''
        : 'none';
  }

  const formattedRange =
    dateFrom && dateTo
      ? `<span class="date-from">${formatDateTr(dateFrom)}</span> — <span class="date-to">${formatDateTr(dateTo)}</span>`
      : formatDateTr(
        dateFrom || dateTo
      );

  let totalTasks = 0;
  let totalCompleted = 0;
  let lastRecordDate = '';

  /*
   * Firebase'den seçilen bütün tarihlerdeki kayıtları
   * önce bekliyoruz.
   */
  const records =
    await Promise.all(
      dates.map(
        (date) =>
          getWorkRecord(
            staff,
            company,
            date
          )
      )
    );

  const dateBlocks =
    dates
      .map(
        (date, dateIndex) => {
          const record =
            records[dateIndex];

          const saved =
            visibleTasks.map(
              (task) =>
                !!(
                  record &&
                  record.tasksByName &&
                  record.tasksByName[task]
                )
            );

          const completedSaved =
            saved.filter(Boolean).length;

          totalTasks +=
            visibleTasks.length;

          totalCompleted +=
            completedSaved;

          if (
            record &&
            record.updatedAt &&
            (
              !lastRecordDate ||
              record.updatedAt >
              lastRecordDate
            )
          ) {
            lastRecordDate =
              record.updatedAt;
          }

          const dateFormatted =
            formatDateTr(date);

          return `
            <div class="task-date-block">
              <div class="task-date-head">
                <span class="task-date-label">
                  ${dateFormatted}
                </span>

                <span class="task-date-summary">
                  ${completedSaved} / ${visibleTasks.length} tamamlandı
                </span>
              </div>

              <div class="task-date-content">

                ${visibleTasks
              .map(
                (task, idx) => {
                  const permission =
                    taskPermissions[task];

                  const canEditTask =
                    permission === 'islem';

                  return `
  <div class="task-entry">
    <label
      class="task-row${canEditTask ? '' : ' task-readonly'}"
    >
      <input
        type="checkbox"
        class="task-check"
        data-date="${date}"
        data-task="${task}"
        ${saved[idx] ? 'checked' : ''}
        ${canEditTask ? '' : 'disabled'}
      />

      <span class="task-box"></span>

      <span class="task-name">
        <strong>${task}</strong>
        <small>
          ${dateFormatted} · ${company}
          ${canEditTask ? '' : ' · Sadece görüntüleme'}
        </small>
      </span>
    </label>

    <div class="task-quantity-wrap">
      <label>Gerçekleşen adet</label>
      <input
        type="number"
        class="task-quantity"
        data-date="${date}"
        data-task="${task}"
        min="0"
        step="1"
        inputmode="numeric"
        placeholder="Adet"
        value="${record && record.quantitiesByName && record.quantitiesByName[task] !== undefined ? record.quantitiesByName[task] : ''}"
        ${canEditTask ? '' : 'disabled'}
      />
    </div>
  </div>
`;
                }
              )
              .join('')}

              </div>
            </div>
          `;
        }
      )
      .join('');

  if (taskTitle) {
    taskTitle.textContent =
      `${staff} · Günlük işlemler`;
  }

  if (taskSummary) {
    taskSummary.innerHTML =
      `${company} · ${formattedRange}`;
  }

  if (taskCounter) {
    taskCounter.textContent =
      `${totalCompleted} / ${totalTasks} tamamlandı`;
  }

  if (taskContent) {
    taskContent.innerHTML =
      dateBlocks;
  }
/*
 * FIREBASE GERÇEK ZAMANLI İŞ KAYDI DİNLEME
 *
 * Başka bir kullanıcı işaretleme yaptığında
 * açık ekran otomatik olarak güncellenir.
 */

if (
  taskContent &&
  window.firebaseOnSnapshot &&
  window.firebaseDoc &&
  window.firebaseDb
) {

  dates.forEach(
    (date) => {

      const recordKey =
        getWorkKey(
          staff,
          company,
          date
        );

      const workRef =
        window.firebaseDoc(
          window.firebaseDb,
          window.firebaseWorkRecordCollection ||
            'workRecords',
          recordKey
        );


      const unsubscribe =
        window.firebaseOnSnapshot(
          workRef,
          (snapshot) => {

            if (!snapshot.exists()) {
              return;
            }


            const record =
              snapshot.data();


            const tasksByName =
              record &&
              record.tasksByName &&
              typeof record.tasksByName === 'object'
                ? record.tasksByName
                : {};


            /*
             * İlgili tarihteki checkbox'ları
             * Firebase'deki son duruma getir.
             */

            const dateBoxes =
              Array.from(
                taskContent.querySelectorAll(
                  '.task-check'
                )
              ).filter(
                (box) =>
                  box.getAttribute(
                    'data-date'
                  ) === date
              );


            dateBoxes.forEach(
              (box) => {

                const taskName =
                  box.getAttribute(
                    'data-task'
                  );

                if (!taskName) {
                  return;
                }


                /*
                 * Kullanıcı o anda elle değişiklik
                 * yapıyorsa üzerine yazma.
                 */

                if (
                  saveStatus &&
                  saveStatus.dataset.dirty ===
                    'true'
                ) {
                  return;
                }


                box.checked =
                  !!tasksByName[taskName];

              }
            );


            /*
             * İlgili günün tamamlanma sayısını güncelle.
             */

            const dateBlock =
              Array.from(
                taskContent.querySelectorAll(
                  '.task-date-block'
                )
              ).find(
                (block) =>
                  block.querySelector(
                    `.task-check[data-date="${date}"]`
                  )
              );


            if (dateBlock) {

              const checkedCount =
                dateBlock.querySelectorAll(
                  '.task-check:checked'
                ).length;


              const totalCount =
                dateBlock.querySelectorAll(
                  '.task-check'
                ).length;


              const dateSummary =
                dateBlock.querySelector(
                  '.task-date-summary'
                );


              if (dateSummary) {

                dateSummary.textContent =
                  `${checkedCount} / ${totalCount} tamamlandı`;

              }

            }


            /*
             * Genel toplamı güncelle.
             */

            const completed =
              taskContent.querySelectorAll(
                '.task-check:checked'
              ).length;


            const total =
              taskContent.querySelectorAll(
                '.task-check'
              ).length;


            if (taskCounter) {

              taskCounter.textContent =
                `${completed} / ${total} tamamlandı`;

            }


            /*
             * Kayıt zamanı bilgisini güncelle.
             */

            if (
              saveStatus &&
              saveStatus.dataset.dirty !==
                'true'
            ) {

              if (
                record.updatedAt
              ) {

                setSaveStatus(
                  saveStatus,
                  'ok',
                  `✓ Canlı güncellendi. Son kayıt: ${formatUpdatedAt(record.updatedAt)}`
                );

              }

            }

          },
          (error) => {

            console.error(
              'Firebase canlı iş kaydı dinlenemedi:',
              error
            );

          }
        );


      window._workRecordUnsubscribers.push(
        unsubscribe
      );

    }
  );

}
  if (saveStatus) {
    if (lastRecordDate) {
      setSaveStatus(
        saveStatus,
        'ok',
        `✓ ${dates.length} gün için kayıtlı veri yüklendi. Son kayıt: ${formatUpdatedAt(lastRecordDate)}`
      );
    } else {
      if (editableTasks.length) {
        setSaveStatus(
          saveStatus,
          '',
          `${dates.length} gün için henüz kayıt yok — işaretleyip Kaydet'e basın.`
        );
      } else {
        setSaveStatus(
          saveStatus,
          '',
          `${dates.length} gün için kayıtlı veriler görüntüleniyor.`
        );
      }
    }
  }

  /*
   * Sadece işlem yetkisi olan checkbox'lar
   * değiştirilebilir.
   */
  if (taskContent) {
    taskContent
      .querySelectorAll(
        '.task-check:not(:disabled)'
      )
      .forEach(
        (checkbox) => {
          checkbox.addEventListener(
            'change',
            () => {
              const completed =
                taskContent.querySelectorAll(
                  '.task-check:checked'
                ).length;

              const total =
                taskContent.querySelectorAll(
                  '.task-check'
                ).length;

              if (taskCounter) {
                taskCounter.textContent =
                  `${completed} / ${total} tamamlandı`;
              }

              if (saveStatus) {
                setSaveStatus(
                  saveStatus,
                  'dirty',
                  'Kaydedilmemiş değişiklik var — Kaydet\'e basın.'
                );
              }
            }
          );
        }
      );
  }

  /*
   * KAYDET
   */
  /*
   * ADET DEĞİŞİKLİĞİ
   */
  if (taskContent) {
    taskContent
      .querySelectorAll('.task-quantity:not(:disabled)')
      .forEach((input) => {
        input.addEventListener('input', () => {
          if (saveStatus) {
            setSaveStatus(
              saveStatus,
              'dirty',
              'Kaydedilmemiş değişiklik var — Kaydet’e basın.'
            );
          }
        });
      });
  }
  if (saveBtn) {
    saveBtn.onclick =
      async () => {

        /*
         * Genel firma işlem yetkisi artık
         * permissionMatrix üzerinden kontrol ediliyor.
         */
        const hasEditPermission =
          editableTasks.length > 0;

        if (!hasEditPermission) {
          setSaveStatus(
            saveStatus,
            'dirty',
            'İşlem yetkiniz yok — sadece görüntüleyebilirsiniz.'
          );

          return;
        }

        if (!taskContent) {
          return;
        }

        const editableBoxes =
          Array.from(
            taskContent.querySelectorAll(
              '.task-check:not(:disabled)'
            )
          );

        const allBoxes =
          Array.from(
            taskContent.querySelectorAll(
              '.task-check'
            )
          );

        const totalBoxes =
          allBoxes.length;

        let savedCount = 0;
        let firebaseSaveFailed =
          false;

        for (const date of dates) {

          const dateBoxes =
            Array.from(
              taskContent.querySelectorAll(
                `.task-check[data-date="${date}"]`
              )
            );

          /*
           * Mevcut kayıt varsa önce mevcut
           * değerleri koruyoruz.
           */
          const existingRecord =
            await getWorkRecord(
              staff,
              company,
              date
            );

          const existingByName =
            existingRecord &&
              existingRecord.tasksByName &&
              typeof existingRecord.tasksByName === 'object'
              ? {
                ...existingRecord.tasksByName
              }
              : {};

          /*
           * Sadece işlem yetkisi olan iş türleri
           * değiştirilebilir.
           *
           * Gör yetkisi olan fakat işlem yetkisi
           * olmayan işlerin mevcut kayıtları
           * korunur.
           */
          dateBoxes.forEach(
            (box) => {

              const taskName =
                box.getAttribute(
                  'data-task'
                );

              if (!taskName) {
                return;
              }

              const permission =
                taskPermissions[taskName];

              if (
                permission === 'islem'
              ) {
                existingByName[taskName] =
                  box.checked;
              }
            }
          );

          const current =
            visibleTasks.map(
              (task) =>
                !!existingByName[task]
            );

          const byName = {};

          visibleTasks.forEach(
            (task) => {
              byName[task] =
                !!existingByName[task];
            }
          );

          /*
           * Firebase'deki mevcut kayıt
           * görünmeyen iş türlerini de kaybetmesin.
           */
          if (
            existingRecord &&
            existingRecord.tasksByName
          ) {
            Object.keys(
              existingRecord.tasksByName
            ).forEach(
              (taskName) => {

                if (
                  !Object.prototype.hasOwnProperty.call(
                    byName,
                    taskName
                  )
                ) {
                  byName[taskName] =
                    existingRecord
                      .tasksByName[taskName];
                }
              }
            );
          }
const existingQuantities =
            existingRecord &&
            existingRecord.quantitiesByName &&
            typeof existingRecord.quantitiesByName === 'object'
              ? { ...existingRecord.quantitiesByName }
              : {};

          const quantityBoxes = Array.from(
            taskContent.querySelectorAll(
              `.task-quantity[data-date="${date}"]`
            )
          );

          quantityBoxes.forEach((box) => {
            const taskName =
              box.getAttribute('data-task');

            if (
              taskName &&
              taskPermissions[taskName] === 'islem'
            ) {
              const rawValue = box.value.trim();

              if (rawValue === '') {
                existingQuantities[taskName] = 0;
                return;
              }

              const quantity = Number(rawValue);

              if (
                Number.isSafeInteger(quantity) &&
                quantity >= 0
              ) {
                existingQuantities[taskName] = quantity;
              }
            }
          });

          const saved =
            await saveWorkRecord(
              staff,
              company,
              date,
              current,
              byName,
              existingQuantities
            );

          if (!saved) {
            firebaseSaveFailed =
              true;
          } else {
            savedCount +=
              current.filter(Boolean)
                .length;

            rememberLastWorkDate(
              date
            );
          }
        }

        if (firebaseSaveFailed) {
          setSaveStatus(
            saveStatus,
            'dirty',
            'Bazı günlük kayıtlar Firebase\'e kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
          );

          return;
        }

        if (taskCounter) {
          const completed =
            taskContent.querySelectorAll(
              '.task-check:checked'
            ).length;

          taskCounter.textContent =
            `${completed} / ${totalBoxes} tamamlandı`;
        }

        setSaveStatus(
          saveStatus,
          'ok',
          `✓ ${dates.length} gün Firebase'e kaydedildi — ${savedCount}/${totalBoxes} tamamlandı.`
        );
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
  const visibleCompanies = getCompanies().filter((company) => canView(staffName, company));
  let open = true;
  try { open = localStorage.getItem(DASH_PANEL_KEY) !== 'closed'; } catch (err) { }
  return `
    <section class="panel dash-work-panel${open ? '' : ' is-collapsed'}" id="dash-work-panel">
      <div class="panel-header dash-work-head">
        <div><h2>İş Takip — Günlük İşlemler</h2><p class="panel-subtitle">Tarih seçin, o güne ait görevleri işaretleyip Kaydet'e basın. Her tarih ayrı saklanır.</p></div>
        <div class="dash-work-head-actions"><span class="task-counter" id="dash-task-counter">0 / 0 tamamlandı</span><button class="collapse-toggle" id="dash-work-toggle" type="button" aria-expanded="${open}"><span class="collapse-chevron">▾</span><span id="dash-work-toggle-text">${open ? 'Kapat' : 'Aç'}</span></button></div>
      </div>
      <div class="dash-work-body" id="dash-work-body">
        <form id="dash-work-form" class="work-form">
          <label class="field">Personel<input type="text" name="staff-display" value="${staffName}" disabled /><input type="hidden" name="staff" value="${staffName}" /></label>
          <label class="field">Firma<select name="company">${visibleCompanies.map((company) => `<option>${company}</option>`).join('')}</select></label>
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
        <div class="brand">
          <span class="brand-mark">İŞ</span>
          <span>İş Süreç Yönetimi</span>
        </div>

        <div class="art-copy">
          <h1>Süreçlerinize netlik kazandırın.</h1>
          <p>Ekibinizin iş akışlarını tek merkezden yönetin, ölçün ve geliştirin.</p>
        </div>
      </div>

      <div class="login-panel">
        <form class="login-card" id="login-form">
          <h2>Tekrar hoş geldiniz</h2>
          <p>Yönetim panelinize erişmek için giriş yapın.</p>

          <label class="field">
            E-posta adresi
            <input type="email" name="email" placeholder="ad@firma.com" required />
          </label>

          <label class="field">
            Şifre
            <input type="password" name="password" placeholder="••••••••" required />
          </label>

          <button class="primary-btn" type="submit">Panele giriş yap</button>

          <div class="demo-note" id="login-note">
            Kendi kullanıcı bilgilerinizle giriş yapın. Örn: ad@firma.com
          </div>
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

    const matchedUser = users.find(
      (user) => user.email.toLowerCase() === email
    );

    const note = document.querySelector('#login-note');

    try {
      await window.firebaseSignIn(
        window.firebaseAuth,
        email,
        password
      );

      const valid = true;

      if (!form.isConnected) return;

      if (!valid) {
        note.textContent =
          'E-posta veya şifre hatalı. Lütfen kendi kullanıcı bilgilerinizle tekrar deneyin.';
        note.style.background = '#fdecec';
        note.style.color = '#a33a3a';
        return;
      }

      const firebaseUser = window.firebaseAuth.currentUser;

      console.log(
        'FIREBASE OTURUM:',
        firebaseUser.uid,
        firebaseUser.email
      );

      const userDoc = await window.firebaseGetDoc(
        window.firebaseDoc(
          window.firebaseDb,
          'users',
          firebaseUser.uid
        )
      );

      if (!userDoc.exists()) {
        throw new Error('Kullanıcı profili bulunamadı.');
      }

      const profile = userDoc.data();

      console.log('FIREBASE PROFİL TEST:', profile);

      currentUser = {
        email: firebaseUser.email,
        title: profile.title || 'Personel',
        name: profile.name || firebaseUser.email
      };

      console.log('CURRENT USER TEST:', currentUser);

      renderDashboard();

    } catch (err) {
      console.error('Firebase giriş hatası:', err);

      note.textContent =
        'Firebase hata: ' + (err.code || err.message || err);

      note.style.background = '#fdecec';
      note.style.color = '#a33a3a';

    } finally {
      button.disabled = false;
    }
  });
}
function renderPageBody(active) {
  try {
    if (active === 'Yetkilendirme') return renderAccessMatrixContent();
    if (active === 'Personel İzin ve Özlük') return renderPersonnelLeaveContent();
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

    if (!currentUser) {

      renderLogin();

      return;

    }


    // Firebase'deki ortak personel listesini ilk açılışta yükle.
    if (
      !window._sharedStaffLoaded &&
      !window._sharedStaffLoading
    ) {

      // Firebase henüz hazır değilse biraz bekleyip tekrar dene.
      if (
        !window.firebaseDb ||
        !window.firebaseDoc ||
        !window.firebaseGetDoc
      ) {

        setTimeout(() => {

          renderDashboard(active);

        }, 500);

        return;

      }


      window._sharedStaffLoading = true;


      loadSharedStaffFromFirebase()

        .then((loaded) => {

          if (loaded) {

            window._sharedStaffLoaded = true;

          } else {

            console.error(
              'Firebase ortak personel listesi yüklenemedi.'
            );

            window._sharedStaffLoaded = true;

          }


          return loadSharedStaffMetaFromFirebase();

        })


        .then(() => {

          /*
           * Personel listesini gerçek zamanlı dinlemeye başla.
           */
          if (
            !window._sharedStaffUnsubscribe
          ) {

            window._sharedStaffUnsubscribe =
              listenSharedStaffFromFirebase();

          }

        })


        .then(() => {

          return loadSharedCompaniesFromFirebase();

        })


        .then(() => {

          /*
           * Firma listesini gerçek zamanlı dinlemeye başla.
           */
          if (
            !window._sharedCompaniesUnsubscribe
          ) {

            window._sharedCompaniesUnsubscribe =
              listenSharedCompaniesFromFirebase();

          }

        })


        .then(() => {

          if (
            typeof sharedCompaniesCache !== 'undefined' &&
            Array.isArray(sharedCompaniesCache)
          ) {

            companies = [
              ...sharedCompaniesCache
            ];

          }


          return loadSharedPermsFromFirebase();

        })


        .then(() => {

          /*
           * Yetkileri gerçek zamanlı dinlemeye başla.
           */
          if (
            !window._sharedPermsUnsubscribe
          ) {

            window._sharedPermsUnsubscribe =
              listenSharedPermsFromFirebase();

          }

        })


        .then(() => {

          return loadSharedTaskTypesFromFirebase();

        })


        .then(() => {

          /*
           * İş türlerini gerçek zamanlı dinlemeye başla.
           */
          if (
            !window._sharedTaskTypesUnsubscribe
          ) {

            window._sharedTaskTypesUnsubscribe =
              listenSharedTaskTypesFromFirebase();

          }

        })


        .then(() => {

          return loadSharedTaskPermsFromFirebase();

        })


        .then(() => {

          /*
           * Personel bazlı iş türü yetkilerini
           * gerçek zamanlı dinlemeye başla.
           */
          if (
            !window._sharedTaskPermsUnsubscribe
          ) {

            window._sharedTaskPermsUnsubscribe =
              listenSharedTaskPermsFromFirebase();

          }

        })


        .then(() => {

          /*
           * Yıl / Dönem Yönetimi kişiye özel olduğu için
           * burada sadece mevcut planları yükle.
           * Gerçek zamanlı ortak dinleme yapılmıyor.
           */
          return loadSharedPlansFromFirebase();

        })


        .then(() => {

          return loadReportWorkRecordsFromFirebase();

        })


        .then(() => {

          window._sharedStaffLoading = false;

          renderDashboard(active);

        })


        .catch((err) => {

          console.error(
            'Ortak Firebase verileri yüklenemedi:',
            err
          );


          window._sharedStaffLoading = false;

          window._sharedStaffLoaded = true;

          renderDashboard(active);

        });


      return;

    }


    const user = currentUser;

    const requested =
      active || 'Yönetim Paneli';


    const safeActive =
      (
        requested === 'Yetkilendirme' ||
        requested === 'Personel İzin ve Özlük'
      ) &&
      !isAdminUser()
        ? 'Yönetim Paneli'
        : requested;


    window._lastPage =
      safeActive;


    app.innerHTML = `

    <section class="app-shell">

      <aside
        class="sidebar"
        id="sidebar"
      >

        <div class="brand">

          <span class="brand-mark">
            İŞ
          </span>

          <span>
            İş Süreç Yönetimi
          </span>

        </div>


        <p class="nav-label">
          Çalışma alanı
        </p>


        <nav class="nav">

          ${menuItems
            .filter(
              ([, label]) =>
                label !== 'Yetkilendirme' &&
                label !== 'Personel İzin ve Özlük' ||
                isAdminUser()
            )
            .map(
              ([icon, label]) => {

                if (
                  label === 'Kullanıcı Yönetimi'
                ) {

                  const parentCls =
                    safeActive ===
                    'Kullanıcı Yönetimi'
                      ? ' active'
                      : '';


                  const childCls =
                    safeActive === 'İş Takip'
                      ? ' active'
                      : '';


                  return `

                    <div
                      class="nav-group is-open"
                    >

                      <button
                        type="button"
                        class="nav-item${parentCls}"
                        data-page="Kullanıcı Yönetimi"
                      >

                        <span class="nav-icon">
                          ${icon}
                        </span>

                        <span>
                          ${label}
                        </span>

                        <span class="nav-caret">
                          ▾
                        </span>

                      </button>


                      <div
                        class="nav-submenu"
                      >

                        <button
                          type="button"
                          class="nav-item nav-child${childCls}"
                          data-page="İş Takip"
                        >

                          <span class="nav-icon">
                            ✓
                          </span>

                          <span>
                            İş Takip
                          </span>

                        </button>

                      </div>

                    </div>

                  `;

                }


                const cls =
                  label === safeActive
                    ? ' active'
                    : '';


                return `

                  <button
                    type="button"
                    class="nav-item${cls}"
                    data-page="${label}"
                  >

                    <span class="nav-icon">
                      ${icon}
                    </span>

                    <span>
                      ${label}
                    </span>

                  </button>

                `;

              }
            )
            .join('')}

        </nav>


        <div class="sidebar-footer">

          <div class="profile">

            <div>

              ${getUserAvatarHtml(
                user.email,
                user.name
              )}

              <div>

                <strong>
                  ${escapeHtml(user.name)}
                </strong>

                <small>
                  ${escapeHtml(
                    getStaffTitle(user.name)
                  )}
                </small>

              </div>

            </div>


            <div class="profile-actions">

              ${getProfileActionsHtml(
                user.email,
                user.name
              )}

            </div>

          </div>


          <button
            class="logout"
            id="logout"
          >
            ↪ &nbsp; Güvenli çıkış
          </button>

        </div>

      </aside>


      <div class="content">

        <header class="topbar">

          <button
            class="mobile-menu"
            id="menu-toggle"
            aria-label="Menüyü aç"
          >
            ☰
          </button>


          <div class="breadcrumb">

            Ana sayfa&nbsp; / &nbsp;

            <strong>
              ${safeActive}
            </strong>

          </div>


          <div class="top-actions">

            <button
              class="notification"
              aria-label="Bildirimler"
            >
              ♧
            </button>


            <span class="date-chip">
              10 Eylül 2026
            </span>

          </div>

        </header>


        ${renderPageBody(safeActive)}

      </div>

    </section>

    `;


    document
      .querySelector('#logout')
      .addEventListener(
        'click',
        renderLogin
      );


    document
      .querySelector('#menu-toggle')
      .addEventListener(
        'click',
        () =>
          document
            .querySelector('#sidebar')
            .classList
            .toggle('open')
      );


    document
      .querySelectorAll('[data-page]')
      .forEach(
        (item) =>

          item.addEventListener(
            'click',
            (e) => {

              if (e) {

                e.preventDefault();
                e.stopPropagation();

              }


              const p =
                item.getAttribute(
                  'data-page'
                );


              renderDashboard(
                p || 'Yönetim Paneli'
              );

            }
          )
      );


    document
      .querySelector('.nav')
      .addEventListener(
        'click',
        (e) => {

          const b =
            e.target.closest(
              '[data-page]'
            );


          if (!b) {

            return;

          }


          e.preventDefault();
          e.stopPropagation();


          renderDashboard(
            b.getAttribute(
              'data-page'
            ) ||
            'Yönetim Paneli'
          );

        }
      );


    if (
      safeActive === 'Yetkilendirme'
    ) {

      setupAccessMatrix();

      setupAnnouncementPermissions();

    }


    if (
      safeActive ===
      'Personel İzin ve Özlük'
    ) {

      setupPersonnelLeave();

    }


    if (
      safeActive === 'Yönetim Paneli'
    ) {

      setupPasswordPanel();

    }


    if (
      safeActive === 'Duyurular'
    ) {

      setupAnnouncements();

    }


    if (
      safeActive === 'Ayın Elemanı'
    ) {

      setupEmployeeSelection();

    }


    if (
      safeActive === 'Firma Yönetimi'
    ) {

      setupCompanyManagement();

    }


    if (
      safeActive ===
      'Yıl / Dönem Yönetimi'
    ) {

      setupPeriodPlans();

    }


    if (
      safeActive ===
      'Personel Yönetimi'
    ) {

      setupStaffManagement();

    }


    if (
      safeActive === 'Raporlar'
    ) {

      setupReports();

    }


    if (
      safeActive ===
      'Personel Soruları'
    ) {

      setupQuestions();

    }


    if (
      safeActive === 'Notlar'
    ) {

      setupNotes();

    }


    if (
      safeActive === 'İş Takip'
    ) {

      setupWorkTracking();

    }


    setupProfileActions();


  } catch (err) {

    app.innerHTML =
      '<div class="permission-empty" style="margin:40px;">' +
      '<span class="permission-icon">!</span>' +
      '<div>' +
      '<strong>Sayfa açılamadı.</strong>' +
      '<p>' +
      ((err && err.message) || err) +
      '</p>' +
      '<button class="primary-btn" onclick="location.reload()">' +
      'Yenile' +
      '</button>' +
      '</div>' +
      '</div>';

  }

}


renderLogin();