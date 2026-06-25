import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config as dotenvConfig } from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Import database initialization
import initializeDatabase from './scripts/init-db';

// Import background jobs
import { backgroundJobsService } from './services/background-jobs.service';

// Import lib utilities
import { prisma, config, createLogger } from './lib';

const logger = createLogger('Server');

// Import routes
import authRoutes from './routes/auth.routes';
import transferRoutes from './routes/transfer.routes';
import publicRoutes from './routes/public.routes';
import notificationsRoutes from './routes/notifications.routes';
import userRoutes from './routes/user.routes';
import systemRoutes from './routes/system.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { rateLimiter } from './middleware/rate-limit.middleware';

// Load environment variables
dotenvConfig();

class SkylineServer {
  public app: Application;
  private port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5004;

    this.initializeDatabase();
    this.initializeMiddleware();
    this.initializeSwagger();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Validate configuration
      config.validate();

      // Skip blocking migration during startup - run in background after server starts
      await initializeDatabase();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      logger.warn('Server will continue without database initialization');
      logger.warn('Use /migrate endpoint to run migration after startup');
    }
  }

  private async runAutoMigration(): Promise<void> {
    try {
      console.log('🔄 Running automatic database migration...');

      const { spawn } = require('child_process');

      // Step 1: Deploy migrations
      console.log('📊 Creating tables and enums...');
      await this.runCommand('npx', ['prisma', 'migrate', 'deploy']);
      console.log('✅ Database migration completed (18 tables, 16 enums created)');

      // Step 2: Seed initial data
      console.log('🌱 Seeding initial data...');
      await this.runCommand('npm', ['run', 'db:seed']);
      console.log('✅ Database seeding completed');

    } catch (error) {
      console.error('❌ Auto-migration failed:', error);
      throw error;
    }
  }

  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess = require('child_process').spawn(command, args, {
        env: { ...process.env },
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        if (text) {
          console.log(`  ${text}`);
          output += text;
        }
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        if (text) {
          console.error(`  ${text}`);
          errorOutput += text;
        }
      });

      childProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command '${command} ${args.join(' ')}' failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  private initializeMiddleware(): void {
    // Trust proxy for rate limiting (needed when behind Nginx/Docker)
    this.app.set('trust proxy', 1);

    // Security middleware (disabled CSP for Swagger)
    this.app.use(helmet({
      contentSecurityPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.CLIENT_URL
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200
    }));

    // Handle preflight requests
    this.app.options('*', cors());

    // Body parsing with memory limits
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Apply rate limiting to all routes
    this.app.use(rateLimiter);
  }

  private initializeSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'SKYLINE Transfers API',
          version: '1.0.0',
          description: `
# SKYLINE Transfers API Documentation

**Secure Russia to Rwanda money transfer service**



          `,
          contact: {
            name: 'SKYLINE Transfers Support',
            email: 'akimanaviateur94@gmail.com'
          }
        },
        servers: [
          {
            url: process.env.NODE_ENV === 'production'
              ? 'https://skyline-backend-production.up.railway.app'
              : `http://localhost:${this.port}`,
            description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Enter JWT token obtained from login endpoint'
            },
          },
          schemas: {
            ErrorResponse: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false
                },
                error: {
                  type: 'string',
                  example: 'Error message describing what went wrong'
                }
              }
            }
          }
        },
        tags: [
          {
            name: 'Authentication',
            description: 'User registration, login, and profile management'
          },
          {
            name: 'Public',
            description: 'Public endpoints - no authentication required'
          },
          {
            name: 'Transfers - Public',
            description: 'Transfer-related public endpoints (exchange rates, bank details)'
          },
          {
            name: 'Transfers - User',
            description: 'User transfer management - authentication required'
          },
          {
            name: 'Transfers - Admin',
            description: 'Admin transfer management - admin privileges required'
          },
          {
            name: 'Webhooks',
            description: 'Sberbank payment webhooks'
          },
          {
            name: 'System',
            description: 'System health and monitoring endpoints'
          }
        ]
      },
      apis: [
        './src/routes/*.ts', // Path to route files with Swagger annotations
      ],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Serve Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .info .title { color: #2c3e50 }
        .swagger-ui .scheme-container { 
          background: #f8f9fa; 
          border: 1px solid #dee2e6; 
          border-radius: 5px; 
          padding: 10px; 
          margin: 15px 0;
        }
      `,
      customSiteTitle: 'SKYLINE Transfers API',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true
      }
    }));

    // Swagger JSON endpoint
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    console.log(`📚 API Documentation available at http://localhost:${this.port}/api-docs`);
  }


  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        // Try to connect to database using singleton
        await prisma.$queryRaw`SELECT 1`;

        res.json({
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString(),
          service: 'SKYLINE Transfers API',
          description: 'Secure Russia to Rwanda money transfers - transparent, private, easy, and affordable',
          commission: '0 RUB per transfer',
          processingModel: 'Fast payment via Rwanda inventory system'
        });
      } catch (error) {
        res.status(503).json({
          status: 'degraded',
          database: 'disconnected',
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
          service: 'SKYLINE Transfers API'
        });
      }
    });

    // Migration endpoint for post-deployment
    this.app.get('/migrate', async (req, res) => {
      try {
        const { spawn } = require('child_process');

        console.log('🔄 Running database migration...');

        const migration = spawn('npx', ['prisma', 'migrate', 'deploy'], {
          env: { ...process.env },
          stdio: 'pipe'
        });

        let output = '';
        let errorOutput = '';

        migration.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        migration.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });

        migration.on('close', (code: number) => {
          if (code === 0) {
            console.log('✅ Migration completed successfully');
            res.json({
              success: true,
              message: 'Database migration completed successfully',
              output: output,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('❌ Migration failed:', errorOutput);
            res.status(500).json({
              success: false,
              message: 'Database migration failed',
              error: errorOutput,
              output: output,
              timestamp: new Date().toISOString()
            });
          }
        });

      } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({
          success: false,
          message: 'Migration process failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // API routes
    this.app.use('/api/public', publicRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/transfers', transferRoutes);
    this.app.use('/api/notifications', notificationsRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/system', systemRoutes);
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 SKYLINE Server running on port ${this.port}`);
      console.log(`📚 API Docs: http://localhost:${this.port}/api-docs`);

      // Start background jobs
      backgroundJobsService.start();

      // Run migration in background AFTER server is listening (prevents startup blocking)
      if (process.env.NODE_ENV === 'production' && process.env.AUTO_MIGRATE === 'true') {
        this.runBackgroundMigration();
      }
    });
  }

  private runBackgroundMigration(): void {
    // Run migration in background after server starts
    setTimeout(async () => {
      try {
        console.log('🔄 Running background database migration...');
        await this.runAutoMigration();
        console.log('✅ Background migration completed successfully');
      } catch (error) {
        console.error('❌ Background migration failed:', error);
        console.log('💡 Use /migrate endpoint to retry migration manually');
      }
    }, 10000); // Wait 10 seconds after server starts to ensure it's ready
  }
}

const server = new SkylineServer();
server.listen();

// Graceful shutdown
import { ServiceContainer } from './services/service-container';

const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    await ServiceContainer.cleanup();

    // Disconnect prisma
    await prisma.$disconnect();

    console.log('👋 Server shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;