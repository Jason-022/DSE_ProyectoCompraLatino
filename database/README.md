# Base de datos de CompraLatino

## Instalador integral

- **Archivo:** `CompraLatino.sql`.
- **Función:** creación idempotente de la base `CompraLatino`.
- **Objetos:** tablas, relaciones, restricciones e índices.
- **Datos iniciales:** cinco cuentas con hashes bcrypt, categorías, seis productos y una venta asociada a cliente y vendedor.
- **Reejecución:** conservación de objetos y registros existentes.
- **Codificación:** lectura UTF-8 mediante `-f 65001` para conservar tildes y `ñ`.
- **Interfaz:** las cuentas iniciales no se publican ni se completan automáticamente en el formulario de acceso.

```powershell
sqlcmd -S localhost -E -C -b -f 65001 -i database\CompraLatino.sql
```

## Instalación modular

| Archivo | Función |
| --- | --- |
| `schema.sql` | Creación de tablas, relaciones, restricciones e índices |
| `seed.sql` | Inserción idempotente de datos iniciales |

Los dos archivos modulares generan la misma estructura y los mismos datos
iniciales que el instalador completo. La venta inicial permite comprobar de
inmediato el historial del cliente y el registro general de ventas.

## Configuración de conexión

- **Archivo:** `server/config/database.js`.
- **Controlador local:** `mssql/msnodesqlv8`.
- **Autenticación local:** identidad integrada de Windows.
- **Parámetro ODBC:** `Trusted_Connection=Yes`.
- **Pool:** conexiones reutilizables y tiempos límite configurables.

```dotenv
SQLSERVER_HOST=localhost
SQLSERVER_DATABASE=CompraLatino
SQLSERVER_DRIVER=msnodesqlv8
SQLSERVER_TRUSTED_CONNECTION=true
SQLSERVER_ODBC_DRIVER=ODBC Driver 18 for SQL Server
```

## Seguridad de conexión

- `.env` excluido mediante `.gitignore`.
- Conexión local sin usuario ni contraseña de SQL Server.
- Credenciales remotas suministradas mediante variables del entorno o gestor de
  secretos.
- Cadenas de conexión y credenciales excluidas de los registros de ejecución.

## Seguridad de cuentas

- Columna `dbo.users.password_hash` de tipo `VARCHAR(255)`.
- Hash bcrypt con sal y factor de costo `12`.
- Contraseñas en texto plano excluidas del esquema y datos iniciales.
- Hashes de aplicación independientes de credenciales de SQL Server.

## Objetos del esquema

| Tabla | Función |
| --- | --- |
| `dbo.users` | Cuentas, roles y perfiles |
| `dbo.categories` | Categorías del catálogo |
| `dbo.products` | Inventario y estado de pujas |
| `dbo.orders` | Pujas y ventas asociadas con cliente, vendedor y producto |
| `dbo.product_events` | Eventos y auditoría funcional |

## Restricciones principales

- Usuario y correo únicos.
- Roles limitados a `customer`, `seller` y `admin`.
- Montos y contadores no negativos.
- Estados de orden controlados mediante `CHECK`.
- Ventas manuales identificadas mediante `order_source` y `seller_id`.
- Cantidad y precio unitario conservados para construir el historial del cliente.
- Productos y órdenes relacionados mediante llaves foráneas.
