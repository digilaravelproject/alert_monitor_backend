const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validateAddOrUpdateUser, validateVerifyOtp } = require('../validations/userValidation');

// Temp User APIs
router.post('/temp-users', userController.createTempUser);
router.get('/temp-users', userController.getTempUsers);

// Staff Enrollment API (requires auth)
router.post('/add-user', authenticateToken, validateAddOrUpdateUser, userController.addStaff);

// OTP Auth APIs
router.post('/login', userController.login);
router.post('/resend-otp', userController.resendOtp);
router.post('/verify-otp', validateVerifyOtp, userController.verifyOtp);

// Super Admin APIs
router.post('/super-admin/login', userController.superAdminLogin);

// Dashboard / Listing APIs (requires auth)
router.get('/users', authenticateToken, userController.getUsers);
router.get('/staff', authenticateToken, userController.getStaff);

// Search API (defined before /staff/:id to avoid parameter conflicts, matching original route ordering)
router.get('/staff/search', authenticateToken, userController.searchStaff);

// Individual Staff APIs (requires auth)
router.get('/staff/:id', authenticateToken, userController.getStaffById);
router.put('/staff/:id', authenticateToken, validateAddOrUpdateUser, userController.updateStaff);
router.post('/staff/:id/toggle-block', authenticateToken, userController.toggleBlockStaff);
router.delete('/staff/:id', authenticateToken, userController.deleteStaff);

module.exports = router;
