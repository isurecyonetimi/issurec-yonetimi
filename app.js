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
function renderDailyWelcome() {
  const thoughts = window.dailyQuotes || [];

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate())
      - startOfYear) / 86400000
  );

  const thought = thoughts.length
    ? thoughts[dayOfYear % thoughts.length]
    : {
        quote: 'Küçük adımlar, büyük değişimlerin başlangıcıdır.',
        note: 'Bugün kendin için küçük ama anlamlı bir adım at.',
        theme: 'Yeni başlangıçlar'
      };

  return `
    <section class="daily-welcome-card">
      <div class="daily-welcome-top">
        <div>
          <span class="daily-welcome-eyebrow">KENDİNE KÜÇÜK BİR MOLA</span>
          <h2>Bugün nasıl hissediyorsun?</h2>
          <p class="daily-welcome-description">
            Kendine bir an ayır. Her gün aynı olmak zorunda değil.
          </p>
        </div>
        <span class="daily-welcome-symbol" aria-hidden="true">✦</span>
      </div>

      <div class="daily-mood-options">
        <button type="button" class="daily-mood-button"
          aria-pressed="false"
          onclick="selectDailyMood('Harika', this)">
          <span>☀</span> Harika
        </button>
        <button type="button" class="daily-mood-button"
          aria-pressed="false"
          onclick="selectDailyMood('İyi', this)">
          <span>☺</span> İyi
        </button>
        <button type="button" class="daily-mood-button"
          aria-pressed="false"
          onclick="selectDailyMood('Yorgun', this)">
          <span>☁</span> Yorgun
        </button>
        <button type="button" class="daily-mood-button"
          aria-pressed="false"
          onclick="selectDailyMood('Düşünceli', this)">
          <span>☾</span> Düşünceli
        </button>
      </div>

      <p class="daily-mood-message" id="daily-mood-message"
        aria-live="polite">
        Bugün kendine nasıl davranmak istediğini seçebilirsin.
      </p>

      <div class="daily-thought">
        <span class="daily-thought-label">GÜNÜN SÖZÜ</span>
        <blockquote>“${thought.quote}”</blockquote>
        <p class="daily-welcome-description">${thought.note}</p>
        <span class="daily-thought-author">${thought.theme}</span>
      </div>
    </section>
  `;
}

function selectDailyMood(mood, button) {
  const container = button.closest('.daily-welcome-card');
  if (!container) return;

  container.querySelectorAll('.daily-mood-button').forEach(function (item) {
    item.classList.remove('selected');
    item.setAttribute('aria-pressed', 'false');
  });

  button.classList.add('selected');
  button.setAttribute('aria-pressed', 'true');

  const messages = {
    'Harika': 'Bu güzel enerjini koru; bugün kendin için de güzel bir şey yap.',
    'İyi': 'Güzel. Küçük adımlar da seni ileriye taşır.',
    'Yorgun': 'Kendine yüklenme. Bazen yavaşlamak da ilerlemenin bir parçasıdır.',
    'Düşünceli': 'Her şeyi hemen çözmek zorunda değilsin. Kendine zaman tanı.'
  };

  const message = container.querySelector('#daily-mood-message');
  if (message) message.textContent = messages[mood] || '';
}
function renderMyDashboardStats() {
  try {
    const s = getMyDashboardStats();

    const cards = [
      {
        icon: '▣',
        title: 'Görebildiğim cari',
        value: s.visibleCompanies.length,
        detail: s.earliest
          ? formatDateTr(s.earliest) + ' itibarıyla'
          : 'Tanımlı cari',
        color: 'blue'
      },
      {
        icon: '◷',
        title: 'Yapmam gereken iş',
        value: s.totalExpected,
        detail: s.visibleCompanies.length + ' cari · ' +
          s.allowedTasks.length + ' iş türü',
        color: 'purple'
      },
      {
        icon: '✓',
        title: 'Tamamladığım',
        value: s.totalDone,
        detail: '%' + s.pct + ' tamamlanma',
        color: 'green'
      },
      {
        icon: '!',
        title: 'Eksik / bekleyen',
        value: s.totalMissing,
        detail: 'Tamamlanması gereken işler',
        color: 'orange'
      }
    ].map(function (item) {
      return `
        <article class="dash-metric dash-${item.color}">
          <div class="dash-metric-top">
            <span class="dash-metric-title">${item.title}</span>
            <span class="dash-metric-icon">${item.icon}</span>
          </div>
          <div class="dash-metric-value">${item.value}</div>
          <div class="dash-metric-detail">${item.detail}</div>
        </article>
      `;
    }).join('');

    const rows = s.perCompany.length
      ? s.perCompany.map(function (r) {
          const percent = r.expected > 0
            ? Math.max(0, Math.min(100, Math.round(r.done / r.expected * 100)))
            : 0;

          return `
            <div class="dash-company-row">
              <div class="dash-company-icon ${
                r.missing === 0 ? 'is-complete' : ''
              }">${r.missing === 0 ? '✓' : '▣'}</div>

              <div class="dash-company-info">
                <div class="dash-company-heading">
                  <strong>${r.company}</strong>
                  <span class="dash-company-status ${
                    r.missing === 0 ? 'is-complete' : 'is-pending'
                  }">${r.missing === 0 ? 'Tamamlandı' : r.missing + ' eksik'}</span>
                </div>

                <div class="dash-company-meta">
                  Tanımlanma: ${formatDateTr(r.createdAt)}
                  <span>•</span> Gereken: ${r.expected}
                  <span>•</span> Yapılan: ${r.done}
                  <span>•</span> Kalan: ${r.missing}
                </div>

                <div class="dash-progress-track">
                  <div class="dash-progress-fill ${
                    r.missing === 0 ? 'is-complete' : ''
                  }" style="width:${percent}%"></div>
                </div>
                <div class="dash-progress-label">%${percent} tamamlandı</div>
              </div>
            </div>
          `;
        }).join('')
      : `
        <div class="permission-empty">
          <span class="permission-icon">▣</span>
          <div>
            <strong>Henüz görebildiğiniz cari yok.</strong>
            <p>Yöneticinizden firma erişim yetkisi isteyin.</p>
          </div>
        </div>
      `;

    const overallPercent = Math.max(
      0,
      Math.min(100, Number(s.pct) || 0)
    );

    return `
      <section class="dash-overview">
        <div class="dash-welcome">
          <div class="dash-welcome-content">
            <span class="dash-eyebrow">İŞ SÜREÇ YÖNETİMİ</span>
            <h1>Hoş geldin, ${s.me} 👋</h1>
            <p>İş durumunu takip et, tamamlanan işleri gör ve
            bekleyen görevlerini kolayca kontrol et.</p>
          </div>
          <div class="dash-welcome-decoration" aria-hidden="true">
            <div class="dash-decoration-circle"></div>
            <div class="dash-decoration-icon">▦</div>
          </div>
        </div>

        ${renderDailyWelcome()}

        <div class="dash-section-heading">
          <div>
            <h2>Genel durum</h2>
            <p>Sana tanımlanan işlerin güncel özeti</p>
          </div>
          <span class="dash-live-label">
            <span class="dash-live-dot"></span> Kişisel özetin
          </span>
        </div>

        <section class="dash-metrics">
          ${cards}
        </section>

        <section class="dash-completion">
          <div class="dash-completion-info">
            <div>
              <span class="dash-completion-label">Genel tamamlanma</span>
              <strong>İş ilerleme durumun</strong>
            </div>
            <div class="dash-completion-number">%${overallPercent}</div>
          </div>
          <div class="dash-completion-track">
            <div class="dash-completion-fill"
                 style="width:${overallPercent}%"></div>
          </div>
          <div class="dash-completion-footer">
            <span>${s.totalDone} iş tamamlandı</span>
            <span>${s.totalMissing} iş bekliyor</span>
          </div>
        </section>

        <section class="panel dash-company-panel">
          <div class="panel-header dash-company-panel-header">
            <div>
              <h2>Carilerime göre durum</h2>
              <p class="panel-subtitle">
                Her carinin tanımlanma tarihinden itibaren iş ilerlemesi
              </p>
            </div>
            <span class="task-counter">
              ${s.totalDone} / ${s.totalExpected} tamamlandı
            </span>
          </div>
          <div class="task-content dash-company-list">
            ${rows}
          </div>
        </section>
      </section>
    `;
  } catch (err) {
    console.error('Yönetim paneli yükleme hatası:', err);
    return `
      <div class="permission-empty">
        <span class="permission-icon">!</span>
        <div>
          <strong>Panel yüklenemedi.</strong>
          <p>Lütfen sayfayı yenileyip tekrar deneyin.</p>
        </div>
      </div>
    `;
  }
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
let sharedTaskPointsCache = null;

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
      sharedTaskTypesCache = null;
      sharedTaskPointsCache = {};
      return false;
    }

    const data = snapshot.data() || {};

    const cleanList = Array.isArray(data.taskTypes)
      ? data.taskTypes
          .filter((name) => typeof name === 'string')
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

    const savedPoints =
      data.taskPoints &&
      typeof data.taskPoints === 'object' &&
      !Array.isArray(data.taskPoints)
        ? data.taskPoints
        : {};

    const cleanPoints = {};

    cleanList.forEach((name) => {
      const value = Number(savedPoints[name] ?? 1);

      cleanPoints[name] =
        Number.isFinite(value) && value >= 0 ? value : 1;
    });

    sharedTaskTypesCache = cleanList;
    sharedTaskPointsCache = cleanPoints;

    try {
      localStorage.setItem(
        TASK_TYPE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) {}

    console.log('Firebase iş türleri ve puanları yüklendi:', {
      taskTypes: cleanList,
      taskPoints: cleanPoints
    });

    return true;
  } catch (err) {
    console.error(
      'Firebase iş türleri ve puanları yüklenemedi:',
      err
    );
    return false;
  }
}

async function saveSharedTaskTypesToFirebase(list, taskPoints) {
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

    const currentPoints =
      taskPoints && typeof taskPoints === 'object'
        ? taskPoints
        : (sharedTaskPointsCache || {});

    const cleanPoints = {};

    cleanList.forEach((name) => {
      const value = Number(currentPoints[name] ?? 1);

      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`"${name}" için geçerli bir puan girin.`);
      }

      cleanPoints[name] = value;
    });

    const taskTypesRef = window.firebaseDoc(
      window.firebaseDb,
      TASK_TYPE_FIREBASE_COLLECTION,
      TASK_TYPE_FIREBASE_DOC
    );

    await window.firebaseSetDoc(taskTypesRef, {
      taskTypes: cleanList,
      taskPoints: cleanPoints,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    sharedTaskTypesCache = [...cleanList];
    sharedTaskPointsCache = { ...cleanPoints };

    try {
      localStorage.setItem(
        TASK_TYPE_KEY,
        JSON.stringify(cleanList)
      );
    } catch (err) {}

    console.log(
      'Firebase ortak iş türleri ve puanları kaydedildi:',
      cleanList,
      cleanPoints
    );

    return true;
  } catch (err) {
    console.error(
      'Firebase iş türleri ve puanları kaydedilemedi:',
      err
    );
    return false;
  }
}

function getTaskPoints() {
  const points = sharedTaskPointsCache || {};

  return Object.fromEntries(
    getTaskTypes().map((name) => [
      name,
      Number.isFinite(Number(points[name]))
        ? Number(points[name])
        : 1
    ])
  );
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
  return `${staff} || ${company} || ${date}`;
}

