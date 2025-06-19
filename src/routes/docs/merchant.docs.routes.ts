import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const merchantApiDoc = YAML.load(path.join(__dirname, '../../../swagger/merchant-api.yaml'));

const merchantDocsRouter = express.Router();
merchantDocsRouter.use('/', swaggerUi.serve, swaggerUi.setup(merchantApiDoc, {
  customSiteTitle: 'Qmart Merchant API Documentation',
}));

export default merchantDocsRouter;
