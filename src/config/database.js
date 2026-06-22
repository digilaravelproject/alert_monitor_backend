const sql = require('mssql');
const env = require('./env');

const pool = new sql.ConnectionPool(env.DB);
const poolConnect = pool.connect().then(p => {
    console.log('Database Connected Successfully!');
    return p;
}).catch(err => {
    console.error('Database Connection Failed:', err);
});

module.exports = {
    sql,
    pool,
    poolConnect
};
