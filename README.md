# Мы вдвоём

Кроссплатформенное приватное пространство для пары: желания, идеи свиданий, фильмы, задачи, покупки, места и общий календарь. Один Expo-проект работает на Android и iOS, данные и правила доступа общие для обеих платформ.

## Структура

- `apps/mobile` — Expo Router / React Native приложение.
- `apps/invite-web` — адаптивная fallback-страница приглашения и файлы Universal/App Links.
- `packages/shared` — типы, схемы валидации и дизайн-токены.
- `supabase` — PostgreSQL-миграции, RLS-тесты и Edge Functions.
- `docs` — архитектура, приватность и статус проверки.

## Локальный запуск

Требования: Node.js 24+, pnpm 10+, Docker Desktop для локального Supabase, Supabase CLI и development build Expo для проверки push.

```bash
pnpm install
cp .env.example .env
npx supabase start
npx supabase db reset
pnpm dev
```

На Windows скопируйте `.env.example` в `.env` вручную или командой `Copy-Item .env.example .env`. Значения `EXPO_PUBLIC_*` используются клиентом; service-role, SMTP, Expo access token и cron secret нельзя помещать в `.env` мобильного приложения.

Без Supabase приложение открывает только демонстрационный режим через кнопку на экране входа. Он предназначен для UI-проверки, а не для приёмки синхронизации или безопасности.

### Страница приглашения

```bash
pnpm dev:web
pnpm build:web
```

Перед production-размещением замените домен `invite.example.com`, `APPLE_TEAM_ID`, SHA-256 сертификата Android и ссылки на карточки магазинов. Папка `apps/invite-web/public/.well-known` должна отдаваться без редиректов и с корректным `Content-Type`.

## Supabase

1. Создайте проект и подключите CLI: `npx supabase link --project-ref <ref>`.
2. Примените миграции: `npx supabase db push`.
3. Разверните функции:

```bash
npx supabase functions deploy invite-preview
npx supabase functions deploy accept-invite
npx supabase functions deploy push-dispatch
npx supabase functions deploy delete-accounts --no-verify-jwt
```

4. Добавьте secrets: `EXPO_ACCESS_TOKEN`, `INVITE_FINGERPRINT_PEPPER` и `ACCOUNT_DELETION_CRON_SECRET`.
5. Настройте production SMTP для шестизначных OTP.
6. Создайте Supabase Cron-вызов `push-dispatch` каждую минуту с service-role bearer token и `delete-accounts` один раз в сутки с `x-cron-secret`.

Миграции включают закрытые по умолчанию RLS-политики. Не используйте service-role в приложении и не выключайте RLS для отладки production-проекта.

## Сборки

Заполните реальный `extra.eas.projectId`, bundle/package identifiers и credentials, затем:

```bash
cd apps/mobile
npx eas build --profile development --platform all
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
npx eas build --profile production --platform ios
```

- `preview` создаёт устанавливаемый APK.
- Android `production` создаёт AAB.
- iOS production требует Apple Developer Program, App Store Connect и APNs key.
- Android push требует Firebase/FCM v1 credentials.
- Подписанные сборки и публикация не считаются выполненными, пока соответствующая команда EAS не завершилась успешно.

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm build:web
npx supabase test db
```

Главная приёмка проводится на двух физических устройствах и третьем тестовом аккаунте. Подробная матрица находится в [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
