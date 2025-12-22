# Matches Platform

Plataforma de comparacion de productos con dos herramientas principales:

- **Fuzzy Matching**: Compara listados de productos por similitud de descripcion
- **Google Lens**: Busqueda visual de productos similares

## 🚀 Guia de Instalacion y Ejecucion

### PASO 1: Verificar que Node.js este instalado

```bash
node --version
```
Debe mostrar v20 o superior. Si no tienes Node.js, descargalo de: https://nodejs.org/

### PASO 2: Configurar las variables de entorno

Ya cree los archivos `.env` por ti. Solo necesitas **editar las credenciales de Oxylabs**:

#### Archivo: `backend/.env` (ya creado)

```env
PORT=3001
FRONTEND_URL=http://localhost:5173

# EDITA ESTAS LINEAS CON TUS CREDENCIALES REALES:
OXYLABS_USERNAME=tu_usuario_oxylabs_aqui
OXYLABS_PASSWORD=tu_contraseña_oxylabs_aqui
OXYLABS_GEO_LOCATION=Mexico
```

**IMPORTANTE**:
- Si **NO** tienes credenciales de Oxylabs, dejalo como esta. El **Fuzzy Matching funcionara perfectamente**.
- Solo **Google Lens** requiere credenciales de Oxylabs (puedes obtenerlas en https://oxylabs.io/)

#### Archivo: `frontend/.env` (ya creado, no editar)

```env
VITE_API_URL=http://localhost:3001/api
```

### PASO 3: Instalar dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### PASO 4: Ejecutar la aplicacion

Necesitas **2 terminales abiertas**:

#### Terminal 1 - Backend:
```bash
cd c:\Users\RodrigoIvánTrejoHern\matches_platform\backend
npm run dev
```

Deberas ver:
```
🚀 Server running on http://localhost:3001
📋 API endpoints:
   - POST /api/fuzzy/process
   - POST /api/google-lens/search
   ...
```

#### Terminal 2 - Frontend:
```bash
cd c:\Users\RodrigoIvánTrejoHern\matches_platform\frontend
npm run dev
```

Deberas ver:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### PASO 5: Abrir en el navegador

Abre tu navegador en: **http://localhost:5173**

Veras dos pestañas:
- **Fuzzy Matching**: Sube tus archivos CSV/Excel
- **Google Lens**: Busca por imagen (requiere credenciales Oxylabs)

## 📋 Formato de Archivos (Fuzzy Matching)

Los archivos CSV/Excel deben tener minimo estas columnas:

### Columnas Requeridas:
- **UPC** (o variantes: EAN, SKU, codigo, codigo de barras)
- **Item** (o variantes: description, descripcion, nombre, producto)

### Ejemplo CSV:
```csv
UPC,Item
7501234567890,"Jabon Neutro 100g"
7501234567891,"Shampoo Anticaspa 400ml"
7501234567892,"Crema Dental Menta 150ml"
```

### Ejemplo Excel:
| UPC | Item |
|-----|------|
| 7501234567890 | Jabon Neutro 100g |
| 7501234567891 | Shampoo Anticaspa 400ml |

**TIP**: Puedes descargar el template desde la aplicacion (boton "Descargar Template")

## 🔑 Variables de Entorno - Referencia

### Backend (`backend/.env`)

| Variable | Descripcion | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3001` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:5173` |
| `OXYLABS_USERNAME` | Usuario de Oxylabs (Google Lens) | *Debes configurarlo* |
| `OXYLABS_PASSWORD` | Contraseña de Oxylabs | *Debes configurarlo* |
| `OXYLABS_GEO_LOCATION` | Ubicacion geografica | `Mexico` |

### Frontend (`frontend/.env`)

| Variable | Descripcion | Valor por Defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL de la API backend | `http://localhost:3001/api` |

## 🛠️ Comandos Utiles

### Desarrollo (modo watch con hot reload):
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Produccion:
```bash
# Backend
cd backend
npm start

# Frontend - Build
cd frontend
npm run build
# Los archivos compilados estaran en frontend/dist/
```

## 📁 Estructura del Proyecto

```
matches_platform/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # FuzzyPage, GoogleLensPage
│   │   ├── services/         # Cliente API
│   │   └── types/            # Tipos TypeScript
│   ├── .env                  # Variables de entorno (YA CREADO)
│   └── package.json
│
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── routes/           # Rutas de la API
│   │   ├── services/         # Logica de negocio
│   │   └── index.js          # Servidor principal
│   ├── uploads/              # Archivos temporales
│   ├── .env                  # Variables de entorno (YA CREADO)
│   └── package.json
│
├── CLAUDE.md                 # Documentacion tecnica completa
└── README.md                 # Este archivo
```

## 🔍 Búsqueda por Lotes de Google Lens

La funcionalidad de búsqueda por lotes permite procesar múltiples imágenes a la vez:

### Características:
- **Procesamiento por lotes**: Sube un archivo CSV/Excel con URLs de imágenes
- **Reintentos automáticos**: Si una imagen falla, se reintenta automáticamente hasta 2 veces
- **Rate limiting**: Delay de 1.5 segundos entre peticiones para evitar bloqueos
- **Timeout extendido**: 3 minutos por imagen para asegurar procesamiento completo
- **Progreso en tiempo real**: Barra de progreso con SSE (Server-Sent Events)
- **Top 15 resultados**: Descarga un Excel con los mejores 15 resultados por imagen

### Formato del archivo:
```csv
URL,UPC,Item
https://example.com/image1.jpg,7501234567890,Producto 1
https://example.com/image2.jpg,7501234567891,Producto 2
```

**Columnas requeridas**:
- `URL` (o variantes: "Image URL", "imageurl", "imagen", "link")

**Columnas opcionales**:
- `UPC` (para identificación)
- `Item` (para descripción)

### ⚠️ Importante para Búsqueda por Lotes:
1. **Credenciales válidas de Oxylabs son OBLIGATORIAS**
2. El archivo `backend/.env` tiene credenciales de **EJEMPLO** (`sdatabunker/sDatabunker=123`)
3. **DEBES reemplazarlas** con tus credenciales reales de https://oxylabs.io/
4. Sin credenciales válidas, verás el error: "Credenciales de Oxylabs inválidas"

## ❓ Troubleshooting

### Error: "Cannot find module..."
```bash
# Asegurate de instalar dependencias
cd backend
npm install
cd ../frontend
npm install
```

### Error: "Port 3001 already in use"
El puerto esta ocupado. Opciones:
1. Cierra la aplicacion que usa el puerto 3001
2. Cambia `PORT=3001` a `PORT=3002` en `backend/.env`

### Error: "Credenciales de Oxylabs invalidas"
**CAUSA**: Las credenciales en `backend/.env` son de ejemplo o incorrectas.

**SOLUCIÓN**:
1. Abre el archivo `backend/.env`
2. Reemplaza estas líneas:
   ```env
   OXYLABS_USERNAME=sdatabunker        # ❌ EJEMPLO
   OXYLABS_PASSWORD=sDatabunker=123    # ❌ EJEMPLO
   ```
   Con tus credenciales reales:
   ```env
   OXYLABS_USERNAME=tu_usuario_real    # ✅ TU USUARIO
   OXYLABS_PASSWORD=tu_password_real   # ✅ TU PASSWORD
   ```
3. Reinicia el backend (`npm run dev`)
4. Si no tienes cuenta, créala en: https://oxylabs.io/

**NOTA**: Fuzzy Matching funciona sin Oxylabs. Solo Google Lens lo requiere.

### Error: "Error de red al procesar imágenes"
**POSIBLES CAUSAS**:
1. Credenciales de Oxylabs inválidas (ver arriba)
2. Sin saldo en cuenta de Oxylabs
3. URLs de imágenes inaccesibles o bloqueadas
4. Problemas de conexión a internet

**SOLUCIONES**:
1. Verifica las credenciales en `backend/.env`
2. Revisa el saldo de tu cuenta en Oxylabs
3. Asegúrate de que las URLs de imágenes sean públicas y accesibles
4. Intenta con menos imágenes (máx. 10-20 para pruebas)

### Error: "Timeout al procesar las imágenes"
Si procesas muchas imágenes a la vez:
- **Recomendación**: Divide el archivo en lotes de 20-30 imágenes
- El sistema procesa cada imagen con timeout de 3 minutos
- Con delay de 1.5s entre peticiones, 30 imágenes toman ~15-20 minutos

## 📞 Soporte

Para dudas tecnicas, consulta el archivo [CLAUDE.md](./CLAUDE.md) con documentacion detallada.