// Eski kayıtların anahtarını bulmak için korunur.
function getLegacyWorkKey(company, date) {
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

    // Önce yeni personel + firma + tarih anahtarını kontrol et.
    const recordKey = getWorkKey(staff, company, date);

    const workRef = window.firebaseDoc(
      window.firebaseDb,
      window.firebaseWorkRecordCollection || 'workRecords',
      recordKey
    );

    const snapshot = await window.firebaseGetDoc(workRef);

    if (snapshot.exists()) {
      const record = snapshot.data();

      if (!Array.isArray(record.tasks)) {
        return null;
      }

      // Yeni kaydın personele ait olduğunu doğrula.
      if (
        record.staff &&
        record.staff !== staff
      ) {
        console.error('İş kaydındaki personel eşleşmiyor:', recordKey);
        return null;
      }

      return record;
    }

    // Eski anahtarla bulunan kayıtları otomatik olarak
    // başka bir personele atamayız.
    const legacyKey = getLegacyWorkKey(company, date);

    const legacyRef = window.firebaseDoc(
      window.firebaseDb,
      window.firebaseWorkRecordCollection || 'workRecords',
      legacyKey
    );

    const legacySnapshot = await window.firebaseGetDoc(legacyRef);

    if (!legacySnapshot.exists()) {
      return null;
    }

    const legacyRecord = legacySnapshot.data();

    if (!Array.isArray(legacyRecord.tasks)) {
      return null;
    }

    const recordedStaff =
      legacyRecord.staff || legacyRecord.updatedBy || '';

    if (recordedStaff !== staff) {
      console.warn(
        'Eski kayıt personele kesin olarak eşleştirilemedi; otomatik kullanılmadı.',
        legacyKey
      );

      return null;
    }

    return legacyRecord;
  } catch (err) {
    console.error('Firebase günlük iş kaydı okunamadı:', err);
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
      staff: staff,
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
// İş Takip ekranında personel alanı giriş yapan kullanıcıya göre doldurulur.
const users = [
  { email: 'ayse.yilmaz@firma.com', password: '1234', name: 'Ayşe Yılmaz', title: 'Yönetici' },
  { email: 'mehmet.kaya@firma.com', password: '1234', name: 'Mehmet Kaya', title: 'Personel' },
  { email: 'elif.demir@firma.com', password: '1234', name: 'Elif Demir', title: 'Personel' },
  { email: 'ahmet.sahin@firma.com', password: '1234', name: 'Ahmet Şahin', title: 'Personel' },
  { email: 'zeynep.aras@firma.com', password: '1234', name: 'Zeynep Aras', title: 'Personel' }
];

const USER_NAME_KEY = 'isSurecUserNamesV1';

function loadUserNames() {
  try {
    const raw = localStorage.getItem(USER_NAME_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) {
    console.error('Kullanıcı adları okunamadı:', err);
  }

  return {};
}

function saveUserNames(data) {
  try {
    localStorage.setItem(USER_NAME_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Kullanıcı adları kaydedilemedi:', err);
  }
}

function resolveUserName(user) {
  const names = loadUserNames();
  return (names && names[user.email]) || user.name;
}

let currentUser = null;


// --------------------------------------------------
// PERSONEL SORULARI - FIREBASE ORTAK KAYIT SİSTEMİ
// --------------------------------------------------

const QUESTION_KEY = 'isSurecQuestionsV1';

window._sharedQuestionsCache =
  window._sharedQuestionsCache || [];

window._sharedQuestionsLoaded =
  window._sharedQuestionsLoaded || false;


// Soruları oku.
function loadQuestions() {
  if (window._sharedQuestionsLoaded) {
    return window._sharedQuestionsCache.slice();
  }

  try {
    const raw = localStorage.getItem(QUESTION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.error('Yerel sorular okunamadı:', err);
  }

  return [];
}


// Soruları Firebase'e kaydet.
async function saveQuestions(list) {
  if (
    !window.firebaseDb ||
    typeof window.firebaseCollection !== 'function' ||
    typeof window.firebaseDoc !== 'function' ||
    typeof window.firebaseSetDoc !== 'function'
  ) {
    console.error('Firebase soru kayıt bağlantısı hazır değil.');
    return false;
  }

  try {
    const collectionRef = window.firebaseCollection(
      window.firebaseDb,
      'personelSorulari'
    );

    await Promise.all(
      list.map((question) => {
        if (!question.id) {
          throw new Error('Soru kaydında kimlik bilgisi bulunamadı.');
        }

        const questionRef = window.firebaseDoc(
          collectionRef,
          String(question.id)
        );

        const { id, ...data } = question;

        return window.firebaseSetDoc(
          questionRef,
          data,
          { merge: true }
        );
      })
    );

    window._sharedQuestionsCache = list.slice();
    window._sharedQuestionsLoaded = true;

    return true;
  } catch (err) {
    console.error('Sorular Firebase’e kaydedilemedi:', err);
    return false;
  }
}


// Kullanıcının görebileceği soruları belirle.
function getVisibleQuestions() {
  const me = currentUser ? currentUser.name : '';
  const all = loadQuestions();

  if (isAdminUser()) {
    return all;
  }

  return all.filter(
    (question) =>
      question.from === me || question.to === me
  );
}


// Firebase sorularını gerçek zamanlı dinle.
function setupSharedQuestionsListener() {
  if (window._sharedQuestionsUnsubscribe) return;

  if (
    !window.firebaseDb ||
    typeof window.firebaseCollection !== 'function' ||
    typeof window.firebaseOnSnapshot !== 'function'
  ) {
    console.error('Firebase soru dinleme bağlantısı hazır değil.');
    return;
  }

  const questionsRef = window.firebaseCollection(
    window.firebaseDb,
    'personelSorulari'
  );

  window._sharedQuestionsUnsubscribe =
    window.firebaseOnSnapshot(
      questionsRef,
      (snapshot) => {
        window._sharedQuestionsCache = snapshot.docs.map(
          (documentSnapshot) => ({
            ...documentSnapshot.data(),
            id: documentSnapshot.id
          })
        );

        window._sharedQuestionsLoaded = true;

        if (document.querySelector('.question-page')) {
          renderDashboard('Personel Soruları');
        }
      },
      (err) => {
        console.error(
          'Ortak personel soruları alınamadı:',
          err
        );
      }
    );
}

const NOTE_KEY = 'isSurecNotesV1';
function loadNotes() { try { const raw = localStorage.getItem(NOTE_KEY); const p = raw ? JSON.parse(raw) : null; if (Array.isArray(p)) return p; } catch (err) { } return []; }
function saveNotes(list) { try { localStorage.setItem(NOTE_KEY, JSON.stringify(list)); } catch (err) { window.alert('Not kaydedilemedi (depolama dolu olabilir, daha küçük dosya deneyin).'); } }
function getMyNotes() {
  const me = currentUser ? currentUser.name : '';
  const uid = window.firebaseAuth?.currentUser?.uid || '';

  // Mevcut tarayıcıdaki notları koru.
  const localNotes = loadNotes().filter(
    (note) => note.staff === me
  );

  // Firebase'den yüklenen kişisel notlar.
  const remoteNotes = Array.isArray(window._personalNotesCache)
    ? window._personalNotesCache.filter(
        (note) => note.ownerUid === uid && uid
      )
    : [];

  // Aynı not iki kez görünmesin.
  const notesById = new Map();

  localNotes.forEach((note) => {
    notesById.set(note.id, note);
  });

  remoteNotes.forEach((note) => {
    notesById.set(note.id, {
      ...notesById.get(note.id),
      ...note
    });
  });

  return Array.from(notesById.values()).sort(
    (a, b) =>
      (a.createdAt < b.createdAt ? 1 : -1)
  );
}

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
  const selectedAvatar =
    typeof currentUser !== 'undefined' &&
    currentUser &&
    avatarKey(currentUser.email) === avatarKey(email)
      ? currentUser.avatar
      : null;

  if (selectedAvatar) {
    return `
      <span class="system-profile-avatar">
        ${getSystemAvatarHtml(selectedAvatar)}
      </span>
    `;
  }

  const avatar = loadUserAvatar(email);

  if (avatar && avatar.indexOf('data:image/') === 0) {
    return '<img src="' + avatar +
      '" alt="Profil resmi" class="profile-avatar-img" />';
  }

  return '<span class="avatar">' +
    escapeHtml(getInitials(name || '?')) +
    '</span>';
}
function getProfileActionsHtml(email, name) {
  const avatar = loadUserAvatar(email);

  return `
    <button
      class="profile-upload-btn"
      type="button"
      data-open-avatar-picker="${escapeHtml(email)}"
      style="margin-right:6px;"
    >
      Avatar seç
    </button>

    <button
      class="profile-upload-btn"
      type="button"
      data-change-avatar="${escapeHtml(email)}"
      style="margin-right:6px;"
    >
      Fotoğraf yükle
    </button>

    ${avatar ? `
      <button
        class="profile-remove-btn"
        type="button"
        data-remove-avatar="${escapeHtml(email)}"
      >
        Fotoğrafı kaldır
      </button>
    ` : ''}
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
}function canEdit(staff, company) {
  return getPermRecord(staff, company) === 'islem';
}

function renderAccessMatrixContent() {
  if (!isAdminUser()) {
    return '<div class="permission-empty">Bu panel yalnızca yöneticilere açıktır.</div>';
  }

  const firms = getCompanies();
  const people = Array.from(new Set([
    ...getStaff(),
    ...(currentUser && currentUser.name ? [currentUser.name] : [])
  ]));

  const focusStaff = window._permFocus || people[0] || '';
  const taskPoints = getTaskPoints();
  const taskTypes = getTaskTypes();

  return `
    <div class="access-page">

      <section class="access-hero">
        <div class="access-hero-content">
          <span class="access-eyebrow">
            <span class="access-eyebrow-dot"></span>
            YÖNETİM VE GÜVENLİK
          </span>
          <h1>Yetkilendirme Merkezi</h1>
          <p>Personel erişimlerini, firma izinlerini ve görev yetkilerini tek bir merkezden yönetin.</p>

          <div class="access-hero-tags">
            <span><span class="access-tag-icon">✓</span> Firma erişimleri</span>
            <span><span class="access-tag-icon">✓</span> İşlem izinleri</span>
            <span><span class="access-tag-icon">✓</span> Puan yönetimi</span>
          </div>
        </div>

        <div class="access-hero-art" aria-hidden="true">
          <div class="access-shield"><span>✓</span></div>
          <span class="access-orbit access-orbit-one"></span>
          <span class="access-orbit access-orbit-two"></span>
        </div>
      </section>

      <section class="access-summary">
        <article class="access-summary-card">
          <span class="access-summary-icon access-icon-blue">♙</span>
          <div>
            <span class="access-summary-label">Personel</span>
            <strong>${people.length}</strong>
            <small>Yetki yönetimi kapsamındaki kişiler</small>
          </div>
        </article>

        <article class="access-summary-card">
          <span class="access-summary-icon access-icon-teal">▦</span>
          <div>
            <span class="access-summary-label">Firma</span>
            <strong>${firms.length}</strong>
            <small>Erişim izni tanımlanabilecek firmalar</small>
          </div>
        </article>

        <article class="access-summary-card">
          <span class="access-summary-icon access-icon-purple">✓</span>
          <div>
            <span class="access-summary-label">İş türü</span>
            <strong>${taskTypes.length}</strong>
            <small>Yetkilendirilebilecek görev türleri</small>
          </div>
        </article>
      </section>

      <!-- PERSONEL SEÇİMİ -->
      <section class="access-panel">
        <div class="access-section-heading">
          <div class="access-section-icon">♙</div>
          <div>
            <h2>Personel seçimi</h2>
            <p>Yetkilerini görüntülemek ve düzenlemek istediğiniz kişiyi seçin.</p>
          </div>
        </div>

        ${people.length ? `
          <form id="perm-focus-form" class="access-person-form">
            <label class="access-field">
              <span>Yetkileri düzenlenecek personel</span>
              <select name="staff" id="perm-focus-staff">
                ${people.map(s => `
                  <option value="${escapeHtml(s)}"${s === focusStaff ? ' selected' : ''}>${escapeHtml(s)}</option>
                `).join('')}
              </select>
            </label>

            <button class="access-primary-btn" type="submit">
              Personeli görüntüle <span>→</span>
            </button>
          </form>
        ` : `
          <div class="access-empty">
            <span>♙</span>
            <strong>Henüz personel bulunmuyor.</strong>
            <p>Önce Personel Yönetimi bölümünden personel ekleyin.</p>
          </div>
        `}
      </section>

      <!-- FİRMA YETKİLERİ -->
      <section class="access-panel">
        <div class="access-section-heading">
          <div class="access-section-icon access-section-teal">▦</div>
          <div>
            <h2>Firma yetkileri</h2>
            <p>Seçili personelin hangi firmaları görüntüleyebileceğini belirleyin.</p>
          </div>
          <span class="access-section-count">${firms.length} firma</span>
        </div>

        <div class="access-search-wrap">
          <span class="access-search-icon">⌕</span>
          <input
            type="search"
            id="access-company-search"
            class="access-search-input"
            placeholder="Firma adıyla ara..."
            aria-label="Firma yetkilerinde firma ara"
          />
        </div>

        <div class="access-company-grid">
          ${firms.length ? firms.map(company => `
            <label
              class="access-company-card"
              data-access-company-card="${escapeHtml(company)}"
            >
              <span class="access-company-symbol">▦</span>

              <span class="access-company-text">
                <strong>${escapeHtml(company)}</strong>
                <small>Firma görüntüleme izni</small>
              </span>

              <input
                type="checkbox"
                class="company-permission-check"
                data-company="${escapeHtml(company)}"
              />

              <span class="access-custom-check"></span>
            </label>
          `).join('') : `
            <div class="access-empty">
              <span>▦</span>
              <strong>Henüz firma bulunmuyor.</strong>
              <p>Önce Firma Yönetimi bölümünden firma ekleyin.</p>
            </div>
          `}
        </div>
      </section>

      <!-- İŞ TÜRÜ YETKİLERİ -->
      <section class="access-panel">
        <div class="access-section-heading">
          <div class="access-section-icon access-section-purple">☷</div>
          <div>
            <h2>İş türü yetkileri</h2>
            <p>Firmaları arayın, açıp kapatın ve görüntüleme veya işlem izinlerini yönetin.</p>
          </div>
        </div>

        <div class="access-search-wrap">
          <span class="access-search-icon">⌕</span>
          <input
            type="search"
            id="access-task-company-search"
            class="access-search-input"
            placeholder="İş türü yetkilerinde firma ara..."
            aria-label="İş türü yetkilerinde firma ara"
          />
        </div>

        ${firms.length ? firms.map(company => `
          <details
            class="access-accordion-company"
            data-access-task-company="${escapeHtml(company)}"
          >
            <summary class="access-task-company-heading">
              <span class="access-company-symbol">▦</span>
              <div>
                <h3>${escapeHtml(company)}</h3>
                <p>Bu firmaya ait görev erişimleri</p>
              </div>
            </summary>

            <div class="access-permission-table">
              <div class="access-permission-head">
                <span>İş türü</span>
                <span>Görüntüleme</span>
                <span>İşlem yapma</span>
              </div>

              ${taskTypes.length ? taskTypes.map(task => `
                <div class="access-permission-row">
                  <span class="access-permission-task">
                    <strong>${escapeHtml(task)}</strong>
                  </span>

                  <label class="access-permission-toggle" title="Görevi görsün">
                    <input
                      type="checkbox"
                      class="task-view-check"
                      data-company="${escapeHtml(company)}"
                      data-task="${escapeHtml(task)}"
                    />
                    <span class="access-toggle-ui"></span>
                  </label>

                  <label class="access-permission-toggle" title="Görev üzerinde işlem yapabilsin">
                    <input
                      type="checkbox"
                      class="task-edit-check"
                      data-company="${escapeHtml(company)}"
                      data-task="${escapeHtml(task)}"
                    />
                    <span class="access-toggle-ui"></span>
                  </label>
                </div>
              `).join('') : `
                <div class="access-empty access-empty-compact">
                  Henüz iş türü tanımlanmadı.
                </div>
              `}
            </div>
          </details>
        `).join('') : `
          <div class="access-empty">
            Firma eklediğinizde iş türü izinlerini burada yönetebilirsiniz.
          </div>
        `}
      </section>

      <!-- DUYURU YETKİLERİ -->
      <section class="access-panel">
        <div class="access-section-heading">
          <div class="access-section-icon access-section-orange">▤</div>
          <div>
            <h2>Duyuru yetkileri</h2>
            <p>Personelin duyuruları görüntüleme ve yönetme izinlerini belirleyin.</p>
          </div>
        </div>

        <div class="access-announcement-grid">
          ${[
            { permission: 'view', icon: '◉', title: 'Duyuruları görsün', desc: 'Yayımlanan duyuruları görüntüleyebilir.' },
            { permission: 'create', icon: '+', title: 'Duyuru oluştursun', desc: 'Yeni duyuru oluşturabilir.' },
            { permission: 'edit', icon: '✎', title: 'Duyuru düzenlesin', desc: 'Duyuru içeriklerini düzenleyebilir.' },
            { permission: 'delete', icon: '×', title: 'Duyuru silsin', desc: 'Duyuruları silebilir.' }
          ].map(item => `
            <label class="access-announcement-card">
              <span class="access-announcement-icon">${item.icon}</span>
              <span class="access-announcement-text">
                <strong>${item.title}</strong>
                <small>${item.desc}</small>
              </span>
              <input
                type="checkbox"
                class="announcement-permission-check"
                data-permission="${item.permission}"
              />
              <span class="access-custom-check"></span>
            </label>
          `).join('')}
        </div>
      </section>

      <!-- İŞ TÜRÜ VE PUAN YÖNETİMİ -->
      <section class="access-panel">
        <div class="access-section-heading">
          <div class="access-section-icon access-section-blue">✦</div>
          <div>
            <h2>İş türü ve puan yönetimi</h2>
            <p>İş türleri oluşturun ve Ayın Elemanı hesaplamasında kullanılacak puanları belirleyin.</p>
          </div>
        </div>

        <form id="tasktype-form" class="access-tasktype-form">
          <label class="access-field">
            <span>İş türü adı</span>
            <input
              type="text"
              name="taskName"
              placeholder="Örn. Fatura kesildi"
              maxlength="150"
              required
            />
          </label>

          <label class="access-field access-points-field">
            <span>İş puanı</span>
            <input
              type="number"
              name="taskPoints"
              min="0"
              step="0.5"
              value="1"
              required
            />
          </label>

          <button class="access-primary-btn" type="submit">
            <span>+</span> İş türü ekle
          </button>
        </form>

        <div class="access-tasktype-list">
          ${taskTypes.length ? taskTypes.map(task => `
            <div class="access-tasktype-item">
              <span class="access-tasktype-symbol">✓</span>
              <span class="access-tasktype-name">
                <strong>${escapeHtml(task)}</strong>
                <small>Görev puanı</small>
              </span>
              <span class="access-points-pill">${Number(taskPoints[task] ?? 1)} puan</span>
              <button
                type="button"
                class="access-delete-btn"
                data-del-task="${escapeHtml(task)}"
                aria-label="${escapeHtml(task)} iş türünü sil"
                title="İş türünü sil"
              >Sil</button>
            </div>
          `).join('') : `
            <div class="access-empty access-empty-compact">
              Henüz iş türü eklenmedi.
            </div>
          `}
        </div>

        <div class="access-inline-status">
          <span class="save-status" id="perm-save-status"></span>
        </div>
      </section>

      <!-- YETKİLERİ KAYDET -->
      <section class="access-save-panel">
        <div class="access-save-copy">
          <span class="access-save-icon">✓</span>
          <div>
            <strong>Yetki değişikliklerini kaydet</strong>
            <p>Seçili personel için yaptığınız değişiklikleri kaydetmeden önce kontrol edin.</p>
          </div>
        </div>

        <div class="access-save-actions">
          <span
            class="save-status"
            id="permission-matrix-status"
            role="status"
            aria-live="polite"
          ></span>
          <button
            type="button"
            class="access-primary-btn access-save-btn"
            id="permission-matrix-save"
          >
            Yetkileri Kaydet <span>→</span>
          </button>
        </div>
      </section>

      ${renderAnnouncementPermissions()}

    </div>
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

  const staffSelect = document.querySelector('#perm-focus-staff');
  const saveBtn = document.querySelector('#permission-matrix-save');
  const status = document.querySelector('#permission-matrix-status');

  if (!staffSelect || !saveBtn) return;
  // Firma yetkileri arama
const companySearch = document.querySelector('#access-company-search');

if (companySearch) {
  companySearch.addEventListener('input', () => {
    const query = companySearch.value.trim().toLocaleLowerCase('tr-TR');

    document.querySelectorAll('[data-access-company-card]').forEach((card) => {
      const companyName = (
        card.dataset.accessCompanyCard || ''
      ).toLocaleLowerCase('tr-TR');

      card.hidden = query !== '' && !companyName.includes(query);
    });
  });
}

// İş türü yetkileri arama
const taskCompanySearch = document.querySelector('#access-task-company-search');

if (taskCompanySearch) {
  taskCompanySearch.addEventListener('input', () => {
    const query = taskCompanySearch.value.trim().toLocaleLowerCase('tr-TR');

    document.querySelectorAll('[data-access-task-company]').forEach((item) => {
      const companyName = (
        item.dataset.accessTaskCompany || ''
      ).toLocaleLowerCase('tr-TR');

      const matches = companyName.includes(query);
      item.hidden = !matches;

      if (query && matches) {
        item.open = true;
      }
    });
  });
}

  function getSelectedStaff() {
    return staffSelect.value;
  }

  function showStatus(message, success = false) {
    if (!status) return;

    status.className = success
      ? 'save-status is-ok'
      : 'save-status';

    status.textContent = message;
    status.style.display = 'inline-block';
  }

  function loadCompanyChecks() {
    const staff = getSelectedStaff();
    const perms = loadPerms();

    document.querySelectorAll('.company-permission-check')
      .forEach((checkbox) => {
        const company = checkbox.dataset.company;
        const key = `${staff} || ${company}`;
        const value = perms[key];

        checkbox.checked = value === 'islem' || value === 'gor';
      });
  }

  async function loadTaskMatrix() {
    try {
      return await loadPermissionMatrixFromFirebase();
    } catch (err) {
      console.error('Yeni iş türü yetki matrisi okunamadı:', err);
      return {};
    }
  }

  async function loadTaskChecks() {
    const staff = getSelectedStaff();
    const matrix = await loadTaskMatrix();
    const staffMatrix = matrix[staff] || {};
    const taskMatrix = staffMatrix.tasks || {};

    document.querySelectorAll('.task-view-check')
      .forEach((checkbox) => {
        const company = checkbox.dataset.company;
        const task = checkbox.dataset.task;
        const value = taskMatrix?.[company]?.[task];

        checkbox.checked = value === 'gor' || value === 'islem';
      });

    document.querySelectorAll('.task-edit-check')
      .forEach((checkbox) => {
        const company = checkbox.dataset.company;
        const task = checkbox.dataset.task;
        const value = taskMatrix?.[company]?.[task];

        checkbox.checked = value === 'islem';
      });

    document.querySelectorAll('.task-edit-check')
      .forEach((editCheckbox) => {
        const company = editCheckbox.dataset.company;
        const task = editCheckbox.dataset.task;

        const viewCheckbox = document.querySelector(
          `.task-view-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
        );

        if (editCheckbox.checked && viewCheckbox) {
          viewCheckbox.checked = true;
        }
      });
  }

  document.querySelectorAll('.task-edit-check')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const company = checkbox.dataset.company;
        const task = checkbox.dataset.task;

        const viewCheckbox = document.querySelector(
          `.task-view-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
        );

        if (checkbox.checked && viewCheckbox) {
          viewCheckbox.checked = true;
        }
      });
    });

  document.querySelectorAll('.task-view-check')
    .forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) return;

        const company = checkbox.dataset.company;
        const task = checkbox.dataset.task;

        const editCheckbox = document.querySelector(
          `.task-edit-check[data-company="${CSS.escape(company)}"][data-task="${CSS.escape(task)}"]`
        );

        if (editCheckbox) {
          editCheckbox.checked = false;
        }
      });
    });

  staffSelect.addEventListener('change', async () => {
    window._permFocus = getSelectedStaff();
    loadCompanyChecks();
    await loadTaskChecks();
  });

  const focusForm = document.querySelector('#perm-focus-form');

  if (focusForm) {
    focusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      window._permFocus = getSelectedStaff();
      loadCompanyChecks();
      await loadTaskChecks();
    });
  }

  saveBtn.addEventListener('click', async () => {
    const staff = getSelectedStaff();
    if (!staff) return;

    if (window._permissionMatrixUnlockTimer) {
      clearTimeout(window._permissionMatrixUnlockTimer);
      window._permissionMatrixUnlockTimer = null;
    }

    window._savingPermissionMatrix = true;
    saveBtn.disabled = true;
    showStatus('Yetkiler kaydediliyor...');

    try {
      const companyPerms = loadPerms();

      getCompanies().forEach((company) => {
        const key = `${staff} || ${company}`;

        const checkbox = document.querySelector(
          `.company-permission-check[data-company="${CSS.escape(company)}"]`
        );

        if (!checkbox) return;
        companyPerms[key] = checkbox.checked ? 'gor' : 'yok';
      });

      const companySaved = await saveSharedPermsToFirebase(companyPerms);

      if (!companySaved) {
        throw new Error('Firma yetkileri Firebase’e kaydedilemedi.');
      }

      const permissionMatrix = await loadPermissionMatrixFromFirebase();

      if (!permissionMatrix[staff] || typeof permissionMatrix[staff] !== 'object') {
        permissionMatrix[staff] = {};
      }

      if (!permissionMatrix[staff].companies || typeof permissionMatrix[staff].companies !== 'object') {
        permissionMatrix[staff].companies = {};
      }

      if (!permissionMatrix[staff].tasks || typeof permissionMatrix[staff].tasks !== 'object') {
        permissionMatrix[staff].tasks = {};
      }

      getCompanies().forEach((company) => {
        const checkbox = document.querySelector(
          `.company-permission-check[data-company="${CSS.escape(company)}"]`
        );

        permissionMatrix[staff].companies[company] =
          checkbox ? checkbox.checked : false;
      });

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

          permissionMatrix[staff].tasks[company][task] = permission;
        });
      });

      const matrixSaved = await savePermissionMatrixToFirebase(permissionMatrix);

      if (!matrixSaved) {
        throw new Error('Yeni yetki matrisi Firebase’e kaydedilemedi.');
      }

      sharedPermsCache = { ...companyPerms };

      try {
        localStorage.setItem(PERM_KEY, JSON.stringify(companyPerms));
      } catch (err) {}

      sharedPermissionMatrixCache =
        JSON.parse(JSON.stringify(permissionMatrix));

      showStatus(`✓ ${staff} personelinin yetkileri kaydedildi.`, true);
      console.log('Yetki kaydı tamamlandı:', staff);

    } catch (err) {
      console.error('Yetki matrisi kaydedilemedi:', err);
      showStatus(`Yetkiler kaydedilemedi: ${err.message}`);

    } finally {
      saveBtn.disabled = false;

      window._permissionMatrixUnlockTimer = setTimeout(() => {
        window._savingPermissionMatrix = false;
        window._permissionMatrixUnlockTimer = null;
      }, 5000);
    }
  });

  loadCompanyChecks();
  loadTaskChecks();

  /*
   * İŞ TÜRÜ SİLME
   */

  document.querySelectorAll('[data-del-task]')
    .forEach((button) => {
      button.addEventListener('click', async () => {
        const taskName = button.dataset.delTask;
        if (!taskName) return;

        const list = getTaskTypes().filter((task) => task !== taskName);
        const points = { ...getTaskPoints() };

        delete points[taskName];

        try {
          const firebaseTaskSaved =
            await saveSharedTaskTypesToFirebase(list, points);

          if (!firebaseTaskSaved) {
            throw new Error('İş türü ve puan bilgileri Firebase’e kaydedilemedi.');
          }

          saveTaskTypes(list);

          const matrix = await loadPermissionMatrixFromFirebase();

          Object.keys(matrix).forEach((person) => {
            if (!matrix[person] || typeof matrix[person] !== 'object') {
              return;
            }

            const tasks = matrix[person].tasks;

            if (!tasks || typeof tasks !== 'object') {
              return;
            }

            Object.keys(tasks).forEach((company) => {
              if (tasks[company] && typeof tasks[company] === 'object') {
                delete tasks[company][taskName];
              }
            });
          });

          const matrixSaved = await savePermissionMatrixToFirebase(matrix);

          if (!matrixSaved) {
            throw new Error('İş türü silindi ancak yetki matrisi güncellenemedi.');
          }

          renderDashboard('Yetkilendirme');

        } catch (err) {
          console.error('İş türü silinemedi:', err);
          showStatus(err.message);
        }
      });
    });

  /*
   * YENİ İŞ TÜRÜ EKLEME
   */

  const taskForm = document.querySelector('#tasktype-form');

  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(taskForm);

      const value = (formData.get('taskName') || '').toString().trim();

      const rawPoints = (formData.get('taskPoints') ?? '')
        .toString()
        .trim()
        .replace(',', '.');

      if (!value) {
        showStatus('Lütfen iş türünün adını girin.');
        return;
      }

      if (rawPoints === '') {
        showStatus('Lütfen iş türü puanını girin.');
        return;
      }

      const enteredPoints = Number(rawPoints);

      if (!Number.isFinite(enteredPoints) || enteredPoints < 0) {
        showStatus('Puan sıfır veya daha büyük geçerli bir sayı olmalıdır.');
        return;
      }

      const list = getTaskTypes();

      if (
        list.some(
          (task) =>
            task.toLocaleLowerCase('tr') ===
            value.toLocaleLowerCase('tr')
        )
      ) {
        showStatus('Bu iş türü zaten mevcut.');
        return;
      }

      const updatedList = [...list, value];
      const points = { ...getTaskPoints() };

      points[value] = enteredPoints;

      const submitBtn = taskForm.querySelector('[type="submit"]');

      if (submitBtn) submitBtn.disabled = true;

      showStatus('İş türü ve puanı kaydediliyor...');

      try {
        const saved = await saveSharedTaskTypesToFirebase(
          updatedList,
          points
        );

        if (!saved) {
          throw new Error('İş türü ve puanı Firebase’e kaydedilemedi.');
        }

        saveTaskTypes(updatedList);

        showStatus(
          `✓ ${value} iş türü ${enteredPoints} puanla kaydedildi.`,
          true
        );

        setTimeout(() => {
          renderDashboard('Yetkilendirme');
        }, 500);

      } catch (err) {
        console.error('İş türü eklenemedi:', err);
        showStatus(err.message);

      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

function renderStaffContent() {
  const list = getStaff();
  const admin = isAdminUser();
  const editName = window._staffEdit || '';
  const staffMeta = loadCommunity(STAFF_META_KEY);

  const editRow = admin && editName
    ? `
      <div class="staff-edit-box">
        <div class="staff-section-heading">
          <span class="staff-section-icon">✎</span>
          <div>
            <h3>Personel bilgilerini düzenle</h3>
            <p>Personelin adını ve ünvanını güncelleyin.</p>
          </div>
        </div>

        <form id="staff-edit-form" class="work-form community-form staff-form-modern">
          <label class="field">
            Ad Soyad
            <input type="text" name="newName"
              value="${escapeHtml(editName)}"
              maxlength="100" required />
          </label>

          <label class="field">
            Ünvan
            <input type="text" name="staffTitle"
              value="${escapeHtml(staffMeta[editName]?.title || '')}"
              maxlength="100" required />
          </label>

          <button class="primary-btn work-submit staff-action-btn" type="submit">
            ✓ Değişiklikleri kaydet
          </button>
        </form>
      </div>
    `
    : '';

  const staffRows = list.length
    ? list.map((s) => {
        const staffName = String(s);
        const initial = escapeHtml(
          staffName.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'P'
        );

        return `
          <article class="staff-person-card">
            <div class="staff-person-avatar">${initial}</div>

            <div class="staff-person-info">
              <strong>${staffIdentity(s)}</strong>
              <span class="staff-person-caption">Kayıtlı personel</span>
            </div>

            <span class="staff-role-badge">
              <span class="staff-role-dot"></span>
              ${admin ? 'Personel kaydı' : 'Görüntüleme'}
            </span>

            ${admin ? `
              <div class="staff-person-actions">
                <button class="primary-btn work-submit staff-edit-btn"
                  data-edit-staff="${escapeHtml(s)}" type="button">
                  ✎ Düzenle
                </button>

                <button class="primary-btn work-submit staff-delete-btn"
                  data-delete-staff="${escapeHtml(s)}" type="button">
                  × Sil
                </button>
              </div>
            ` : ''}
          </article>
        `;
      }).join('')
    : `
      <div class="staff-empty-state">
        <div class="staff-empty-icon">♟</div>
        <strong>Henüz personel kaydı bulunmuyor.</strong>
        <p>${admin
          ? 'Yeni personel eklemek için yukarıdaki formu kullanabilirsiniz.'
          : 'Personel kayıtları burada görüntülenecektir.'}</p>
      </div>
    `;

  return `
    <section class="staff-page">
      <div class="staff-hero">
        <div class="staff-hero-content">
          <span class="staff-eyebrow">İNSAN KAYNAKLARI</span>
          <h1>Personel Yönetimi</h1>
          <p>${admin
            ? 'Ekibinizi, personel bilgilerini ve görev ünvanlarını tek bir yerden yönetin.'
            : 'Kayıtlı personelleri ve ünvanlarını görüntüleyin.'}</p>

          <div class="staff-hero-tags">
            <span><span class="staff-tag-dot"></span> Personel kayıtları</span>
            <span><span class="staff-tag-dot"></span> Ünvan bilgileri</span>
          </div>
        </div>

        <div class="staff-hero-visual" aria-hidden="true">
          <div class="staff-visual-circle staff-circle-one"></div>
          <div class="staff-visual-circle staff-circle-two"></div>
          <div class="staff-visual-icon">♟</div>
          <div class="staff-visual-label">EKİBİNİZ</div>
        </div>

        <span class="staff-access-label">${admin ? 'Yönetici' : 'Personel'}</span>
      </div>

      <div class="staff-summary-grid">
        <article class="staff-summary-card">
          <div class="staff-summary-icon">♟</div>
          <div>
            <span>Toplam personel</span>
            <strong>${list.length}</strong>
            <small>Kayıtlı çalışan sayısı</small>
          </div>
        </article>

        <article class="staff-summary-card">
          <div class="staff-summary-icon staff-summary-icon-blue">▤</div>
          <div>
            <span>Bilgi yönetimi</span>
            <strong>${admin ? 'Aktif' : 'Görüntüleme'}</strong>
            <small>${admin ? 'Kayıt ve düzenleme yetkisi' : 'Salt okunur erişim'}</small>
          </div>
        </article>

        <article class="staff-summary-card">
          <div class="staff-summary-icon staff-summary-icon-purple">✓</div>
          <div>
            <span>Personel kayıtları</span>
            <strong>${list.length ? 'Hazır' : 'Boş'}</strong>
            <small>Mevcut kayıt durumu</small>
          </div>
        </article>
      </div>

      ${admin ? `
        <section class="panel staff-main-panel">
          <div class="staff-section-heading">
            <span class="staff-section-icon">＋</span>
            <div>
              <h2>Yeni personel ekle</h2>
              <p>Personel bilgilerini doldurarak yeni bir kayıt oluşturun.</p>
            </div>
          </div>

          <form id="staff-form" class="work-form community-form staff-form-modern">
            <label class="field">
              Ad Soyad
              <input type="text" name="staffName"
                placeholder="Örn: Ali Veli"
                maxlength="100" autocomplete="name" required />
            </label>

            <label class="field">
              Ünvan
              <input type="text" name="staffTitle"
                placeholder="Örn: Muhasebe Uzmanı"
                maxlength="100" required />
            </label>

            <label class="field">
              E-posta (kullanıcı adı)
              <input type="email" name="staffEmail"
                placeholder="ornek@firma.com"
                autocomplete="email" required />
            </label>

            <label class="field">
              Şifre
              <input type="password" name="staffPassword"
                minlength="8" maxlength="128"
                autocomplete="new-password"
                placeholder="En az 8 karakter" required />
            </label>

            <label class="field">
              Şifre tekrar
              <input type="password" name="staffPasswordRepeat"
                minlength="8" maxlength="128"
                autocomplete="new-password"
                placeholder="Şifreyi tekrar girin" required />
            </label>

            <div class="staff-form-footer">
              <span class="field-hint">
                <span>ⓘ</span> Şifre 8–128 karakter arasında olmalıdır.
              </span>

              <button class="primary-btn work-submit staff-action-btn" type="submit">
                ＋ Personel ekle
              </button>
            </div>
          </form>

          <div class="save-row staff-save-row">
            <span class="save-status" id="staff-save-status"></span>
          </div>

          ${editRow}
        </section>
      ` : ''}

      <section class="panel staff-main-panel staff-directory-panel">
        <div class="staff-directory-heading">
          <div class="staff-section-heading">
            <span class="staff-section-icon">☷</span>
            <div>
              <h2>Personel listesi</h2>
              <p>Kayıtlı çalışanların adlarını ve ünvan bilgilerini görüntüleyin.</p>
            </div>
          </div>

          <span class="staff-total-badge">${list.length} personel</span>
        </div>

        <div class="staff-directory-list">
          ${staffRows}
        </div>
      </section>
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
     // Güncel personel ünvanını ortak kayda hazırla.
    const meta = loadCommunity(STAFF_META_KEY);

    // Personelin adı değiştiyse eski anahtarı kaldır.
    if (old !== nv) {
      delete meta[old];
    }

    // Yeni adı ve güncel ünvanı kaydet.
    meta[nv] = {
      ...(meta[nv] && typeof meta[nv] === 'object' ? meta[nv] : {}),
      title: title
    };

    if (!saveCommunity(STAFF_META_KEY, meta)) {
      alert('Personel bilgileri yerel kayda yazılamadı.');
      return;
    }

    // Güncel ünvanı Firebase ortak kaynağına kaydet.
    const firebaseMetaSaved = await saveSharedStaffMetaToFirebase(meta);

    if (!firebaseMetaSaved) {
      alert(
        'Personel bilgileri bilgisayarda güncellendi ancak ortak ünvan kaydı Firebase’e kaydedilemedi.'
      );
      return;
    }
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
  const myCompanies = getMyVisibleCompanies(me);

  const companyOptions = myCompanies.length
    ? myCompanies.map((c) => `<option>${c}</option>`).join('')
    : '<option value="">Yetkili cari yok</option>';

  const dueCount = plans.filter((p) => p.date <= today).length;
  const upcomingCount = plans.filter((p) => p.date > today).length;
  const reminderCount = plans.filter((p) => p.remind).length;

  const rows = plans.length
    ? plans.map((p) => {
        const due = p.date <= today;
        const dateText = p.date === today
          ? 'Bugün'
          : p.date < today
            ? 'Tarihi geçti'
            : 'Yaklaşan';

        return `
          <article class="period-plan-card ${due ? 'period-plan-due' : ''}">
            <div class="period-plan-icon ${due ? 'period-icon-due' : 'period-icon-upcoming'}">
              ${due ? '!' : '◷'}
            </div>

            <div class="period-plan-info">
              <strong>${escapeHtml(p.title)}</strong>
              <span class="period-plan-company">${escapeHtml(p.company)}</span>
              <div class="period-plan-meta">
                <span class="period-date-chip">${escapeHtml(p.date)}</span>
                <span class="period-status-chip ${due ? 'period-status-due' : 'period-status-upcoming'}">
                  ${dateText}
                </span>
                ${p.remind ? `
                  <span class="period-reminder-chip">♧ Hatırlatma açık</span>
                ` : ''}
              </div>
            </div>

            <div class="period-plan-actions">
              <button
                class="primary-btn work-submit period-remind-btn"
                data-remind="${escapeHtml(String(p.id))}"
                type="button">
                ${p.remind ? 'Uyarıyı kapat' : 'Beni uyar'}
              </button>

              <button
                class="primary-btn work-submit period-delete-btn"
                data-del="${escapeHtml(String(p.id))}"
                type="button">
                Sil
              </button>
            </div>
          </article>
        `;
      }).join('')
    : `
      <div class="period-empty-state">
        <div class="period-empty-icon">◷</div>
        <strong>Henüz plan oluşturmadınız.</strong>
        <p>Yapmanız gereken işleri tarihleriyle kaydederek kişisel plan listenizi oluşturabilirsiniz.</p>
      </div>
    `;

  return `
    <section class="period-page">
      <div class="period-hero">
        <div class="period-hero-content">
          <span class="period-eyebrow">PLANLAMA VE ORGANİZASYON</span>
          <h1>Yıl / Dönem Yönetimi</h1>
          <p>Planlı işlerinizi tarihlere göre düzenleyin, yaklaşan işlemlerinizi takip edin ve hatırlatmalarınızı yönetin.</p>

          <div class="period-hero-tags">
            <span>◷ Tarih bazlı planlama</span>
            <span>✓ Kişisel iş takibi</span>
          </div>
        </div>

        <div class="period-hero-visual" aria-hidden="true">
          <div class="period-calendar">
            <div class="period-calendar-top"></div>
            <div class="period-calendar-grid">
              <i></i><i></i><i></i><i></i>
              <i></i><i></i><i class="period-calendar-active"></i><i></i>
              <i></i><i></i><i></i><i></i>
            </div>
          </div>
          <span class="period-hero-clock">◷</span>
        </div>

        <span class="period-user-badge">${escapeHtml(me)}</span>
      </div>

      <div class="period-summary-grid">
        <article class="period-summary-card">
          <div class="period-summary-icon period-summary-total">☷</div>
          <div>
            <span>Toplam plan</span>
            <strong>${plans.length}</strong>
            <small>Kayıtlı kişisel planlarınız</small>
          </div>
        </article>

        <article class="period-summary-card">
          <div class="period-summary-icon period-summary-due">!</div>
          <div>
            <span>Günü gelen</span>
            <strong>${dueCount}</strong>
            <small>Bugün veya geçmiş tarihli</small>
          </div>
        </article>

        <article class="period-summary-card">
          <div class="period-summary-icon period-summary-upcoming">◷</div>
          <div>
            <span>Yaklaşan plan</span>
            <strong>${upcomingCount}</strong>
            <small>İleri tarihli planlarınız</small>
          </div>
        </article>

        <article class="period-summary-card">
          <div class="period-summary-icon period-summary-reminder">♧</div>
          <div>
            <span>Hatırlatma açık</span>
            <strong>${reminderCount}</strong>
            <small>Hatırlatma etkin planlar</small>
          </div>
        </article>
      </div>

      <section class="panel period-main-panel">
        <div class="period-section-heading">
          <span class="period-section-icon">＋</span>
          <div>
            <h2>Yeni plan oluştur</h2>
            <p>Plan başlığını, yetkili olduğunuz firmayı ve tarihi belirleyin.</p>
          </div>
        </div>

        <form id="plan-form" class="work-form period-form-modern">
          <label class="field">
            Plan başlığı
            <input
              type="text"
              name="title"
              placeholder="Örn: SGK bildirimi"
              maxlength="200"
              required />
          </label>

          <label class="field">
            Firma
            <select name="company" ${myCompanies.length ? '' : 'disabled'} required>
              ${companyOptions}
            </select>
          </label>

          <label class="field">
            Plan tarihi
            <input type="date" name="date" value="${today}" required />
          </label>

          <button class="primary-btn work-submit period-add-btn" type="submit" ${myCompanies.length ? '' : 'disabled'}>
            <span>＋</span> Plan ekle
          </button>
        </form>

        ${myCompanies.length ? '' : `
          <div class="period-form-warning">
            Yetkili olduğunuz firma bulunmadığı için yeni plan oluşturamazsınız. Yöneticinizden firma erişim yetkisi isteyin.
          </div>
        `}
      </section>

      <section class="panel period-main-panel period-list-panel">
        <div class="period-list-heading">
          <div class="period-section-heading">
            <span class="period-section-icon">☷</span>
            <div>
              <h2>Planlarım</h2>
              <p>Yalnızca kendi planlarınızı görüntülersiniz. Günü gelen planlar ayrıca işaretlenir.</p>
            </div>
          </div>

          <span class="period-total-badge">${plans.length} plan</span>
        </div>

        <div class="period-plan-list">
          ${rows}
        </div>
      </section>
    </section>
  `;
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
      console.error('Firebase rapor bağlantısı hazır değil.');
      return [];
    }

    const recordsRef = window.firebaseCollection(
      window.firebaseDb,
      'workRecords'
    );

    const snapshot = await window.firebaseGetDocs(recordsRef);
    const records = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (!data || !data.date) return;

      const staffValue =
        data.staff ??
        data.staffName ??
        data.personel ??
        data.employee ??
        data.updatedBy ??
        data.createdBy ??
        '';

      const staff =
        typeof staffValue === 'string'
          ? staffValue.trim()
          : '';

      const tasksByName =
        data.tasksByName &&
        typeof data.tasksByName === 'object' &&
        !Array.isArray(data.tasksByName)
          ? data.tasksByName
          : {};

      const quantitiesByName =
        data.quantitiesByName &&
        typeof data.quantitiesByName === 'object' &&
        !Array.isArray(data.quantitiesByName)
          ? data.quantitiesByName
          : {};

      records.push({
        id: docSnapshot.id,
        staff,
        company: data.company || '',
        date: String(data.date),
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        tasksByName,
        quantitiesByName,
        updatedAt: data.updatedAt || ''
      });
    });

    console.log(
      'Ayın Elemanı için okunan iş kayıtları:',
      records.length,
      records
    );

    if (typeof sharedReportWorkRecordsCache !== 'undefined') {
      sharedReportWorkRecordsCache = [...records];
    }

    return records;
  } catch (err) {
    console.error('Firebase rapor kayıtları okunamadı:', err);
    throw err;
  }
} function getReportData(staff, start, end) {
  const store = Array.isArray(sharedReportWorkRecordsCache)
    ? sharedReportWorkRecordsCache
    : [];

  const tasks = getTaskTypes();

  const matrix = sharedPermissionMatrixCache;
  const staffPermissions =
    matrix &&
    typeof matrix === 'object' &&
    matrix[staff] &&
    typeof matrix[staff] === 'object'
      ? matrix[staff]
      : null;

  const taskPermissions =
    staffPermissions &&
    staffPermissions.tasks &&
    typeof staffPermissions.tasks === 'object'
      ? staffPermissions.tasks
      : null;

  const rows = [];
  let done = 0;
  let total = 0;

  // Yetki matrisi yüklenmediyse eksik görev hesaplama.
  if (!taskPermissions) {
    return {
      rows: [],
      done: 0,
      total: 0,
      pct: 0,
      missing: 0,
      byTask: {},
      taskCount: 0
    };
  }

  store.forEach((rec) => {
    if (!rec) return;

    const s = rec.staff || '';
    const c = rec.company || '';
    const d = rec.date || '';

    if (s !== staff) return;
    if (start && d < start) return;
    if (end && d > end) return;

    const companyPermissions = taskPermissions[c];

    // Bu firmada personelin görev yetkisi yoksa sayma.
    if (
      !companyPermissions ||
      typeof companyPermissions !== 'object'
    ) {
      return;
    }

    tasks.forEach((task) => {
      const permission = companyPermissions[task];

      // Yalnızca görüntüleme veya işlem izni olan görevleri say.
      if (permission !== 'gor' && permission !== 'islem') {
        return;
      }

      const value = !!(
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

  rows.sort((a, b) =>
    a.date < b.date ? -1 :
    a.date > b.date ? 1 : 0
  );

  const pct = total
    ? Math.round((done / total) * 100)
    : 0;

  const byTask = {};

  // Yalnızca rapora dahil edilen görev türlerini hazırla.
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
    taskCount: Object.keys(byTask).length
  };
}

function renderReportContent() {
  const admin = isAdminUser();
  const me = currentUser ? currentUser.name : '';
  const people = admin ? getStaff() : [me];
  const focus = window._reportStaff || me;
  const start = window._reportStart || '';
  const end = window._reportEnd || '';
  const target = admin ? (focus || people[0] || '') : me;
  const data = getReportData(target, start, end);

  const dayMap = {};

  data.rows.forEach((r) => {
    if (!dayMap[r.date]) {
      dayMap[r.date] = {
        total: 0,
        done: 0,
        companies: {}
      };
    }

    dayMap[r.date].total += 1;

    if (r.done) dayMap[r.date].done += 1;

    dayMap[r.date].companies[r.company] = true;
  });

  const days = Object.keys(dayMap).sort();
  const pct = Math.max(0, Math.min(100, Number(data.pct) || 0));

  const safePct = (value) =>
    Math.max(0, Math.min(100, Number(value) || 0));

  const formatNumber = (value) =>
    new Intl.NumberFormat('tr-TR').format(Number(value) || 0);

  const periodText = start || end
    ? `${start ? formatDate(new Date(`${start}T00:00:00`)) : 'Başlangıç belirtilmedi'} — ${end ? formatDate(new Date(`${end}T00:00:00`)) : 'Bitiş belirtilmedi'}`
    : 'Tüm tarihler';

  const dayRows = days.length
    ? days.map((d) => {
        const di = dayMap[d];
        const p = di.total
          ? Math.round((di.done / di.total) * 100)
          : 0;

        const missing = data.rows.filter(
          (r) => r.date === d && !r.done
        );

        const companyNames = Object.keys(di.companies).join(', ');

        const missingText = missing.length
          ? `Yapılmayan: ${missing.map(
              (m) => `${m.task} (${m.company})`
            ).join(', ')}`
          : 'Bu gün için eksik işlem yok.';

        return `
          <article class="report-day-card">
            <div class="report-day-status ${p === 100 ? 'is-complete' : 'is-pending'}">
              ${p === 100 ? '✓' : '!'}
            </div>

            <div class="report-day-main">
              <div class="report-day-heading">
                <strong>${formatDate(new Date(`${d}T00:00:00`))}</strong>
                <span class="report-day-percent">%${p}</span>
              </div>

              <div class="report-day-meta">
                ${di.done}/${di.total} işlem tamamlandı
                <span class="report-dot">•</span>
                ${formatNumber(Object.keys(di.companies).length)} firma
              </div>

              <div class="report-progress-track">
                <span style="width:${p}%"></span>
              </div>

              <div class="report-day-detail">
                ${companyNames}
              </div>

              ${missing.length ? `
                <div class="report-missing-note">
                  <strong>Eksik işlemler:</strong> ${missingText.replace('Yapılmayan: ', '')}
                </div>
              ` : ''}
            </div>
          </article>
        `;
      }).join('')
    : `
      <div class="report-empty">
        <div class="report-empty-icon">▤</div>
        <strong>Henüz rapor kaydı bulunmuyor</strong>
        <p>Seçilen personel ve tarih aralığına ait bir kayıt bulunamadı. Filtreleri değiştirerek tekrar deneyebilirsin.</p>
      </div>
    `;

  const taskRows = Object.keys(data.byTask).length
    ? Object.keys(data.byTask).map((task) => {
        const item = data.byTask[task];
        const taskPct = item.total
          ? Math.round((item.done / item.total) * 100)
          : 0;

        const missingRows = data.rows.filter(
          (r) => r.task === task && !r.done
        );

        const missingDays = missingRows.map(
          (r) => `${formatDate(new Date(`${r.date}T00:00:00`))} (${r.company})`
        );

        const statusClass = taskPct === 100
          ? 'is-complete'
          : item.done === 0
            ? 'is-missing'
            : 'is-pending';

        const statusText = taskPct === 100
          ? 'Tamamlandı'
          : item.done === 0
            ? 'Başlanmadı'
            : 'Devam ediyor';

        return `
          <article class="report-task-card">
            <div class="report-task-top">
              <div class="report-task-icon">
                ${taskPct === 100 ? '✓' : item.done === 0 ? '!' : '↗'}
              </div>

              <div class="report-task-info">
                <strong>${task}</strong>
                <span>${formatNumber(item.done)} / ${formatNumber(item.total)} işlem tamamlandı</span>
              </div>

              <div class="report-task-result">
                <strong>%${safePct(taskPct)}</strong>
                <span class="report-status-pill ${statusClass}">${statusText}</span>
              </div>
            </div>

            <div class="report-progress-track">
              <span style="width:${safePct(taskPct)}%"></span>
            </div>

            <div class="report-task-foot">
              <span>Eksik işlem: <strong>${formatNumber(item.total - item.done)}</strong></span>
              <span>${missingDays.length ? 'Eksik kayıt mevcut' : 'Eksik kayıt yok'}</span>
            </div>

            ${missingDays.length ? `
              <details class="report-missing-details">
                <summary>Eksik kayıtların ayrıntısı (${missingDays.length})</summary>
                <ul>
                  ${missingRows.map((r) => `
                    <li>
                      <span>${formatDate(new Date(`${r.date}T00:00:00`))}</span>
                      <span>${r.company}</span>
                    </li>
                  `).join('')}
                </ul>
              </details>
            ` : ''}
          </article>
        `;
      }).join('')
    : `
      <div class="report-empty report-empty-compact">
        <div class="report-empty-icon">◎</div>
        <strong>İş türü verisi bulunamadı</strong>
        <p>Seçilen filtrelerde görüntülenecek iş türü kaydı yok.</p>
      </div>
    `;

  return `
    <div class="report-page">

      <section class="report-hero">
        <div class="report-hero-content">
          <div class="report-eyebrow">
            <span class="report-eyebrow-dot"></span>
            PERFORMANS VE FAALİYET ANALİZİ
          </div>

          <h1>Raporlama Merkezi</h1>

          <p>
            ${admin
              ? 'Personel faaliyetlerini, iş tamamlama oranlarını ve eksik işlemleri tek ekrandan takip et.'
              : 'Faaliyetlerini, tamamlanma oranlarını ve günlük işlem detaylarını incele.'}
          </p>

          <div class="report-hero-meta">
            <span class="report-meta-icon">◷</span>
            ${periodText}
          </div>
        </div>

        <div class="report-hero-visual" aria-hidden="true">
          <div class="report-orbit report-orbit-one"></div>
          <div class="report-orbit report-orbit-two"></div>
          <div class="report-hero-chart">
            <span class="report-hero-chart-label">TAMAMLANMA</span>
            <strong>%${pct}</strong>
            <span class="report-hero-chart-caption">Genel oran</span>
          </div>
          <span class="report-floating-mark report-mark-one">↗</span>
          <span class="report-floating-mark report-mark-two">✓</span>
        </div>
      </section>

      <section class="report-filter-panel">
        <div class="report-section-heading">
          <div class="report-heading-icon">☷</div>
          <div>
            <h2>Rapor filtreleri</h2>
            <p>Analiz etmek istediğin personeli ve tarih aralığını seç.</p>
          </div>
        </div>

        <form id="report-form" class="report-filter-form">
          ${admin ? `
            <label class="report-field">
              <span>Personel</span>
              <select name="staff" id="report-staff">
                ${people.map((person) => `
                  <option value="${person}" ${person === target ? 'selected' : ''}>${person}</option>
                `).join('')}
              </select>
            </label>
          ` : `
            <label class="report-field">
              <span>Personel</span>
              <input type="text" value="${me}" disabled>
            </label>
          `}

          <label class="report-field">
            <span>Başlangıç tarihi</span>
            <input type="date" name="start" value="${start}">
          </label>

          <label class="report-field">
            <span>Bitiş tarihi</span>
            <input type="date" name="end" value="${end}" min="${start}">
          </label>

          <button class="report-filter-button" type="submit">
            <span>⌕</span>
            Raporu getir
          </button>
        </form>
      </section>

      <section class="report-stats-grid">
        <article class="report-stat-card report-stat-primary">
          <div class="report-stat-top">
            <span>Genel tamamlanma</span>
            <span class="report-stat-icon">◉</span>
          </div>
          <div class="report-stat-value">%${pct}</div>
          <div class="report-stat-bottom">
            <span class="report-stat-indicator"></span>
            ${formatNumber(data.done)} / ${formatNumber(data.total)} işlem tamamlandı
          </div>
          <div class="report-stat-track">
            <span style="width:${pct}%"></span>
          </div>
        </article>

        <article class="report-stat-card">
          <div class="report-stat-top">
            <span>Tamamlanan işler</span>
            <span class="report-stat-icon report-icon-green">✓</span>
          </div>
          <div class="report-stat-value">${formatNumber(data.done)}</div>
          <div class="report-stat-bottom">Başarıyla tamamlanan işlem</div>
          <div class="report-stat-accent report-accent-green"></div>
        </article>

        <article class="report-stat-card">
          <div class="report-stat-top">
            <span>Eksik işlemler</span>
            <span class="report-stat-icon report-icon-orange">!</span>
          </div>
          <div class="report-stat-value">${formatNumber(data.missing)}</div>
          <div class="report-stat-bottom">Takip edilmesi gereken işlem</div>
          <div class="report-stat-accent report-accent-orange"></div>
        </article>

        <article class="report-stat-card">
          <div class="report-stat-top">
            <span>Faaliyet günleri</span>
            <span class="report-stat-icon report-icon-blue">▦</span>
          </div>
          <div class="report-stat-value">${formatNumber(days.length)}</div>
          <div class="report-stat-bottom">Kayıt bulunan farklı gün</div>
          <div class="report-stat-accent report-accent-blue"></div>
        </article>
      </section>

      <section class="report-analysis-grid">

        <article class="report-panel report-completion-panel">
          <div class="report-panel-heading">
            <div>
              <span class="report-overline">GENEL BAKIŞ</span>
              <h2>Tamamlanma analizi</h2>
              <p>Seçili dönemdeki işlem durumu.</p>
            </div>
            <span class="report-panel-symbol">◉</span>
          </div>

          <div class="report-donut-layout">
            <div class="report-donut" role="img" aria-label="Tamamlanma oranı yüzde ${pct}">
              <div class="report-donut-inner">
                <strong>%${pct}</strong>
                <span>Tamamlandı</span>
              </div>
            </div>

            <div class="report-legend">
              <div class="report-legend-item">
                <span class="report-legend-dot report-legend-done"></span>
                <div>
                  <span>Tamamlanan</span>
                  <strong>${formatNumber(data.done)}</strong>
                </div>
              </div>

              <div class="report-legend-item">
                <span class="report-legend-dot report-legend-missing"></span>
                <div>
                  <span>Eksik</span>
                  <strong>${formatNumber(data.missing)}</strong>
                </div>
              </div>

              <div class="report-legend-total">
                <span>Toplam işlem</span>
                <strong>${formatNumber(data.total)}</strong>
              </div>
            </div>
          </div>

          <div class="report-insight">
            <span class="report-insight-icon">✦</span>
            <p>
              ${data.total
                ? pct === 100
                  ? 'Seçili dönemde tüm işlemler tamamlanmış görünüyor.'
                  : `${formatNumber(data.missing)} işlem eksik görünüyor. Günlük dökümden ayrıntıları inceleyebilirsin.`
                : 'Seçili filtrelerde karşılaştırma yapılabilecek işlem kaydı bulunmuyor.'}
            </p>
          </div>
        </article>

        <article class="report-panel report-summary-panel">
          <div class="report-panel-heading">
            <div>
              <span class="report-overline">RAPOR ÖZETİ</span>
              <h2>Seçili kapsam</h2>
              <p>Raporun geçerli olduğu alanlar.</p>
            </div>
            <span class="report-panel-symbol">⌗</span>
          </div>

          <div class="report-summary-list">
            <div class="report-summary-row">
              <span class="report-summary-icon">♙</span>
              <div>
                <span>Personel</span>
                <strong>${target || 'Seçilmedi'}</strong>
              </div>
            </div>

            <div class="report-summary-row">
              <span class="report-summary-icon">◷</span>
              <div>
                <span>Tarih aralığı</span>
                <strong>${periodText}</strong>
              </div>
            </div>

            <div class="report-summary-row">
              <span class="report-summary-icon">▦</span>
              <div>
                <span>Kayıtlı faaliyet günü</span>
                <strong>${formatNumber(days.length)} gün</strong>
              </div>
            </div>

            <div class="report-summary-row">
              <span class="report-summary-icon">▤</span>
              <div>
                <span>İş türü sayısı</span>
                <strong>${formatNumber(Object.keys(data.byTask).length)} tür</strong>
              </div>
            </div>
          </div>
        </article>

      </section>

      <section class="report-panel report-task-panel">
        <div class="report-panel-heading">
          <div>
            <span class="report-overline">DETAYLI PERFORMANS</span>
            <h2>İş türü bazında analiz</h2>
            <p>Her iş türündeki tamamlanma oranını ve eksik kayıtları incele.</p>
          </div>
          <span class="report-count-badge">${formatNumber(Object.keys(data.byTask).length)} iş türü</span>
        </div>

        <div class="report-task-list">
          ${taskRows}
        </div>
      </section>

      <section class="report-panel report-daily-panel">
        <div class="report-panel-heading">
          <div>
            <span class="report-overline">GÜN GÜN TAKİP</span>
            <h2>Günlük faaliyet dökümü</h2>
            <p>Tamamlanan işlemler, eksikler ve ilgili firmalar.</p>
          </div>
          <span class="report-count-badge">${formatNumber(days.length)} gün</span>
        </div>

        <div class="report-day-list">
          ${dayRows}
        </div>
      </section>

      <div class="report-footer-note">
        <span>ⓘ</span>
        <p>Rapor sonuçları mevcut iş kayıtları ve seçili filtreler üzerinden hesaplanır.</p>
      </div>

    </div>
  `;
}
function renderPersonnelLeaveContent() {
  if (!isAdminUser()) {
    return '<div class="permission-empty">Bu panel yalnızca yöneticilere açıktır.</div>';
  }

  const people = getStaff();

  return `
    <section class="leave-page">

      <div class="leave-hero">
        <div class="leave-hero-content">
          <span class="leave-eyebrow">İNSAN KAYNAKLARI YÖNETİMİ</span>
          <h1>Personel İzin ve Özlük</h1>
          <p>Personel bilgilerini yönetin, izin kullanımını takip edin ve gelecek dönem izin planlarını tek ekrandan düzenleyin.</p>
          <div class="leave-hero-tags">
            <span>✓ Özlük bilgileri</span>
            <span>◷ İzin takibi</span>
            <span>▦ İzin planlaması</span>
          </div>
        </div>
        <div class="leave-hero-art" aria-hidden="true">
          <div class="leave-hero-document">
            <div class="leave-doc-line"></div>
            <div class="leave-doc-line short"></div>
            <div class="leave-doc-check">✓</div>
            <div class="leave-doc-line"></div>
            <div class="leave-doc-line short"></div>
          </div>
          <div class="leave-hero-symbol">◷</div>
        </div>
        <span class="leave-admin-badge">Yönetici Paneli</span>
      </div>

      <section class="panel leave-panel">
        <div class="leave-section-heading">
          <span class="leave-section-icon">♙</span>
          <div>
            <h2>Personel Seçimi</h2>
            <p>İşlem yapmak istediğiniz personeli seçin.</p>
          </div>
        </div>

        <form id="personnel-leave-form" class="work-form leave-selection-form">
          <label class="field">
            Personel
            <select name="staff" id="personnel-leave-staff" ${people.length ? '' : 'disabled'}>
              ${people.length
                ? people.map((person) =>
                    `<option value="${escapeHtml(person)}">${escapeHtml(person)}</option>`
                  ).join('')
                : '<option value="">Personel bulunmuyor</option>'
              }
            </select>
          </label>
          <button class="primary-btn work-submit leave-primary-btn" type="submit" ${people.length ? '' : 'disabled'}>
            Personeli Görüntüle <span>→</span>
          </button>
        </form>
      </section>

      <section class="panel leave-panel">
        <div class="leave-section-heading">
          <span class="leave-section-icon">▤</span>
          <div>
            <h2>Personel Özlük Bilgileri</h2>
            <p>Seçilen personele ait sabit özlük bilgileri.</p>
          </div>
        </div>

        <form id="personnel-info-form" class="work-form leave-fields-grid">
          <label class="field">
            Ad Soyad
            <input type="text" id="personnel-info-name" name="name" disabled />
          </label>

          <label class="field">
            Doğum Tarihi
            <input type="date" id="personnel-info-birth" name="birthDate" />
          </label>

          <label class="field">
            İşe Giriş Tarihi
            <input type="date" id="personnel-info-start" name="startDate" />
          </label>

          <label class="field">
            Yıllık İzin Hakkı (Gün)
            <input type="number" id="personnel-info-annual" name="annualLeave" min="0" step="0.5" placeholder="Örn: 14" />
          </label>

          <label class="field leave-note-field">
            Not
            <input type="text" id="personnel-info-note" name="note" placeholder="Personel hakkında not" />
          </label>

          <div class="save-row leave-save-row">
            <span class="save-status" id="personnel-info-status"></span>
            <button class="primary-btn work-submit leave-primary-btn" type="submit">Bilgileri Kaydet</button>
          </div>
        </form>
      </section>

      <section class="panel leave-panel">
        <div class="leave-section-heading">
          <span class="leave-section-icon">▥</span>
          <div>
            <h2>İzin Kullanım Özeti</h2>
            <p>Seçilen personelin izin kullanım durumunu takip edin.</p>
          </div>
        </div>

        <div class="stats-grid leave-stats-grid">
          <article class="stat-card leave-stat-card">
            <div class="leave-stat-top">
              <span class="leave-stat-icon entitlement">▤</span>
              <span>Yıllık İzin Hakkı</span>
            </div>
            <div class="stat-number" id="leave-summary-entitlement">0</div>
            <small>Gün</small>
          </article>

          <article class="stat-card leave-stat-card">
            <div class="leave-stat-top">
              <span class="leave-stat-icon used">↗</span>
              <span>Kullanılan Yıllık İzin</span>
            </div>
            <div class="stat-number" id="leave-summary-annual-used">0</div>
            <small>Gün</small>
          </article>

          <article class="stat-card leave-stat-card">
            <div class="leave-stat-top">
              <span class="leave-stat-icon remaining">✓</span>
              <span>Kalan Yıllık İzin</span>
            </div>
            <div class="stat-number" id="leave-summary-annual-remaining">0</div>
            <small>Gün</small>
          </article>

          <article class="stat-card leave-stat-card">
            <div class="leave-stat-top">
              <span class="leave-stat-icon hourly">◷</span>
              <span>Saatlik İzin</span>
            </div>
            <div class="stat-number" id="leave-summary-hourly-used">0</div>
            <small>Saat</small>
          </article>
        </div>
      </section>

      <section class="panel leave-panel">
        <div class="leave-section-heading">
          <span class="leave-section-icon">＋</span>
          <div>
            <h2>Yeni İzin Kaydı</h2>
            <p>Seçilen personelin kullandığı izni kaydedin.</p>
          </div>
        </div>

        <form id="leave-record-form" class="work-form leave-fields-grid">
          <label class="field">
            İzin Tarihi
            <input type="date" id="leave-record-date" name="date" required />
          </label>

          <label class="field">
            İzin Türü
            <select id="leave-record-type" name="type" required>
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
            <input type="time" id="leave-record-start" name="startTime" />
          </label>

          <label class="field">
            Bitiş Saati
            <input type="time" id="leave-record-end" name="endTime" />
          </label>

          <label class="field">
            Süre (Gün / Saat)
            <input type="number" id="leave-record-duration" name="duration" min="0" step="0.5" placeholder="Örn: 1 veya 2,5" required />
          </label>

          <label class="field">
            Açıklama
            <input type="text" id="leave-record-note" name="note" placeholder="İzin açıklaması" />
          </label>

          <div class="save-row leave-save-row">
            <span class="save-status" id="leave-record-status"></span>
            <button class="primary-btn work-submit leave-primary-btn" type="submit">İzin Kaydet</button>
          </div>
        </form>
      </section>

      <section class="panel leave-panel">
        <div class="leave-section-heading">
          <span class="leave-section-icon">☷</span>
          <div>
            <h2>İzin Geçmişi</h2>
            <p>Seçilen personelin kayıtlı izinlerini görüntüleyin.</p>
          </div>
        </div>

        <div id="personnel-leave-history" class="leave-history-container">
          <div class="permission-empty">Henüz izin kaydı bulunmuyor.</div>
        </div>
      </section>

      <section class="panel leave-panel">
        <div class="leave-section-heading">
          <span class="leave-section-icon">▦</span>
          <div>
            <h2>Gelecek Yıl İzin Planı</h2>
            <p>Planlanan ve tahmini izinleri önceden kaydedin.</p>
          </div>
        </div>

        <form id="leave-plan-form" class="work-form leave-fields-grid">
          <label class="field">
            İzin Tarihi
            <input type="date" id="leave-plan-date" name="date" required />
          </label>

          <label class="field">
            Süre (Gün)
            <input type="number" id="leave-plan-duration" name="duration" min="0.5" step="0.5" placeholder="Örn: 5" required />
          </label>

          <label class="field">
            Durum
            <select id="leave-plan-status" name="status">
              <option value="Tahmini">Tahmini</option>
              <option value="Planlandı">Planlandı</option>
            </select>
          </label>

          <label class="field">
            Açıklama
            <input type="text" id="leave-plan-note" name="note" placeholder="Örn: Yaz tatili" />
          </label>

          <div class="save-row leave-save-row">
            <span class="save-status" id="leave-plan-status-message"></span>
            <button class="primary-btn work-submit leave-primary-btn" type="submit">Planı Kaydet</button>
          </div>
        </form>

        <div id="personnel-leave-plan-history" class="leave-history-container leave-plan-history">
          <div class="permission-empty">Henüz izin planı bulunmuyor.</div>
        </div>
      </section>

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

  const allQuestions = getVisibleQuestions().sort(
    (a, b) => (a.askedAt < b.askedAt ? 1 : -1)
  );

  // Varsayılan filtre: içinde bulunulan ay.
  const now = new Date();
  const currentMonth =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!window._questionFilterMonth) {
    window._questionFilterMonth = currentMonth;
  }

  // Kayıtların bulunduğu ayları belirle.
  const monthKeys = [
    ...new Set([
      currentMonth,
      ...allQuestions.map((q) => {
        const date = new Date(q.askedAt);

        if (Number.isNaN(date.getTime())) return '';

        return `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}`;
      }).filter(Boolean)
    ])
  ];

  monthKeys.sort((a, b) => b.localeCompare(a));

  // Seçilen ayı veya bütün soruları göster.
  const selectedMonth = window._questionFilterMonth;

  const list = selectedMonth === 'all'
    ? allQuestions
    : allQuestions.filter((q) => {
        const date = new Date(q.askedAt);

        if (Number.isNaN(date.getTime())) return false;

        const questionMonth =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, '0')}`;

        return questionMonth === selectedMonth;
      });

  // Ay seçimi seçenekleri.
  const monthOptions = `
    <option value="all" ${selectedMonth === 'all' ? 'selected' : ''}>
      Tüm Sorular
    </option>
    ${monthKeys.map((key) => {
      const [year, month] = key.split('-');

      const label = new Intl.DateTimeFormat('tr-TR', {
        month: 'long',
        year: 'numeric'
      }).format(new Date(Number(year), Number(month) - 1, 1));

      return `
        <option value="${key}" ${selectedMonth === key ? 'selected' : ''}>
          ${label}
        </option>
      `;
    }).join('')}
  `;

  const answeredCount = list.filter((q) => q.answer).length;
  const pendingCount = list.length - answeredCount;

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);

  const rows = list.length
    ? list.map((q) => {
        const canAnswer = admin || q.to === me;
        const answered = Boolean(q.answer);

        const answerBlock = answered
          ? `
            <div class="question-answer-card">
              <div class="question-answer-heading">
                <span class="question-answer-check">✓</span>
                <div>
                  <strong>Yanıt</strong>
                  <small>${esc(q.answeredBy || 'Personel')} · ${esc(formatUpdatedAt(q.answeredAt))}</small>
                </div>
                <span class="question-status question-status-answered">Yanıtlandı</span>
              </div>
              <div class="question-answer-text">${esc(q.answer)}</div>
            </div>
          `
          : `
            <div class="question-pending-card">
              <span class="question-pending-icon">◷</span>
              <div>
                <strong>Yanıt bekleniyor</strong>
                <p>Bu soruya henüz bir yanıt girilmedi.</p>
              </div>
            </div>
          `;

        const answerForm = canAnswer && !answered
          ? `
            <form data-answer-form="${esc(q.id)}" class="question-answer-form">
              <label class="question-field">
                <span>Yanıtınız</span>
                <input
                  type="text"
                  name="answer"
                  placeholder="Soruyu yanıtlayın..."
                  maxlength="2000"
                  required
                />
              </label>
              <button class="question-submit-button" type="submit">
                <span>↗</span> Yanıtı gönder
              </button>
            </form>
          `
          : '';

        return `
          <article class="question-card">
            <div class="question-card-top">
              <div class="question-card-icon">☏</div>

              <div class="question-card-people">
                <div class="question-person-line">
                  <span class="question-person-label">Gönderen</span>
                  <strong>${esc(q.from)}</strong>
                </div>
                <div class="question-person-line">
                  <span class="question-person-label">Alıcı</span>
                  <strong>${esc(q.to)}</strong>
                </div>
              </div>

              <span class="question-status ${
                answered
                  ? 'question-status-answered'
                  : 'question-status-pending'
              }">
                <span class="question-status-dot"></span>
                ${answered ? 'Yanıtlandı' : 'Yanıt bekliyor'}
              </span>
            </div>

            <div class="question-card-body">
              <div class="question-date">
                <span>◷</span> ${esc(formatUpdatedAt(q.askedAt))}
              </div>

              <h3 class="question-title">${esc(q.title)}</h3>

              ${answerBlock}
              ${answerForm}
            </div>
          </article>
        `;
      }).join('')
    : `
      <div class="question-empty">
        <div class="question-empty-icon">☏</div>
        <strong>Bu dönemde soru bulunmuyor</strong>
        <p>
          ${selectedMonth === 'all'
            ? 'Henüz görüntülenebilecek bir soru kaydı bulunmuyor.'
            : 'Seçilen ayda soru bulunmuyor. Diğer ayları veya Tüm Sorular seçeneğini deneyebilirsin.'}
        </p>
      </div>
    `;

  return `
    <div class="question-page">

      <section class="question-hero">
        <div class="question-hero-content">
          <span class="question-hero-eyebrow">
            <span></span> EKİP İLETİŞİM MERKEZİ
          </span>

          <h1>Personel Soruları</h1>

          <p>
            ${admin
              ? 'Personel sorularını takip et, yanıtla ve ekip içi iletişimi tek merkezden yönet.'
              : 'Sorularını ilet, sana yöneltilen soruları takip et ve yanıtları tek ekranda görüntüle.'}
          </p>

          <div class="question-hero-tag">
            <span>✦</span>
            Açık ve düzenli iletişim
          </div>
        </div>

        <div class="question-hero-art" aria-hidden="true">
          <div class="question-art-ring question-art-ring-one"></div>
          <div class="question-art-ring question-art-ring-two"></div>
          <div class="question-art-bubble">
            <span>•••</span>
          </div>
          <span class="question-art-small question-art-small-one">?</span>
          <span class="question-art-small question-art-small-two">✓</span>
        </div>
      </section>

      <section class="question-overview">
        <article class="question-overview-card">
          <div class="question-overview-icon question-overview-icon-blue">☏</div>
          <div>
            <span>Görüntülenen sorular</span>
            <strong>${list.length}</strong>
            <small>Seçili filtredeki soru</small>
          </div>
        </article>

        <article class="question-overview-card">
          <div class="question-overview-icon question-overview-icon-orange">◷</div>
          <div>
            <span>Yanıt bekleyen</span>
            <strong>${pendingCount}</strong>
            <small>Takip edilmesi gereken</small>
          </div>
        </article>

        <article class="question-overview-card">
          <div class="question-overview-icon question-overview-icon-green">✓</div>
          <div>
            <span>Yanıtlanan</span>
            <strong>${answeredCount}</strong>
            <small>Yanıtı bulunan soru</small>
          </div>
        </article>
      </section>

      <section class="question-compose-panel">
        <div class="question-section-heading">
          <div class="question-section-icon">✎</div>
          <div>
            <h2>Yeni soru oluştur</h2>
            <p>İlgili personeli seç ve iletmek istediğin soruyu yaz.</p>
          </div>
        </div>

        ${others.length ? `
          <form id="question-form" class="question-compose-form">
            <label class="question-field">
              <span>Sorunun yöneltileceği personel</span>
              <select name="to" required>
                ${others.map((s) => `
                  <option value="${esc(s)}">${esc(s)}</option>
                `).join('')}
              </select>
            </label>

            <label class="question-field question-field-message">
              <span>Soru içeriği</span>
              <input
                type="text"
                name="title"
                placeholder="Sorunuzu buraya yazın..."
                maxlength="2000"
                required
              />
            </label>

            <button class="question-submit-button question-send-button" type="submit">
              <span>↗</span> Soruyu gönder
            </button>
          </form>
        ` : `
          <div class="question-compose-notice">
            <span>ⓘ</span>
            <p>Soru yöneltebileceğin başka bir personel bulunmuyor.</p>
          </div>
        `}

        <div class="question-save-message" id="question-save-status"></div>
      </section>

      <section class="question-list-section">
        <div class="question-list-heading">
          <div>
            <span class="question-section-eyebrow">İLETİŞİM GEÇMİŞİ</span>
            <h2>Soru ve yanıtlar</h2>
            <p>
              ${admin
                ? 'Görüntüleme yetkin kapsamındaki personel soruları.'
                : 'Sorduğun ve sana yöneltilen sorular.'}
            </p>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <select
              id="question-month-filter"
              aria-label="Soruları aya göre filtrele"
              style="padding:10px 12px; border:1px solid #d1d5db; border-radius:8px; background:#fff; color:#111827; max-width:100%;"
            >
              ${monthOptions}
            </select>

            <span class="question-list-count">${list.length} kayıt</span>
          </div>
        </div>

        <div class="question-list">
          ${rows}
        </div>
      </section>

      <div class="question-footer-note">
        <span>ⓘ</span>
        <p>Soru ve yanıtlar Firebase üzerinde saklanır; bu filtre kayıtları silmez.</p>
      </div>

    </div>
  `;
}

function setupQuestions() {
  // Firebase üzerinden ortak soruları dinlemeye başla.
  setupSharedQuestionsListener();

  // Ay filtresinin değişimini takip et.
  const monthFilter = document.querySelector('#question-month-filter');

  if (monthFilter && !monthFilter.dataset.filterBound) {
    monthFilter.dataset.filterBound = 'true';

    monthFilter.addEventListener('change', () => {
      window._questionFilterMonth = monthFilter.value;
      renderDashboard('Personel Soruları');
    });
  }

  // Yeni soru gönderme işlemi.
  const form = document.querySelector('#question-form');

  if (form && !form.dataset.questionsBound) {
    form.dataset.questionsBound = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fd = new FormData(form);
      const to = (fd.get('to') || '').toString().trim();
      const title = (fd.get('title') || '').toString().trim();

      if (!to || !title) {
        alert('Lütfen personel seçin ve soru başlığını yazın.');
        return;
      }

      if (
        !window.firebaseDb ||
        typeof window.firebaseCollection !== 'function' ||
        typeof window.firebaseAddDoc !== 'function'
      ) {
        alert('Firebase bağlantısı hazır değil. Lütfen sayfayı yenileyin.');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      const statusEl = document.querySelector('#question-save-status');

      if (submitButton) submitButton.disabled = true;
      if (statusEl) statusEl.textContent = 'Soru gönderiliyor...';

      try {
        const questionsRef = window.firebaseCollection(
          window.firebaseDb,
          'personelSorulari'
        );

        await window.firebaseAddDoc(questionsRef, {
          from: currentUser ? currentUser.name : '',
          to: to,
          title: title,
          askedAt: new Date().toISOString(),
          answer: '',
          answeredBy: '',
          answeredAt: ''
        });

        form.reset();

        if (statusEl) {
          statusEl.textContent = 'Sorunuz başarıyla gönderildi.';
        }
      } catch (err) {
        console.error('Soru gönderilemedi:', err);

        if (statusEl) {
          statusEl.textContent =
            'Soru gönderilemedi. Firebase bağlantısını ve güvenlik kurallarını kontrol edin.';
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  // Gelen sorulara yanıt verme işlemi.
  document.querySelectorAll('[data-answer-form]').forEach((f) => {
    if (f.dataset.questionsBound) return;

    f.dataset.questionsBound = 'true';

    f.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = f.dataset.answerForm;
      const answer = (
        new FormData(f).get('answer') || ''
      ).toString().trim();

      if (!id || !answer) {
        alert('Lütfen yanıtınızı yazın.');
        return;
      }

      const me = currentUser ? currentUser.name : '';
      const q = loadQuestions().find((item) => item.id === id);

      if (!q) {
        alert('Soru kaydı henüz yüklenmedi. Biraz bekleyip tekrar deneyin.');
        return;
      }

      if (!isAdminUser() && q.to !== me) {
        alert('Bu soruyu yanıtlama yetkiniz bulunmuyor.');
        return;
      }

      if (
        !window.firebaseDb ||
        typeof window.firebaseDoc !== 'function' ||
        typeof window.firebaseSetDoc !== 'function'
      ) {
        alert('Firebase bağlantısı hazır değil. Lütfen sayfayı yenileyin.');
        return;
      }

      const submitButton = f.querySelector('button[type="submit"]');

      if (submitButton) submitButton.disabled = true;

      try {
        const questionRef = window.firebaseDoc(
          window.firebaseDb,
          'personelSorulari',
          id
        );

        await window.firebaseSetDoc(
          questionRef,
          {
            answer: answer,
            answeredBy: me,
            answeredAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Yanıt kaydedilemedi:', err);

        alert(
          'Yanıt kaydedilemedi. Firebase bağlantısını ve güvenlik kurallarını kontrol edin.'
        );
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
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
async function setupNotes() {
  const form = document.querySelector('#note-form');
  const textArea = document.querySelector('#note-text');
  const charCount = document.querySelector('#note-char-count');
  const fileInput = document.querySelector('#note-file');
  const preview = document.querySelector('#note-preview');
  const fileHint = document.querySelector('#note-file-hint');

  const status = (message) => {
    const el = document.querySelector('#note-save-status');
    if (el) el.textContent = message;
  };

  const auth = window.firebaseAuth;
  const db = window.firebaseDb;
  const uid = auth?.currentUser?.uid;

  if (!uid || !db) {
    status('Firebase bağlantısı hazır değil. Sayfayı yenileyip tekrar deneyin.');
    setupCalculator();
    return;
  }

  // Firebase'deki kişisel notları yükle.
  try {
    if (
      window._personalNotesUid !== uid ||
      !Array.isArray(window._personalNotesCache)
    ) {
      window._personalNotesCache = [];

      const notesQuery = window.firebaseQuery(
        window.firebaseCollection(db, 'personalNotes'),
        window.firebaseWhere('ownerUid', '==', uid)
      );

      const snapshot = await window.firebaseGetDocs(notesQuery);

      window._personalNotesCache = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      window._personalNotesUid = uid;

      // Veriler yüklendikten sonra not listesini yenile.
      renderDashboard('Notlar');
      return;
    }
  } catch (err) {
    console.error('Kişisel notlar yüklenemedi:', err);
    status('Notlar Firebase’den yüklenemedi. Bağlantınızı ve güvenlik kurallarını kontrol edin.');
    setupCalculator();
    return;
  }

  // Karakter sayacı.
  if (textArea && charCount) {
    const updateCount = () => {
      charCount.textContent = `${textArea.value.length} karakter`;
    };

    textArea.addEventListener('input', updateCount);
    updateCount();
  }

  // Resim önizlemesi ve boyut kontrolü.
  if (fileInput && preview) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];

      preview.style.display = 'none';
      preview.removeAttribute('src');

      if (fileHint) {
        fileHint.textContent =
          'JPG / PNG, en fazla 1.5 MB. Seçince önizleme çıkar.';
      }

      if (!file) return;

      if (file.size > 1500000) {
        fileInput.value = '';

        if (fileHint) {
          fileHint.textContent =
            'Resim 1.5 MB sınırını aşıyor. Daha küçük bir resim seçin.';
        }

        return;
      }

      if (!file.type.startsWith('image/')) {
        fileInput.value = '';

        if (fileHint) {
          fileHint.textContent = 'Yalnızca resim dosyası seçebilirsiniz.';
        }

        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        preview.src = reader.result;
        preview.style.display = 'block';

        if (fileHint) {
          fileHint.textContent =
            `${file.name} hazır — Kaydet'e basınca nota eklenir.`;
        }
      };

      reader.readAsDataURL(file);
    });
  }

  // Yeni notu kaydet.
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const fd = new FormData(form);
      const title = String(fd.get('title') || '').trim();
      const text = String(fd.get('text') || '').trim();
      const file = fd.get('file');

      if (!title) {
        status('Lütfen nota bir başlık girin.');
        return;
      }

      if (file && file.size > 1500000) {
        status('Resim 1.5 MB sınırını aşıyor.');
        return;
      }

      if (file && file.size && !file.type.startsWith('image/')) {
        status('Lütfen geçerli bir resim dosyası seçin.');
        return;
      }

      const saveButton = form.querySelector('[type="submit"]');

      if (saveButton) saveButton.disabled = true;
      status('Not kaydediliyor...');

      try {
        let fileData = '';

        // Resim yalnızca bu tarayıcıdaki yerel nota eklenir.
        if (file && file.size) {
          fileData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Resim okunamadı.'));
            reader.readAsDataURL(file);
          });
        }

        const now = new Date().toISOString();
        const noteId =
          'note_' + Date.now() + '_' +
          Math.random().toString(36).slice(2, 8);

        const note = {
          id: noteId,
          staff: currentUser?.name || '',
          ownerUid: uid,
          title,
          text,
          createdAt: now,
          fileName: file && file.size ? file.name : '',
          fileType: file && file.size ? file.type : '',
          fileData
        };

        // Önce yerel kaydı koru.
        const localNotes = loadNotes();
        localNotes.push(note);
        saveNotes(localNotes);

        // Metin ve temel bilgiler Firebase'e kaydedilir.
        // Base64 resim verisi Firestore'a gönderilmez.
        const cloudNote = {
          ownerUid: uid,
          staff: note.staff,
          title: note.title,
          text: note.text,
          createdAt: note.createdAt
        };

        await window.firebaseSetDoc(
          window.firebaseDoc(db, 'personalNotes', noteId),
          cloudNote
        );

        window._personalNotesCache = [
          ...(window._personalNotesCache || []),
          { id: noteId, ...cloudNote }
        ];

        form.reset();

        if (preview) {
          preview.style.display = 'none';
          preview.removeAttribute('src');
        }

        if (fileHint) {
          fileHint.textContent =
            'JPG / PNG, en fazla 1.5 MB. Seçince önizleme çıkar.';
        }

        renderDashboard('Notlar');
        status(
          fileData
            ? 'Not Firebase’e kaydedildi. Ekli resim yalnızca bu tarayıcıda saklandı.'
            : 'Not başarıyla Firebase’e kaydedildi.'
        );
      } catch (err) {
        console.error('Not kaydetme hatası:', err);
        status(
          'Firebase kaydı başarısız oldu. Notun kaydedildiğini varsaymayın; bağlantıyı kontrol edin.'
        );
      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    });
  }

  // Not silme.
  document.querySelectorAll('[data-del-note]').forEach((button) => {
    button.addEventListener('click', async () => {
      const noteId = button.dataset.delNote;
      const note = getMyNotes().find((item) => item.id === noteId);

      if (!note) return;

      if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) {
        return;
      }

      try {
        const localNotes = loadNotes().filter(
          (item) => item.id !== noteId
        );

        saveNotes(localNotes);

        // Firebase'deki notu da sil.
        if (note.ownerUid === uid) {
          await window.firebaseDeleteDoc(
            window.firebaseDoc(db, 'personalNotes', noteId)
          );
        }

        window._personalNotesCache = (
          window._personalNotesCache || []
        ).filter((item) => item.id !== noteId);

        renderDashboard('Notlar');
      } catch (err) {
        console.error('Not silme hatası:', err);
        status('Not Firebase’den silinemedi. Sayfayı yenileyip kontrol edin.');
      }
    });
  });

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
  const list = admin ? getCompanies() : getMyVisibleCompanies(me);
  const meta = loadCompanyMeta();
  const editName = window._companyEdit || '';
  const today = new Date().toISOString().slice(0, 10);

  const editRow = admin && editName ? `
    <form id="company-edit-form" class="work-form company-form-modern">
      <label class="field">
        Firma
        <input type="text" value="${editName}" disabled />
      </label>
      <label class="field">
        Yeni unvan
        <input type="text" name="newName" value="${editName}" required />
      </label>
      <button class="primary-btn work-submit" type="submit">
        ✓ Kaydet
      </button>
    </form>
  ` : '';

  const companyRows = list.length
    ? list.map((c) => {
        const d = (meta[c] && meta[c].createdAt) || getCompanyCreatedDate(c);

        return `
          <article class="company-item">
            <div class="company-item-icon">▣</div>

            <div class="company-item-info">
              <strong>${c}</strong>
              <div class="company-item-date">
                <span>Takip başlangıcı</span>
                <span>${formatDateTr(d)}</span>
              </div>
            </div>

            ${admin ? `
              <button class="primary-btn work-submit company-edit-btn"
                data-edit-company="${c}" type="button">
                ✎ Düzenle
              </button>
            ` : `
              <span class="company-view-label">Görüntüleme</span>
            `}
          </article>
        `;
      }).join('')
    : `
      <div class="permission-empty">
        <span class="permission-icon">▣</span>
        <div>
          <strong>Henüz görüntülenebilecek cari yok.</strong>
          <p>Yöneticinizden firma erişim yetkisi isteyin.</p>
        </div>
      </div>
    `;

  return `
    <section class="company-page">

      <div class="company-hero">
        <div class="company-hero-content">
          <span class="company-eyebrow">FİRMA VE CARİ KAYITLARI</span>
          <h1>Firma Yönetimi</h1>
          <p>
            Firma kayıtlarını düzenli bir şekilde yönet,
            tanımlanma tarihlerini takip et ve iş süreçlerini
            doğru başlangıç tarihleriyle yürüt.
          </p>
          <div class="company-hero-tags">
            <span>✓ Düzenli kayıt</span>
            <span>▦ Tarih bazlı takip</span>
          </div>
        </div>

        <div class="company-hero-art" aria-hidden="true">
          <div class="company-hero-orbit"></div>
          <div class="company-hero-symbol">▣</div>
        </div>
      </div>

      <div class="company-section-heading">
        <div>
          <h2>Firma çalışma alanı</h2>
          <p>
            ${admin
              ? 'Yeni firmalar ekleyebilir ve mevcut firma unvanlarını düzenleyebilirsiniz.'
              : 'Yalnızca erişim izniniz bulunan firmaları görüntüleyebilirsiniz.'}
          </p>
        </div>
        <span class="company-role-label">
          ${admin ? 'Yönetici' : 'Personel'} · ${me}
        </span>
      </div>

      ${admin ? `
        <section class="panel company-add-panel">
          <div class="company-panel-heading">
            <div class="company-heading-icon">＋</div>
            <div>
              <h2>Yeni cari ekle</h2>
              <p>Firma unvanını ve iş takibinin başlayacağı tarihi tanımlayın.</p>
            </div>
          </div>

          <form id="company-form" class="work-form company-form-modern">
            <label class="field">
              Firma / cari unvanı
              <input type="text" name="companyName"
                placeholder="Örn: Yeni Cari A.Ş." required />
            </label>

            <label class="field">
              Tanımlanma tarihi
              <input type="date" name="createdAt"
                value="${today}" required />
              <small>Bu tarih, iş takip başlangıcını etkiler.</small>
            </label>

            <button class="primary-btn work-submit company-add-btn"
              type="submit">
              ＋ &nbsp; Firma ekle
            </button>
          </form>

          <div class="company-save-message">
            <span class="save-status" id="company-save-status"></span>
          </div>

          ${editRow ? `
            <div class="company-edit-area">
              <div class="company-panel-heading">
                <div class="company-heading-icon company-edit-icon">✎</div>
                <div>
                  <h2>Firma unvanını düzenle</h2>
                  <p>Seçtiğiniz firmanın yeni unvanını girin.</p>
                </div>
              </div>
              ${editRow}
            </div>
          ` : ''}
        </section>
      ` : ''}

      <section class="panel company-list-panel">
        <div class="company-list-heading">
          <div class="company-panel-heading">
            <div class="company-heading-icon company-list-icon">▤</div>
            <div>
              <h2>${admin ? 'Kayıtlı firmalar' : 'Yetkili olduğum cariler'}</h2>
              <p>Tanımlanma tarihleri iş takip başlangıcında kullanılır.</p>
            </div>
          </div>

          <div class="company-total">
            <strong>${list.length}</strong>
            <span>${list.length === 1 ? 'firma' : 'firma'}</span>
          </div>
        </div>

        <div class="company-list-content">
          ${companyRows}
        </div>
      </section>

    </section>
  `;
}

