import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

type OpenApiSpec = {
  paths?: Record<string, Record<string, unknown>>;
};

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
      { url: 'https://historytalk.app/historytalkwdp/api/v1', description: 'Production (Docker)' },
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
}) as OpenApiSpec;

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

for (const pathItem of Object.values(spec.paths ?? {})) {
  if (!pathItem || typeof pathItem !== 'object') continue;

  for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
    if (!httpMethods.has(method) || !operation || typeof operation !== 'object') continue;

    const operationObject = operation as { responses?: Record<string, unknown> };
    operationObject.responses ??= {
      200: {
        description: 'Successful response',
      },
    };
  }
}

const outPath = path.resolve('./docs/openapi.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2));
console.log('✓  Generated docs/openapi.json');
