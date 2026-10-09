SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @Categories TABLE (name NVARCHAR(100));
INSERT INTO @Categories (name)
VALUES (N'Fotografía'), (N'Coleccionables'), (N'Relojes'), (N'Hogar'), (N'Tecnología vintage');

INSERT INTO dbo.categories (name)
SELECT source.name
FROM @Categories source
WHERE NOT EXISTS (SELECT 1 FROM dbo.categories target WHERE target.name = source.name);

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'adminDSE')
  INSERT INTO dbo.users (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
  VALUES ('10000000-0000-0000-0000-000000000001', N'adminDSE', '$2b$12$ddMvojWaBc5fnnMzKLuwVueGFCyCZ4o2.I7l8qbC4Hbf4k0cAjzHS', N'admin.dse@compralatino.demo', N'Administrador', N'DSE', N'7000-0001', '1995-01-01', 'admin');

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'adminUser')
  INSERT INTO dbo.users (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
  VALUES ('10000000-0000-0000-0000-000000000002', N'adminUser', '$2b$12$dl0HQkkbRYAPuySqKf9PsuvbXRjUd6wcQPiSepDJ.3EfSx5ZRauaC', N'admin.user@compralatino.demo', N'Administrador', N'Usuarios', N'7000-0002', '1994-02-02', 'admin');

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'adminSales')
  INSERT INTO dbo.users (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
  VALUES ('10000000-0000-0000-0000-000000000003', N'adminSales', '$2b$12$EhZwnL6jmLwQ0mId/MxMSumK93JXugvS9cUlC4kyc4BFG/z6gvs5m', N'admin.sales@compralatino.demo', N'Administrador', N'Ventas', N'7000-0003', '1993-03-03', 'admin');

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'clienteDemo')
  INSERT INTO dbo.users (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
  VALUES ('10000000-0000-0000-0000-000000000004', N'clienteDemo', '$2b$12$MFyAiYS4zAMS/GNiA/xrx.hXViAzYrDSpMt9qmhmfv9ngRT/CyNEO', N'cliente.demo@compralatino.demo', N'Cliente', N'Demo', N'7000-0004', '1998-05-12', 'customer');

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'vendedorDemo')
  INSERT INTO dbo.users (id, username, password_hash, email, first_name, last_name, phone, birth_date, role)
  VALUES ('10000000-0000-0000-0000-000000000005', N'vendedorDemo', '$2b$12$D6YdHkLwDyziCYROmVJKyenor5zEfPHBSgvwKGL0cKp4DqgNuK.g6', N'vendedor.demo@compralatino.demo', N'Vendedor', N'Demo', N'7000-0005', '1992-06-15', 'seller');

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1001')
  INSERT INTO dbo.products (id, yauctions_id, category_id, title, image_url, price, current_bid, bid_count, shipping_fee, badge, auction_ends_at)
  SELECT N'ya-1001', N'ya-1001', id, N'Cámara Fujifilm X100V Silver', N'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80', 1049, 896, 18, 29, N'Subasta activa', DATEADD(HOUR, 3, SYSUTCDATETIME()) FROM dbo.categories WHERE name = N'Fotografía';

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1002')
  INSERT INTO dbo.products (id, yauctions_id, category_id, title, image_url, price, current_bid, bid_count, shipping_fee, badge, auction_ends_at)
  SELECT N'ya-1002', N'ya-1002', id, N'Nintendo Game Boy Advance SP', N'https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=900&q=80', 188, 142, 9, 18, N'Subasta activa', DATEADD(HOUR, 6, SYSUTCDATETIME()) FROM dbo.categories WHERE name = N'Coleccionables';

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1003')
  INSERT INTO dbo.products (id, yauctions_id, category_id, title, image_url, price, current_bid, bid_count, shipping_fee, badge, auction_ends_at)
  SELECT N'ya-1003', N'ya-1003', id, N'Reloj Seiko 5 Sports automático', N'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80', 298, 236, 14, 22, N'Envío verificado', DATEADD(HOUR, 27, SYSUTCDATETIME()) FROM dbo.categories WHERE name = N'Relojes';

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1004')
  INSERT INTO dbo.products (id, yauctions_id, category_id, title, image_url, price, current_bid, bid_count, shipping_fee, badge, auction_ends_at)
  SELECT N'ya-1004', N'ya-1004', id, N'Set de té japonés artesanal', N'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80', 86, 61, 6, 16, N'Oferta destacada', DATEADD(HOUR, 8, SYSUTCDATETIME()) FROM dbo.categories WHERE name = N'Hogar';

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1005')
  INSERT INTO dbo.products (id, yauctions_id, category_id, title, image_url, price, current_bid, bid_count, shipping_fee, badge, auction_ends_at)
  SELECT N'ya-1005', N'ya-1005', id, N'Sony Walkman WM-EX190', N'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80', 119, 84, 11, 20, N'Subasta activa', DATEADD(HOUR, 12, SYSUTCDATETIME()) FROM dbo.categories WHERE name = N'Tecnología vintage';

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1006')
  INSERT INTO dbo.products (id, yauctions_id, category_id, title, image_url, price, current_bid, bid_count, shipping_fee, badge, auction_ends_at)
  SELECT N'ya-1006', N'ya-1006', id, N'Figura Studio Ghibli Totoro', N'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80', 74, 52, 7, 14, N'Recomendado', DATEADD(HOUR, 35, SYSUTCDATETIME()) FROM dbo.categories WHERE name = N'Coleccionables';

