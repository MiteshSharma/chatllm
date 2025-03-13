# TypeScript API Development Guidelines

## Core Principles

Our API design philosophy is built on these core principles:

1. **Consistency**: APIs should follow consistent patterns across all services
2. **Simplicity**: Keep designs simple and intuitive
3. **Pragmatism**: Balance theoretical purity with practical needs
4. **Security**: Security must be a foundational consideration
5. **Evolvability**: APIs should be able to evolve without breaking clients
6. **Type Safety**: Leverage TypeScript's type system throughout the API stack

## RESTful API Design

### Resource Modeling

- Model APIs around **resources** (nouns) rather than actions (verbs)
- Use **plural nouns** for collection resources (`/users`, `/orders`)
- Use **nested resources** to represent containment relationships (`/users/{userId}/orders`)
- Limit nesting to a maximum of 2-3 levels to avoid complexity

### HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resources | Yes | Yes |
| POST | Create resources or trigger operations | No | No |
| PUT | Replace resources entirely | Yes | No |
| PATCH | Partially update resources | No | No |
| DELETE | Remove resources | Yes | No |

### Status Codes

- **2xx**: Success
  - 200 OK: Standard success response
  - 201 Created: Resource created successfully
  - 204 No Content: Success with no response body

- **4xx**: Client errors
  - 400 Bad Request: Malformed request or invalid data
  - 401 Unauthorized: Authentication required
  - 403 Forbidden: Authenticated but lacks permission
  - 404 Not Found: Resource doesn't exist
  - 422 Unprocessable Entity: Semantic errors

- **5xx**: Server errors
  - 500 Internal Server Error: Unexpected server condition
  - 503 Service Unavailable: Temporary outage

### URL Design

```
https://api.example.com/v1/resources/{resourceId}/sub-resources?filter=value
```

- Use kebab-case for multi-word resource names (`purchase-orders`)
- Use query parameters for filtering, pagination, and sorting
- Keep URLs verb-free (use HTTP methods instead)

## TypeScript Implementation Guidelines

### API Controller Structure

```typescript
// Service layer interface
interface UserService {
  getUser(ctx: RequestContext, id: string): Promise<User>;
  createUser(ctx: RequestContext, user: CreateUserRequest): Promise<User>;
  // Other methods...
}

// HTTP Controller
export class UserController {
  constructor(private userService: UserService) {}

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = req.context;
      const id = req.params.id;
      
      const user = await this.userService.getUser(ctx, id);
      
      res.status(200).json({
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = req.context;
      const userData = req.body;
      
      const user = await this.userService.createUser(ctx, userData);
      
      res.status(201).json({
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Request Context

- Use request context to pass request-scoped values
- Include correlation IDs, auth info, and deadline information
- Propagate context throughout the request lifecycle

```typescript
// Define request context interface
export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  startTime: Date;
  logger: Logger;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

// Add context middleware
export function contextMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Set response header for correlation
    res.setHeader('X-Request-ID', requestId);
    
    // Create request context
    req.context = {
      requestId,
      startTime: new Date(),
      logger: logger.child({ requestId })
    };
    
    next();
  };
}
```

### Error Handling

- Create domain-specific error types
- Map domain errors to appropriate HTTP status codes
- Include error codes for machine-readable responses
- Provide helpful error messages for developers

```typescript
// Base error class
export class ApplicationError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class NotFoundError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

// Error handling middleware
export function errorHandlerMiddleware(logger: Logger) {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    // Log the error
    if (err instanceof ApplicationError) {
      logger.warn(`Application error: ${err.message}`, {
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        requestId: req.context?.requestId
      });
      
      // Send structured error response
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details
        }
      });
    } else {
      // Unexpected error
      logger.error(`Unexpected error: ${err.message}`, {
        stack: err.stack,
        requestId: req.context?.requestId
      });
      
      // Don't leak error details in production
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: isProduction ? 'Internal server error' : err.message,
          ...(isProduction ? {} : { stack: err.stack })
        }
      });
    }
  };
}
```

### Response Formatting

- Use a consistent response envelope for all responses
- Include pagination metadata for collection responses
- Use strong typing for response objects

```typescript
// Response interfaces
interface ApiResponse<T> {
  data: T;
}

