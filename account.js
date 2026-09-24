// Sunucusuz demo için yerel şifre değişikliği. Gerçek yetki sınırı sunucu gerektirir.
const PASSWORD_STORAGE_KEY = 'isSurecPasswordsV1';
const PASSWORD_ITERATIONS = 600000;
function loadPasswordRecords() {
  const raw = localStorage.getItem(PASSWORD_STORAGE_KEY);
  if (!raw) return {};
  const records = JSON.parse(raw);
  if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('Şifre deposu okunamadı.');
  return records;
}
function passwordHex(bytes) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}
async function derivePassword(password, salt, iterations) {
  if (!window.crypto?.subtle) throw new Error('Şifre işlemleri için güncel tarayıcıda HTTPS, localhost veya yerel dosya kullanın.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = Uint8Array.from(salt.match(/../g), (value) => parseInt(value, 16));
  return passwordHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes, iterations, hash: 'SHA-256' }, key, 256));
}
// Değiştirilmemiş demo hesapları senkron; kayıtlı özetler Web Crypto ile doğrulanır.
function verifyAccountPassword(user, password) {
  if (!user) return false;
  const records = loadPasswordRecords();
  if (!Object.hasOwn(records, user.email)) return user.password === password;
  const record = records[user.email];
  if (!record || record.algorithm !== 'PBKDF2-SHA256' || record.iterations !== PASSWORD_ITERATIONS || !/^[a-f0-9]{32}$/.test(record.salt) || !/^[a-f0-9]{64}$/.test(record.hash)) return false;
  return derivePassword(password, record.salt, record.iterations).then((hash) => hash === record.hash);
}
async function changeOwnPassword(oldPassword, newPassword, repeatPassword) {
  const session = currentUser;
  if (!session) throw new Error('Şifre değiştirmek için giriş yapın.');
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128 || !newPassword.trim()) throw new Error('Yeni şifre 8–128 karakter olmalıdır.');
  if (newPassword !== repeatPassword) throw new Error('Yeni şifreler eşleşmiyor.');
  if (oldPassword === newPassword) throw new Error('Yeni şifre mevcut şifreden farklı olmalıdır.');
  const user = users.find((item) => item.email === session.email);
  const before = localStorage.getItem(PASSWORD_STORAGE_KEY);
  if (!await verifyAccountPassword(user, oldPassword)) throw new Error('Mevcut şifreniz yanlış.');
  const salt = passwordHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derivePassword(newPassword, salt, PASSWORD_ITERATIONS);
  if (currentUser !== session) throw new Error('Oturum değişti. Lütfen tekrar giriş yapın.');
  if (localStorage.getItem(PASSWORD_STORAGE_KEY) !== before) throw new Error('Şifre kayıtları değişti. Lütfen tekrar deneyin.');
  const records = loadPasswordRecords();
  records[user.email] = { algorithm: 'PBKDF2-SHA256', iterations: PASSWORD_ITERATIONS, salt, hash };
  try { localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(records)); }
  catch (err) { throw new Error('Şifre kaydedilemedi. Tarayıcı depolama alanını kontrol edin.'); }
}
function renderPasswordPanel() {
  if (!currentUser) return '';
  return `<section class="panel"><div class="panel-header"><div><h2>Şifremi Güncelle</h2><p class="panel-subtitle">Yalnızca kendi hesabınızın şifresini değiştirebilirsiniz. Değişiklik bu tarayıcıda geçerlidir.</p></div></div>
    <form id="password-form" class="work-form community-form">
      <label class="field">Mevcut şifre<input type="password" name="currentPassword" autocomplete="current-password" required /></label>
      <label class="field">Yeni şifre<input type="password" name="newPassword" autocomplete="new-password" minlength="8" maxlength="128" aria-describedby="password-hint" required /></label>
      <label class="field">Yeni şifre tekrar<input type="password" name="repeatPassword" autocomplete="new-password" minlength="8" maxlength="128" required /></label>
      <span class="field-hint" id="password-hint">Yeni şifre 8–128 karakter olmalıdır.</span>
      <button type="submit" class="primary-btn work-submit">Şifremi güncelle</button>
    </form><div class="save-row"><span id="password-status" class="save-status" role="status" aria-live="polite"></span></div></section>`;
}
function setupPasswordPanel() {
  const form = document.querySelector('#password-form');
  if (!form) return;
  let busy = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const button = form.querySelector('button');
    const status = document.querySelector('#password-status');
    button.disabled = true;
    status.className = 'save-status';
    status.textContent = 'Şifreniz güncelleniyor…';
    try {
      const data = new FormData(form);
      await changeOwnPassword(data.get('currentPassword'), data.get('newPassword'), data.get('repeatPassword'));
      form.reset();
      status.className = 'save-status is-ok';
      status.textContent = '✓ Şifreniz güncellendi. Sonraki girişinizde yeni şifrenizi kullanın.';
    } catch (err) { status.textContent = err.message || 'Şifre güncellenemedi.'; }
    finally { busy = false; button.disabled = false; }
  });
}
