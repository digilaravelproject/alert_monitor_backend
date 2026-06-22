require('dotenv').config();
const { sql, pool, poolConnect } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function setup() {
    try {
        console.log('Connecting to database...');
        await poolConnect;
        console.log('Connected.');

        // 1. Create table if not exists
        console.log('Creating super_admins table if it does not exist...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[super_admins]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[super_admins] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    email NVARCHAR(100) UNIQUE NOT NULL,
                    password NVARCHAR(255) NOT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table super_admins created.';
            END
            ELSE
            BEGIN
                PRINT 'Table super_admins already exists.';
            END
        `);

        // 2. Check and seed admin credentials
        const email = 'admin@alertmonitor.com';
        const rawPassword = 'Admin@123';
        
        const checkResult = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT TOP 1 id FROM super_admins WHERE email = @email');

        if (checkResult.recordset.length === 0) {
            console.log('Seeding super admin account...');
            const salt = bcrypt.genSaltSync(10);
            const hashedPassword = bcrypt.hashSync(rawPassword, salt);

            await pool.request()
                .input('email', sql.NVarChar, email)
                .input('password', sql.NVarChar, hashedPassword)
                .query('INSERT INTO super_admins (email, password) VALUES (@email, @password)');
            console.log('Super admin account seeded successfully.');
        } else {
            console.log('Super admin account already exists.');
        }

        console.log('Database setup completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

setup();
