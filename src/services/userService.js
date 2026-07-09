const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const roleRepository = require('../repositories/roleRepository');
const levelRepository = require('../repositories/levelRepository');
const { normalizePhoneNumber, extractTenDigits } = require('../utils/helper');

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function mapUserRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone_number: row.phone_number,
        role: row.role,
        role_id: row.role_id,
        access_level: row.access_level,
        level_id: row.level_id,
        location: row.location_id ? {
            id: row.location_id,
            name: row.loc_name,
            address: row.loc_address,
            city: row.loc_city,
            zip_code: row.loc_zip_code,
            is_active: row.loc_is_active
        } : (row.location ? { name: row.location } : null),
        created_at: row.created_at,
        admin_id: row.admin_id,
        is_blocked: row.is_blocked,
        ...(row.permissions && { permissions: row.permissions }),
        ...(row.level && { level: row.level })
    };
}

class UserService {
    // 1. Temp User APIs
    async createTempUser(email, phone_number) {
        await userRepository.createTempUser(email, phone_number);
    }

    async getTempUsers() {
        return await userRepository.getTempUsers();
    }

    // 2. Add User (Staff Enrollment)
    async addStaff(name, phone_number, role, access_level, location_id, currentUser) {
        const normalizedPhone = normalizePhoneNumber(phone_number);

        // Check if user already exists
        const existingUsers = await userRepository.findExactPhone(normalizedPhone);
        if (existingUsers.length > 0) {
            throw new ServiceError('Mobile number is already registered', 400);
        }

        const adminId = currentUser.id;
        const isBlocked = 0; // default not blocked

        let roleId = null;
        const roleStr = String(role).trim();
        if (/^\d+$/.test(roleStr)) {
            roleId = parseInt(roleStr, 10);
        } else {
            const dbRole = await roleRepository.findByName(adminId, roleStr);
            if (dbRole) {
                roleId = dbRole.id;
            }
        }

        let levelId = null;
        if (access_level !== undefined && access_level !== null && access_level !== '') {
            const levelStr = String(access_level).trim();
            if (levelStr && levelStr !== 'null' && levelStr !== 'undefined') {
                if (/^\d+$/.test(levelStr)) {
                    levelId = parseInt(levelStr, 10);
                } else {
                    const dbLevel = await levelRepository.findByName(adminId, levelStr);
                    if (dbLevel) {
                        levelId = dbLevel.id;
                    }
                }
            }
        }

        let parsedLocationId = null;
        if (location_id !== undefined && location_id !== null && location_id !== '') {
            const locStr = String(location_id).trim();
            if (locStr && locStr !== 'null' && locStr !== 'undefined') {
                const parsed = parseInt(locStr, 10);
                if (!isNaN(parsed)) {
                    parsedLocationId = parsed;
                }
            }
        }

        const newUser = await userRepository.create({
            name: name.trim(),
            phone_number: normalizedPhone,
            role_id: roleId,
            level_id: levelId,
            location_id: parsedLocationId,
            created_at: new Date(),
            admin_id: adminId,
            is_blocked: isBlocked
        });

        // Fetch user with location details
        const freshUser = await userRepository.checkStaffOwnership(newUser.id, adminId);
        return mapUserRow(freshUser[0]);
    }

    // 3. User Login (Generate OTP)
    async generateOtp(phone_number) {
        const digits = phone_number.replace(/\D/g, '');
        const tenDigits = digits.slice(-10);
        const normalizedPhone = '+91' + tenDigits;

        const userResult = await userRepository.findUserForLogin(normalizedPhone, phone_number.trim(), tenDigits);
        if (userResult.length === 0) {
            throw new ServiceError('User not found with this mobile number', 404);
        }

        const user = userResult[0];

        // Store OTP '1234' with 10 minutes expiry
        const otp = '1234';
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await userRepository.updateOtp(user.id, otp, otpExpiry);

        return user.phone_number;
    }

