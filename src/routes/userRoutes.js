const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const permissionController = require('../controllers/permissionController');
const roleController = require('../controllers/roleController');
const levelController = require('../controllers/levelController');
const locationController = require('../controllers/locationController');
const deviceController = require('../controllers/deviceController');
const homepageController = require('../controllers/homepageController');
const pageController = require('../controllers/pageController');
const faqController = require('../controllers/faqController');
const notificationController = require('../controllers/notificationController');
const comityController = require('../controllers/comityController');
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validateAddOrUpdateUser, validateVerifyOtp } = require('../validations/userValidation');
const { validateCreateDevice, validateUpdateDevice } = require('../validations/deviceValidation');
const { validateAddComityMembers } = require('../validations/comityValidation');

// Temp User APIs
router.post('/temp-users', userController.createTempUser);
router.get('/temp-users', userController.getTempUsers);

// Staff Enrollment API (requires auth)
router.post('/add-user', authenticateToken, validateAddOrUpdateUser, userController.addStaff);
router.post('/staff/send-otp', authenticateToken, userController.sendStaffOtp);

// OTP Auth APIs
router.post('/login', userController.login);
router.post('/resend-otp', userController.resendOtp);
router.post('/verify-otp', validateVerifyOtp, userController.verifyOtp);

// Super Admin APIs
router.post('/super-admin/login', userController.superAdminLogin);

// Dashboard / Listing APIs (requires auth)
router.get('/homepage', authenticateToken, homepageController.getHomepage);
router.get('/users', authenticateToken, userController.getUsers);
router.get('/staff', authenticateToken, userController.getStaff);

// Search API (defined before /staff/:id to avoid parameter conflicts, matching original route ordering)
router.get('/staff/search', authenticateToken, userController.searchStaff);

// Individual Staff APIs (requires auth)
router.get('/staff/:id', authenticateToken, userController.getStaffById);
router.put('/staff/:id', authenticateToken, validateAddOrUpdateUser, userController.updateStaff);
router.post('/staff/:id/toggle-block', authenticateToken, userController.toggleBlockStaff);
router.delete('/staff/:id', authenticateToken, userController.deleteStaff);

// Comity APIs (requires auth)
router.get('/comity/members', authenticateToken, comityController.getMembersAndStats);
router.post('/comity/members', authenticateToken, validateAddComityMembers, comityController.addMembers);
router.post('/comity/members/:userId/toggle', authenticateToken, comityController.toggleMemberStatus);
router.delete('/comity/members/:userId', authenticateToken, comityController.removeMember);
router.get('/comity/staff', authenticateToken, comityController.getStaffWithComityStatus);

// Permissions APIs (requires auth)
router.get('/permissions', authenticateToken, permissionController.getAll);
router.post('/permissions', authenticateToken, permissionController.create);
router.put('/permissions/:id', authenticateToken, permissionController.update);
router.post('/permissions/:id/toggle', authenticateToken, permissionController.toggle);
router.delete('/permissions/:id', authenticateToken, permissionController.delete);

// Roles APIs (requires auth)
router.post('/roles', authenticateToken, roleController.create);
router.get('/roles', authenticateToken, roleController.getAll);
router.get('/roles/search', authenticateToken, roleController.search);
router.get('/roles/:id', authenticateToken, roleController.getById);
router.put('/roles/:id', authenticateToken, roleController.update);
router.delete('/roles/:id', authenticateToken, roleController.delete);

// Levels APIs (requires auth)
router.post('/levels', authenticateToken, levelController.create);
router.get('/levels', authenticateToken, levelController.getAll);
router.get('/levels/search', authenticateToken, levelController.search);
router.get('/levels/:id', authenticateToken, levelController.getById);
router.put('/levels/:id', authenticateToken, levelController.update);
router.delete('/levels/:id', authenticateToken, levelController.delete);

