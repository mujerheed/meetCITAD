import express from 'express';
import { certificateController } from '../controllers/index.js';
import { protect, restrictTo } from '../middleware/index.js';
import { uploadCertificateTemplate, processCertificateTemplate, handleMulterError } from '../middleware/upload.js';
import { validateCertificateVerification } from '../middleware/validation.js';

const router = express.Router();

// Template management (admin)
router.post('/templates', protect, restrictTo('admin'), uploadCertificateTemplate, processCertificateTemplate, handleMulterError, certificateController.createTemplate.bind(certificateController));
router.get('/templates', protect, restrictTo('admin'), certificateController.getTemplates.bind(certificateController));
router.get('/templates/:id', protect, restrictTo('admin'), certificateController.getTemplate.bind(certificateController));
router.put('/templates/:id', protect, restrictTo('admin'), certificateController.updateTemplate.bind(certificateController));
router.delete('/templates/:id', protect, restrictTo('admin'), certificateController.deleteTemplate.bind(certificateController));

// Certificate generation & retrieval
router.post('/generate', protect, restrictTo('admin'), certificateController.generateCertificate.bind(certificateController));
router.post('/bulk-generate', protect, restrictTo('admin'), certificateController.bulkGenerateCertificates.bind(certificateController));
router.get('/:id', protect, certificateController.getCertificate.bind(certificateController));
router.get('/user/:userId', protect, certificateController.getUserCertificates.bind(certificateController));
router.get('/:id/download', protect, certificateController.downloadCertificate.bind(certificateController));
router.get('/verify/:hash', validateCertificateVerification, certificateController.verifyCertificate.bind(certificateController));
router.post('/:id/revoke', protect, restrictTo('admin'), certificateController.revokeCertificate.bind(certificateController));
router.get('/statistics', protect, restrictTo('admin'), certificateController.getCertificateStatistics.bind(certificateController));
router.post('/:id/regenerate', protect, restrictTo('admin'), certificateController.regenerateCertificate.bind(certificateController));

export default router;
