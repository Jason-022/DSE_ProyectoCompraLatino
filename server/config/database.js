const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

function booleanFromEnvironment(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function databaseDriver() {
  return String(process.env.SQLSERVER_DRIVER || 'tedious').trim().toLowerCase();
}

function trustedConnectionEnabled() {
  return booleanFromEnvironment('SQLSERVER_TRUSTED_CONNECTION', false);
}

function databaseEnabled() {
  if (process.env.SQLSERVER_CONNECTION_STRING) return true;
  if (!process.env.SQLSERVER_HOST || !process.env.SQLSERVER_DATABASE) return false;
  if (trustedConnectionEnabled()) return databaseDriver() === 'msnodesqlv8';
  return ['SQLSERVER_USER', 'SQLSERVER_PASSWORD'].every((name) => Boolean(process.env[name]));
}

function databaseConfiguration() {
  const connectionTimeout = Number(process.env.SQLSERVER_CONNECTION_TIMEOUT || 15000);
  const requestTimeout = Number(process.env.SQLSERVER_REQUEST_TIMEOUT || 15000);
  const pool = {
    max: Number(process.env.SQLSERVER_POOL_MAX || 10),
    min: Number(process.env.SQLSERVER_POOL_MIN || 0),
    idleTimeoutMillis: Number(process.env.SQLSERVER_POOL_IDLE_TIMEOUT || 30000)
  };

  if (process.env.SQLSERVER_CONNECTION_STRING) {
    if (databaseDriver() === 'msnodesqlv8') {
      return { connectionString: process.env.SQLSERVER_CONNECTION_STRING, connectionTimeout, requestTimeout, pool };
    }
    return process.env.SQLSERVER_CONNECTION_STRING;
  }

  if (trustedConnectionEnabled()) {
    const odbcDriver = process.env.SQLSERVER_ODBC_DRIVER || 'ODBC Driver 18 for SQL Server';
    const encrypt = booleanFromEnvironment('SQLSERVER_ENCRYPT', false) ? 'yes' : 'no';
    const trustCertificate = booleanFromEnvironment('SQLSERVER_TRUST_SERVER_CERTIFICATE', true) ? 'yes' : 'no';
    const connectionString = [
      `Driver={${odbcDriver}}`,
      `Server=${process.env.SQLSERVER_HOST}`,
      `Database=${process.env.SQLSERVER_DATABASE}`,
      'Trusted_Connection=Yes',
      `Encrypt=${encrypt}`,
      `TrustServerCertificate=${trustCertificate}`
    ].join(';');

    return { connectionString, connectionTimeout, requestTimeout, pool };
  }

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
    connectionTimeout,
    requestTimeout,
    pool,
    options: {
      encrypt: booleanFromEnvironment('SQLSERVER_ENCRYPT', false),
      trustServerCertificate: booleanFromEnvironment('SQLSERVER_TRUST_SERVER_CERTIFICATE', true)
    }
  };
}

module.exports = {
  databaseConfiguration,
  databaseDriver,
  databaseEnabled,
  trustedConnectionEnabled
};
