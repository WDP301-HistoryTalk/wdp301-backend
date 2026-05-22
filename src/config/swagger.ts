import path from 'path';
import fs from 'fs';

const specPath = path.resolve(__dirname, '../../docs/openapi.json');
export const swaggerSpec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
