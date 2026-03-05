import coursesRouter from "./routes/cousesRoute";
import teachersRouter from "./routes/teachersRoute";
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const express = require('express')
const app = express()
const port = 3000

app.use(express.json())

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pointy Backend API',
      version: '1.0.0',
      description: 'API documentation for Pointy Backend',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: process.env["PROD_URL"] || '',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: process.env["NODE_ENV"] === 'production' 
      ? ['./dist/routes/*.js', './routes/*.js', './**/*.js'] 
      : ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/courses', coursesRouter)
app.use('/teachers', teachersRouter)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
  console.log(`Swagger docs available at ${process.env["PROD_URL"] || 'http://localhost:3000'}/api/docs`)
})