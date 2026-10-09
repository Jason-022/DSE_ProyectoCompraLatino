const { databaseDriver } = require('../config/database');

const sql = databaseDriver() === 'msnodesqlv8'
  ? require('mssql/msnodesqlv8')
  : require('mssql');

function dateOnly(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endsIn(value) {
  if (!value) return '';
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return 'Finalizada';
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${String(hours % 24).padStart(2, '0')}h`;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone || '',
    birthDate: dateOnly(row.birthDate),
    role: row.role
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    price: Number(row.price),
    currentBid: Number(row.currentBid),
    bids: Number(row.bids),
    endsIn: endsIn(row.auctionEndsAt),
    shipping: Number(row.shipping),
    image: row.image,
    badge: row.badge
  };
}

function mapSale(row) {
  if (!row) return null;
  return {
    id: row.id,
    customer: {
      id: row.customerId,
      username: row.customerUsername,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      email: row.customerEmail
    },
    seller: row.sellerId ? {
      id: row.sellerId,
      username: row.sellerUsername,
      firstName: row.sellerFirstName,
      lastName: row.sellerLastName
    } : null,
    product: {
      id: row.productId,
      title: row.productTitle
    },
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    serviceFee: Number(row.serviceFee),
    shippingFee: Number(row.shippingFee),
    total: Number(row.total),
    status: row.status,
    notes: row.notes || '',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt
  };
}

const productSelect = `
  SELECT p.id,
         p.title,
         c.name AS category,
         p.price,
         p.current_bid AS currentBid,
         p.bid_count AS bids,
         p.auction_ends_at AS auctionEndsAt,
         p.shipping_fee AS shipping,
         p.image_url AS image,
         p.badge
  FROM dbo.products p
  INNER JOIN dbo.categories c ON c.id = p.category_id`;

const saleSelect = `
  SELECT o.id,
         customer.id AS customerId,
         customer.username AS customerUsername,
         customer.first_name AS customerFirstName,
         customer.last_name AS customerLastName,
         customer.email AS customerEmail,
         seller.id AS sellerId,
         seller.username AS sellerUsername,
         seller.first_name AS sellerFirstName,
         seller.last_name AS sellerLastName,
         p.id AS productId,
         p.title AS productTitle,
         o.quantity,
         COALESCE(o.unit_price, o.bid_amount, p.price, 0) AS unitPrice,
         o.service_fee AS serviceFee,
         o.shipping_fee AS shippingFee,
         (o.quantity * COALESCE(o.unit_price, o.bid_amount, p.price, 0)) + o.service_fee + o.shipping_fee AS total,
         o.status,
         o.notes,
         o.created_at AS createdAt
  FROM dbo.orders o
  INNER JOIN dbo.users customer ON customer.id = o.user_id
  LEFT JOIN dbo.users seller ON seller.id = o.seller_id
  INNER JOIN dbo.products p ON p.id = o.product_id`;

class SqlServerStore {
  constructor(configuration) {
    this.kind = 'sqlserver';
    this.pool = new sql.ConnectionPool(configuration);
    this.pool.on('error', (error) => console.error('Error del pool de SQL Server:', error.message));
  }

  async connect() {
    await this.pool.connect();
    const result = await this.pool.request().query(`
      SELECT OBJECT_ID(N'dbo.users', N'U') AS usersTable,
             OBJECT_ID(N'dbo.products', N'U') AS productsTable,
             OBJECT_ID(N'dbo.orders', N'U') AS ordersTable,
             COL_LENGTH(N'dbo.orders', N'seller_id') AS sellerColumn,
             COL_LENGTH(N'dbo.orders', N'quantity') AS quantityColumn,
             COL_LENGTH(N'dbo.orders', N'unit_price') AS unitPriceColumn`);
    const state = result.recordset[0];
    if (!state.usersTable || !state.productsTable || !state.ordersTable || !state.sellerColumn || !state.quantityColumn || !state.unitPriceColumn) {
      throw new Error('La base de datos no tiene el esquema actualizado de CompraLatino. Ejecuta database/CompraLatino.sql.');
    }
    return this;
  }

  async getProducts({ query = '', category = '', includeArchived = false } = {}) {
    const normalizedQuery = String(query).trim();
    const request = this.pool.request();
    request.input('query', sql.NVarChar(300), normalizedQuery);
    request.input('search', sql.NVarChar(304), `%${normalizedQuery}%`);
    request.input('category', sql.NVarChar(100), String(category).trim());
    request.input('includeArchived', sql.Bit, includeArchived ? 1 : 0);
    const result = await request.query(`${productSelect}
      WHERE (@query = N'' OR CONCAT(p.title, N' ', c.name) LIKE @search)
        AND (@category = N'' OR @category = N'Todos' OR c.name = @category)
        AND (@includeArchived = 1 OR p.availability <> N'archived')
      ORDER BY p.auction_ends_at, p.title`);
    return result.recordset.map(mapProduct);
  }

  async getProductById(id) {
    const result = await this.pool.request()
      .input('id', sql.NVarChar(120), id)
      .query(`${productSelect} WHERE p.id = @id`);
    return mapProduct(result.recordset[0]);
  }

  async getDashboard() {
    const [metricsResult, categoryResult] = await Promise.all([
      this.pool.request().query(`
        SELECT
          COALESCE(SUM(CASE WHEN status IN ('won','paid','shipped','delivered')
            THEN CASE WHEN seller_id IS NOT NULL
              THEN (quantity * COALESCE(unit_price, bid_amount, 0)) + service_fee + shipping_fee
              ELSE COALESCE(bid_amount, 0)
            END
            ELSE 0 END), 0) AS sales,
          (SELECT COUNT(*) FROM dbo.products WHERE availability = 'active') AS activeBids,
          (SELECT COUNT(*) FROM dbo.users WHERE created_at >= DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1)) AS newUsers,
          COALESCE(100.0 * SUM(CASE WHEN status IN ('won','paid','shipped','delivered') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 0) AS conversion
        FROM dbo.orders`),
      this.pool.request().query(`
        SELECT c.name, COUNT(p.id) AS total
        FROM dbo.categories c
        LEFT JOIN dbo.products p ON p.category_id = c.id
        GROUP BY c.name
        ORDER BY total DESC, c.name`)
    ]);

    const metrics = metricsResult.recordset[0];
    const categoryTotal = categoryResult.recordset.reduce((sum, row) => sum + Number(row.total), 0);
    return {
      metrics: [
        { label: 'Ventas este mes', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(metrics.sales)), delta: 'Datos reales' },
        { label: 'Pujas activas', value: String(metrics.activeBids), delta: 'Datos reales' },
        { label: 'Usuarios nuevos', value: String(metrics.newUsers), delta: 'Este mes' },
        { label: 'Conversión', value: `${Number(metrics.conversion).toFixed(1)}%`, delta: 'Datos reales' }
      ],
      categories: categoryResult.recordset.map((row) => ({
        name: row.name,
        value: categoryTotal ? Math.round((Number(row.total) / categoryTotal) * 100) : 0
      }))
    };
  }

  async findUserByUsername(username) {
    const result = await this.pool.request()
      .input('username', sql.NVarChar(60), String(username || '').trim())
      .query(`SELECT TOP (1) id, username, password_hash AS passwordHash, email, first_name AS firstName,
                     last_name AS lastName, phone, birth_date AS birthDate, role
              FROM dbo.users WHERE LOWER(username) = LOWER(@username)`);
    return mapUser(result.recordset[0]);
  }

  async findUserByEmail(email) {
    const result = await this.pool.request()
      .input('email', sql.NVarChar(255), String(email || '').trim())
      .query(`SELECT TOP (1) id, username, password_hash AS passwordHash, email, first_name AS firstName,
                     last_name AS lastName, phone, birth_date AS birthDate, role
              FROM dbo.users WHERE LOWER(email) = LOWER(@email)`);
    return mapUser(result.recordset[0]);
  }

  async getUsers() {
    const result = await this.pool.request().query(`
      SELECT id, username, password_hash AS passwordHash, email, first_name AS firstName,
             last_name AS lastName, phone, birth_date AS birthDate, role
      FROM dbo.users ORDER BY first_name, last_name, username`);
    return result.recordset.map(mapUser);
  }

  async getCustomers() {
    const result = await this.pool.request().query(`
      SELECT id, username, password_hash AS passwordHash, email, first_name AS firstName,
             last_name AS lastName, phone, birth_date AS birthDate, role
      FROM dbo.users
      WHERE role = N'customer'
      ORDER BY first_name, last_name, username`);
    return result.recordset.map(mapUser);
  }

  async createUser(user) {
    await this.pool.request()
      .input('id', sql.UniqueIdentifier, user.id)
      .input('username', sql.NVarChar(60), user.username)
      .input('passwordHash', sql.VarChar(255), user.passwordHash)
      .input('email', sql.NVarChar(255), user.email)
      .input('firstName', sql.NVarChar(80), user.firstName)
      .input('lastName', sql.NVarChar(80), user.lastName)
      .input('phone', sql.NVarChar(30), user.phone || null)
      .input('birthDate', sql.Date, asDate(user.birthDate))
      .input('role', sql.VarChar(20), user.role)
      .query(`INSERT INTO dbo.users (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
              VALUES (@id, @username, @passwordHash, @email, @firstName, @lastName, @phone, @birthDate, @role)`);
    return this.findUserByUsername(user.username);
  }

  async updateUser(username, changes) {
    const assignments = [];
    const request = this.pool.request().input('lookupUsername', sql.NVarChar(60), username);
    const fields = {
      username: ['username', sql.NVarChar(60)],
      email: ['email', sql.NVarChar(255)],
      firstName: ['first_name', sql.NVarChar(80)],
      lastName: ['last_name', sql.NVarChar(80)],
      phone: ['phone', sql.NVarChar(30)],
      birthDate: ['birth_date', sql.Date],
      role: ['role', sql.VarChar(20)],
      passwordHash: ['password_hash', sql.VarChar(255)]
    };

    for (const [field, [column, type]] of Object.entries(fields)) {
      if (changes[field] === undefined) continue;
      const value = field === 'birthDate' ? asDate(changes[field]) : changes[field];
      request.input(field, type, value || (field === 'phone' || field === 'birthDate' ? null : value));
      assignments.push(`${column} = @${field}`);
    }

    if (!assignments.length) return this.findUserByUsername(username);
    const result = await request.query(`UPDATE dbo.users SET ${assignments.join(', ')} WHERE username = @lookupUsername; SELECT @@ROWCOUNT AS affected;`);
    if (!result.recordset[0].affected) return null;
    return this.findUserByUsername(changes.username || username);
  }

  async placeBid(productId, amount, userId) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const update = await new sql.Request(transaction)
        .input('productId', sql.NVarChar(120), productId)
        .input('amount', sql.Decimal(12, 2), amount)
        .query(`UPDATE dbo.products
                SET current_bid = @amount, bid_count = bid_count + 1, updated_at = SYSUTCDATETIME()
                WHERE id = @productId AND current_bid < @amount;
                SELECT @@ROWCOUNT AS affected;`);
      if (!update.recordset[0].affected) {
        await transaction.rollback();
        return null;
      }

      await new sql.Request(transaction)
        .input('userId', sql.UniqueIdentifier, userId)
        .input('productId', sql.NVarChar(120), productId)
        .input('amount', sql.Decimal(12, 2), amount)
        .query(`INSERT INTO dbo.orders (user_id, product_id, status, bid_amount, shipping_fee)
                SELECT @userId, id, 'bid_submitted', @amount, shipping_fee
                FROM dbo.products WHERE id = @productId`);
      await transaction.commit();
      return this.getProductById(productId);
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    }
  }

  async getSales({ customerId = '' } = {}) {
    const request = this.pool.request()
      .input('customerId', sql.NVarChar(36), String(customerId || ''));
    const result = await request.query(`${saleSelect}
      WHERE o.seller_id IS NOT NULL
        AND (@customerId = N'' OR CONVERT(NVARCHAR(36), o.user_id) = @customerId)
      ORDER BY o.created_at DESC, o.id DESC`);
    return result.recordset.map(mapSale);
  }

  async createSale(sale) {
    const result = await this.pool.request()
      .input('customerId', sql.UniqueIdentifier, sale.customerId)
      .input('sellerId', sql.UniqueIdentifier, sale.sellerId)
      .input('productId', sql.NVarChar(120), sale.productId)
      .input('quantity', sql.Int, sale.quantity)
      .input('unitPrice', sql.Decimal(18, 2), sale.unitPrice)
      .input('serviceFee', sql.Decimal(18, 2), sale.serviceFee)
      .input('shippingFee', sql.Decimal(18, 2), sale.shippingFee)
      .input('status', sql.NVarChar(30), sale.status)
      .input('notes', sql.NVarChar(500), sale.notes || null)
      .query(`
        DECLARE @saleId UNIQUEIDENTIFIER = NEWID();

        IF EXISTS (SELECT 1 FROM dbo.users WHERE id = @customerId AND role = N'customer')
          AND EXISTS (SELECT 1 FROM dbo.products WHERE id = @productId AND availability <> N'archived')
        BEGIN
          INSERT INTO dbo.orders
            (id, user_id, seller_id, product_id, status, bid_amount, quantity, unit_price,
             service_fee, shipping_fee, notes, order_source)
          VALUES
            (@saleId, @customerId, @sellerId, @productId, @status, @unitPrice, @quantity,
             @unitPrice, @serviceFee, @shippingFee, @notes, N'manual_sale');

          SELECT @saleId AS id;
        END`);

    const saleId = result.recordset?.[0]?.id;
    if (!saleId) return null;
    const created = await this.pool.request()
      .input('saleId', sql.UniqueIdentifier, saleId)
      .query(`${saleSelect} WHERE o.id = @saleId`);
    return mapSale(created.recordset[0]);
  }

  async createProduct(product) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const categoryResult = await new sql.Request(transaction)
        .input('category', sql.NVarChar(100), product.category)
        .query(`IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE name = @category)
                  INSERT INTO dbo.categories (name) VALUES (@category);
                SELECT id FROM dbo.categories WHERE name = @category;`);
      const categoryId = categoryResult.recordset[0].id;

      await new sql.Request(transaction)
        .input('id', sql.NVarChar(120), product.id)
        .input('categoryId', sql.Int, categoryId)
        .input('title', sql.NVarChar(255), product.title)
        .input('description', sql.NVarChar(sql.MAX), product.description || null)
        .input('image', sql.NVarChar(1000), product.image || null)
        .input('price', sql.Decimal(18, 2), product.price)
        .input('currentBid', sql.Decimal(18, 2), product.currentBid)
        .input('shipping', sql.Decimal(18, 2), product.shipping)
        .input('badge', sql.NVarChar(60), product.badge)
        .query(`INSERT INTO dbo.products
                  (id, category_id, title, description, image_url, price, current_bid,
                   shipping_fee, badge, auction_ends_at, availability)
                VALUES
                  (@id, @categoryId, @title, @description, @image, @price, @currentBid,
                   @shipping, @badge, DATEADD(DAY, 7, SYSUTCDATETIME()), N'active')`);
      await transaction.commit();
      return this.getProductById(product.id);
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    }
  }

  async updateProduct(productId, changes) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      let categoryId;
      if (changes.category !== undefined) {
        const categoryResult = await new sql.Request(transaction)
          .input('category', sql.NVarChar(100), changes.category)
          .query(`IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE name = @category)
                    INSERT INTO dbo.categories (name) VALUES (@category);
                  SELECT id FROM dbo.categories WHERE name = @category;`);
        categoryId = categoryResult.recordset[0].id;
      }

      const request = new sql.Request(transaction).input('productId', sql.NVarChar(120), productId);
      const assignments = [];
      const fields = {
        title: ['title', sql.NVarChar(300)],
        price: ['price', sql.Decimal(12, 2)],
        currentBid: ['current_bid', sql.Decimal(12, 2)],
        shipping: ['shipping_fee', sql.Decimal(12, 2)],
        badge: ['badge', sql.NVarChar(80)],
        image: ['image_url', sql.NVarChar(1000)]
      };
      for (const [field, [column, type]] of Object.entries(fields)) {
        if (changes[field] === undefined) continue;
        request.input(field, type, changes[field]);
        assignments.push(`${column} = @${field}`);
      }
      if (categoryId) {
        request.input('categoryId', sql.Int, categoryId);
        assignments.push('category_id = @categoryId');
      }
      if (!assignments.length) {
        await transaction.commit();
        return this.getProductById(productId);
      }
      assignments.push('updated_at = SYSUTCDATETIME()');
      const result = await request.query(`UPDATE dbo.products SET ${assignments.join(', ')} WHERE id = @productId; SELECT @@ROWCOUNT AS affected;`);
      if (!result.recordset[0].affected) {
        await transaction.rollback();
        return null;
      }
      await transaction.commit();
      return this.getProductById(productId);
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    }
  }

  async deleteProduct(productId) {
    const result = await this.pool.request()
      .input('productId', sql.NVarChar(120), productId)
      .query(`UPDATE dbo.products
              SET availability = N'archived', updated_at = SYSUTCDATETIME()
              WHERE id = @productId AND availability <> N'archived';
              SELECT @@ROWCOUNT AS affected;`);
    return Boolean(result.recordset[0].affected);
  }

  async close() {
    if (this.pool.connected) await this.pool.close();
  }
}

module.exports = { SqlServerStore };
