const faqRepository = require('../repositories/faqRepository');

class FaqController {
    async create(req, res) {
        try {
            if (req.user.role !== 'Super Admin') {
                return res.status(403).json({
                    status: false,
                    error: 'Forbidden: Super Admin privileges required'
                });
            }

            const { question, answer, is_active } = req.body;
            if (!question || typeof question !== 'string' || question.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Question is required'
                });
            }
            if (!answer || typeof answer !== 'string' || answer.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Answer is required'
                });
            }

            const newFaq = await faqRepository.create({
                question,
                answer,
                is_active
            });

            res.status(201).json({
                status: true,
                data: newFaq
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

            const faqs = await faqRepository.getAll();
            res.status(200).json({
                status: true,
                data: faqs
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }

    async getActive(req, res) {
        try {
            // Accessible by all users/guards/admins (public)
            const faqs = await faqRepository.getActive();
            res.status(200).json({
                status: true,
                data: faqs
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
            const faq = await faqRepository.getById(parseInt(id, 10));
            if (!faq) {
                return res.status(404).json({
                    status: false,
                    error: 'FAQ not found'
                });
            }

            res.status(200).json({
                status: true,
                data: faq
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
            const { question, answer, is_active } = req.body;

            if (!question || typeof question !== 'string' || question.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Question is required'
                });
            }
            if (!answer || typeof answer !== 'string' || answer.trim() === '') {
                return res.status(400).json({
                    status: false,
                    error: 'Answer is required'
                });
            }

            const faq = await faqRepository.getById(parseInt(id, 10));
            if (!faq) {
                return res.status(404).json({
                    status: false,
                    error: 'FAQ not found'
                });
            }

            const updated = await faqRepository.update(parseInt(id, 10), {
                question,
                answer,
                is_active
            });

            res.status(200).json({
                status: true,
                message: 'FAQ updated successfully',
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
            const faq = await faqRepository.getById(parseInt(id, 10));
            if (!faq) {
                return res.status(404).json({
                    status: false,
                    error: 'FAQ not found'
                });
            }

            const newStatus = faq.is_active ? 0 : 1;
            const updated = await faqRepository.toggleStatus(parseInt(id, 10), newStatus);

            res.status(200).json({
                status: true,
                is_active: updated.is_active,
                message: `FAQ status updated to ${updated.is_active ? 'Active' : 'Inactive'}`
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
            const faq = await faqRepository.getById(parseInt(id, 10));
            if (!faq) {
                return res.status(404).json({
                    status: false,
                    error: 'FAQ not found'
                });
            }

            await faqRepository.delete(parseInt(id, 10));

            res.status(200).json({
                status: true,
                message: 'FAQ deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
}

module.exports = new FaqController();
