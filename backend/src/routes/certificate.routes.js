import express from 'express';
import { certificateController } from '../controllers/index.js';
import {
  protect,
  restrictTo,
  checkPermission,
  downloadLimiter,
  uploadLimiter,
} from '../middleware/index.js';
import {
  uploadCertificateTemplate,
  processCertificateTemplate,
  handleMulterError,
} from '../middleware/upload.js';
import { validateCertificateVerification } from '../middleware/validation.js';

const router = express.Router();

const adminOnly = [
  protect,
  restrictTo('admin'),
  checkPermission('generate_certificates'),
];

// Template management (admin)
router.post(
  '/templates',
  ...adminOnly,
  uploadLimiter,
  uploadCertificateTemplate,
  processCertificateTemplate,
  handleMulterError,
  certificateController.createTemplate.bind(certificateController)
);
router.get('/templates', ...adminOnly, certificateController.getTemplates.bind(certificateController));
router.get('/templates/:id', ...adminOnly, certificateController.getTemplate.bind(certificateController));
router.put('/templates/:id', ...adminOnly, certificateController.updateTemplate.bind(certificateController));
router.post(
  '/templates/:id/background',
  ...adminOnly,
  uploadLimiter,
  uploadCertificateTemplate,
  processCertificateTemplate,
  handleMulterError,
  certificateController.uploadTemplateBackground.bind(certificateController)
);
router.delete(
  '/templates/:id/background',
  ...adminOnly,
  certificateController.removeTemplateBackground.bind(certificateController)
);
router.delete('/templates/:id', ...adminOnly, certificateController.deleteTemplate.bind(certificateController));

// Generation (admin)
router.post('/generate', ...adminOnly, certificateController.generateCertificate.bind(certificateController));
router.post('/bulk-generate', ...adminOnly, certificateController.bulkGenerateCertificates.bind(certificateController));

// Certificate listing (admin)
router.get('/', ...adminOnly, certificateController.getAllCertificates.bind(certificateController));

// Static paths must come before /:id
router.get('/statistics', ...adminOnly, certificateController.getCertificateStatistics.bind(certificateController));

// Public verification: only the opaque verification hash is accepted.
router.get(
  '/verify/:hash',
  validateCertificateVerification,
  certificateController.verifyCertificate.bind(certificateController)
);

// A participant may list only their own certificates; the controller enforces
// ownership. Admins may list any participant's certificates.
router.get('/user/:userId', protect, certificateController.getUserCertificates.bind(certificateController));

// Single certificate. Ownership is checked in the controller.
router.get(
  '/:id/download',
  protect,
  downloadLimiter,
  certificateController.downloadCertificate.bind(certificateController)
);
router.get('/:id', protect, certificateController.getCertificate.bind(certificateController));
router.post('/:id/revoke', ...adminOnly, certificateController.revokeCertificate.bind(certificateController));
router.post('/:id/regenerate', ...adminOnly, certificateController.regenerateCertificate.bind(certificateController));

export default router;
