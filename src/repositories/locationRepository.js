const { sql, pool, poolConnect } = require('../config/database');

class LocationRepository {
    async create({ name, address, city, zip_code, latitude, longitude, admin_id }) {
        await poolConnect;
        const result = await pool.request()
            .input('name', sql.NVarChar, name.trim())
            .input('address', sql.NVarChar, address ? address.trim() : null)
            .input('city', sql.NVarChar, city ? city.trim() : null)
            .input('zip_code', sql.NVarChar, zip_code ? zip_code.trim() : null)
            .input('latitude', sql.NVarChar, latitude ? String(latitude).trim() : null)
            .input('longitude', sql.NVarChar, longitude ? String(longitude).trim() : null)
            .input('admin_id', sql.Int, admin_id)
            .query(`
                INSERT INTO locations (name, address, city, zip_code, latitude, longitude, admin_id, is_active)
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.address, INSERTED.city, INSERTED.zip_code, INSERTED.latitude, INSERTED.longitude, INSERTED.is_active, INSERTED.admin_id, INSERTED.created_at
                VALUES (@name, @address, @city, @zip_code, @latitude, @longitude, @admin_id, 1)
            `);
        return result.recordset[0];
    }

    async getAll(adminId = null, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT l.id, l.name, l.address, l.city, l.zip_code, l.latitude, l.longitude, l.is_active, l.admin_id, l.created_at,
                   (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id) as nodes,
                   (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id AND u.is_blocked = 0) as online_nodes,
                   u.name AS owner_name, u.email AS owner_email
            FROM locations l
            LEFT JOIN users u ON l.admin_id = u.id
        `;
        const request = pool.request();
        if (!isSuperAdmin && adminId !== null) {
            query += ' WHERE l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        query += ' ORDER BY l.id DESC';
        const result = await request.query(query);
        return result.recordset;
    }

    async getById(id, adminId = null, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT l.id, l.name, l.address, l.city, l.zip_code, l.latitude, l.longitude, l.is_active, l.admin_id, l.created_at,
                   (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id) as nodes,
                   (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id AND u.is_blocked = 0) as online_nodes
            FROM locations l
            WHERE l.id = @id
        `;
        const request = pool.request().input('id', sql.Int, id);
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        const result = await request.query(query);
        return result.recordset[0];
    }

    async findByName(adminId, name) {
        await poolConnect;
        const request = pool.request()
            .input('name', sql.NVarChar, name.trim());
        
        let query = 'SELECT TOP 1 id, name FROM locations WHERE name = @name';
        if (adminId !== null) {
            query += ' AND admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        } else {
            query += ' AND admin_id IS NULL';
        }

        const result = await request.query(query);
        return result.recordset[0];
    }

    async search(adminId = null, queryStr, isSuperAdmin = false) {
        await poolConnect;
        let query = `
            SELECT l.id, l.name, l.address, l.city, l.zip_code, l.latitude, l.longitude, l.is_active, l.admin_id, l.created_at,
                   (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id) as nodes,
                   (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id AND u.is_blocked = 0) as online_nodes,
                   u.name AS owner_name, u.email AS owner_email
            FROM locations l
            LEFT JOIN users u ON l.admin_id = u.id
            WHERE (l.name LIKE @searchQuery OR l.address LIKE @searchQuery OR l.city LIKE @searchQuery OR l.zip_code LIKE @searchQuery)
        `;
        const request = pool.request().input('searchQuery', sql.NVarChar, `%${queryStr.trim()}%`);
        if (!isSuperAdmin && adminId !== null) {
            query += ' AND l.admin_id = @adminId';
            request.input('adminId', sql.Int, adminId);
        }
        query += ' ORDER BY l.id DESC';
        const result = await request.query(query);
        return result.recordset;
    }

    async update(id, { name, address, city, zip_code, latitude, longitude }) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name.trim())
            .input('address', sql.NVarChar, address ? address.trim() : null)
            .input('city', sql.NVarChar, city ? city.trim() : null)
            .input('zip_code', sql.NVarChar, zip_code ? zip_code.trim() : null)
            .input('latitude', sql.NVarChar, latitude ? String(latitude).trim() : null)
            .input('longitude', sql.NVarChar, longitude ? String(longitude).trim() : null)
            .query(`
                UPDATE locations
                SET name = @name, address = @address, city = @city, zip_code = @zip_code, latitude = @latitude, longitude = @longitude
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.address, INSERTED.city, INSERTED.zip_code, INSERTED.latitude, INSERTED.longitude, INSERTED.is_active, INSERTED.admin_id, INSERTED.created_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async toggleStatus(id, isActive) {
        await poolConnect;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('is_active', sql.Bit, isActive)
            .query(`
                UPDATE locations
                SET is_active = @is_active
                OUTPUT INSERTED.id, INSERTED.name, INSERTED.address, INSERTED.city, INSERTED.zip_code, INSERTED.latitude, INSERTED.longitude, INSERTED.is_active, INSERTED.admin_id, INSERTED.created_at
                WHERE id = @id
            `);
        return result.recordset[0];
    }

    async delete(id) {
        await poolConnect;
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM locations WHERE id = @id');
    }
}

module.exports = new LocationRepository();
