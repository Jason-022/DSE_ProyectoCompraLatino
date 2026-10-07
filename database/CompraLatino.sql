/*
    CompraLatino - instalación completa para Microsoft SQL Server

    Puede ejecutarse varias veces: crea la base de datos cuando no existe,
    instala o actualiza el esquema y agrega los datos iniciales faltantes.
    Las contraseñas iniciales se almacenan únicamente como hashes bcrypt.
*/

USE [master];
GO

IF DB_ID(N'CompraLatino') IS NULL
BEGIN
    CREATE DATABASE [CompraLatino];
END;
GO

USE [CompraLatino];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* Usuarios y cuentas */
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users
    (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_users PRIMARY KEY
            CONSTRAINT DF_users_id DEFAULT NEWID(),
        username NVARCHAR(60) NOT NULL
            CONSTRAINT UQ_users_username UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL
            CONSTRAINT UQ_users_email UNIQUE,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        phone NVARCHAR(30) NULL,
        birth_date DATE NULL,
        auth0_subject NVARCHAR(255) NULL,
        role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_users_role DEFAULT N'customer',
        country_code CHAR(2) NOT NULL
            CONSTRAINT DF_users_country_code DEFAULT 'SV',
        created_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_users_role
            CHECK (role IN (N'customer', N'seller', N'admin'))
    );
END;
GO

/* Compatibilidad con instalaciones antiguas que usaban un hash más corto. */
IF EXISTS
(
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.users')
      AND name = N'password_hash'
      AND (system_type_id <> TYPE_ID(N'varchar') OR max_length < 255)
)
BEGIN
    ALTER TABLE dbo.users ALTER COLUMN password_hash VARCHAR(255) NOT NULL;
END;
GO

IF NOT EXISTS
(
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.users')
      AND name = N'UX_users_auth0_subject'
)
BEGIN
    CREATE UNIQUE INDEX UX_users_auth0_subject
        ON dbo.users(auth0_subject)
        WHERE auth0_subject IS NOT NULL;
END;
GO

