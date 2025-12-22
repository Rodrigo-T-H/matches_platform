# Guía de Integración - Matches Platform

Esta guía explica cómo integrar las funcionalidades de **Fuzzy Matching** y **Google Lens** en una aplicación React principal, manteniendo el desarrollo independiente.

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Opción Recomendada: Integración Directa](#opción-1-integración-directa-recomendada)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Checklist de Migración](#checklist-de-migración)
5. [Configuración del Backend](#configuración-del-backend)
6. [Solución de Problemas](#solución-de-problemas)

---

## Visión General

El proyecto **Matches Platform** está diseñado para ser **modular y portable**:

- ✅ **Componentes auto-contenidos** - No dependen de contexto global
- ✅ **Estilos aislados** - Cada componente tiene su propio CSS
- ✅ **API centralizada** - Un solo archivo de servicio (`api.ts`)
- ✅ **TypeScript completo** - Tipos exportables y reutilizables
- ✅ **Backend independiente** - Express API en puerto 3001

**Funciona standalone AHORA, integrable DESPUÉS**

---

## Opción 1: Integración Directa (RECOMENDADA)

### Paso 1: Instalar Dependencias

```bash
# En tu proyecto principal
npm install axios react-router-dom xlsx file-saver papaparse
```

### Paso 2: Copiar Archivos

Copia estas carpetas a tu proyecto principal:

```bash
# Desde la raíz de matches_platform/frontend/src/

# Componentes reutilizables
cp -r components/FileUploader.tsx <TU_PROYECTO>/src/components/matches/
cp -r components/FileUploader.css <TU_PROYECTO>/src/components/matches/
cp -r components/ResultsTable.tsx <TU_PROYECTO>/src/components/matches/
cp -r components/ResultsTable.css <TU_PROYECTO>/src/components/matches/
cp -r components/BatchGoogleLens.tsx <TU_PROYECTO>/src/components/matches/
cp -r components/BatchGoogleLens.css <TU_PROYECTO>/src/components/matches/

# Páginas principales
cp -r pages/FuzzyPage.tsx <TU_PROYECTO>/src/pages/matches/
cp -r pages/FuzzyPage.css <TU_PROYECTO>/src/pages/matches/
cp -r pages/GoogleLensPage.tsx <TU_PROYECTO>/src/pages/matches/
cp -r pages/GoogleLensPage.css <TU_PROYECTO>/src/pages/matches/

# Servicios de API
cp -r services/api.ts <TU_PROYECTO>/src/services/matchesApi.ts

# Tipos TypeScript
cp -r types/index.ts <TU_PROYECTO>/src/types/matches.ts
```

### Paso 3: Actualizar Imports

En los archivos copiados, actualiza las rutas de import:

**Ejemplo en FuzzyPage.tsx:**

```typescript
// ANTES (en matches_platform)
import { FileUploader } from '../components/FileUploader';
import { ResultsTable } from '../components/ResultsTable';
import { processFuzzyMatchingWithProgress } from '../services/api';
import type { FuzzyResult } from '../types';

// DESPUÉS (en tu proyecto)
import { FileUploader } from '@/components/matches/FileUploader';
import { ResultsTable } from '@/components/matches/ResultsTable';
import { processFuzzyMatchingWithProgress } from '@/services/matchesApi';
import type { FuzzyResult } from '@/types/matches';
```

### Paso 4: Copiar Variables CSS

Agrega estas variables a tu archivo CSS global:

```css
/* Variables de Matches Platform */
:root {
  --color-primary: #073C5C;
  --color-primary-dark: #062341;
  --color-accent: #30A7B5;
  --color-accent-orange: #F68D2E;
  --color-background: #f5f7fa;
  --color-text: #213547;
}
```

### Paso 5: Configurar Variables de Entorno

Crea o actualiza tu archivo `.env`:

```env
# URL del backend de Matches Platform
VITE_MATCHES_API_URL=http://localhost:3001/api
```

Actualiza `matchesApi.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_MATCHES_API_URL || 'http://localhost:3001/api';
```

### Paso 6: Agregar Rutas

En tu `App.tsx` o router principal:

```typescript
import { Routes, Route } from 'react-router-dom';
import FuzzyPage from '@/pages/matches/FuzzyPage';
import GoogleLensPage from '@/pages/matches/GoogleLensPage';

function App() {
  return (
    <Routes>
      {/* Tus rutas existentes */}

      {/* Nuevas rutas de Matches Platform */}
      <Route path="/herramientas/fuzzy-matching" element={<FuzzyPage />} />
      <Route path="/herramientas/google-lens" element={<GoogleLensPage />} />
    </Routes>
  );
}
```

### Paso 7: Agregar Navegación

En tu componente de navegación:

```typescript
<nav>
  {/* Tus links existentes */}

  <NavLink to="/herramientas/fuzzy-matching">
    Fuzzy Matching
  </NavLink>
  <NavLink to="/herramientas/google-lens">
    Google Lens
  </NavLink>
</nav>
```

---

## Estructura de Archivos

### Antes (Standalone)

```
matches_platform/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── types/
└── backend/
```

### Después (Integrado)

```
tu_proyecto/
├── src/
│   ├── components/
│   │   ├── common/
│   │   └── matches/              ← NUEVO
│   │       ├── FileUploader.tsx
│   │       ├── ResultsTable.tsx
│   │       └── BatchGoogleLens.tsx
│   ├── pages/
│   │   ├── Home/
│   │   └── matches/              ← NUEVO
│   │       ├── FuzzyPage.tsx
│   │       └── GoogleLensPage.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── matchesApi.ts         ← NUEVO
│   └── types/
│       ├── index.ts
│       └── matches.ts            ← NUEVO
```

---

## Checklist de Migración

### Frontend

- [ ] Instalar dependencias: `axios`, `react-router-dom`, `xlsx`, `file-saver`, `papaparse`
- [ ] Copiar carpeta `/components` → `tu_proyecto/src/components/matches/`
- [ ] Copiar carpeta `/pages` → `tu_proyecto/src/pages/matches/`
- [ ] Copiar `/services/api.ts` → `tu_proyecto/src/services/matchesApi.ts`
- [ ] Copiar `/types/index.ts` → `tu_proyecto/src/types/matches.ts`
- [ ] Actualizar imports en archivos copiados
- [ ] Copiar variables CSS a archivo global
- [ ] Configurar `VITE_MATCHES_API_URL` en `.env`
- [ ] Agregar rutas en router principal
- [ ] Probar FuzzyPage (upload → proceso → descarga)
- [ ] Probar GoogleLensPage (URL/Upload → búsqueda)
- [ ] Probar BatchGoogleLens (CSV → búsqueda batch)

### Backend

- [ ] Copiar carpeta completa `backend/` al servidor o proyecto
- [ ] Instalar dependencias: `npm install`
- [ ] Configurar `.env` con credenciales de Oxylabs
- [ ] Actualizar `FRONTEND_URL` en `.env` con tu URL principal
- [ ] Ejecutar backend: `npm run dev` (puerto 3001)
- [ ] Verificar endpoints: `GET http://localhost:3001/api/health`
- [ ] Probar CORS con tu frontend

---

## Configuración del Backend

### Variables de Entorno (backend/.env)

```env
# Puerto del servidor
PORT=3001

# URL del frontend para CORS (IMPORTANTE: actualizar con tu URL)
FRONTEND_URL=http://localhost:5173

# Credenciales de Oxylabs (para Google Lens)
OXYLABS_USERNAME=tu_usuario_real
OXYLABS_PASSWORD=tu_password_real
OXYLABS_GEO_LOCATION=Mexico
```

### Endpoints Disponibles

```
POST /api/fuzzy/process
  - Fuzzy Matching con SSE progress
  - Content-Type: multipart/form-data
  - Body: { pivotFile, comparisonFile, matchCount }

POST /api/google-lens/search
  - Búsqueda por URL de imagen
  - Body: { imageUrl }

POST /api/google-lens/upload-search
  - Búsqueda por imagen subida
  - Content-Type: multipart/form-data
  - Body: { image }

POST /api/google-lens/batch-search
  - Búsqueda por lotes con SSE
  - Body: { imageUrls: string[] }

GET /api/health
  - Health check
```

### Ejecutar Backend

```bash
# Desarrollo (con hot reload)
cd backend
npm run dev

# Producción
cd backend
npm start
```

---

## Solución de Problemas

### Error: "Cannot find module 'react-router-dom'"

```bash
npm install react-router-dom
```

### Error: "API_BASE_URL is undefined"

Verifica que existe `.env` con:
```env
VITE_MATCHES_API_URL=http://localhost:3001/api
```

Reinicia el servidor de desarrollo después de crear/modificar `.env`.

### Error: "CORS blocked"

En `backend/.env`, actualiza:
```env
FRONTEND_URL=http://localhost:TU_PUERTO
```

Reinicia el backend.

### Error: "Credenciales de Oxylabs inválidas"

Edita `backend/.env`:
```env
OXYLABS_USERNAME=tu_usuario_real
OXYLABS_PASSWORD=tu_password_real
```

Las credenciales de ejemplo (`sdatabunker`) NO funcionan.

### Estilos rotos después de copiar

Asegúrate de copiar las variables CSS de `index.css` a tu archivo CSS global:

```css
:root {
  --color-primary: #073C5C;
  --color-primary-dark: #062341;
  --color-accent: #30A7B5;
  --color-accent-orange: #F68D2E;
  --color-background: #f5f7fa;
  --color-text: #213547;
}
```

### Backend no responde

1. Verifica que esté corriendo: `ps aux | grep node`
2. Verifica el puerto: `lsof -i :3001`
3. Revisa logs del backend
4. Verifica firewall/antivirus

---

## Mantenimiento Dual (Standalone + Integrado)

### Desarrollo Standalone

```bash
# Terminal 1 - Backend
cd matches_platform/backend
npm run dev

# Terminal 2 - Frontend
cd matches_platform/frontend
npm run dev
```

### Desarrollo Integrado

```bash
# Terminal 1 - Backend (matches_platform)
cd matches_platform/backend
npm run dev

# Terminal 2 - Frontend (tu proyecto)
cd tu_proyecto
npm run dev
```

**Nota:** El backend es compartido entre ambos.

---

## Recursos Adicionales

- [CLAUDE.md](./CLAUDE.md) - Documentación técnica completa
- [README.md](./README.md) - Guía de inicio rápido
- [Backend API Reference](./backend/src/routes/) - Código de rutas

---

## Contacto y Soporte

Si tienes problemas con la integración, revisa:

1. Esta guía de integración
2. [CLAUDE.md](./CLAUDE.md) - Documentación técnica
3. [README.md](./README.md) - Troubleshooting

**Nota:** Mantén el proyecto `matches_platform` original intacto para futuras actualizaciones y testing.
