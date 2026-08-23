import { Router } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import { serve, setup } from 'swagger-ui-express'

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Orbit API',
      version: '0.1.0',
      description: 'REST API for the Orbit project management platform.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Missing or invalid access token',
        },
        ForbiddenError: {
          description: 'The authenticated user lacks permission',
        },
        ValidationError: {
          description: 'Request payload failed validation',
        },
      },
    },
  },
  apis: ['src/modules/**/*.routes.ts'],
}

export function createDocsRouter(): Router {
  const router = Router()
  const spec = swaggerJsdoc(swaggerOptions)

  router.get('/docs.json', (_req, res) => {
    res.json(spec)
  })

  router.use(
    '/docs',
    serve,
    setup(spec, {
      customSiteTitle: 'Orbit API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    }),
  )

  return router
}
