const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

function booleanFromEnvironment(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function databaseEnabled() {
  if (process.env.SQLSERVER_CONNECTION_STRING) return true;
  return ['SQLSERVER_HOST', 'SQLSERVER_DATABASE', 'SQLSERVER_USER', 'SQLSERVER_PASSWORD']
    .every((name) => Boolean(process.env[name]));
}

function databaseConfiguration() {
  if (process.env.SQLSERVER_CONNECTION_STRING) return process.env.SQLSERVER_CONNECTION_STRING;

  const port = Number(process.env.SQLSERVER_PORT || 1433);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('SQLSERVER_PORT debe ser un puerto TCP válido.');
  }

  return {
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DATABASE,
    port,
    connectionTimeout: Number(process.env.SQLSERVER_CONNECTION_TIMEOUT || 15000),
    requestTimeout: Number(process.env.SQLSERVER_REQUEST_TIMEOUT || 15000),
    pool: {
      max: Number(process.env.SQLSERVER_POOL_MAX || 10),
      min: Number(process.env.SQLSERVER_POOL_MIN || 0),
      idleTimeoutMillis: Number(process.env.SQLSERVER_POOL_IDLE_TIMEOUT || 30000)
    },
    options: {
      encrypt: booleanFromEnvironment('SQLSERVER_ENCRYPT', false),
      trustServerCertificate: booleanFromEnvironment('SQLSERVER_TRUST_SERVER_CERTIFICATE', true)
    }
  };
}

module.exports = { databaseConfiguration, databaseEnabled };
