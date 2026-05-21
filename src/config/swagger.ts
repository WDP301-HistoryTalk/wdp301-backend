import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HistoryTalk API',
      version: '1.0.0',
      description: 'REST API documentation for the HistoryTalk backend',
    },
    servers: [{ url: '/api', description: 'API server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Reads JSDoc @swagger annotations from route files
  apis: [path.resolve(__dirname, '../routes/*.ts'), path.resolve(__dirname, '../routes/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);
