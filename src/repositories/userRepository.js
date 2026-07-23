const { sql, pool, poolConnect } = require('../config/database');

class UserRepository {
    // 1. Temp users
    async createTempUser(email, phone_number) {
        await poolConnect;
        await pool.request()
            .input('email', sql.VarChar, email)
            .input('phone_number', sql.VarChar, phone_number)
            .query(`
                INSERT INTO temp_user_tbl
                (email, phone_number)
                VALUES
                (@email, @phone_number)
            `);
    }

    async getTempUsers() {
        await poolConnect;
        // In the original userRoutes.js, this was commented out. 
        // We will uncomment the temp_user_tbl query so that the endpoint functions correctly.
        const result = await pool.request()
            .query(`
                SELECT *
                FROM temp_user_tbl
                ORDER BY id DESC
            `);
        return result.recordset;
    }

    // 2. Exact match phone checks
    async findExactPhone(phone) {
        await poolConnect;
        const result = await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .query(`
                SELECT TOP 1 id 
                FROM users 
                WHERE phone_number = @phone_number
            `);
        return result.recordset;
    }

    async findExactPhoneExcludingId(phone, id) {
        await poolConnect;
        const result = await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .input('id', sql.Int, id)
            .query(`
                SELECT TOP 1 id 
                FROM users 
                WHERE phone_number = @phone_number AND id != @id
            `);
        return result.recordset;
    }

