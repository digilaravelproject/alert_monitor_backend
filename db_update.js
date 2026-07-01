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

            -- Create temp_user_tbl table
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[temp_user_tbl]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[temp_user_tbl] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    email NVARCHAR(100) NULL,
                    phone_number NVARCHAR(20) NOT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table temp_user_tbl created.';
            END

            -- Create permissions table
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[permissions]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[permissions] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) UNIQUE NOT NULL,
                    description NVARCHAR(255) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table permissions created.';
            END

            -- Create roles table
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[roles]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[roles] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL,
                    description NVARCHAR(255) NULL,
                    admin_id INT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table roles created.';
            END

            -- Create role_permissions table
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[role_permissions]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[role_permissions] (
                    role_id INT NOT NULL,
                    permission_id INT NOT NULL,
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
                    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
                );
                PRINT 'Table role_permissions created.';
            END

            -- Check and add role_id column to users table
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'role_id')
            BEGIN
                ALTER TABLE [dbo].[users] ADD role_id INT NULL;
                ALTER TABLE [dbo].[users] ADD CONSTRAINT FK_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
                PRINT 'Added role_id column to users.';
            END
            ELSE
            BEGIN
                PRINT 'role_id column already exists.';
            END

            -- Seed default permissions
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Manage Devices') INSERT INTO permissions (name, description, is_active) VALUES ('Manage Devices', 'Ability to view and edit devices', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'View Reports') INSERT INTO permissions (name, description, is_active) VALUES ('View Reports', 'Ability to view analytics and logs', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Manage Staff') INSERT INTO permissions (name, description, is_active) VALUES ('Manage Staff', 'Ability to enroll and update staff', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Edit Alerts') INSERT INTO permissions (name, description, is_active) VALUES ('Edit Alerts', 'Ability to customize alert thresholds', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Setup Organization') INSERT INTO permissions (name, description, is_active) VALUES ('Setup Organization', 'Ability to configure org settings', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Manage Roles') INSERT INTO permissions (name, description, is_active) VALUES ('Manage Roles', 'Ability to create and update roles', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Manage Levels') INSERT INTO permissions (name, description, is_active) VALUES ('Manage Levels', 'Ability to configure security levels', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Manage Locations') INSERT INTO permissions (name, description, is_active) VALUES ('Manage Locations', 'Ability to configure guard stations and locations', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'View System Logs') INSERT INTO permissions (name, description, is_active) VALUES ('View System Logs', 'Ability to view raw backend logs', 1);
            IF NOT EXISTS (SELECT * FROM permissions WHERE name = 'Export Data') INSERT INTO permissions (name, description, is_active) VALUES ('Export Data', 'Ability to download reports and user details', 1);

            -- Seed default system roles (admin_id is NULL)
            IF NOT EXISTS (SELECT * FROM roles WHERE name = 'Admin' AND admin_id IS NULL) INSERT INTO roles (name, description, admin_id) VALUES ('Admin', 'Default System Administrator', NULL);
            IF NOT EXISTS (SELECT * FROM roles WHERE name = 'Security Guard' AND admin_id IS NULL) INSERT INTO roles (name, description, admin_id) VALUES ('Security Guard', 'Default Security Guard', NULL);
            IF NOT EXISTS (SELECT * FROM roles WHERE name = 'Manager' AND admin_id IS NULL) INSERT INTO roles (name, description, admin_id) VALUES ('Manager', 'Default Security Manager', NULL);
            IF NOT EXISTS (SELECT * FROM roles WHERE name = 'Supervisor' AND admin_id IS NULL) INSERT INTO roles (name, description, admin_id) VALUES ('Supervisor', 'Default Operations Supervisor', NULL);

            -- Create levels table
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[levels]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[levels] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL,
                    description NVARCHAR(255) NULL,
                    sla_window NVARCHAR(50) NULL,
                    cycle_count NVARCHAR(50) NULL,
                    response_logic NVARCHAR(50) NULL,
                    color NVARCHAR(50) NULL,
                    admin_id INT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table levels created.';
            END

            -- Check and add level_id column to users table
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'level_id')
            BEGIN
                ALTER TABLE [dbo].[users] ADD level_id INT NULL;
                ALTER TABLE [dbo].[users] ADD CONSTRAINT FK_users_level_id FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE SET NULL;
                PRINT 'Added level_id column to users.';
            END
            ELSE
            BEGIN
                PRINT 'level_id column already exists.';
            END

            -- Seed default system levels (admin_id is NULL)
            IF NOT EXISTS (SELECT * FROM levels WHERE name = 'Level 1 (Critical)' AND admin_id IS NULL) 
                INSERT INTO levels (name, description, sla_window, cycle_count, response_logic, color, admin_id) 
                VALUES ('Level 1 (Critical)', 'Critical Priority Protocol', '5m', '3x', 'Immediate', 'red', NULL);
                
            IF NOT EXISTS (SELECT * FROM levels WHERE name = 'Level 2 (High)' AND admin_id IS NULL) 
                INSERT INTO levels (name, description, sla_window, cycle_count, response_logic, color, admin_id) 
                VALUES ('Level 2 (High)', 'High Priority Protocol', '15m', '3x', 'Immediate', 'orange', NULL);

            IF NOT EXISTS (SELECT * FROM levels WHERE name = 'Level 3 (Medium)' AND admin_id IS NULL) 
                INSERT INTO levels (name, description, sla_window, cycle_count, response_logic, color, admin_id) 
                VALUES ('Level 3 (Medium)', 'Medium Priority Protocol', '30m', '3x', 'Immediate', 'blue', NULL);

            IF NOT EXISTS (SELECT * FROM levels WHERE name = 'Level 4 (Information)' AND admin_id IS NULL) 
                INSERT INTO levels (name, description, sla_window, cycle_count, response_logic, color, admin_id) 
                VALUES ('Level 4 (Information)', 'Information Priority Protocol', '1h', '3x', 'Immediate', 'grey', NULL);

            -- Create locations table
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[locations] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL,
                    address NVARCHAR(255) NULL,
                    city NVARCHAR(100) NULL,
                    zip_code NVARCHAR(20) NULL,
                    latitude NVARCHAR(100) NULL,
                    longitude NVARCHAR(100) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    admin_id INT NULL,
                    created_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table locations created.';
            END
            ELSE
            BEGIN
                -- Check and add latitude column to locations table
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND name = 'latitude')
                BEGIN
                    ALTER TABLE [dbo].[locations] ADD latitude NVARCHAR(100) NULL;
                    PRINT 'Added latitude column to locations.';
                END

                -- Check and add longitude column to locations table
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[locations]') AND name = 'longitude')
                BEGIN
                    ALTER TABLE [dbo].[locations] ADD longitude NVARCHAR(100) NULL;
                    PRINT 'Added longitude column to locations.';
                END
            END

            -- Check and add location_id column to users table
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'location_id')
            BEGIN
                ALTER TABLE [dbo].[users] ADD location_id INT NULL;
                ALTER TABLE [dbo].[users] ADD CONSTRAINT FK_users_location_id FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
                PRINT 'Added location_id column to users.';
            END
            ELSE
            BEGIN
                PRINT 'location_id column already exists.';
            END

            -- Create tbl_DeviceFeedData table if it does not exist
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[tbl_DeviceFeedData]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[tbl_DeviceFeedData] (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    ts INT NULL,
                    Ts_date DATETIME NULL,
                    node NVARCHAR(100) NULL,
                    ev NVARCHAR(100) NULL,
                    fw_ver NVARCHAR(50) NULL,
                    x INT NULL,
                    y INT NULL,
                    spd INT NULL,
                    mov BIT NULL,
                    fall BIT NULL,
                    mic_db FLOAT NULL,
                    rssi INT NULL,
                    bat_v FLOAT NULL,
                    bat_pct INT NULL,
                    charging BIT NULL,
                    err INT NULL,
                    msg NVARCHAR(255) NULL,
                    status NVARCHAR(50) NULL,
                    Insertdate DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table tbl_DeviceFeedData created.';
            END

            -- Create devices table if it does not exist
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[devices]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[devices] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL,
                    serial_number NVARCHAR(100) UNIQUE NOT NULL,
                    type NVARCHAR(100) NOT NULL,
                    location_id INT NOT NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_devices_location_id FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
                );
                PRINT 'Table devices created.';
            END

            -- Create dismissed_alerts table if it does not exist
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[dismissed_alerts]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[dismissed_alerts] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    feed_id BIGINT NOT NULL,
                    dismissed_at DATETIME DEFAULT GETDATE()
                );
                PRINT 'Table dismissed_alerts created.';
            END

            -- Create acknowledged_alerts table if it does not exist
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[acknowledged_alerts]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[acknowledged_alerts] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    feed_id BIGINT NOT NULL,
                    acknowledged_at DATETIME DEFAULT GETDATE(),
                    acknowledged_by NVARCHAR(100) NULL
                );
                PRINT 'Table acknowledged_alerts created.';
            END

            -- Create user_fcm_tokens table if it does not exist
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[user_fcm_tokens]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[user_fcm_tokens] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    fcm_token NVARCHAR(450) NOT NULL,
                    device_type NVARCHAR(50) NULL,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE(),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT UQ_user_fcm UNIQUE (user_id, fcm_token)
                );
                PRINT 'Table user_fcm_tokens created.';
            END

            -- Create notification_tracker table if it does not exist
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[notification_tracker]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [dbo].[notification_tracker] (
                    key_name NVARCHAR(100) PRIMARY KEY,
                    last_id BIGINT NOT NULL
                );
                PRINT 'Table notification_tracker created.';
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
