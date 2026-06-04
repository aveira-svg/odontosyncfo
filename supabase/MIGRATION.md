# Configuración inicial de Supabase

## Checklist

1. [ ] Ejecutar `supabase/schema.sql` en Supabase SQL Editor
2. [ ] Crear usuarios en **Authentication → Users**
3. [ ] Configurar `.env.local` (`NEXT_PUBLIC_SUPABASE_*`)
4. [ ] Probar login, búsqueda de pacientes y abonos

---

## Paso 1 — Esquema SQL

Supabase Dashboard → **SQL Editor** → pegar y ejecutar `supabase/schema.sql`.

---

## Paso 2 — Usuarios Auth

Creá cuentas en Supabase Auth con el email del personal de la clínica.

---

## Paso 3 — Variables locales

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Vercel

Solo configurá en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**No** subas `SUPABASE_SERVICE_ROLE_KEY` a Vercel salvo que uses Edge Functions server-side.
