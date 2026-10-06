# CompraLatino

Prototipo web responsivo para la plataforma de compras y pujas internacionales descrita en **DSE Fase 2**.

La aplicación muestra el catálogo de YAuctions en moneda local, recomendaciones, el flujo de puja y un resumen administrativo. Usa datos simulados porque el documento no incluye credenciales ni contrato de la API externa.

## Tecnologías y arquitectura inicial

- **Node.js**: servidor HTTP y API REST local sin dependencias externas.
- **HTML, CSS y JavaScript**: interfaz PWA-ready y adaptable a escritorio, tablet y móvil.
- **PostgreSQL 15**: esquema relacional incluido para la implementación transaccional.
- **Redis / Auth0 / YAuctions**: puntos de integración documentados para la siguiente fase.

La estructura sigue MVC: `web/` contiene las vistas, `server/controllers/` resuelve las vistas y rutas, `server/mock-data.js` funciona como modelo de demostración y `database/` contiene la persistencia PostgreSQL. La API local es el backend de la aplicación.

## Ejecutar localmente

1. Abre una terminal dentro de esta carpeta.
2. Verifica que Node.js 20 o superior esté instalado y ejecuta `./start.cmd`.
3. Abre `http://localhost:3000`.

## Accesos de demostración

- Administradores: `adminDSE`, `adminUser` o `adminSales`; contraseña: `admin`.
- Cliente: `clienteDemo`; contraseña: `cliente`.

Al iniciar sesión, un administrador abre directamente el panel ejecutivo. Desde su menú lateral cada opción abre una pantalla propia: usuarios y vendedores, productos, analíticas, transacciones, salud de API, reportes y configuración. Los vendedores acceden únicamente a la gestión de productos. Los usuarios pueden abrir `Mi perfil` desde el menú público para actualizar sus datos en una pantalla independiente.

Las rutas visibles no exponen nombres de archivos: `/administracion`, `/administracion/usuarios`, `/administracion/productos` y `/perfil`. Las direcciones antiguas con `.html` redirigen automáticamente a estas rutas.

## PostgreSQL

El esquema para PostgreSQL 15 está en `database/schema.sql`; incluye usuarios, vendedores, productos, categorías, órdenes y eventos. Copia `.env.example` a `.env`, define `DATABASE_URL` y ejecuta el esquema en la base de datos. Mientras no se configure la conexión, el backend funciona en modo demostración con datos locales.

Las credenciales del modo demostración se almacenan únicamente como hashes SHA-256; la API nunca devuelve hashes ni contraseñas al navegador.

Como alternativa, instala Node.js 20 o superior desde [nodejs.org](https://nodejs.org/), abre una **nueva** terminal y ejecuta `npm start`.

Para desarrollo con reinicio automático: `npm run dev`.

## Límites del prototipo

- No realiza pujas ni compras reales en YAuctions.
- No incluye pagos ni autenticación real; los controles representan el flujo de usuario.
- `database/schema.sql` es el modelo base; aún no se conecta desde el servidor local.

## Próxima integración

1. Sustituir los datos de `server/mock-data.js` por el conector autenticado de YAuctions.
2. Configurar Auth0 y validación de JWT en el API Gateway.
3. Crear migraciones PostgreSQL y reemplazar las respuestas simuladas.
