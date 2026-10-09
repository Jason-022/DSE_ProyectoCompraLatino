const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MockStore } = require('./mock-store');

test('filtra productos por categoría', async () => {
  const store = new MockStore({ persist: false });
  const products = await store.getProducts({ category: 'Relojes' });
  assert.equal(products.length, 1);
  assert.equal(products[0].category, 'Relojes');
});

test('rechaza pujas no numéricas sin modificar el producto', async () => {
  const store = new MockStore({ persist: false });
  const before = await store.getProductById('ya-1001');
  const currentBid = before.currentBid;
  const result = await store.placeBid('ya-1001', Number.NaN);
  const after = await store.getProductById('ya-1001');
  assert.equal(result, null);
  assert.equal(after.currentBid, currentBid);
});

test('registra una puja superior a la actual', async () => {
  const store = new MockStore({ persist: false });
  const before = await store.getProductById('ya-1002');
  const amount = before.currentBid + 10;
  const bidCount = before.bids;
  const result = await store.placeBid(before.id, amount);
  assert.equal(result.currentBid, amount);
  assert.equal(result.bids, bidCount + 1);
});

test('crea y actualiza usuarios mediante el contrato de persistencia', async () => {
  const store = new MockStore({ persist: false });
  const suffix = randomUUID();
  const username = `test-${suffix}`;
  await store.createUser({
    id: randomUUID(),
    username,
    passwordHash: 'hash',
    email: `${suffix}@example.test`,
    firstName: 'Test',
    lastName: 'User',
    phone: '',
    birthDate: '',
    role: 'customer'
  });
  const updated = await store.updateUser(username, { firstName: 'Updated' });
  assert.equal(updated.firstName, 'Updated');
  assert.equal((await store.findUserByUsername(username)).firstName, 'Updated');
  assert.equal((await store.findUserByUsername(username)).passwordHash, 'hash');
});

test('persiste usuarios en JSON sin reemplazar un hash omitido', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'compralatino-'));
  const usersFile = path.join(directory, 'users.json');
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new MockStore({ usersFile });
  const original = await store.findUserByUsername('clienteDemo');
  const originalHash = original.passwordHash;
  await store.updateUser('clienteDemo', { firstName: 'Cliente actualizado' });
  const stored = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
  const updated = stored.find((user) => user.username === 'clienteDemo');
  assert.equal(updated.firstName, 'Cliente actualizado');
  assert.equal(updated.passwordHash, originalHash);
});

test('registra ventas asociadas al cliente, vendedor y producto', async () => {
  const store = new MockStore({ persist: false });
  const customer = await store.findUserByUsername('clienteDemo');
  const seller = await store.findUserByUsername('vendedorDemo');
  const product = await store.getProductById('ya-1001');
  const sale = await store.createSale({
    customerId: customer.id,
    sellerId: seller.id,
    productId: product.id,
    quantity: 2,
    unitPrice: 100,
    serviceFee: 5,
    shippingFee: 10,
    status: 'paid',
    notes: 'Venta de prueba'
  });

  assert.equal(sale.customer.id, customer.id);
  assert.equal(sale.seller.id, seller.id);
  assert.equal(sale.product.id, product.id);
  assert.equal(sale.total, 215);
  assert.deepEqual(await store.getSales({ customerId: customer.id }), [sale]);
});

test('permite crear, modificar y retirar productos del catálogo', async () => {
  const store = new MockStore({ persist: false });
  const product = {
    id: `product-${randomUUID()}`,
    title: 'Producto de prueba',
    category: 'Pruebas',
    price: 25,
    currentBid: 20,
    bids: 0,
    shipping: 3,
    image: '',
    badge: 'Disponible'
  };

  await store.createProduct(product);
  assert.equal((await store.getProductById(product.id)).title, product.title);
  assert.equal((await store.updateProduct(product.id, { price: 30 })).price, 30);
  assert.equal(await store.deleteProduct(product.id), true);
  assert.equal(await store.getProductById(product.id), null);
});
