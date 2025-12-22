# Matches Platform - Documentacion del Proyecto

## Descripcion General

Este proyecto es una plataforma de comparacion de productos con dos funcionalidades principales:

1. **Fuzzy Matching**: Compara listados de productos para encontrar coincidencias basadas en similitud de descripciones
2. **Google Lens**: Busqueda visual de productos similares usando la API de Oxylabs

## Estructura del Proyecto

```
matches_platform/
├── frontend/                 # Aplicacion React (Vite + TypeScript)
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   │   ├── FileUploader.tsx    # Componente de carga de archivos
│   │   │   └── ResultsTable.tsx    # Tabla de resultados fuzzy
│   │   ├── pages/            # Paginas principales
│   │   │   ├── FuzzyPage.tsx       # Pagina de Fuzzy Matching
│   │   │   └── GoogleLensPage.tsx  # Pagina de Google Lens
│   │   ├── services/         # Servicios de API
│   │   │   └── api.ts              # Cliente HTTP para backend
│   │   ├── types/            # Tipos TypeScript
│   │   │   └── index.ts            # Definiciones de tipos
│   │   ├── App.tsx           # Componente principal con rutas
│   │   └── main.tsx          # Entry point
│   └── package.json
│
├── backend/                  # API Node.js (Express)
│   ├── src/
│   │   ├── routes/           # Rutas de la API
│   │   │   ├── fuzzy.js            # Endpoints de fuzzy matching
│   │   │   └── googleLens.js       # Endpoints de Google Lens
│   │   ├── services/         # Logica de negocio
│   │   │   ├── fuzzyService.js     # Logica de fuzzy matching
│   │   │   └── googleLensService.js # Integracion con Oxylabs
│   │   └── index.js          # Entry point del servidor
│   ├── uploads/              # Archivos temporales subidos
│   └── package.json
│
├── .env                      # Variables de entorno (crear manualmente)
├── .env.example              # Ejemplo de variables de entorno
└── CLAUDE.md                 # Este archivo
```

## Tecnologias Utilizadas

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **React Router v6** - Navegacion
- **Axios** - Cliente HTTP
- **XLSX** - Lectura/escritura de Excel
- **file-saver** - Descarga de archivos

### Backend
- **Node.js** con ES Modules
- **Express 5** - Framework web
- **Multer** - Manejo de archivos
- **Algoritmo de Índice Invertido** - Fuzzy matching optimizado (sin librerías externas)
- **XLSX** - Parsing de Excel
- **PapaParse** - Parsing de CSV
- **Axios** - Llamadas a API externa (Oxylabs)

## APIs y Endpoints

### Backend API (Puerto 3001)

#### Fuzzy Matching
```
POST /api/fuzzy/process
Content-Type: multipart/form-data

Body:
- pivotFile: archivo CSV/Excel con productos pivote
- comparisonFile: archivo CSV/Excel con productos a comparar
- matchCount: numero de coincidencias (2-5, default 4)

Response:
{
  "success": true,
  "results": [...],
  "totalPivot": 100,
  "totalComparison": 500,
  "processingTime": 1234
}
```

#### Google Lens
```
POST /api/google-lens/search
Content-Type: application/json

Body:
{
  "imageUrl": "https://ejemplo.com/imagen.jpg"
}

Response:
{
  "success": true,
  "results": [
    {
      "title": "Producto Similar",
      "link": "https://tienda.com/producto",
      "source": "tienda.com",
      "thumbnail": "https://...",
      "price": "$199.00"
    }
  ],
  "imageUrl": "https://..."
}
```

#### Health Check
```
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

## Variables de Entorno

Crear archivo `.env` en la raiz del proyecto `backend/`:

```env
# Puerto del servidor
PORT=3001