function renderWorkTrackingContent() {
  const today = new Date().toISOString().slice(0, 10);
  const initialDate = getLastWorkDate(today);
  const staffName = currentUser ? currentUser.name : getStaff()[0];
  const visibleCompanies = getMyVisibleCompanies(staffName);

  const companyOptions = (
    visibleCompanies.length
      ? visibleCompanies
      : ['Yetkiniz yok — yöneticiye başvurun']
  ).map((c) => `<option>${c}</option>`).join('');

  return `
    <section class="work-page">

      <div class="work-hero">
        <div class="work-hero-content">
          <span class="work-eyebrow">GÜNLÜK OPERASYONLAR</span>
          <h1>İş Takip</h1>
          <p>Günlük işlerini planla, işlemlerini kontrol et ve
          tamamladığın görevleri güvenle kaydet.</p>
          <div class="work-hero-tags">
            <span>✓ Kişisel çalışma alanı</span>
            <span>▦ Firma bazlı takip</span>
          </div>
        </div>
        <div class="work-hero-art" aria-hidden="true">
          <div class="work-hero-orbit"></div>
          <div class="work-hero-symbol">✓</div>
        </div>
      </div>

      <div class="work-section-heading">
        <div>
          <h2>Çalışma alanı</h2>
          <p>İşlemlerini görüntülemek için aşağıdaki bilgileri seç.</p>
        </div>
        <span class="work-secure-label">
          <span class="work-secure-dot"></span>
          Yetki kontrollü erişim
        </span>
      </div>

      <section class="panel work-filter work-filter-modern">
        <div class="panel-header work-filter-heading">
          <div class="work-heading-icon">⌕</div>
          <div>
            <h2>İşlem filtreleri</h2>
            <p class="panel-subtitle">
              Personel, firma ve tarih aralığına göre işlemlerini listele.
            </p>
          </div>
        </div>

        <form id="work-form" class="work-form work-form-modern">

          <label class="field work-field">
            <span class="work-field-label">Personel</span>
            <input type="text" name="staff-display"
              value="${staffName}" disabled />
            <input type="hidden" name="staff" value="${staffName}" />
            <small>Hesabına otomatik atanır.</small>
          </label>

          <label class="field work-field">
            <span class="work-field-label">Firma</span>
            <select name="company">${companyOptions}</select>
            <small>Yalnızca yetkili olduğun firmalar.</small>
          </label>

          <label class="field work-field">
            <span class="work-field-label">Başlangıç tarihi</span>
            <input type="date" name="date-from"
              value="${initialDate}" required />
          </label>

          <label class="field work-field">
            <span class="work-field-label">Bitiş tarihi</span>
            <input type="date" name="date-to"
              value="${initialDate}" required />
          </label>

          <div class="work-form-actions">
            <button class="primary-btn work-submit work-submit-modern"
              type="submit">
              <span>⌕</span> İşlemleri göster
            </button>
          </div>

        </form>
      </section>

      <section class="panel task-panel task-panel-modern">

        <div class="panel-header task-panel-heading">
          <div class="task-heading-main">
            <div class="work-heading-icon work-heading-icon-green">✓</div>
            <div>
              <h2 id="task-title">Günlük işlemler</h2>
              <p class="panel-subtitle" id="task-summary">
                Firma ve tarih seçimini yaptıktan sonra işlemlerin burada
                görüntülenecek.
              </p>
            </div>
          </div>

          <span class="task-counter work-counter-modern"
            id="task-counter">0 / 0 tamamlandı</span>
        </div>

        <div class="work-task-intro">
          <span class="work-task-intro-icon">▤</span>
          <span>İşlemlerini kontrol et. Değişiklik yaptıktan sonra
          <strong>Kaydet</strong> düğmesine bas.</span>
        </div>

        <div id="task-content" class="task-content work-task-content"></div>

        <div class="save-row work-save-row" id="task-save-row">
          <div class="work-save-info">
            <span class="work-save-icon">✓</span>
            <div>
              <strong>İşlem kayıtları</strong>
              <span class="save-status" id="task-save-status">
                Değişikliklerini kaydetmeyi unutma.
              </span>
            </div>
          </div>
          <button class="primary-btn save-btn work-save-btn"
            id="task-save-btn" type="button">
            ✓ &nbsp; Kaydet
          </button>
        </div>

      </section>
    </section>
  `;
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
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  title: profile.title || 'Personel',
  name: profile.name || firebaseUser.email,
  avatar: profile.avatar || null
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
    if (active === 'Ayın Elemanı') return renderEmployeeScoringContent();
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
  ${new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })}
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

