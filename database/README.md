# Base de datos de CompraLatino

Esta carpeta concentra la instalación y los archivos modulares de Microsoft SQL
Server:

- `CompraLatino.sql`: instalador completo e idempotente. Crea la base, las tablas,
  relaciones, restricciones, índices y datos iniciales.
- `schema.sql`: solamente la estructura de una base existente.
- `seed.sql`: solamente los datos iniciales.

## Instalación completa

Desde una terminal con acceso administrativo local a SQL Server:

```powershell
sqlcmd -S localhost -E -C -b -i database\CompraLatino.sql
```

`-E` utiliza la identidad de Windows que ejecuta el comando. No se escribe un
usuario ni una contraseña de SQL Server en el comando o en el repositorio.

## Conexión del backend sin credenciales visibles

La configuración local usa autenticación integrada de Windows:

```dotenv
SQLSERVER_HOST=localhost
SQLSERVER_DATABASE=CompraLatino
SQLSERVER_DRIVER=msnodesqlv8
SQLSERVER_TRUSTED_CONNECTION=true
SQLSERVER_ODBC_DRIVER=ODBC Driver 18 for SQL Server
```

El flujo de conexión es:

1. `server/config/database.js` lee la configuración local.
2. Cuando `SQLSERVER_TRUSTED_CONNECTION=true`, construye en memoria una conexión
   ODBC con `Trusted_Connection=Yes`, sin usuario ni contraseña.
3. `server/data/sqlserver-store.js` selecciona `mssql/msnodesqlv8` y abre el pool.
4. El servidor verifica que existan `dbo.users` y `dbo.products` antes de aceptar
   solicitudes HTTP.

El archivo `.env` real está excluido mediante `.gitignore`. Para despliegues que
requieran autenticación SQL, las credenciales deben almacenarse en variables del
entorno o en un gestor de secretos, nunca en archivos versionados.

Los valores `password_hash` del script pertenecen a las cuentas demostrativas de
la aplicación. Son hashes bcrypt y no son credenciales de conexión a SQL Server.