UPDATE category SET category.name = N'Fotografía'
FROM dbo.categories AS category INNER JOIN dbo.products AS product ON product.category_id = category.id
WHERE product.id = N'ya-1001' AND (category.name COLLATE Latin1_General_100_BIN2 LIKE N'%' + NCHAR(195) + N'%' OR category.name COLLATE Latin1_General_100_BIN2 = N'Fotografia');

UPDATE category SET category.name = N'Tecnología vintage'
FROM dbo.categories AS category INNER JOIN dbo.products AS product ON product.category_id = category.id
WHERE product.id = N'ya-1005' AND (category.name COLLATE Latin1_General_100_BIN2 LIKE N'%' + NCHAR(195) + N'%' OR category.name COLLATE Latin1_General_100_BIN2 = N'Tecnologia vintage');

UPDATE dbo.products SET title = N'Cámara Fujifilm X100V Silver'
WHERE id = N'ya-1001' AND (title COLLATE Latin1_General_100_BIN2 LIKE N'%' + NCHAR(195) + N'%' OR title COLLATE Latin1_General_100_BIN2 = N'Camara Fujifilm X100V Silver');

UPDATE dbo.products SET title = N'Reloj Seiko 5 Sports automático', badge = N'Envío verificado'
WHERE id = N'ya-1003' AND (title COLLATE Latin1_General_100_BIN2 LIKE N'%' + NCHAR(195) + N'%' OR badge COLLATE Latin1_General_100_BIN2 LIKE N'%' + NCHAR(195) + N'%' OR title COLLATE Latin1_General_100_BIN2 = N'Reloj Seiko 5 Sports automatico' OR badge COLLATE Latin1_General_100_BIN2 = N'Envio verificado');

UPDATE dbo.products SET title = N'Set de té japonés artesanal'
WHERE id = N'ya-1004' AND (title COLLATE Latin1_General_100_BIN2 LIKE N'%' + NCHAR(195) + N'%' OR title COLLATE Latin1_General_100_BIN2 = N'Set de te japones artesanal');

IF NOT EXISTS
(
  SELECT 1
  FROM dbo.orders AS existing_order
  INNER JOIN dbo.users AS existing_customer ON existing_customer.id = existing_order.user_id
  INNER JOIN dbo.users AS existing_seller ON existing_seller.id = existing_order.seller_id
  WHERE existing_customer.username = N'clienteDemo'
    AND existing_seller.username = N'adminSales'
    AND existing_order.product_id = N'ya-1001'
    AND existing_order.order_source = N'manual_sale'
)
  INSERT INTO dbo.orders
    (id, user_id, seller_id, product_id, status, bid_amount, quantity, unit_price,
     service_fee, shipping_fee, notes, order_source, created_at, updated_at)
  SELECT
    '20000000-0000-0000-0000-000000000001', customer.id, seller.id,
    N'ya-1001', N'paid', 1049, 10, 1049, 0, 29, NULL, N'manual_sale',
    DATEADD(MINUTE, -30, SYSUTCDATETIME()), DATEADD(MINUTE, -30, SYSUTCDATETIME())
  FROM dbo.users AS customer
  CROSS JOIN dbo.users AS seller
  WHERE customer.username = N'clienteDemo'
    AND seller.username = N'adminSales'
    AND EXISTS (SELECT 1 FROM dbo.products WHERE id = N'ya-1001');

COMMIT TRANSACTION;