interface PaginatedApiResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page_size: number;
    current_page: number;
    total_pages: number;
  };
}

// Example response helper
function sendResponse<T>(res: Response, statusCode: number, data: T): void {
  res.status(statusCode).json({
    data
  });
}

// Example paginated response
function sendPaginatedResponse<T>(
  res: Response,
  statusCode: number,
  data: T[],
  pagination: { total: number; page: number; pageSize: number }
): void {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  res.status(statusCode).json({
    data,
    pagination: {
      total: pagination.total,
      page_size: pagination.pageSize,
      current_page: pagination.page,
      total_pages: totalPages
    }
  });
}

// Usage in controller
async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.page_size as string || '20', 10);
    
    const result = await this.userService.listUsers(req.context, {
      page,
      pageSize
    });
    
    sendPaginatedResponse(res, 200, result.users, {
      total: result.total,
      page,
      pageSize
    });
  } catch (error) {
    next(error);
  }
}
```

### Request Validation

Use strong validation with descriptive error messages:

```typescript
// Using express-validator
import { body, param, validationResult } from 'express-validator';
import { ValidationError } from '../errors/application-error';

export const validateCreateUser = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  
  // Validation middleware
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }));
      
      return next(new ValidationError('Validation failed', validationErrors));
    }
    next();
  }
];

