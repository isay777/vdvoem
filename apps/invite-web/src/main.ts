import './styles.css';

type InvitePreview = { valid: boolean; code?: string; expiresAt?: string; reason?: string };

const env = import.meta.env;
const token = location.pathname.split('/invite/')[1]?.split('/')[0] || new URLSearchParams(location.search).get('token') || '';
const app = document.querySelector<HTMLElement>('#app')!;

function icon(name: 'heart' | 'shield' | 'phone') {
  const paths = {
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-4"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function shell(content: string) {
  app.innerHTML = `
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
    <section class="invite-shell">
      <header class="brand"><span class="brand-mark">${icon('heart')}<i>${icon('heart')}</i></span><span>Мы вдвоём</span></header>
      ${content}
      <footer>${icon('shield')} Приглашение не открывает доступ к личным данным пары</footer>
    </section>`;
}

function renderLoading() {
  shell(`<div class="card loading"><div class="skeleton hero"></div><div class="skeleton line"></div><div class="skeleton line short"></div></div>`);
}

function renderError(reason = 'Ссылка недействительна или уже использована') {
  shell(`<div class="card center"><span class="large-heart muted">${icon('heart')}</span><p class="eyebrow">Приглашение недоступно</p><h1>Кажется, эта ссылка больше не работает</h1><p>${reason}. Попросите партнёра создать новое приглашение.</p></div>`);
}

function renderInstall() {
  const androidUrl = env.VITE_ANDROID_APK_URL || env.VITE_PLAY_STORE_URL || '#';
  shell(`<div class="card center">
    <span class="large-heart">${icon('heart')}</span>
    <p class="eyebrow">Тестовая версия</p>
    <h1>Ваше место только для двоих</h1>
    <p class="lead">Установите MVP на Android и откройте демонстрационный режим, чтобы познакомиться с приложением.</p>
    <a class="primary" href="${androidUrl}">${icon('phone')} Скачать Android APK</a>
  </div>`);
}

function renderInvite(preview: InvitePreview) {
  const code = preview.code ?? '••••••';
  const expires = preview.expiresAt ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(preview.expiresAt)) : '';
  const deepLink = `${env.VITE_APP_SCHEME || 'myvdvoem'}://invite/${encodeURIComponent(token)}`;
  const androidUrl = env.VITE_ANDROID_APK_URL || env.VITE_PLAY_STORE_URL || '#';
  const androidLabel = env.VITE_ANDROID_APK_URL ? 'Скачать Android APK' : 'Google Play';
  shell(`<div class="card">
    <div class="heart-confetti" aria-hidden="true">♡ <b>♥</b> ♡</div>
    <span class="large-heart">${icon('heart')}</span>
    <p class="eyebrow">Личное приглашение</p>
    <h1>Вас ждут в пространстве «Мы вдвоём»</h1>
    <p class="lead">Планы, желания и маленькие радости — в одном приватном месте только для вас двоих.</p>
    <a class="primary" href="${deepLink}">${icon('phone')} Открыть приложение</a>
    <div class="divider"><span>или введите код после установки</span></div>
    <button class="code" data-copy="${code}" aria-label="Скопировать код приглашения"><span>${code}</span><small>Нажмите, чтобы скопировать</small></button>
    <div class="stores"><a href="${env.VITE_APP_STORE_URL || '#'}">App Store</a><a href="${androidUrl}">${androidLabel}</a></div>
    ${expires ? `<p class="expiry">Действует до ${expires}</p>` : ''}
  </div>`);
  document.querySelector<HTMLButtonElement>('.code')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    await navigator.clipboard.writeText(button.dataset.copy || '');
    const hint = button.querySelector('small');
    if (hint) hint.textContent = 'Код скопирован';
  });
}

async function loadInvite() {
  renderLoading();
  if (!token) return renderInstall();
  if (!token || !env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    if (import.meta.env.DEV && token) return renderInvite({ valid: true, code: 'ВДВОЁМ' });
    return renderError('Не удалось определить приглашение');
  }
  try {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/invite-preview?token=${encodeURIComponent(token)}`, {
      headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const preview = await response.json() as InvitePreview;
    if (!response.ok || !preview.valid) return renderError(preview.reason);
    renderInvite(preview);
  } catch {
    renderError('Сервис временно недоступен');
  }
}

void loadInvite();
