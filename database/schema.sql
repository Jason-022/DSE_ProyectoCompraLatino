SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_users PRIMARY KEY CONSTRAINT DF_users_id DEFAULT NEWID(),
    username NVARCHAR(60) NOT NULL CONSTRAINT UQ_users_username UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL CONSTRAINT UQ_users_email UNIQUE,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(30) NULL,
    birth_date DATE NULL,
    auth0_subject NVARCHAR(255) NULL,
    role NVARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT N'customer',
    country_code CHAR(2) NOT NULL CONSTRAINT DF_users_country DEFAULT 'SV',
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_users_role CHECK (role IN (N'customer', N'seller', N'admin'))
  );
END;
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.users')
    AND name = N'password_hash'
    AND (TYPE_NAME(user_type_id) <> N'varchar' OR max_length < 255)
)
  ALTER TABLE dbo.users ALTER COLUMN password_hash VARCHAR(255) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_users_auth0_subject' AND object_id = OBJECT_ID(N'dbo.users'))
  CREATE UNIQUE INDEX UX_users_auth0_subject ON dbo.users(auth0_subject) WHERE auth0_subject IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.categories', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.categories (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_categories PRIMARY KEY,
    name NVARCHAR(100) NOT NULL CONSTRAINT UQ_categories_name UNIQUE,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_categories_created DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.products (
    id NVARCHAR(120) NOT NULL CONSTRAINT PK_products PRIMARY KEY,
    yauctions_id NVARCHAR(120) NULL CONSTRAINT UQ_products_yauctions UNIQUE,
    category_id INT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    image_url NVARCHAR(1000) NULL,
    currency CHAR(3) NOT NULL CONSTRAINT DF_products_currency DEFAULT 'USD',
    price DECIMAL(18,2) NULL,
    current_bid DECIMAL(18,2) NULL,
    bid_count INT NOT NULL CONSTRAINT DF_products_bid_count DEFAULT 0,
    shipping_fee DECIMAL(18,2) NOT NULL CONSTRAINT DF_products_shipping DEFAULT 0,
    badge NVARCHAR(60) NULL,
    auction_ends_at DATETIME2(0) NULL,
    availability NVARCHAR(20) NOT NULL CONSTRAINT DF_products_availability DEFAULT N'active',
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_products_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_products_categories FOREIGN KEY (category_id) REFERENCES dbo.categories(id),
    CONSTRAINT CK_products_bid_count CHECK (bid_count >= 0),
    CONSTRAINT CK_products_amounts CHECK ((price IS NULL OR price >= 0) AND (current_bid IS NULL OR current_bid >= 0) AND shipping_fee >= 0),
    CONSTRAINT CK_products_availability CHECK (availability IN (N'active', N'paused', N'sold', N'archived'))
  );
END;
GO

IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.orders (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_orders PRIMARY KEY CONSTRAINT DF_orders_id DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    seller_id UNIQUEIDENTIFIER NULL,
    product_id NVARCHAR(120) NOT NULL,
    status NVARCHAR(30) NOT NULL CONSTRAINT DF_orders_status DEFAULT N'draft',
    bid_amount DECIMAL(18,2) NULL,
    quantity INT NOT NULL CONSTRAINT DF_orders_quantity DEFAULT 1,
    unit_price DECIMAL(18,2) NULL,
    service_fee DECIMAL(18,2) NOT NULL CONSTRAINT DF_orders_service DEFAULT 0,
    shipping_fee DECIMAL(18,2) NOT NULL CONSTRAINT DF_orders_shipping DEFAULT 0,
    notes NVARCHAR(500) NULL,
    order_source NVARCHAR(20) NOT NULL CONSTRAINT DF_orders_order_source DEFAULT N'bid' CONSTRAINT CK_orders_source CHECK (order_source IN (N'bid', N'manual_sale')),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_orders_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_orders_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_orders_quantity CHECK (quantity > 0),
    CONSTRAINT CK_orders_status CHECK (status IN (N'draft', N'bid_submitted', N'won', N'paid', N'shipped', N'delivered', N'cancelled')),
    CONSTRAINT CK_orders_amounts CHECK ((bid_amount IS NULL OR bid_amount >= 0) AND service_fee >= 0 AND shipping_fee >= 0),
    CONSTRAINT FK_orders_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_orders_sellers FOREIGN KEY (seller_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_orders_products FOREIGN KEY (product_id) REFERENCES dbo.products(id)
  );
END;
GO

IF COL_LENGTH(N'dbo.orders', N'seller_id') IS NULL
  ALTER TABLE dbo.orders ADD seller_id UNIQUEIDENTIFIER NULL;
GO
IF COL_LENGTH(N'dbo.orders', N'quantity') IS NULL
  ALTER TABLE dbo.orders ADD quantity INT NOT NULL CONSTRAINT DF_orders_quantity DEFAULT 1 WITH VALUES;
GO
IF COL_LENGTH(N'dbo.orders', N'unit_price') IS NULL
  ALTER TABLE dbo.orders ADD unit_price DECIMAL(18,2) NULL;
GO
IF COL_LENGTH(N'dbo.orders', N'notes') IS NULL
  ALTER TABLE dbo.orders ADD notes NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.orders', N'order_source') IS NULL
  ALTER TABLE dbo.orders ADD order_source NVARCHAR(20) NOT NULL CONSTRAINT DF_orders_order_source DEFAULT N'bid' WITH VALUES;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'dbo.orders') AND name = N'FK_orders_sellers')
  ALTER TABLE dbo.orders WITH CHECK ADD CONSTRAINT FK_orders_sellers FOREIGN KEY (seller_id) REFERENCES dbo.users(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders') AND name = N'CK_orders_quantity')
  ALTER TABLE dbo.orders WITH CHECK ADD CONSTRAINT CK_orders_quantity CHECK (quantity > 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders') AND name = N'CK_orders_source')
  ALTER TABLE dbo.orders WITH CHECK ADD CONSTRAINT CK_orders_source CHECK (order_source IN (N'bid', N'manual_sale'));
GO

IF OBJECT_ID(N'dbo.product_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.product_events (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_product_events PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NULL,
    product_id NVARCHAR(120) NOT NULL,
    event_type NVARCHAR(50) NOT NULL,
    occurred_at DATETIME2(0) NOT NULL CONSTRAINT DF_product_events_occurred DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_product_events_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_product_events_products FOREIGN KEY (product_id) REFERENCES dbo.products(id)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_orders_user_created' AND object_id = OBJECT_ID(N'dbo.orders'))
  CREATE INDEX IX_orders_user_created ON dbo.orders(user_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_orders_seller_created' AND object_id = OBJECT_ID(N'dbo.orders'))
  CREATE INDEX IX_orders_seller_created ON dbo.orders(seller_id, created_at DESC) WHERE seller_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_orders_status_created' AND object_id = OBJECT_ID(N'dbo.orders'))
  CREATE INDEX IX_orders_status_created ON dbo.orders(status, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_products_category' AND object_id = OBJECT_ID(N'dbo.products'))
  CREATE INDEX IX_products_category ON dbo.products(category_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_products_availability_end' AND object_id = OBJECT_ID(N'dbo.products'))
  CREATE INDEX IX_products_availability_end ON dbo.products(availability, auction_ends_at);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_product_events_user' AND object_id = OBJECT_ID(N'dbo.product_events'))
  CREATE INDEX IX_product_events_user ON dbo.product_events(user_id, occurred_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_product_events_product' AND object_id = OBJECT_ID(N'dbo.product_events'))
  CREATE INDEX IX_product_events_product ON dbo.product_events(product_id, occurred_at DESC);
GO
