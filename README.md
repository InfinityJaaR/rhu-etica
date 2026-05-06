# Ética en la IA — Plataforma de Votación en Tiempo Real

Una aplicación web interactiva y en tiempo real para exposiciones universitarias sobre Ética Informática. La audiencia (usuarios anónimos) vota sobre dilemas éticos mientras el presentador (admin) controla la información mostrada en tiempo real.

## 🎯 Características

- **Votación Pública** (`/`): Pantalla minimalista con dilemas y opciones A/B/C. Los usuarios votan de forma anónima.
- **Panel Admin** (`/admin`): Control total del presentador para activar/desactivar dilemas y revelar resultados.
- **Pantalla de Resultados** (`/resultados`): Visualización en tiempo real con gráficos Recharts mostrando porcentajes.
- **Tiempo Real**: Supabase Realtime subscriptions para actualizaciones instantáneas sin refresh.
- **Modo Oscuro**: Diseño oscuro por defecto optimizado para proyectores.

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **UI Components**: Recharts para gráficos
- **Backend & DB**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Hosting**: Vercel

## 📁 Estructura del Proyecto

```
app/
├── page.tsx                 # Página de votación pública
├── admin/page.tsx           # Panel de control del admin
├── resultados/page.tsx      # Pantalla de resultados
├── api/
│   ├── vote/route.ts        # API para registrar votos
│   └── admin/
│       ├── dilemma/route.ts # API para gestionar dilemas
│       └── votes/route.ts   # API para resetear votos
└── globals.css              # Diseño oscuro y tokens de diseño

components/
├── voting/VotingClient.tsx  # Lógica de votación pública
├── admin/AdminClient.tsx    # Lógica del panel admin
└── results/ResultsClient.tsx # Lógica de pantalla de resultados

lib/
├── supabase/
│   ├── client.ts            # Cliente Supabase para el navegador
│   ├── server.ts            # Cliente Supabase para el servidor
│   └── middleware.ts        # Middleware para token refresh
└── types.ts                 # Tipos TypeScript
```

## 🗄️ Esquema de Base de Datos

La aplicación utiliza tres tablas principales en Supabase:

### `dilemmas`
```sql
id          UUID PRIMARY KEY
title       TEXT (ej: "El Algoritmo de Contratación")
context     TEXT (descripción del dilema)
is_active   BOOLEAN (si está activo para votación)
show_results BOOLEAN (si mostrar resultados)
created_at  TIMESTAMPTZ
```

### `options`
```sql
id          UUID PRIMARY KEY
dilemma_id  UUID FK → dilemmas.id
label       TEXT (A, B, C)
text        TEXT (descripción de la opción)
consequence TEXT (consecuencia de elegir esta opción)
sort_order  INT (orden de visualización)
created_at  TIMESTAMPTZ
```

### `votes`
```sql
id          UUID PRIMARY KEY
option_id   UUID FK → options.id
created_at  TIMESTAMPTZ
```

Las políticas RLS permiten lectura pública de todas las tablas e inserción pública en `votes`.

## 🚀 Primeros Pasos

### 1. Clonar y instalar dependencias

```bash
git clone https://github.com/InfinityJaaR/rhu-etica.git
cd rhu-etica
npm install
```

### 2. Configurar Supabase

Asegúrate de que:
- Tienes una cuenta en [Supabase](https://supabase.com)
- La base de datos está creada y el schema está aplicado
- Las variables de entorno están configuradas

### 3. Variables de Entorno

Crea un archivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 4. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📱 Rutas

- **`/`** - Página de votación pública (para la audiencia)
- **`/admin`** - Panel de control (para el presentador)
- **`/resultados`** - Pantalla de resultados (para proyectar en pantalla grande)

## 🎨 Diseño

- **Color Scheme**: Modo oscuro (#0a0a0a fondo, #fafafa texto)
- **Accent**: Azul (#3b82f6)
- **Typography**: Geist Sans para todo el texto
- **Animaciones**: Transiciones suaves entre estados (voting → results)

## 🔄 Flujo en Tiempo Real

1. El admin activa un dilema en `/admin`
2. Los usuarios ven el dilema en `/` con botones A/B/C
3. Cada voto se registra en la BD y se propaga en tiempo real a todos
4. El admin revela los resultados en `/admin`
5. La pantalla `/resultados` actualiza el gráfico en tiempo real
6. Los usuarios en `/` ven el gráfico y las consecuencias de sus votaciones

## 🛡️ Seguridad

- Row Level Security (RLS) activo en todas las tablas
- Voto anónimo (sin autenticación de usuario)
- El admin usa acceso directo a la API (sin autenticación adicional en esta versión)

## 📚 Dependencias Principales

- `@supabase/supabase-js` - Cliente Supabase
- `@supabase/ssr` - SSR para Supabase
- `recharts` - Gráficos
- `tailwindcss` - Utilidades CSS
- `next/font` - Fuentes optimizadas

## 🤝 Contribuir

Para cambios significativos, abre un issue primero para discutir lo que quieres cambiar.

## 📄 Licencia

MIT

---

Desarrollado para la exposición RHU sobre Ética en la Inteligencia Artificial.
