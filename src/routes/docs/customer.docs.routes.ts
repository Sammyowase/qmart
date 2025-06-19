import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Correct path to swagger file (from src/routes/docs/ to project root swagger/)
const customerApiDoc = YAML.load(path.join(__dirname, '../../../swagger/customer-api.yaml'));

const customerDocsRouter = express.Router();
customerDocsRouter.use('/', swaggerUi.serve, swaggerUi.setup(customerApiDoc, {
  customSiteTitle: 'Qmart Customer API Documentation',
}));

export default customerDocsRouter;
