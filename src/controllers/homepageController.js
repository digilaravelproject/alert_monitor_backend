const homepageRepository = require('../repositories/homepageRepository');

class HomepageController {
    async getHomepage(req, res) {
        try {
            if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Admin access required'
                });
            }

            const isSuperAdmin = req.user.role === 'Super Admin';
            const adminId = isSuperAdmin ? null : req.user.id;

            const data = await homepageRepository.getHomepageData(adminId, isSuperAdmin);

            res.status(200).json({
                status: true,
                counts: data.counts,
                recent_alerts: data.recent_alerts
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new HomepageController();