    // 3. User operations
    async create(user) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, user.name)
            .input('phone_number', sql.NVarChar, user.phone_number)
            .input('role', sql.NVarChar, user.role || null) // "When staff addition and updation store the role id should not store role name."
            .input('role_id', sql.Int, user.role_id)
            .input('access_level', sql.NVarChar, null) // "Should send level id insteade of level name in add staff and update staff api's."
            .input('level_id', sql.Int, user.level_id)
            .input('location', sql.NVarChar, null)
            .input('location_id', sql.Int, user.location_id)
            .input('created_at', sql.DateTime, user.created_at || new Date())
            .input('admin_id', sql.Int, user.admin_id)
            .input('is_blocked', sql.Bit, user.is_blocked || 0)
            .query(`
                INSERT INTO users 
                (name, phone_number, role, role_id, access_level, level_id, location, location_id, created_at, admin_id, is_blocked)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.phone_number, INSERTED.role, INSERTED.role_id, INSERTED.access_level, INSERTED.level_id, INSERTED.location, INSERTED.location_id, INSERTED.created_at, INSERTED.admin_id, INSERTED.is_blocked
                VALUES 
                (@name, @phone_number, @role, @role_id, @access_level, @level_id, @location, @location_id, @created_at, @admin_id, @is_blocked)
            `);
        return result.recordset[0];
    }

    async findUserForLogin(phone, rawPhone, tenDigits) {
        await poolConnect;
        const result = await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .input('raw_phone', sql.NVarChar, rawPhone)
            .input('ten_digits', sql.NVarChar, tenDigits)
            .query(`
                SELECT TOP 1 id, phone_number 
                FROM users 
                WHERE phone_number = @phone_number 
                   OR phone_number = @raw_phone
                   OR phone_number = @ten_digits
            `);
        return result.recordset;
    }

    async findUserForOtpVerification(phone, rawPhone, tenDigits) {
        await poolConnect;
        const result = await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .input('raw_phone', sql.NVarChar, rawPhone)
            .input('ten_digits', sql.NVarChar, tenDigits)
            .query(`
                SELECT TOP 1 u.id, u.name, u.email, u.phone_number, u.profile_image, COALESCE(r.name, u.role) as role, u.role_id, COALESCE(l.name, u.access_level) as access_level, u.level_id, u.location, u.location_id,
                       loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, loc.is_active as loc_is_active,
                       u.otp, u.otp_expiry, u.admin_id
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN levels l ON u.level_id = l.id
                LEFT JOIN locations loc ON u.location_id = loc.id
                WHERE u.phone_number = @phone_number
                   OR u.phone_number = @raw_phone
                   OR u.phone_number = @ten_digits
            `);
        return result.recordset;
    }

    async updateOtp(id, otp, otpExpiry) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .input('otp', sql.NVarChar, otp)
            .input('otp_expiry', sql.DateTime, otpExpiry)
            .query(`
                UPDATE users 
                SET otp = @otp, otp_expiry = @otp_expiry 
                WHERE id = @id
            `);
    }

    async clearOtp(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE users 
                SET otp = NULL, otp_expiry = NULL 
                WHERE id = @id
            `);
    }

    async findSuperAdminByEmail(email) {
        await poolConnect;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT TOP 1 id, email, password FROM super_admins WHERE email = @email');
        return result.recordset;
    }

    async findAllUsers() {
        await poolConnect;
        const result = await pool.request()
            .query(`
                SELECT u.id, u.name, u.email, u.phone_number, COALESCE(r.name, u.role) as role, u.role_id, COALESCE(l.name, u.access_level) as access_level, u.level_id, u.location, u.location_id,
                       loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, loc.is_active as loc_is_active,
                       u.created_at
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN levels l ON u.level_id = l.id
                LEFT JOIN locations loc ON u.location_id = loc.id
                ORDER BY u.id DESC
            `);
        return result.recordset;
    }

    async getStaffStats(adminId) {
        await poolConnect;
        const result = await pool.request()
            .input('adminId', sql.Int, adminId)
            .query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_blocked = 0 THEN 1 ELSE 0 END) as on_duty,
                    SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as off_duty
                FROM users
                WHERE admin_id = @adminId
            `);
        return result.recordset[0] || { total: 0, on_duty: 0, off_duty: 0 };
    }

    async findStaff(adminId, levelQuery) {
        await poolConnect;
        let queryStr = `
            SELECT u.id, u.name, u.email, u.phone_number, COALESCE(r.name, u.role) as role, u.role_id, COALESCE(l.name, u.access_level) as access_level, u.level_id, u.location, u.location_id,
                   loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, loc.is_active as loc_is_active,
                   u.created_at, u.admin_id, u.is_blocked 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN levels l ON u.level_id = l.id
            LEFT JOIN locations loc ON u.location_id = loc.id
            WHERE u.admin_id = @adminId
        `;
        const request = pool.request().input('adminId', sql.Int, adminId);

        if (levelQuery && levelQuery.toLowerCase() !== 'all') {
            if (/^\d+$/.test(levelQuery)) {
                queryStr += ' AND u.level_id = @levelId';
                request.input('levelId', sql.Int, parseInt(levelQuery, 10));
            } else {
                queryStr += ' AND COALESCE(l.name, u.access_level) = @accessLevel';
                request.input('accessLevel', sql.NVarChar, levelQuery);
            }
        }

        queryStr += ' ORDER BY u.id DESC';

        const result = await request.query(queryStr);
        return result.recordset;
    }

    async searchStaff(adminId, query) {
        await poolConnect;
        let queryStr = `
            SELECT u.id, u.name, u.email, u.phone_number, COALESCE(r.name, u.role) as role, u.role_id, COALESCE(l.name, u.access_level) as access_level, u.level_id, u.location, u.location_id,
                   loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, loc.is_active as loc_is_active,
                   u.created_at, u.admin_id, u.is_blocked 
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN levels l ON u.level_id = l.id
            LEFT JOIN locations loc ON u.location_id = loc.id
            WHERE u.admin_id = @adminId
              AND (u.name LIKE @searchQuery 
               OR u.phone_number LIKE @searchQuery 
               OR COALESCE(r.name, u.role) LIKE @searchQuery 
               OR COALESCE(l.name, u.access_level) LIKE @searchQuery 
               OR loc.name LIKE @searchQuery
               OR u.location LIKE @searchQuery)
        `;
        const request = pool.request()
            .input('adminId', sql.Int, adminId)
            .input('searchQuery', sql.NVarChar, `%${query.trim()}%`);

        queryStr += ' ORDER BY u.id DESC';

        const result = await request.query(queryStr);
        return result.recordset;
    }

    async checkStaffOwnership(staffId, adminId, isSuperAdmin = false) {
        await poolConnect;
        const request = pool.request()
            .input('id', sql.Int, staffId);
        let queryStr = `
            SELECT u.id, u.name, u.email, u.phone_number, COALESCE(r.name, u.role) as role, u.role_id, COALESCE(l.name, u.access_level) as access_level, u.level_id, u.location, u.location_id,
                   loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, loc.is_active as loc_is_active,
                   u.created_at, u.admin_id, u.is_blocked
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN levels l ON u.level_id = l.id
            LEFT JOIN locations loc ON u.location_id = loc.id
            WHERE u.id = @id
        `;
        if (!isSuperAdmin) {
            queryStr += ' AND u.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        const result = await request.query(queryStr);
        return result.recordset;
    }

    async updateStaff(staffId, name, phone, role, roleId, levelId, locationId) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, staffId)
            .input('name', sql.NVarChar, name.trim())
            .input('phone_number', sql.NVarChar, phone)
            .input('role', sql.NVarChar, role || null) // Set to null for staff, set to role (e.g. 'Admin') for vendors
            .input('role_id', sql.Int, roleId)
            .input('access_level', sql.NVarChar, null) // Set to null, do not store level name!
            .input('level_id', sql.Int, levelId)
            .input('location', sql.NVarChar, null)
            .input('location_id', sql.Int, locationId)
            .query(`
                UPDATE users 
                SET name = @name, 
                    phone_number = @phone_number, 
                    role = @role, 
                    role_id = @role_id,
                    access_level = @access_level, 
                    level_id = @level_id,
                    location = @location,
                    location_id = @location_id
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.phone_number, INSERTED.role, INSERTED.role_id, INSERTED.access_level, INSERTED.level_id, INSERTED.location, INSERTED.location_id, INSERTED.created_at, INSERTED.admin_id, INSERTED.is_blocked
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async getLevelById(levelId) {
        if (!levelId) return null;
        await poolConnect;
        const result = await pool.request()
            .input('levelId', sql.Int, levelId)
            .query('SELECT TOP 1 id, name, description, sla_window, cycle_count, response_logic, color FROM levels WHERE id = @levelId');
        return result.recordset[0] || null;
    }

    async getRolePermissions(roleId) {
        if (!roleId) return [];
        await poolConnect;
        const result = await pool.request()
            .input('roleId', sql.Int, roleId)
            .query(`
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = @roleId AND p.is_active = 1
            `);
        return result.recordset.map(row => row.name);
    }

    async updateBlockedState(staffId, isBlocked) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, staffId)
            .input('is_blocked', sql.Bit, isBlocked)
            .query('UPDATE users SET is_blocked = @is_blocked WHERE id = @id');
    }

    async deleteStaff(staffId) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, staffId)
            .query('DELETE FROM users WHERE id = @id');
    }

    async getProfile(userId, role) {
        await poolConnect;
        if (role === 'Super Admin') {
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .query('SELECT id, name, email, phone_number, profile_image FROM super_admins WHERE id = @id');
            return result.recordset[0];
        } else {
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .query(`
                    SELECT u.id, u.name, u.email, u.phone_number, u.profile_image, COALESCE(r.name, u.role) as role, u.role_id, u.location_id,
                           loc.name as loc_name, loc.address as loc_address, loc.city as loc_city, loc.zip_code as loc_zip_code, u.admin_id
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    LEFT JOIN locations loc ON u.location_id = loc.id
                    WHERE u.id = @id
                `);
            return result.recordset[0];
        }
    }

    async updateProfile(userId, role, { name, email, phone_number, profile_image }) {
        await poolConnect;
        if (role === 'Super Admin') {
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .input('name', sql.NVarChar, name ? name.trim() : null)
                .input('email', sql.NVarChar, email ? email.trim() : null)
                .input('phone_number', sql.NVarChar, phone_number ? phone_number.trim() : null)
                .input('profile_image', sql.NVarChar, profile_image || null)
                .query(`
                    UPDATE super_admins
                    SET name = @name, email = @email, phone_number = @phone_number, profile_image = @profile_image
                    OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone_number, INSERTED.profile_image
                    WHERE id = @id
                `);
            return result.recordset[0];
        } else {
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .input('name', sql.NVarChar, name ? name.trim() : null)
                .input('email', sql.NVarChar, email ? email.trim() : null)
                .input('phone_number', sql.NVarChar, phone_number ? phone_number.trim() : null)
                .input('profile_image', sql.NVarChar, profile_image || null)
                .query(`
                    UPDATE users
                    SET name = @name, email = @email, phone_number = @phone_number, profile_image = @profile_image
                    OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone_number, INSERTED.profile_image
                    WHERE id = @id
                `);
            return result.recordset[0];
        }
    }

    async savePhoneOtp(phone, otp, expiry) {
        await poolConnect;
        await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .query('DELETE FROM phone_otps WHERE phone_number = @phone_number');
        
        await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .input('otp', sql.NVarChar, otp)
            .input('otp_expiry', sql.DateTime, expiry)
            .query(`
                INSERT INTO phone_otps (phone_number, otp, otp_expiry)
                VALUES (@phone_number, @otp, @otp_expiry)
            `);
    }

    async getPhoneOtp(phone) {
        await poolConnect;
        const result = await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .query('SELECT phone_number, otp, otp_expiry FROM phone_otps WHERE phone_number = @phone_number');
        return result.recordset[0];
    }

    async deletePhoneOtp(phone) {
        await poolConnect;
        await pool.request()
            .input('phone_number', sql.NVarChar, phone)
            .query('DELETE FROM phone_otps WHERE phone_number = @phone_number');
    }
}

module.exports = new UserRepository();