// Avatar seçenekleri: emoji ve SVG tabanlı illüstrasyonlar
const SYSTEM_AVATARS = [
  { id: 'emoji-1', type: 'emoji', value: '👨‍💼', label: 'Profesyonel' },
  { id: 'emoji-2', type: 'emoji', value: '👩‍💼', label: 'Yönetici' },
  { id: 'emoji-3', type: 'emoji', value: '🧑‍💻', label: 'Teknoloji' },
  { id: 'emoji-4', type: 'emoji', value: '👨‍💻', label: 'Uzman' },
  { id: 'emoji-5', type: 'emoji', value: '👩‍💻', label: 'Uzman' },
  { id: 'emoji-6', type: 'emoji', value: '🙂', label: 'Sade' },

  {
    id: 'illustration-1',
    type: 'illustration',
    value: 'male-navy',
    label: 'Kurumsal'
  },
  {
    id: 'illustration-2',
    type: 'illustration',
    value: 'female-teal',
    label: 'Modern'
  },
  {
    id: 'illustration-3',
    type: 'illustration',
    value: 'male-teal',
    label: 'Uzman'
  },
  {
    id: 'illustration-4',
    type: 'illustration',
    value: 'female-rose',
    label: 'Profesyonel'
  }
];

function getSystemAvatarSvg(id) {
  const designs = {
    'illustration-1': {
      bg: '#dce7f5',
      skin: '#d6a078',
      hair: '#29364b',
      shirt: '#253d63'
    },
    'illustration-2': {
      bg: '#d9efeb',
      skin: '#edbd98',
      hair: '#49352f',
      shirt: '#27877f'
    },
    'illustration-3': {
      bg: '#e1e9fa',
      skin: '#8e583e',
      hair: '#252c3c',
      shirt: '#3979a8'
    },
    'illustration-4': {
      bg: '#f7e2e8',
      skin: '#e0a47e',
      hair: '#6b3f38',
      shirt: '#a94f71'
    }
  };

  const d = designs[id];
  if (!d) return '';

  return `
    <svg viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Profesyonel avatar">
      <circle cx="50" cy="50" r="50" fill="${d.bg}"/>
      <path d="M14 100 Q17 72 38 69 L62 69 Q83 72 86 100"
        fill="${d.shirt}"/>
      <path d="M39 59 L61 59 L64 76 L36 76 Z"
        fill="${d.skin}"/>
      <ellipse cx="50" cy="43" rx="23" ry="28"
        fill="${d.skin}"/>
      <path d="M27 43 Q20 12 49 12 Q78 12 74 44
        L67 32 Q51 37 34 29 Z"
        fill="${d.hair}"/>
      <path d="M36 44 Q40 41 44 44 M56 44 Q60 41 64 44"
        stroke="#45352f" stroke-width="2.5"
        fill="none" stroke-linecap="round"/>
      <path d="M44 56 Q50 61 57 55"
        stroke="#925a4c" stroke-width="2.5"
        fill="none" stroke-linecap="round"/>
    </svg>
  `;
}

