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
      schemas: {
        QuizQuestion: {
          type: 'object',
          properties: {
            questionId: { type: 'string' },
            content: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correctAnswer: { type: 'integer', example: 0 },
            selectedAnswer: { type: 'integer', nullable: true, example: 1 },
            orderIndex: { type: 'integer', example: 0 },
            explanation: { type: 'string' },
            correct: { type: 'boolean' },
          },
        },
        QuizSummary: {
          type: 'object',
          properties: {
            quizId: { type: 'string' },
            title: { type: 'string' },
            level: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
            description: { type: 'string' },
            grade: { type: 'integer', example: 12 },
            chapterNumber: { type: 'integer', example: 1 },
            chapterTitle: { type: 'string' },
            era: { type: 'string', enum: ['ANCIENT', 'MEDIEVAL', 'MODERN', 'CONTEMPORARY'] },
            durationSeconds: { type: 'integer', example: 900 },
            playCount: { type: 'integer' },
            rating: { type: 'number' },
            contextTitle: { type: 'string' },
          },
        },
        StaffQuizSet: {
          allOf: [
            { $ref: '#/components/schemas/QuizSummary' },
            {
              type: 'object',
              properties: {
                isPublished: { type: 'boolean' },
                status: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'DELETED'] },
                contextId: { type: 'string' },
                createdBy: { type: 'string' },
                createdDate: { type: 'string', format: 'date-time' },
                updatedDate: { type: 'string', format: 'date-time' },
                deletedAt: { type: 'string', format: 'date-time', nullable: true },
                questions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/QuizQuestion' },
                },
              },
            },
          ],
        },
        QuizResultSummary: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            quizId: { type: 'string' },
            quizTitle: { type: 'string' },
            score: { type: 'number', example: 8 },
            totalQuestions: { type: 'integer', example: 10 },
            percentage: { type: 'integer', example: 80 },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreatedByInfo: {
          type: 'object',
          nullable: true,
          properties: {
            uid: { type: 'string' },
            userName: { type: 'string' },
          },
        },
        ContextInfo: {
          type: 'object',
          properties: {
            contextId: { type: 'string' },
            name: { type: 'string' },
          },
        },
        CharacterEvent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            era: { type: 'string', enum: ['ANCIENT', 'MEDIEVAL', 'MODERN', 'CONTEMPORARY'] },
            year: { type: 'integer' },
          },
        },
        CharacterSummary: {
          type: 'object',
          properties: {
            characterId: { type: 'string' },
            name: { type: 'string' },
            title: { type: 'string' },
            background: { type: 'string' },
            image: { type: 'string' },
            modelUrl: { type: 'string' },
            personality: { type: 'string' },
            bornYear: { type: 'integer' },
            bornMonth: { type: 'integer' },
            bornDay: { type: 'integer' },
            isBornBc: { type: 'boolean' },
            deathYear: { type: 'integer' },
            deathMonth: { type: 'integer' },
            deathDay: { type: 'integer' },
            isDeathBc: { type: 'boolean' },
            isPublished: { type: 'boolean' },
            status: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'INACTIVE'] },
            era: { type: 'string', enum: ['ANCIENT', 'MEDIEVAL', 'MODERN', 'CONTEMPORARY'], nullable: true },
            events: {
              type: 'array',
              items: { $ref: '#/components/schemas/CharacterEvent' },
            },
            context: {
              allOf: [{ $ref: '#/components/schemas/ContextInfo' }],
              nullable: true,
            },
            contexts: {
              type: 'array',
              items: { $ref: '#/components/schemas/ContextInfo' },
            },
            createdBy: { $ref: '#/components/schemas/CreatedByInfo' },
            createdDate: { type: 'string', format: 'date-time' },
            updatedDate: { type: 'string', format: 'date-time' },
          },
        },
        HistoricalContextSummary: {
          type: 'object',
          properties: {
            contextId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            era: { type: 'string', enum: ['ANCIENT', 'MEDIEVAL', 'MODERN', 'CONTEMPORARY'] },
            category: {
              type: 'string',
              enum: ['WAR', 'POLITICS', 'CULTURE', 'SCIENCE', 'RELIGION', 'OTHER'],
              nullable: true,
            },
            year: { type: 'integer' },
            startYear: { type: 'integer' },
            endYear: { type: 'integer' },
            period: { type: 'string', nullable: true },
            yearLabel: { type: 'string', nullable: true },
            isBC: { type: 'boolean' },
            location: { type: 'string' },
            imageUrl: { type: 'string' },
            videoUrl: { type: 'string' },
            isPublished: { type: 'boolean' },
            status: { type: 'string', enum: ['ACTIVE', 'DRAFT', 'INACTIVE'] },
            createdBy: { $ref: '#/components/schemas/CreatedByInfo' },
            createdDate: { type: 'string', format: 'date-time' },
            updatedDate: { type: 'string', format: 'date-time' },
          },
        },
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