    // 4. Verify OTP
    async verifyOtp(phone_number, otp) {
        const digits = phone_number.replace(/\D/g, '');
        const tenDigits = digits.slice(-10);
        const normalizedPhone = '+91' + tenDigits;

        const userResult = await userRepository.findUserForOtpVerification(normalizedPhone, phone_number.trim(), tenDigits);
        if (userResult.length === 0) {
            throw new ServiceError('User not found', 404);
        }

        const user = userResult[0];

        // Check if OTP matches
        if (!user.otp || user.otp !== otp.trim()) {
            throw new ServiceError('Invalid OTP', 400);
        }

        // Check if OTP is expired
        if (user.otp_expiry && new Date() > new Date(user.otp_expiry)) {
            throw new ServiceError('OTP has expired', 400);
        }

        // Clear OTP and expiry
        await userRepository.clearOtp(user.id);

        let permissions = [];
        let level = null;
        if (user.role !== 'Admin') {
            if (user.role_id) {
                permissions = await userRepository.getRolePermissions(user.role_id);
            }
            if (user.level_id) {
                level = await userRepository.getLevelById(user.level_id);
            }
        }

        const verifiedUser = {
            id: user.id,
            name: user.name,
            phone_number: user.phone_number,
            role: user.role,
            access_level: user.access_level,
            location: user.location_id ? {
                id: user.location_id,
                name: user.loc_name,
                address: user.loc_address,
                city: user.loc_city,
                zip_code: user.loc_zip_code,
                is_active: user.loc_is_active
            } : (user.location ? { name: user.location } : null),
            ...(user.role !== 'Admin' && { permissions, level })
        };

        // Generate Access Token (JWT)
        const accessToken = jwt.sign(
            { id: user.id, phone_number: user.phone_number, role: user.role },
            env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return {
            user: verifiedUser,
            accessToken
        };
    }

    // 5. Super Admin Login
    async superAdminLogin(email, password) {
        const adminResult = await userRepository.findSuperAdminByEmail(email.trim());
        if (adminResult.length === 0) {
            throw new ServiceError('Invalid email or password', 401);
        }

        const admin = adminResult[0];

        // Compare password hash
        const isMatch = bcrypt.compareSync(password.trim(), admin.password);
        if (!isMatch) {
            throw new ServiceError('Invalid email or password', 401);
        }

        // Generate Access Token for Super Admin
        const accessToken = jwt.sign(
            { id: admin.id, email: admin.email, role: 'Super Admin' },
            env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return {
            user: {
                id: admin.id,
                email: admin.email,
                role: 'Super Admin'
            },
            accessToken
        };
    }

    // 6. List Users
    async getAllUsers() {
        const users = await userRepository.findAllUsers();
        return users.map(mapUserRow);
    }

    // 7. Staff Listing & Stats
    async getStaffAndStats(currentUser, levelQuery = 'all') {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        const counts = await userRepository.getStaffStats(adminId);
        const data = await userRepository.findStaff(adminId, levelQuery);

        return {
            counts,
            data: data.map(mapUserRow)
        };
    }

    // 8. Search Staff Members
    async searchStaff(currentUser, query) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        const results = await userRepository.searchStaff(adminId, query);
        return results.map(mapUserRow);
    }

    // 9. Staff Member by ID
    async getStaffById(staffId, currentUser) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        const result = await userRepository.checkStaffOwnership(staffId, adminId);
        if (result.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        return mapUserRow(result[0]);
    }

    // 10. Update Staff Details
    async updateStaff(staffId, currentUser, name, phone_number, role, access_level, location_id) {
        const adminId = currentUser.id;
        const currentUserRole = currentUser.role;

        if (currentUserRole !== 'Admin' && currentUserRole !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        // Check ownership first
        const checkResult = await userRepository.checkStaffOwnership(staffId, adminId);
        if (checkResult.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        const normalizedPhone = normalizePhoneNumber(phone_number);

        // Check if phone number is already registered by another user
        const phoneCheck = await userRepository.findExactPhoneExcludingId(normalizedPhone, staffId);
        if (phoneCheck.length > 0) {
            throw new ServiceError('Mobile number is already registered', 400);
        }

        const staffOwnerAdminId = checkResult[0].admin_id;
        let roleId = null;
        const roleStr = String(role).trim();
        if (/^\d+$/.test(roleStr)) {
            roleId = parseInt(roleStr, 10);
        } else {
            const dbRole = await roleRepository.findByName(staffOwnerAdminId, roleStr);
            if (dbRole) {
                roleId = dbRole.id;
            }
        }

        let levelId = null;
        if (access_level !== undefined && access_level !== null && access_level !== '') {
            const levelStr = String(access_level).trim();
            if (levelStr && levelStr !== 'null' && levelStr !== 'undefined') {
                if (/^\d+$/.test(levelStr)) {
                    levelId = parseInt(levelStr, 10);
                } else {
                    const dbLevel = await levelRepository.findByName(staffOwnerAdminId, levelStr);
                    if (dbLevel) {
                        levelId = dbLevel.id;
                    }
                }
            }
        }

        let parsedLocationId = null;
        if (location_id !== undefined && location_id !== null && location_id !== '') {
            const locStr = String(location_id).trim();
            if (locStr && locStr !== 'null' && locStr !== 'undefined') {
                const parsed = parseInt(locStr, 10);
                if (!isNaN(parsed)) {
                    parsedLocationId = parsed;
                }
            }
        }

        // Update record
        await userRepository.updateStaff(staffId, name, normalizedPhone, roleId, levelId, parsedLocationId);

        // Fetch updated user with location details
        const freshUser = await userRepository.checkStaffOwnership(staffId, adminId);
        return mapUserRow(freshUser[0]);
    }

    // 11. Toggle Block/Unblock Staff
    async toggleBlockStaff(staffId, currentUser) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        // Check ownership first
        const checkResult = await userRepository.checkStaffOwnership(staffId, adminId);
        if (checkResult.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        const currentBlockedState = checkResult[0].is_blocked;
        const newBlockedState = currentBlockedState ? 0 : 1;

        await userRepository.updateBlockedState(staffId, newBlockedState);

        return {
            is_blocked: newBlockedState,
            message: `Staff member has been successfully ${newBlockedState ? 'blocked' : 'unblocked'}`
        };
    }

    // 12. Delete Staff
    async deleteStaff(staffId, currentUser) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        // Check ownership first
        const checkResult = await userRepository.checkStaffOwnership(staffId, adminId);
        if (checkResult.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        await userRepository.deleteStaff(staffId);
    }

    // 13. Save FCM Token
    async saveFcmToken(userId, fcmToken, deviceType) {
        if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim() === '') {
            throw new ServiceError('FCM token is required', 400);
        }
        const fcmRepository = require('../repositories/fcmRepository');
        await fcmRepository.saveToken(userId, fcmToken, deviceType);
    }

    // 14. Delete FCM Token
    async deleteFcmToken(userId, fcmToken) {
        if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim() === '') {
            throw new ServiceError('FCM token is required', 400);
        }
        const fcmRepository = require('../repositories/fcmRepository');
        await fcmRepository.deleteToken(userId, fcmToken);
    }
}

module.exports = {
    UserService: new UserService(),
    ServiceError
};