// Usage in routes
router.post('/users', validateCreateUser, userController.createUser);
```

### Input/Output Types

Use TypeScript interfaces to define request and response types:

```typescript
// Request types
interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// Response types
interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// Controller with typed parameters
async createUser(
  req: Request<{}, {}, CreateUserRequest>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userData = req.body;
    const user = await this.userService.createUser(req.context, userData);
    
    const response: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString()
    };
    
    res.status(201).json({ data: response });
  } catch (error) {
    next(error);
  }
}
```

## Testing API Endpoints

### Unit Testing Controllers

```typescript
// Using Jest and Supertest
describe('UserController', () => {
  let userService: jest.Mocked<UserService>;
  let userController: UserController;
  let app: express.Express;
  
  beforeEach(() => {
    userService = {
      getUser: jest.fn(),
      createUser: jest.fn(),
      // Other methods...
    } as any;
    
    userController = new UserController(userService);
    
    // Setup Express app with the controller
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.context = {
        requestId: 'test-id',
        startTime: new Date(),
        logger: createMockLogger()
      };
      next();
    });
    
    // Setup routes
    app.get('/users/:id', userController.getUser);
    app.post('/users', userController.createUser);
    
    // Add error handler
    app.use(errorHandlerMiddleware(createMockLogger()));
  });
  
  describe('getUser', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date()
      };
      
      userService.getUser.mockResolvedValue(mockUser);
      
      // Act
      const response = await request(app)
        .get('/users/123')
        .expect(200);
      
      // Assert
      expect(response.body.data).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: expect.any(String)
      });
      
      expect(userService.getUser).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'test-id' }),
        '123'
      );
    });
    
    it('should return 404 when user not found', async () => {
      // Arrange
      userService.getUser.mockRejectedValue(
        new NotFoundError('User not found')
      );
      
      // Act & Assert
      const response = await request(app)
        .get('/users/nonexistent')
        .expect(404);
      
      expect(response.body.error).toEqual({
        code: 'NOT_FOUND',
        message: 'User not found'
      });
    });
  });
});
```

### Integration Testing

```typescript
// Using Jest, Supertest, and test containers
describe('User API Integration', () => {
  let app: express.Express;
  let dbContainer: PostgreSqlContainer;
  let connection: Connection;
  
  beforeAll(async () => {
    // Start test database
    dbContainer = await new PostgreSqlContainer().start();
    
    // Create database connection
    connection = await createConnection({
      type: 'postgres',
      url: dbContainer.getConnectionUri(),
      entities: [/* entity paths */],
      synchronize: true
    });
    
    // Setup application
    const logger = createLogger('test');
    const userRepository = new TypeORMUserRepository(connection);
    const userService = new UserService(userRepository, logger);
    const userController = new UserController(userService);
    
    app = express();
    app.use(express.json());
    app.use(contextMiddleware(logger));
    
    // Setup routes
    app.get('/users/:id', userController.getUser);
    app.post('/users', userController.createUser);
    
    app.use(errorHandlerMiddleware(logger));
  });
  
  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    
    if (dbContainer) {
      await dbContainer.stop();
    }
  });
  
  beforeEach(async () => {
    // Clear database between tests
    await connection.query('TRUNCATE TABLE users CASCADE');
  });
  
  it('should create and retrieve a user', async () => {
    // Create user
    const createResponse = await request(app)
      .post('/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123'
      })
      .expect(201);
    
    const userId = createResponse.body.data.id;
    
    // Get user
    const getResponse = await request(app)
      .get(`/users/${userId}`)
      .expect(200);
    
    expect(getResponse.body.data).toEqual({
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: expect.any(String)
    });
  });
});
```

## Performance Considerations

- Use pagination for large collections
- Implement caching with proper invalidation strategies
- Consider request timeouts and connection pooling
- Monitor request latency and error rates
- Optimize database queries
- Use compression middleware for responses
- Implement rate limiting for public APIs

```typescript
// Pagination example
async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Parse and validate pagination parameters
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = parseInt(req.query.page_size as string || '20', 10);
    
    // Apply limits to prevent abuse
    const limitedPageSize = Math.min(Math.max(pageSize, 1), 100);
    
    // For sorting
    const sortField = req.query.sort_by as string || 'createdAt';
    const sortOrder = req.query.sort_order as 'asc' | 'desc' || 'desc';
    
    const result = await this.userService.listUsers(req.context, {
      page,
      pageSize: limitedPageSize,
      sortField,
      sortOrder
    });
    
    sendPaginatedResponse(res, 200, result.users, {
      total: result.total,
      page,
      pageSize: limitedPageSize
    });
  } catch (error) {
    next(error);
  }
}

// Caching middleware example
function cachingMiddleware(duration: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip caching for authenticated requests
    if (req.user) {
      return next();
    }
    
    res.set('Cache-Control', `public, max-age=${duration}`);
    next();
  };
}
```

## Versioning and Evolution

- Include API version in the URL path (`/v1/users`)
- Never make breaking changes within a version
- Support multiple API versions during transition periods
- Document deprecation timelines
- Use feature flags for controlled rollouts

```typescript
// Version routing
const app = express();

// v1 routes
app.use('/api/v1', v1Router);

// v2 routes
app.use('/api/v2', v2Router);

// Current API version redirect
app.use('/api/current', (req, res) => {
  res.redirect(`/api/v2${req.path}`);
});
```

## Health and Monitoring

- Implement a `/health` endpoint for basic health checks
- Provide a `/metrics` endpoint for Prometheus
- Log all API access with correlation IDs
- Create dashboards for API metrics
- Set up alerts for error spikes or latency issues

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  // Basic health check
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Advanced health check
app.get('/health/detailed', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseConnection();
    
    // Check external dependencies
    const dependencyStatus = await checkExternalDependencies();
    
    // Check overall status
    const isHealthy = dbStatus.status === 'UP' && dependencyStatus.status === 'UP';
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      components: {
        database: dbStatus,
        dependencies: dependencyStatus
      },
      version: process.env.APP_VERSION || 'unknown'
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Metrics endpoint (using prom-client)
import promClient from 'prom-client';

// Configure metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
register.registerMetric(httpRequestDuration);

// Metrics route
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Metrics middleware
function metricsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Record response time when finished
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = (req.route?.path || req.path).toString();
      
      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: res.statusCode
        },
        duration
      );
    });
    
    next();
  };
}
```

