# CompraLatino

Prototipo web responsivo para la plataforma de compras y pujas internacionales descrita en **DSE Fase 2**.

La aplicación muestra el catálogo de YAuctions en moneda local, recomendaciones, el flujo de puja y un resumen administrativo. Puede trabajar con Microsoft SQL Server o usar datos simulados cuando no existe una configuración de base de datos.

## Tecnologías y arquitectura inicial

- **Node.js**: servidor HTTP y API REST local.
- **HTML, CSS y JavaScript**: interfaz PWA-ready y adaptable a escritorio, tablet y móvil.
- **Microsoft SQL Server 2022**: persistencia relacional mediante el controlador `mssql`.
- **Redis / Auth0 / YAuctions**: puntos de integración documentados para la siguiente fase.

La estructura sigue MVC: `web/` contiene las vistas, `server/controllers/` resuelve las vistas y rutas, `server/data/` selecciona la persistencia, `server/mock-data.js` respalda el modo demostración y `database/` contiene el esquema y datos iniciales para SQL Server. La API local es el backend de la aplicación.

## Ejecutar localmente

1. Abre una terminal dentro de esta carpeta.
2. Verifica que Node.js 20 o superior esté instalado.
3. Ejecuta `npm install` y luego `./start.cmd`.
4. Abre `http://localhost:3000`.

## Accesos de demostración

- Administradores: `adminDSE`, `adminUser` o `adminSales`; contraseña: `admin`.
- Cliente: `clienteDemo`; contraseña: `cliente`.

Al iniciar sesión, un administrador abre directamente el panel ejecutivo. Desde su menú lateral cada opción abre una pantalla propia: usuarios y vendedores, productos, analíticas, transacciones, salud de API, reportes y configuración. Los vendedores acceden únicamente a la gestión de productos. Los usuarios pueden abrir `Mi perfil` desde el menú público para actualizar sus datos en una pantalla independiente.

Las rutas visibles no exponen nombres de archivos: `/administracion`, `/administracion/usuarios`, `/administracion/productos` y `/perfil`. Las direcciones antiguas con `.html` redirigen automáticamente a estas rutas.

## Microsoft SQL Server

La persistencia está preparada para Microsoft SQL Server 2022 y versiones compatibles. El esquema incluye usuarios, vendedores, productos, categorías, órdenes y eventos.

La forma más rápida de instalarla es ejecutar `database/CompraLatino.sql` desde
SQL Server Management Studio o `sqlcmd`. El archivo crea la base de datos
`CompraLatino`, instala tablas, relaciones e índices y carga los datos iniciales.
Se puede volver a ejecutar sin duplicar esos datos.

Como alternativa modular:

1. Crea una base de datos llamada `CompraLatino` en SQL Server.
2. Ejecuta `database/schema.sql` sobre esa base.
3. Ejecuta `database/seed.sql` para cargar las cuentas y productos de demostración.
4. Copia `.env.example` a `.env` y define el servidor y la base de datos.
5. Ejecuta `npm start`.

En Windows, la configuración de ejemplo utiliza autenticación integrada mediante
`msnodesqlv8`, por lo que no guarda una contraseña y no requiere habilitar TCP en
una instancia local. Para un servidor remoto puede utilizarse el controlador
`tedious` con autenticación SQL y TCP. Ambos controladores usan un pool
reutilizable. En producción se recomienda cifrado con un certificado válido.

Cuando las variables de SQL Server no están completas, el backend inicia automáticamente en modo demostración. Los usuarios y sus cambios se conservan en `server/data/mock-users.json`; el resto de los datos simulados se reinicia con el servidor. Si las variables están definidas, la aplicación exige una conexión válida y verifica que el esquema exista antes de abrir el servidor HTTP.

Las contraseñas se almacenan únicamente como hashes bcrypt con sal y factor de costo 12. La API nunca devuelve hashes ni contraseñas al navegador. Al editar un usuario o perfil, dejar vacíos los campos de nueva contraseña conserva el hash existente.

Como alternativa, instala Node.js 20 o superior desde [nodejs.org](https://nodejs.org/), abre una **nueva** terminal y ejecuta `npm start`.

Para desarrollo con reinicio automático: `npm run dev`.

## Límites del prototipo

- No realiza pujas ni compras reales en YAuctions.
- No incluye pagos ni autenticación real; los controles representan el flujo de usuario.
- La autenticación actual sigue siendo demostrativa; antes de producción debe sustituirse por Auth0 y JWT.
- El modo demostración conserva usuarios y perfiles en JSON, pero reinicia productos y pujas al reiniciar. SQL Server conserva todos esos cambios.

## Próxima integración

1. Sustituir los datos de `server/mock-data.js` por el conector autenticado de YAuctions.
2. Configurar Auth0 y validación de JWT en el API Gateway.
3. Convertir los cambios futuros del esquema en migraciones versionadas para SQL Server.
