import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const adminApiDoc = YAML.load(path.join(__dirname, '../../../swagger/admin-api.yaml'));

const adminDocsRouter = express.Router();
adminDocsRouter.use('/', swaggerUi.serve, swaggerUi.setup(adminApiDoc, {
  customSiteTitle: 'Qmart Admin API Documentation',
}));

export default adminDocsRouter;
