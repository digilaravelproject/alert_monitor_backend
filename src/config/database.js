const sql = require('mssql');
const env = require('./env');

const pool = new sql.ConnectionPool(env.DB);
const poolConnect = pool.connect();

module.exports = {
    sql,
    pool,
    poolConnect
};