# URL del frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Credenciales de Oxylabs para Google Lens
OXYLABS_USERNAME=tu_usuario
OXYLABS_PASSWORD=tu_contraseña
OXYLABS_GEO_LOCATION=Mexico
```

## Formato de Archivos para Fuzzy Matching

Los archivos CSV/Excel deben tener las siguientes columnas:

### Columnas Requeridas
- **UPC** (o: EAN, SKU, codigo, codigo de barras)
- **Item** (o: description, descripcion, producto, nombre)

### Columnas Opcionales (archivo de comparacion)
- URL SKU / URL
- Image / Imagen
- Final Price / Price / Precio

### Ejemplo de archivo CSV:
```csv
UPC,Item
7501234567890,"Jabon Neutro 100g"
7501234567891,"Shampoo Anticaspa 400ml"
```

## Algoritmo de Fuzzy Matching

El sistema utiliza un **Índice Invertido (Inverted Index)** optimizado para máxima velocidad:

1. **Coincidencia Exacta**: Si el UPC coincide exactamente, se marca como "Identico" con score 100%

2. **Coincidencia Fuzzy con Índice Invertido**:
   - **Pre-procesamiento**: Se crea un índice que mapea cada palabra → productos que la contienen
   - **Filtrado de stopwords**: Se eliminan palabras comunes sin valor semántico (de, la, el, con, etc.)
   - **Matching por conteo de palabras**: Se cuenta cuántas palabras coinciden entre productos
   - **Normalización**: minúsculas, sin acentos, sin caracteres especiales
   - **Ventaja**: Hasta 10-20x más rápido que Fuse.js para datasets grandes

3. **Scoring**: El score va de 0% a 100%, donde:
   - **Score = (palabras coincidentes / total palabras pivote) × 100**
   - **80-100%**: Alta similitud (verde)
   - **60-79%**: Similitud media (amarillo)
   - **<60%**: Baja similitud (rojo)

### Optimizaciones de Rendimiento

- **Índice invertido**: Creado una sola vez al inicio, reutilizado para todos los productos
- **Reporte de progreso cada 10 items**: Para datasets >100 productos
- **Stopwords españoles**: Filtrados para mejorar precisión
- **Palabras mínimas de 3 caracteres**: Ignora palabras muy cortas sin valor semántico

## Comandos de Desarrollo

### Frontend
```bash
cd frontend
npm install
npm run dev       # Desarrollo (puerto 5173)
npm run build     # Build para produccion
npm run preview   # Preview del build
```

### Backend
```bash
cd backend
npm install
npm run dev       # Desarrollo con hot reload
npm start         # Produccion
```

## Integracion con React Principal

Este proyecto esta disenado para integrarse como modulo en una aplicacion React mas grande. Opciones:

### Opcion 1: Micro-frontend
- Compilar como Web Component
- Importar en aplicacion principal

### Opcion 2: Monorepo
- Mover carpetas `pages` y `components` al proyecto principal
- Configurar rutas anidadas

### Opcion 3: iFrame
- Hostear por separado
- Integrar via iframe

## Notas Importantes

1. **Google Lens**: Requiere cuenta activa de Oxylabs con creditos
2. **Archivos Grandes**: El backend soporta hasta 50MB por archivo
3. **Timeout**: Las operaciones tienen timeout de 5 minutos
4. **Limpieza**: Los archivos subidos se eliminan automaticamente despues del procesamiento

## Casos de Uso Tipicos

1. **Farmacias**: Comparar marcas propias entre diferentes cadenas
2. **Ferreterias**: Encontrar herramientas equivalentes entre marcas
3. **Supermercados**: Comparar productos de tiendas de conveniencia
4. **E-commerce**: Encontrar productos competidores por imagen

## Troubleshooting

### Error: "Credenciales de Oxylabs invalidas"
- Verificar OXYLABS_USERNAME y OXYLABS_PASSWORD en .env

### Error: "Archivo vacio o formato incorrecto"
- Asegurar que el archivo tiene columnas UPC e Item
- Verificar que el archivo no esta corrupto

### Fuzzy matching muy lento
- Archivos muy grandes (>10,000 filas) pueden tardar varios minutos
- Considerar dividir archivos en lotes
