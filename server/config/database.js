function databaseConfiguration() {
  return {
    connectionString: process.env.DATABASE_URL || '',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
}

function databaseEnabled() { return Boolean(process.env.DATABASE_URL); }

module.exports = { databaseConfiguration, databaseEnabled };
