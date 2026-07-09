const pageRepository = require('../repositories/pageRepository');

class PageController {
    async create(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { title, slug, description, is_active } = req.body;
            if (!title || typeof title !== 'string' || title.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Page title is required'
                });
            }
            if (!slug || typeof slug !== 'string' || slug.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Page name (slug) is required'
                });
            }

            const existing = await pageRepository.getBySlug(slug);
            if (existing) {
                return res.status(400).json({
                    status: false,
                    error: 'Page with this name (slug) already exists'
                });
            }

            const newPage = await pageRepository.create({
                title,
                slug,
                description,
                is_active
            });

            res.status(201).json({
                status: true,
                data: newPage
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getAll(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const pages = await pageRepository.getAll();
            res.status(200).json({
                status: true,
                data: pages
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getById(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const page = await pageRepository.getById(parseInt(id, 10));
            if (!page) {
                return res.status(404).json({
                    status: false,
                    error: 'Page not found'
                });
            }

            res.status(200).json({
                status: true,
                data: page
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getByName(req, res) {
        try {
            // Note: Can be accessed publicly or authenticated
            // Query parameters or path parameter name
            const pageName = req.params.name || req.query.name;
            if (!pageName || typeof pageName !== 'string' || pageName.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Page name parameter is required'
                });
            }

            const page = await pageRepository.getBySlug(pageName);
            if (!page) {
                return res.status(404).json({
                    status: false,
                    error: 'Page not found'
                });
            }

            res.status(200).json({
                status: true,
                data: page
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async update(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const { title, slug, description, is_active } = req.body;

            if (!title || typeof title !== 'string' || title.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Page title is required'
                });
            }
            if (!slug || typeof slug !== 'string' || slug.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Page name (slug) is required'
                });
            }

            const page = await pageRepository.getById(parseInt(id, 10));
            if (!page) {
                return res.status(404).json({
                    status: false,
                    error: 'Page not found'
                });
            }

            const existing = await pageRepository.getBySlug(slug);
            if (existing && existing.id !== parseInt(id, 10)) {
                return res.status(400).json({
                    status: false,
                    error: 'Page with this name (slug) already exists'
                });
            }

            const updated = await pageRepository.update(parseInt(id, 10), {
                title,
                slug,
                description,
                is_active
            });

            res.status(200).json({
                status: true,
                message: 'Page updated successfully',
                data: updated
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async toggleStatus(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const page = await pageRepository.getById(parseInt(id, 10));
            if (!page) {
                return res.status(404).json({
                    status: false,
                    error: 'Page not found'
                });
            }

            const newStatus = page.is_active ? 0 : 1;
            const updated = await pageRepository.toggleStatus(parseInt(id, 10), newStatus);

            res.status(200).json({
                status: true,
                is_active: updated.is_active,
                message: `Page status updated to ${updated.is_active ? 'Active' : 'Inactive'}`
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async delete(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { id } = req.params;
            const page = await pageRepository.getById(parseInt(id, 10));
            if (!page) {
                return res.status(404).json({
                    status: false,
                    error: 'Page not found'
                });
            }

            await pageRepository.delete(parseInt(id, 10));

            res.status(200).json({
                status: true,
                message: 'Page deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new PageController();