// Locations APIs (requires auth)
router.post('/locations', authenticateToken, locationController.create);
router.get('/locations', authenticateToken, locationController.getAll);
router.get('/locations/search', authenticateToken, locationController.search);
router.get('/locations/:id', authenticateToken, locationController.getById);
router.put('/locations/:id', authenticateToken, locationController.update);
router.post('/locations/:id/toggle', authenticateToken, locationController.toggleStatus);
router.delete('/locations/:id', authenticateToken, locationController.delete);

// Devices & Alerts APIs (requires auth)
router.post('/devices', authenticateToken, validateCreateDevice, deviceController.create);
router.get('/alerts', authenticateToken, deviceController.getAlertsData);
router.get('/alerts/all', authenticateToken, deviceController.getAllAlertsForAdmin);
router.get('/devices/search', authenticateToken, deviceController.search);
router.post('/devices/:id/toggle', authenticateToken, deviceController.toggleStatus);
router.get('/devices/:id', authenticateToken, deviceController.getById);
router.put('/devices/:id', authenticateToken, validateUpdateDevice, deviceController.update);
router.delete('/devices/:id', authenticateToken, deviceController.delete);
router.post('/devices/:id/remove-alert', authenticateToken, deviceController.removeAlert);
router.post('/alerts/:feedId/remove', authenticateToken, deviceController.removeAlertByFeedId);
router.post('/devices/:id/acknowledge-alert', authenticateToken, deviceController.acknowledgeAlert);
router.post('/alerts/:feedId/acknowledge', authenticateToken, deviceController.acknowledgeAlertByFeedId);
router.get('/devices/:id/alerts', authenticateToken, deviceController.getAlertsForDevice);
router.get('/devices/:id/analysis', authenticateToken, deviceController.getAnalysis);

// Reports API (requires auth)
router.get('/reports', authenticateToken, reportController.handleOverviewOrPdf);
router.get('/reports/filter', authenticateToken, reportController.filterReport);

// FCM Token APIs (requires auth)
router.post('/fcm-token', authenticateToken, userController.saveFcmToken);
router.delete('/fcm-token', authenticateToken, userController.deleteFcmToken);
router.post('/test-push-notification', authenticateToken, userController.testPushNotification);

// Logout API (requires auth)
router.post('/logout', authenticateToken, userController.logout);

// Profile Details & Update APIs (requires auth)
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// Pages Management APIs (secured or public)
router.post('/pages', authenticateToken, pageController.create);
router.get('/pages', authenticateToken, pageController.getAll);
router.get('/pages/by-name/:name', pageController.getByName);
router.get('/pages/by-name', pageController.getByName);
router.get('/pages/:id', authenticateToken, pageController.getById);
router.put('/pages/:id', authenticateToken, pageController.update);
router.post('/pages/:id/toggle', authenticateToken, pageController.toggleStatus);
router.delete('/pages/:id', authenticateToken, pageController.delete);

// FAQs Management APIs
router.post('/faqs', authenticateToken, faqController.create);
router.get('/faqs/all', authenticateToken, faqController.getAll);
router.get('/faqs', faqController.getActive); // Public/Users
router.get('/faqs/:id', authenticateToken, faqController.getById);
router.put('/faqs/:id', authenticateToken, faqController.update);
router.post('/faqs/:id/toggle', authenticateToken, faqController.toggleStatus);
router.delete('/faqs/:id', authenticateToken, faqController.delete);

// Notifications Management & User APIs
router.post('/notifications', authenticateToken, notificationController.create);
router.get('/notifications/all-admin', authenticateToken, notificationController.getAllAdmin);
router.get('/notifications', authenticateToken, notificationController.getUserNotifications);
router.get('/notifications/:id', authenticateToken, notificationController.getById);
router.put('/notifications/:id', authenticateToken, notificationController.update);
router.post('/notifications/:id/toggle', authenticateToken, notificationController.toggleStatus);
router.delete('/notifications/:id', authenticateToken, notificationController.delete);
router.post('/notifications/read-all', authenticateToken, notificationController.markAllAsRead);
router.post('/notifications/:id/read', authenticateToken, notificationController.markAsRead);

module.exports = router;
