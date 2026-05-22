import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'HistoryTalk API',
      version: '1.0.0',
      description: 'Vietnamese history educational AI platform — backend REST API',
    },
    servers: [
      { url: 'http://localhost:5000/api/v1', description: 'Local development' },
      { url: 'https://api.historytalk.dev/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  // Every *.ts file under routes/ is auto-scanned — just add your JSDoc and run.
  apis: ['./src/routes/*.ts'],
});

const outPath = path.resolve('./docs/openapi.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
console.log('✓  Generated docs/openapi.json');
