const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { products: seedProducts, dashboard, users: seedUsers, sales: seedSales } = require('../mock-data');

function normalize(value) { return String(value || '').trim().toLowerCase(); }

class MockStore {
  constructor({ persist = true, usersFile = path.join(__dirname, 'mock-users.json') } = {}) {
    this.kind = 'demo';
    this.persist = persist;
    this.usersFile = usersFile;
    this.products = structuredClone(seedProducts);
    this.users = structuredClone(seedUsers);
    this.sales = structuredClone(seedSales);

    if (this.persist && fs.existsSync(this.usersFile)) {
      const storedUsers = JSON.parse(fs.readFileSync(this.usersFile, 'utf8'));
      if (Array.isArray(storedUsers)) this.users = storedUsers;
    }
  }

  async saveUsers() {
    if (!this.persist) return;
    await fs.promises.writeFile(this.usersFile, `${JSON.stringify(this.users, null, 2)}\n`, 'utf8');
  }

  async getProducts({ query = '', category = '' } = {}) {
    const normalizedQuery = normalize(query);
    return this.products.filter((product) =>
      (!normalizedQuery || normalize(`${product.title} ${product.category}`).includes(normalizedQuery)) &&
      (!category || category === 'Todos' || product.category === category)
    );
  }

  async getProductById(id) {
    return this.products.find((product) => product.id === id) || null;
  }

  async getDashboard() { return dashboard; }

  async findUserByUsername(username) {
    return this.users.find((user) => normalize(user.username) === normalize(username)) || null;
  }

  async findUserByEmail(email) {
    return this.users.find((user) => normalize(user.email) === normalize(email)) || null;
  }

  async getUsers() { return this.users; }

  async getCustomers() { return this.users.filter((user) => user.role === 'customer'); }

  async createUser(user) {
    this.users.push(user);
    await this.saveUsers();
    return user;
  }

  async updateUser(username, changes) {
    const user = await this.findUserByUsername(username);
    if (!user) return null;
    Object.assign(user, changes);
    await this.saveUsers();
    return user;
  }

  async placeBid(productId, amount) {
    const product = await this.getProductById(productId);
    if (!product || !Number.isFinite(amount) || amount <= product.currentBid) return null;
    product.currentBid = amount;
    product.bids += 1;
    return product;
  }

  async updateProduct(productId, changes) {
    const product = await this.getProductById(productId);
    if (!product) return null;
    Object.assign(product, changes);
    return product;
  }

  async createProduct(product) {
    this.products.push(product);
    return product;
  }

  async deleteProduct(productId) {
    const index = this.products.findIndex((product) => product.id === productId);
    if (index < 0) return false;
    this.products.splice(index, 1);
    return true;
  }

  async getSales({ customerId = '' } = {}) {
    return this.sales.filter((sale) => !customerId || sale.customer.id === customerId);
  }

  async createSale(sale) {
    const customer = this.users.find((user) => user.id === sale.customerId && user.role === 'customer');
    const seller = this.users.find((user) => user.id === sale.sellerId);
    const product = this.products.find((item) => item.id === sale.productId);
    if (!customer || !seller || !product) return null;
    const created = {
      id: randomUUID(),
      customer: { id: customer.id, username: customer.username, firstName: customer.firstName, lastName: customer.lastName, email: customer.email },
      seller: { id: seller.id, username: seller.username, firstName: seller.firstName, lastName: seller.lastName },
      product: { id: product.id, title: product.title },
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      serviceFee: sale.serviceFee,
      shippingFee: sale.shippingFee,
      total: (sale.quantity * sale.unitPrice) + sale.serviceFee + sale.shippingFee,
      status: sale.status,
      notes: sale.notes || '',
      createdAt: new Date().toISOString()
    };
    this.sales.unshift(created);
    return created;
  }

  async close() { await this.saveUsers(); }
}

module.exports = { MockStore };
