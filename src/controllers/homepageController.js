const homepageRepository = require('../repositories/homepageRepository');
const comityRepository = require('../repositories/comityRepository');

class HomepageController {
    async getHomepage(req, res) {
        try {
            // if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
            //     return res.status(403).json({
            //         status: false,
            //         error: 'Forbidden: Admin access required'
            //     });
            // }

            const isSuperAdmin = req.user.role === 'Super Admin';
            const isAdmin = req.user.role === 'Admin';

            if (!isSuperAdmin && !isAdmin) {
                const isActive = await comityRepository.isUserActiveComityMember(req.user.id);
                if (!isActive) {
                    return res.status(200).json({
                        status: true,
                        counts: {
                            active_alerts: 0,
                            assigned: 0
                        },
                        recent_alerts: []
                    });
                }
            }

            let data;
            if (isSuperAdmin || isAdmin) {
                const adminId = isSuperAdmin ? null : req.user.id;
                data = await homepageRepository.getHomepageData(adminId, isSuperAdmin);
            } else {
                data = await homepageRepository.getNonAdminHomepageData(req.user.id);
            }

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
