const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const { normalizePhoneNumber, extractTenDigits } = require('../utils/helper');

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
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
    async addStaff(name, phone_number, role, access_level, location, currentUser) {
        const normalizedPhone = normalizePhoneNumber(phone_number);

        // Check if user already exists
        const existingUsers = await userRepository.findExactPhone(normalizedPhone);
        if (existingUsers.length > 0) {
            throw new ServiceError('Mobile number is already registered', 400);
        }

        const adminId = currentUser.role === 'Super Admin' ? null : currentUser.id;
        const isBlocked = 0; // default not blocked

        const newUser = await userRepository.create({
            name: name.trim(),
            phone_number: normalizedPhone,
            role: role.trim(),
            access_level: access_level.trim(),
            location: location.trim(),
            created_at: new Date(),
            admin_id: adminId,
            is_blocked: isBlocked
        });

        return newUser;
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

        const verifiedUser = {
            id: user.id,
            name: user.name,
            phone_number: user.phone_number,
            role: user.role,
            access_level: user.access_level,
            location: user.location
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
        return await userRepository.findAllUsers();
    }

    // 7. Staff Listing & Stats
    async getStaffAndStats(currentUser, levelQuery = 'all') {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        const counts = await userRepository.getStaffStats(adminId, role);
        const data = await userRepository.findStaff(adminId, role, levelQuery);

        return {
            counts,
            data
        };
    }

    // 8. Search Staff Members
    async searchStaff(currentUser, query) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        return await userRepository.searchStaff(adminId, role, query);
    }

    // 9. Staff Member by ID
    async getStaffById(staffId, currentUser) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        const result = await userRepository.checkStaffOwnership(staffId, adminId, role);
        if (result.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        return result[0];
    }

    // 10. Update Staff Details
    async updateStaff(staffId, currentUser, name, phone_number, role, access_level, location) {
        const adminId = currentUser.id;
        const currentUserRole = currentUser.role;

        if (currentUserRole !== 'Admin' && currentUserRole !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        // Check ownership first
        const checkResult = await userRepository.checkStaffOwnership(staffId, adminId, currentUserRole);
        if (checkResult.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        const normalizedPhone = normalizePhoneNumber(phone_number);

        // Check if phone number is already registered by another user
        const phoneCheck = await userRepository.findExactPhoneExcludingId(normalizedPhone, staffId);
        if (phoneCheck.length > 0) {
            throw new ServiceError('Mobile number is already registered', 400);
        }

        // Update record
        const updatedStaff = await userRepository.updateStaff(staffId, name, normalizedPhone, role, access_level, location);
        return updatedStaff;
    }

    // 11. Toggle Block/Unblock Staff
    async toggleBlockStaff(staffId, currentUser) {
        const adminId = currentUser.id;
        const role = currentUser.role;

        if (role !== 'Admin' && role !== 'Super Admin') {
            throw new ServiceError('Forbidden: Access denied', 403);
        }

        // Check ownership first
        const checkResult = await userRepository.checkStaffOwnership(staffId, adminId, role);
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
        const checkResult = await userRepository.checkStaffOwnership(staffId, adminId, role);
        if (checkResult.length === 0) {
            throw new ServiceError('Staff member not found or access denied', 404);
        }

        await userRepository.deleteStaff(staffId);
    }
}

module.exports = {
    UserService: new UserService(),
    ServiceError
};