/* Catálogo */
IF OBJECT_ID(N'dbo.categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.categories
    (
        id INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_categories PRIMARY KEY,
        name NVARCHAR(100) NOT NULL CONSTRAINT UQ_categories_name UNIQUE,
        created_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_categories_created_at DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.products
    (
        id NVARCHAR(120) NOT NULL CONSTRAINT PK_products PRIMARY KEY,
        yauctions_id NVARCHAR(120) NULL CONSTRAINT UQ_products_yauctions_id UNIQUE,
        category_id INT NULL,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        image_url NVARCHAR(1000) NULL,
        currency CHAR(3) NOT NULL CONSTRAINT DF_products_currency DEFAULT 'USD',
        price DECIMAL(18, 2) NULL,
        current_bid DECIMAL(18, 2) NULL,
        bid_count INT NOT NULL CONSTRAINT DF_products_bid_count DEFAULT 0,
        shipping_fee DECIMAL(18, 2) NOT NULL
            CONSTRAINT DF_products_shipping_fee DEFAULT 0,
        badge NVARCHAR(60) NULL,
        auction_ends_at DATETIME2(0) NULL,
        availability NVARCHAR(20) NOT NULL
            CONSTRAINT DF_products_availability DEFAULT N'active',
        updated_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_products_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_products_categories
            FOREIGN KEY (category_id) REFERENCES dbo.categories(id),
        CONSTRAINT CK_products_bid_count CHECK (bid_count >= 0),
        CONSTRAINT CK_products_amounts CHECK
        (
            (price IS NULL OR price >= 0)
            AND (current_bid IS NULL OR current_bid >= 0)
            AND shipping_fee >= 0
        ),
        CONSTRAINT CK_products_availability
            CHECK (availability IN (N'active', N'paused', N'sold', N'archived'))
    );
END;
GO

/* Compras y pujas */
IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.orders
    (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_orders PRIMARY KEY
            CONSTRAINT DF_orders_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        product_id NVARCHAR(120) NOT NULL,
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_orders_status DEFAULT N'draft',
        bid_amount DECIMAL(18, 2) NULL,
        service_fee DECIMAL(18, 2) NOT NULL
            CONSTRAINT DF_orders_service_fee DEFAULT 0,
        shipping_fee DECIMAL(18, 2) NOT NULL
            CONSTRAINT DF_orders_shipping_fee DEFAULT 0,
        created_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_orders_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_orders_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_orders_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_orders_products FOREIGN KEY (product_id) REFERENCES dbo.products(id),
        CONSTRAINT CK_orders_status CHECK
        (
            status IN
            (
                N'draft', N'bid_submitted', N'won', N'paid',
                N'shipped', N'delivered', N'cancelled'
            )
        ),
        CONSTRAINT CK_orders_amounts CHECK
        (
            (bid_amount IS NULL OR bid_amount >= 0)
            AND service_fee >= 0
            AND shipping_fee >= 0
        )
    );
END;
GO

/* Historial para analítica y auditoría funcional. */
IF OBJECT_ID(N'dbo.product_events', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.product_events
    (
        id BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_product_events PRIMARY KEY,
        user_id UNIQUEIDENTIFIER NULL,
        product_id NVARCHAR(120) NOT NULL,
        event_type NVARCHAR(50) NOT NULL,
        occurred_at DATETIME2(0) NOT NULL
            CONSTRAINT DF_product_events_occurred_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_product_events_users
            FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_product_events_products
            FOREIGN KEY (product_id) REFERENCES dbo.products(id)
    );
END;
GO

/* Índices usados por el catálogo, el panel administrativo y los reportes. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'IX_orders_user_created')
    CREATE INDEX IX_orders_user_created ON dbo.orders(user_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'IX_orders_status_created')
    CREATE INDEX IX_orders_status_created ON dbo.orders(status, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'IX_products_category')
    CREATE INDEX IX_products_category ON dbo.products(category_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'IX_products_availability_end')
    CREATE INDEX IX_products_availability_end ON dbo.products(availability, auction_ends_at);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.product_events') AND name = N'IX_product_events_user')
    CREATE INDEX IX_product_events_user ON dbo.product_events(user_id, occurred_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.product_events') AND name = N'IX_product_events_product')
    CREATE INDEX IX_product_events_product ON dbo.product_events(product_id, occurred_at DESC);
GO

/* Datos iniciales */
BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.categories(name)
    SELECT source.name
    FROM
    (
        VALUES
            (N'Fotografía'),
            (N'Coleccionables'),
            (N'Relojes'),
            (N'Hogar'),
            (N'Tecnología vintage')
    ) AS source(name)
    WHERE NOT EXISTS
    (
        SELECT 1 FROM dbo.categories AS target WHERE target.name = source.name
    );

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'adminDSE')
        INSERT INTO dbo.users
            (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
        VALUES
            ('10000000-0000-0000-0000-000000000001', N'adminDSE',
             '$2b$12$ddMvojWaBc5fnnMzKLuwVueGFCyCZ4o2.I7l8qbC4Hbf4k0cAjzHS',
             N'admin.dse@compralatino.demo', N'Administrador', N'DSE',
             N'7000-0001', '1995-01-01', N'admin');

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'adminUser')
        INSERT INTO dbo.users
            (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
        VALUES
            ('10000000-0000-0000-0000-000000000002', N'adminUser',
             '$2b$12$dl0HQkkbRYAPuySqKf9PsuvbXRjUd6wcQPiSepDJ.3EfSx5ZRauaC',
             N'admin.user@compralatino.demo', N'Administrador', N'Usuarios',
             N'7000-0002', '1994-02-02', N'admin');

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'adminSales')
        INSERT INTO dbo.users
            (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
        VALUES
            ('10000000-0000-0000-0000-000000000003', N'adminSales',
             '$2b$12$EhZwnL6jmLwQ0mId/MxMSumK93JXugvS9cUlC4kyc4BFG/z6gvs5m',
             N'admin.sales@compralatino.demo', N'Administrador', N'Ventas',
             N'7000-0003', '1993-03-03', N'admin');

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'clienteDemo')
        INSERT INTO dbo.users
            (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
        VALUES
            ('10000000-0000-0000-0000-000000000004', N'clienteDemo',
             '$2b$12$MFyAiYS4zAMS/GNiA/xrx.hXViAzYrDSpMt9qmhmfv9ngRT/CyNEO',
             N'cliente.demo@compralatino.demo', N'Cliente', N'Demo',
             N'7000-0004', '1998-05-12', N'customer');

    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1001')
        INSERT INTO dbo.products
            (id, yauctions_id, category_id, title, image_url, price, current_bid,
             bid_count, shipping_fee, badge, auction_ends_at)
        SELECT N'ya-1001', N'ya-1001', id, N'Cámara Fujifilm X100V Silver',
               N'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
               1049, 896, 18, 29, N'Subasta activa', DATEADD(HOUR, 3, SYSUTCDATETIME())
        FROM dbo.categories WHERE name = N'Fotografía';

    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1002')
        INSERT INTO dbo.products
            (id, yauctions_id, category_id, title, image_url, price, current_bid,
             bid_count, shipping_fee, badge, auction_ends_at)
        SELECT N'ya-1002', N'ya-1002', id, N'Nintendo Game Boy Advance SP',
               N'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80',
               188, 142, 9, 18, N'Subasta activa', DATEADD(HOUR, 6, SYSUTCDATETIME())
        FROM dbo.categories WHERE name = N'Coleccionables';

    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1003')
        INSERT INTO dbo.products
            (id, yauctions_id, category_id, title, image_url, price, current_bid,
             bid_count, shipping_fee, badge, auction_ends_at)
        SELECT N'ya-1003', N'ya-1003', id, N'Reloj Seiko 5 Sports automático',
               N'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80',
               298, 236, 14, 22, N'Envío verificado', DATEADD(HOUR, 27, SYSUTCDATETIME())
        FROM dbo.categories WHERE name = N'Relojes';

    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1004')
        INSERT INTO dbo.products
            (id, yauctions_id, category_id, title, image_url, price, current_bid,
             bid_count, shipping_fee, badge, auction_ends_at)
        SELECT N'ya-1004', N'ya-1004', id, N'Set de té japonés artesanal',
               N'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
               86, 61, 6, 16, N'Oferta destacada', DATEADD(HOUR, 8, SYSUTCDATETIME())
        FROM dbo.categories WHERE name = N'Hogar';

    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1005')
        INSERT INTO dbo.products
            (id, yauctions_id, category_id, title, image_url, price, current_bid,
             bid_count, shipping_fee, badge, auction_ends_at)
        SELECT N'ya-1005', N'ya-1005', id, N'Sony Walkman WM-EX190',
               N'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
               119, 84, 11, 20, N'Subasta activa', DATEADD(HOUR, 12, SYSUTCDATETIME())
        FROM dbo.categories WHERE name = N'Tecnología vintage';

    IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1006')
        INSERT INTO dbo.products
            (id, yauctions_id, category_id, title, image_url, price, current_bid,
             bid_count, shipping_fee, badge, auction_ends_at)
        SELECT N'ya-1006', N'ya-1006', id, N'Figura Studio Ghibli Totoro',
               N'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80',
               74, 52, 7, 14, N'Recomendado', DATEADD(HOUR, 35, SYSUTCDATETIME())
        FROM dbo.categories WHERE name = N'Coleccionables';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO

/* Resumen de validación sin exponer hashes ni datos sensibles. */
SELECT
    DB_NAME() AS database_name,
    (SELECT COUNT_BIG(*) FROM dbo.users) AS users_count,
    (SELECT COUNT_BIG(*) FROM dbo.categories) AS categories_count,
    (SELECT COUNT_BIG(*) FROM dbo.products) AS products_count,
    (SELECT COUNT_BIG(*) FROM dbo.orders) AS orders_count;
GO
