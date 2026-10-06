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
    first_name NVARCHAR(80) NOT NULL,
    last_name NVARCHAR(80) NOT NULL,
    phone NVARCHAR(30) NULL,
    birth_date DATE NULL,
    auth0_subject NVARCHAR(255) NULL,
    role VARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT 'customer',
    country_code CHAR(2) NOT NULL CONSTRAINT DF_users_country DEFAULT 'SV',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_users_role CHECK (role IN ('customer', 'seller', 'admin'))
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
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_categories PRIMARY KEY CONSTRAINT DF_categories_id DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL CONSTRAINT UQ_categories_name UNIQUE,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_categories_created DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.products (
    id NVARCHAR(120) NOT NULL CONSTRAINT PK_products PRIMARY KEY,
    yauctions_id NVARCHAR(120) NOT NULL CONSTRAINT UQ_products_yauctions UNIQUE,
    category_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(300) NOT NULL,
    description NVARCHAR(MAX) NULL,
    image_url NVARCHAR(1000) NULL,
    currency CHAR(3) NOT NULL CONSTRAINT DF_products_currency DEFAULT 'USD',
    price DECIMAL(12,2) NOT NULL CONSTRAINT CK_products_price CHECK (price >= 0),
    current_bid DECIMAL(12,2) NOT NULL CONSTRAINT CK_products_bid CHECK (current_bid >= 0),
    bid_count INT NOT NULL CONSTRAINT DF_products_bid_count DEFAULT 0 CONSTRAINT CK_products_bid_count CHECK (bid_count >= 0),
    shipping_fee DECIMAL(12,2) NOT NULL CONSTRAINT DF_products_shipping DEFAULT 0 CONSTRAINT CK_products_shipping CHECK (shipping_fee >= 0),
    badge NVARCHAR(80) NOT NULL CONSTRAINT DF_products_badge DEFAULT N'Subasta activa',
    auction_ends_at DATETIME2(3) NULL,
    availability VARCHAR(30) NOT NULL CONSTRAINT DF_products_availability DEFAULT 'active',
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_products_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_products_categories FOREIGN KEY (category_id) REFERENCES dbo.categories(id)
  );
END;
GO

IF OBJECT_ID(N'dbo.orders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.orders (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_orders PRIMARY KEY CONSTRAINT DF_orders_id DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    product_id NVARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL CONSTRAINT DF_orders_status DEFAULT 'draft',
    bid_amount DECIMAL(12,2) NOT NULL CONSTRAINT CK_orders_bid CHECK (bid_amount > 0),
    service_fee DECIMAL(12,2) NOT NULL CONSTRAINT DF_orders_service DEFAULT 0 CONSTRAINT CK_orders_service CHECK (service_fee >= 0),
    shipping_fee DECIMAL(12,2) NOT NULL CONSTRAINT DF_orders_shipping DEFAULT 0 CONSTRAINT CK_orders_shipping CHECK (shipping_fee >= 0),
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_orders_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_orders_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_orders_status CHECK (status IN ('draft', 'bid_submitted', 'won', 'paid', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT FK_orders_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_orders_products FOREIGN KEY (product_id) REFERENCES dbo.products(id)
  );
END;
GO

IF OBJECT_ID(N'dbo.product_events', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.product_events (
    id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_product_events PRIMARY KEY,
    user_id UNIQUEIDENTIFIER NULL,
    product_id NVARCHAR(120) NOT NULL,
    event_type NVARCHAR(40) NOT NULL,
    occurred_at DATETIME2(3) NOT NULL CONSTRAINT DF_product_events_occurred DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_product_events_users FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_product_events_products FOREIGN KEY (product_id) REFERENCES dbo.products(id)
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_orders_user_created' AND object_id = OBJECT_ID(N'dbo.orders'))
  CREATE INDEX IX_orders_user_created ON dbo.orders(user_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_products_category' AND object_id = OBJECT_ID(N'dbo.products'))
  CREATE INDEX IX_products_category ON dbo.products(category_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_product_events_user' AND object_id = OBJECT_ID(N'dbo.product_events'))
  CREATE INDEX IX_product_events_user ON dbo.product_events(user_id, occurred_at DESC);
GO