## Example API Project Structure

Our TypeScript APIs follow this standard structure:

```
/
├── src/                    # Application source code
│   ├── api/                # API controllers & routes
│   │   ├── controllers/    # API controllers
│   │   ├── middleware/     # HTTP middleware
│   │   ├── routes/         # Route definitions
│   │   ├── validators/     # Request validation
│   │   └── index.ts        # API setup
│   ├── app/                # Application services
│   │   └── services/       # Business logic services
│   ├── domain/             # Domain models & interfaces
│   │   ├── entities/       # Domain entities
│   │   ├── interfaces/     # Domain interfaces
│   │   └── errors/         # Error definitions
│   ├── repository/         # Data access layer
│   │   ├── database/       # Database repositories
│   │   └── external/       # External API clients
│   └── utils/              # Utilities
│       ├── logger/         # Logging utilities
│       └── config/         # Configuration
├── swagger/                # Swagger/OpenAPI definitions
├── configs/                # Configuration files
├── scripts/                # Utility scripts
├── tests/                  # Tests
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── dist/                   # Compiled output
├── node_modules/           # Dependencies
├── .github/                # GitHub workflows
├── deploy/                 # Deployment manifests
│   └── docker/             # Docker configs
│       ├── Dockerfile
│       └── docker-compose.yml
├── .env.example            # Example environment variables
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── jest.config.js          # Jest configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Package definition
├── package-lock.json       # Package lock
└── README.md               # Project documentation
```

Swagger/OpenAPI specifications should be maintained in the `swagger/` directory, with versioned API definition files.

## Example API Implementation

```typescript
// src/index.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createLogger } from './utils/logger';
import { config } from './utils/config';
import { contextMiddleware } from './api/middleware/context';
import { errorHandlerMiddleware } from './api/middleware/error-handler';
import { metricsMiddleware } from './api/middleware/metrics';
import { requestLoggerMiddleware } from './api/middleware/request-logger';
import { initRoutes } from './api/routes';
import { connectDatabase } from './repository/database';
import { UserController } from './api/controllers/user-controller';
import { UserService } from './app/services/user-service';
import { UserRepository } from './repository/database/user-repository';

async function bootstrap() {
  // Initialize logger
  const logger = createLogger();
  
  // Initialize app
  const app = express();
  
  try {
    // Connect to database
    const db = await connectDatabase(config.database);
    
    // Create repositories
    const userRepository = new UserRepository(db);
    
    // Create services
    const userService = new UserService(userRepository, logger);
    
    // Create controllers
    const userController = new UserController(userService);
    
    // Apply global middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(contextMiddleware(logger));
    app.use(requestLoggerMiddleware());
    app.use(metricsMiddleware());
    
    // Initialize routes
    initRoutes(app, {
      userController
    });
    
    // Apply error handling middleware (must be last)
    app.use(errorHandlerMiddleware(logger));
    
    // Start server
    app.listen(config.server.port, () => {
      logger.info(`Server started on port ${config.server.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
```

## Conclusion

Following these guidelines will help create consistent, secure, and maintainable APIs across our TypeScript services. While these guidelines provide a strong foundation, remember that every API is unique, and you may need to make pragmatic exceptions based on specific requirements.

When in doubt, prioritize:
1. **Security**: Always put security considerations first
2. **Usability**: Make the API intuitive for clients
3. **Maintainability**: Create code that's easy to understand and change
4. **Type Safety**: Leverage TypeScript's type system to prevent errors
5. **Testing**: Ensure your API is thoroughly tested

These guidelines should be treated as a living document, evolving with our experience and the best practices in the TypeScript ecosystem. 