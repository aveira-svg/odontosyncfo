# Hospital Odontológico — OdontoSync FO

Aplicación web (Next.js 15 + **Supabase**) para pacientes, atenciones clínicas, aranceles y facturación.

## Requisitos

- Node.js 18 o superior
- Proyecto en [Supabase](https://supabase.com)
- Cuenta en [GitHub](https://github.com) y [Vercel](https://vercel.com) (opcional)

## Configuración Supabase

### 1. Crear proyecto y ejecutar SQL

En **SQL Editor**, ejecutá el archivo `supabase/schema.sql` (tablas, RLS, RPC de búsqueda y abonos).

### 2. Crear usuario de acceso

**Authentication → Users → Add user** (email + contraseña para el personal de la clínica).

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completá en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Desarrollo local

```bash
npm install
npm run dev
```

La app corre en `http://127.0.0.1:3001`.

## Desplegar en Vercel

1. Importá el repo [aveira-svg/odontosyncfo](https://github.com/aveira-svg/odontosyncfo).
2. Agregá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

## Estructura principal

```
app/                  # Rutas Next.js
components/           # UI
lib/
  supabase-service.ts # Capa de datos (PostgreSQL)
  supabase/client.ts  # Cliente Supabase
supabase/schema.sql   # Esquema + RLS + funciones RPC
types/                # Modelos TypeScript
```

## Licencia

Proyecto privado — ZenithSoft / uso interno de la clínica.
