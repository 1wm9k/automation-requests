# Настройка Supabase

1. Создайте проект на supabase.com и скопируйте Project URL и anon public key из Settings → API.
2. В Authentication → Providers включите Email. Для демо отключите Confirm email; если оставить включённым, приложение показывает «Проверьте почту».
3. Выполните `supabase/migrations/0001_init.sql` целиком в SQL Editor (или `supabase db push`).
4. Убедитесь, что у `public.tickets` включён RLS и видны четыре политики `tickets_*_own`.
5. Создайте `.env.local` из `.env.example`, заполните URL и anon key.
6. Для `scripts/verify-rls.mjs` задайте `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TEST_A_EMAIL`, `TEST_A_PASSWORD`, `TEST_B_EMAIL`, `TEST_B_PASSWORD`.
7. Для Vercel добавьте те же две `VITE_` переменные. Site URL и Redirect URL укажите как `https://<домен-vercel>/`.

Service role key не используется в клиенте и не хранится в репозитории.