function getSystemAvatarHtml(avatar) {
  if (!avatar) return '';

  if (avatar.type === 'emoji') {
    const item = SYSTEM_AVATARS.find(
      (x) => x.id === avatar.id && x.type === 'emoji'
    );

    if (!item) return '';

    return `<span class="system-avatar-emoji"
      aria-label="${escapeHtml(item.label)}">${item.value}</span>`;
  }

  if (avatar.type === 'illustration') {
    const item = SYSTEM_AVATARS.find(
      (x) => x.id === avatar.id && x.type === 'illustration'
    );

    if (!item) return '';

    return getSystemAvatarSvg(item.id);
  }

  return '';
}

function openAvatarPicker(email) {
  const uid = window.firebaseAuth?.currentUser?.uid;

  if (!uid || !email) {
    window.alert('Avatar seçmek için tekrar giriş yapmalısınız.');
    return;
  }

  document.querySelector('#system-avatar-picker')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'system-avatar-picker';
  overlay.className = 'avatar-picker-overlay';

  const choices = SYSTEM_AVATARS.map((avatar) => `
    <button type="button"
      class="avatar-picker-option"
      data-avatar-id="${avatar.id}"
      aria-label="${escapeHtml(avatar.label)}">
      <span class="avatar-picker-preview">
        ${avatar.type === 'emoji'
          ? `<span class="system-avatar-emoji">${avatar.value}</span>`
          : getSystemAvatarSvg(avatar.id)}
      </span>
      <span>${escapeHtml(avatar.label)}</span>
    </button>
  `).join('');

  overlay.innerHTML = `
    <section class="avatar-picker-dialog"
      role="dialog" aria-modal="true"
      aria-labelledby="avatar-picker-title">
      <button type="button" class="avatar-picker-close"
        aria-label="Kapat">×</button>
      <h2 id="avatar-picker-title">Profil avatarını seç</h2>
      <p>Ekibine uygun bir avatar seçebilirsin.</p>
      <h3>Emoji avatarlar</h3>
      <div class="avatar-picker-grid">
        ${choices.split('</button>').slice(0, 6)
          .map((x) => x + '</button>').join('')}
      </div>
      <h3>Profesyonel illüstrasyonlar</h3>
      <div class="avatar-picker-grid">
        ${choices.split('</button>').slice(6)
          .map((x) => x + '</button>').join('')}
      </div>
      <p class="avatar-picker-status" aria-live="polite"></p>
    </section>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.avatar-picker-close').onclick =
    () => overlay.remove();

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });

  overlay.querySelectorAll('[data-avatar-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = SYSTEM_AVATARS.find(
        (x) => x.id === button.dataset.avatarId
      );

      if (!item) return;

      const status = overlay.querySelector('.avatar-picker-status');
      status.textContent = 'Avatar kaydediliyor...';

      try {
        const profileRef = window.firebaseDoc(
          window.firebaseDb, 'users', uid
        );

        await window.firebaseSetDoc(profileRef, {
          avatar: {
            id: item.id,
            type: item.type,
            value: item.value
          }
        }, { merge: true });

        if (window.firebaseAuth.currentUser.uid !== uid) {
          throw new Error('Oturum değişti. Lütfen tekrar deneyin.');
        }

        if (typeof currentUser !== 'undefined' && currentUser) {
          currentUser.avatar = {
            id: item.id,
            type: item.type,
            value: item.value
          };
        }

        overlay.remove();
        renderDashboard(window._lastPage || 'Yönetim Paneli');
      } catch (error) {
        console.error('Avatar kaydetme hatası:', error);
        status.textContent =
          'Avatar kaydedilemedi. Firebase erişim kurallarını kontrol edin.';
      }
    });
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-avatar-picker]');
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  openAvatarPicker(button.dataset.openAvatarPicker);
});