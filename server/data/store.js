const { databaseConfiguration, databaseEnabled } = require('../config/database');
const { MockStore } = require('./mock-store');
const { SqlServerStore } = require('./sqlserver-store');

async function createStore() {
  if (!databaseEnabled()) return new MockStore({ persist: process.env.MOCK_USERS_PERSIST !== 'false' });
  return new SqlServerStore(databaseConfiguration()).connect();
}

module.exports = { createStore };
