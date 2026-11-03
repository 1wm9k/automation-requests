# Заявки на автоматизацию

Vite + React + TypeScript приложение для заявок сотрудников, Supabase Auth/Postgres/RLS и GitHub Pages.

## Запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

Переменные: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. В браузер попадает только anon key.

## Архитектура

- Auth по email/паролю через Supabase; сессия восстанавливается SDK.
- Таблица и политики находятся в `supabase/migrations/0001_init.sql`.
- Поиск и фильтр выполняются запросом Supabase: `ilike` с экранированием `%` и `_`, `eq` для статуса; ответы устаревших запросов игнорируются.
- Список ограничен 50 последними заявками; даты форматируются в локальном часовом поясе.
- Идемпотентность создания: UUID генерируется при открытии формы; повторная вставка того же id обрабатывается как «уже сохранено».

## Проверки

`npm run build`, `npm run lint`, `npm run test`; интеграционный `node scripts/verify-rls.mjs` требует переменных тестовых пользователей (см. `docs/SUPABASE_SETUP.md`).

