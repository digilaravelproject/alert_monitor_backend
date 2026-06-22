require('dotenv').config();
const { sql, pool, poolConnect } = require('./src/config/database');

async function updateSchema() {
    try {
        console.log('Connecting to database...');
        await poolConnect;
        console.log('Connected.');

        console.log('Updating users table schema...');
        await pool.request().query(`
            -- Check and add admin_id column
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'admin_id')
            BEGIN
                ALTER TABLE [dbo].[users] ADD admin_id INT NULL;
                PRINT 'Added admin_id column.';
            END
            ELSE
            BEGIN
                PRINT 'admin_id column already exists.';
            END

            -- Check and add is_blocked column
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'is_blocked')
            BEGIN
                ALTER TABLE [dbo].[users] ADD is_blocked BIT NOT NULL DEFAULT 0;
                PRINT 'Added is_blocked column.';
            END
            ELSE
            BEGIN
                PRINT 'is_blocked column already exists.';
            END
        `);

        console.log('Database migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error migrating database schema:', error);
        process.exit(1);
    }
}

updateSchema();
