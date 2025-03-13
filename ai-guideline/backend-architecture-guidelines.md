# Modern TypeScript Backend Architecture: A Comprehensive Guide

## Core Architecture Principles

This document outlines a robust architecture for TypeScript backend services based on the Controller-Service-Domain-Repository pattern. This architecture promotes:

- **Clear Separation of Concerns** - Each component has a distinct responsibility
- **Testability** - Dependency injection and interfaces make unit testing straightforward
- **Modularity** - Components can be developed and maintained independently
- **Scalability** - Services can grow without becoming unwieldy
- **Type Safety** - Leverage TypeScript's type system for safer code

## Architecture Layers

### 1. Controller Layer (API Handlers)

**Primary Responsibility:** HTTP request handling and response formatting

```typescript
export class UserAPI {
  constructor(private userService: UserService) {}

  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse and validate request
      const userData = req.body;
      
      // Validate input (could use a validation middleware)
      if (!userData || !this.isValidUser(userData)) {
        throw new ValidationError('Invalid user data');
      }
      
      // Call service layer
      const result = await this.userService.createUser(userData);
      
      // Format response
      res.status(201).json({
        data: result
      });
    } catch (error) {
      // Pass to error handling middleware
      next(error);
    }
  };
  
  private isValidUser(userData: any): boolean {
    // Validation logic
    return !!(userData.email && userData.password);
  }
}
```

**Best Practices:**
- Keep controllers thin - focus solely on request/response handling
- Use middleware for cross-cutting concerns (auth, logging, metrics)
- Validate all inputs before processing
- Return appropriate HTTP status codes and consistent error formats
- Document APIs with OpenAPI/Swagger
- Use async/await for all asynchronous operations
- Type all request and response data

### 2. Service Layer (Application Services)

**Primary Responsibility:** Business logic orchestration

```typescript
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private eventBus: EventBus,
    private logger: Logger
  ) {}

  async createUser(userData: CreateUserDTO): Promise<UserDTO> {
    // Business logic
    const salt = this.passwordService.generateSalt();
    const hashedPassword = await this.passwordService.hashPassword(userData.password, salt);
    
    const user: User = {
      id: undefined, // Will be set by repository
      email: userData.email,
      passwordHash: hashedPassword,
      salt,
      firstName: userData.firstName,
      lastName: userData.lastName,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Call repository
    const createdUser = await this.userRepository.createUser(user);
    if (!createdUser) {
      throw new ApplicationError('Failed to create user', 500);
    }
    
    // Additional business logic
    this.eventBus.publish('user.created', { userId: createdUser.id });
    
    // Map to DTO before returning
    return this.toDTO(createdUser);
  }
  
  private toDTO(user: User): UserDTO {
    // Remove sensitive data before returning
    const { passwordHash, salt, ...userDTO } = user;
    return userDTO;
  }
}
```

**Best Practices:**
- Focus on orchestration of business processes
- Use dependency injection for repositories and external services
- Manage transactions that span multiple repositories
- Emit events for asynchronous processing
- Implement proper error handling and propagation
- Keep methods cohesive and focused on a single responsibility
- Return DTOs, not domain entities
- Use interfaces for all dependencies

### 3. Domain Layer

**Primary Responsibility:** Core business logic and domain models

```typescript
// Domain models with validation
export interface User {
  id?: string;
  email: string;
  passwordHash: string;
  salt: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Value Objects
export class Email {
  private constructor(public readonly value: string) {}
  
  static create(email: string): Either<ValidationError, Email> {
    if (!email || !email.includes('@')) {
      return left(new ValidationError('Invalid email format'));
    }
    return right(new Email(email.toLowerCase()));
  }
}

// Domain services for complex business logic
export class UserDomainService {
  static calculateUserRiskScore(user: User, transactions: Transaction[]): number {
    // Complex business logic isolated in domain layer
    let riskScore = 0;
    
    // Example logic
    if (new Date().getTime() - user.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
      // Account less than 7 days old
      riskScore += 50;
    }
    
    // Process transactions
    const highValueTransactions = transactions.filter(t => t.amount > 1000);
    riskScore += highValueTransactions.length * 10;
    
    return Math.min(riskScore, 100);
  }
}
```

**Best Practices:**
- Create rich domain models with validation and behavior
- Use interfaces to define entity structures
- Isolate complex business calculations in domain services
- Keep domain logic free from infrastructure concerns
- Use value objects for concepts that have no identity
- Follow ubiquitous language from domain-driven design
- Consider using functional error handling patterns

### 4. Repository Layer

**Primary Responsibility:** Data access abstraction

```typescript
// Repository interfaces
export interface UserRepository {
  createUser(user: User): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  updateUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getUserByEmail(email: string): Promise<User | null>;
}

// Implementation with TypeORM
export class TypeORMUserRepository implements UserRepository {
  constructor(private connection: Connection) {}
  
  async createUser(user: User): Promise<User> {
    try {
      const userRepository = this.connection.getRepository(UserEntity);
      const userEntity = userRepository.create(user);
      const result = await userRepository.save(userEntity);
      return this.mapToDomain(result);
    } catch (error) {
      this.handleRepositoryError(error);
      throw new ApplicationError('Failed to create user', 500);
    }
  }
  
  async getUserById(id: string): Promise<User | null> {
    try {
      const userRepository = this.connection.getRepository(UserEntity);
      const userEntity = await userRepository.findOne({ where: { id } });
      return userEntity ? this.mapToDomain(userEntity) : null;
    } catch (error) {
      this.handleRepositoryError(error);
      throw new ApplicationError('Failed to get user', 500);
    }
  }
  
  private mapToDomain(entity: UserEntity): User {
    // Map from database entity to domain model
    return {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      salt: entity.salt,
      firstName: entity.firstName,
      lastName: entity.lastName,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  
  private handleRepositoryError(error: any): void {
    // Error handling logic
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ConflictError('User already exists');
    }
    // Log error details
  }
}
```

**Best Practices:**
- Define interfaces at the domain level, implementations in infrastructure
- Use repositories for all data access (databases, caches, external APIs)
- Return domain models from repositories, not database entities
- Implement query optimization (indexes, efficient queries)
- Add appropriate caching strategies
- Handle connection pooling and transaction management
- Use try/catch to handle database errors and map to domain errors
- Consider using the Unit of Work pattern for transaction management

## Core Middleware Components

### Request Context

**Primary Responsibility:** Managing request-specific data and state throughout the request lifecycle

```typescript
// Request context type
export interface RequestContext {
  requestId: string;
  path: string;
  userId?: string;
  sessionId?: string;
  startTime: Date;
  logger: Logger;
  metrics: MetricsCollector;
  tracer?: Tracer;
  error?: ApplicationError;
}

// Middleware to create request context
export function requestContextMiddleware(
  logger: Logger,
  metrics: MetricsCollector
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract request ID from header or generate new one
    const requestId = req.header('X-Request-ID') || uuidv4();
    
    // Set response header
    res.setHeader('X-Request-ID', requestId);
    
    // Create request-scoped logger
    const requestLogger = logger.child({
      requestId,
      path: req.path
    });
    
    // Create request context
    req.context = {
      requestId,
      path: req.path,
      startTime: new Date(),
      logger: requestLogger,
      metrics: metrics.withTags({ path: req.path })
    };
    
    // Extract user ID from authenticated request if available
    if (req.user) {
      req.context.userId = req.user.id;
    }
    
    next();
  };
}

// Add type definition to Express Request
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
      user?: any;
    }
  }
}
```

**Best Practices:**
- Create a request context for each incoming HTTP request
- Include request ID for distributed tracing
- Store user and session information for authorization
- Attach a request-scoped logger
- Track request timing for performance monitoring
- Make context available to all handlers

### Error Handling

**Primary Responsibility:** Centralized error processing and formatting

```typescript
// Base application error
export class ApplicationError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

// Error handling middleware
export function errorHandlerMiddleware(
  logger: Logger
): ErrorRequestHandler {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Default status code and error structure
    let statusCode = 500;
    let errorResponse = {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    };
    
    // Handle known application errors
    if (err instanceof ApplicationError) {
      statusCode = err.statusCode;
      errorResponse = {
        code: err.code,
        message: err.message,
        details: err.details
      };
      
      // Log at appropriate level based on status code
      if (statusCode >= 500) {
        logger.error('Application error', { error: errorResponse, stack: err.stack });
      } else {
        logger.warn('Application error', { error: errorResponse });
      }
    } else {
      // Unknown error - log with stack trace
      logger.error('Unhandled error', { 
        message: err.message, 
        stack: err.stack 
      });
      
      // In development, include error details
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.message = err.message;
        (errorResponse as any).stack = err.stack;
      }
    }
    
    // Track error in request context
    if (req.context) {
      req.context.error = errorResponse;
    }
    
    // Send error response
    res.status(statusCode).json({ error: errorResponse });
  };
}
```

**Best Practices:**
- Create a hierarchy of error types
- Use HTTP status codes appropriately
- Include error codes for client-side error handling
- Provide detailed error information in development
- Sanitize error details in production
- Log all errors with appropriate context
- Track errors in metrics

### Authentication & Authorization

**Primary Responsibility:** User identity verification and access control

```typescript
// JWT Authentication middleware
export function authenticateJWT(
  jwtSecret: string,
  userService: UserService
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedError('Missing authentication token');
      }
      
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedError('Invalid authentication header format');
      }
      
      // Verify JWT
      try {
        const payload = jwt.verify(token, jwtSecret) as JwtPayload;
        
        // Optionally fetch user from database for up-to-date information
        const user = await userService.getUserById(payload.sub);
        if (!user) {
          throw new UnauthorizedError('User not found');
        }
        
        // Attach user to request
        req.user = user;
        
        // Update request context
        if (req.context) {
          req.context.userId = user.id;
        }
        
        next();
      } catch (jwtError) {
        throw new UnauthorizedError('Invalid or expired token');
      }
    } catch (error) {
      next(error);
    }
  };
}

// Role-based authorization middleware
export function authorize(requiredRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some(role => 
        req.user.roles && req.user.roles.includes(role)
      );
      
      if (!hasRequiredRole) {
        throw new ForbiddenError('Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

**Best Practices:**
- Separate authentication and authorization concerns
- Use JWT for stateless authentication
- Include minimal information in JWT payload
- Set appropriate token expiration
- Implement refresh token mechanism
- Use role-based access control
- Log authentication failures
- Rate limit authentication attempts

### Logging

**Primary Responsibility:** Recording application events and diagnostics

```typescript
// Logging interface
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  child(meta: Record<string, any>): Logger;
}

// Winston implementation
export class WinstonLogger implements Logger {
  private logger: winston.Logger;
  
  constructor(config: { level: string }) {
    this.logger = winston.createLogger({
      level: config.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }
  
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }
  
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }
  
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }
  
  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }
  
  child(meta: Record<string, any>): Logger {
    const childLogger = new WinstonLogger({ level: this.logger.level });
    (childLogger as any).logger = this.logger.child(meta);
    return childLogger;
  }
}

// Request logging middleware
export function requestLoggingMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for health checks and similar endpoints
    if (req.path === '/health' || req.path === '/metrics') {
      return next();
    }
    
    const startTime = Date.now();
    
    // Log request
    req.context.logger.info(`Request started: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 500 ? 'error' : 
                   res.statusCode >= 400 ? 'warn' : 'info';
                   
      req.context.logger[level](`Request completed: ${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length')
      });
      
      // Record metrics
      req.context.metrics.recordHttpRequest({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration
      });
    });
    
    next();
  };
}
```

**Best Practices:**
- Use structured logging (JSON)
- Include context in all log messages
- Log at appropriate levels
- Create child loggers with request context
- Avoid logging sensitive information
- Implement a consistent logging format
- Configure different log destinations based on environment

### Event System

**Primary Responsibility:** Decoupling services through asynchronous communication

```typescript
// Event definitions
export interface Event<T = any> {
  type: string;
  payload: T;
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

// Event bus interface
export interface EventBus {
  publish<T>(eventType: string, payload: T, metadata?: Partial<Event['metadata']>): void;
  subscribe<T>(eventType: string, handler: (event: Event<T>) => Promise<void>): void;
  unsubscribe(eventType: string, handler: Function): void;
}

// In-memory implementation (for local development)
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Array<(event: Event) => Promise<void>>> = new Map();
  
  publish<T>(eventType: string, payload: T, metadata?: Partial<Event['metadata']>): void {
    const handlers = this.handlers.get(eventType) || [];
    
    const event: Event<T> = {
      type: eventType,
      payload,
      metadata: {
        timestamp: new Date(),
        correlationId: metadata?.correlationId || uuidv4(),
        ...metadata
      }
    };
    
    // Execute handlers asynchronously
    for (const handler of handlers) {
      // We use setImmediate to make this non-blocking
      setImmediate(() => {
        handler(event).catch(err => {
          console.error(`Error handling event ${eventType}:`, err);
        });
      });
    }
  }
  
  subscribe<T>(eventType: string, handler: (event: Event<T>) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler as any);
  }
  
  unsubscribe(eventType: string, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      return;
    }
    
    const handlers = this.handlers.get(eventType)!;
    const index = handlers.findIndex(h => h === handler);
    
    if (index >= 0) {
      handlers.splice(index, 1);
    }
  }
}

// Usage example
export class UserEventHandler {
  constructor(
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  async handleUserCreated(event: Event<{ userId: string }>): Promise<void> {
    try {
      this.logger.info('Processing user.created event', {
        userId: event.payload.userId,
        correlationId: event.metadata.correlationId
      });
      
      await this.emailService.sendWelcomeEmail(event.payload.userId);
    } catch (error) {
      this.logger.error('Failed to process user.created event', {
        error: error.message,
        userId: event.payload.userId,
        correlationId: event.metadata.correlationId
      });
      // Depending on the error, we might want to rethrow or suppress
    }
  }
  
  registerHandlers(eventBus: EventBus): void {
    eventBus.subscribe('user.created', this.handleUserCreated.bind(this));
  }
}
```

**Best Practices:**
- Use events for decoupling services
- Implement asynchronous processing for non-critical operations
- Design idempotent event handlers
- Use a message queue or event bus for reliability
- Implement retry logic for failed operations
- Monitor event processing with metrics
- Create strongly typed event definitions

## Testing Strategy

### Unit Testing

```typescript
// Test for UserService
import { UserService } from '../src/app/services/user-service';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserRepository } from '../src/domain/interfaces/user-repository';
import { PasswordService } from '../src/app/services/password-service';
import { EventBus } from '../src/infrastructure/events/event-bus';
import { Logger } from '../src/infrastructure/logger/logger';
import { ValidationError } from '../src/domain/errors/application-error';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: MockProxy<UserRepository>;
  let passwordService: MockProxy<PasswordService>;
  let eventBus: MockProxy<EventBus>;
  let logger: MockProxy<Logger>;
  
  beforeEach(() => {
    // Create mocks
    userRepository = mock<UserRepository>();
    passwordService = mock<PasswordService>();
    eventBus = mock<EventBus>();
    logger = mock<Logger>();
    
    // Create service with mocks
    userService = new UserService(userRepository, passwordService, eventBus, logger);
  });
  
  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const salt = 'generatedSalt';
      const hashedPassword = 'hashedPassword';
      
      passwordService.generateSalt.mockReturnValue(salt);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      
      const createdUser = {
        id: '123',
        email: userData.email,
        passwordHash: hashedPassword,
        salt,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      
      userRepository.createUser.mockResolvedValue(createdUser);
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toEqual({
        id: '123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      
      expect(passwordService.generateSalt).toHaveBeenCalled();
      expect(passwordService.hashPassword).toHaveBeenCalledWith(userData.password, salt);
      expect(userRepository.createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: userData.email,
        passwordHash: hashedPassword,
        salt
      }));
      expect(eventBus.publish).toHaveBeenCalledWith('user.created', { userId: '123' });
    });
    
    it('should throw validation error for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(ValidationError);
    });
  });
});
```

### Integration Testing

```typescript
// Integration test for UserAPI endpoints
import request from 'supertest';
import { app } from '../src/app';
import { createTestDatabase, clearTestDatabase } from './utils/test-db';

describe('User API Integration Tests', () => {
  // Setup test database
  beforeAll(async () => {
    await createTestDatabase();
  });
  
  // Clean up after each test
  afterEach(async () => {
    await clearTestDatabase();
  });
  
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      // Arrange
      const userData = {
        email: 'integration@example.com',
        password: 'Password123',
        firstName: 'Integration',
        lastName: 'Test'
      };
      
      // Act
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);
      
      // Assert
      expect(response.body.data).toEqual(expect.objectContaining({
        id: expect.any(String),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      }));
      
      // Password should not be returned
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
      
      // Verify user was stored in database
      const dbResponse = await request(app)
        .get(`/api/users/${response.body.data.id}`)
        .expect(200);
        
      expect(dbResponse.body.data.email).toBe(userData.email);
    });
    
    it('should return 400 for invalid user data', async () => {
      // Arrange
      const invalidUserData = {
        email: 'not-an-email',
        password: '123', // Too short
      };
      
      // Act
      const response = await request(app)
        .post('/api/users')
        .send(invalidUserData)
        .expect('Content-Type', /json/)
        .expect(400);
      
      // Assert
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

**Best Practices:**
- Write unit tests for all layers (controllers, services, repositories)
- Use mocks or stubs for dependencies to isolate test scope
- Create integration tests for critical paths
- Use Docker or test containers for database testing
- Set up CI/CD pipeline with test automation
- Implement code coverage reporting
- Use snapshot testing for API responses

## Project Structure

```
/
├── src/                    # Application source code
│   ├── api/                # API controllers/routes
│   │   ├── controllers/    # Controller implementations
│   │   ├── middlewares/    # Express middleware
│   │   ├── routes/         # Express routes
│   │   ├── validators/     # Request validation
│   │   └── index.ts        # API setup
│   ├── app/                # Application services
│   │   └── services/       # Business logic implementations
│   ├── domain/             # Domain models and interfaces
│   │   ├── entities/       # Domain entities
│   │   ├── interfaces/     # Domain interfaces
│   │   └── errors/         # Domain errors
│   ├── infrastructure/     # External dependencies & implementations
│   │   ├── database/       # Database connectors & repositories
│   │   ├── external/       # External API clients
│   │   ├── logger/         # Logging implementation
│   │   └── config/         # Configuration handling
│   └── utils/              # Utility functions and helpers
├── swagger/                # Swagger API specifications
├── configs/                # Configuration files
├── scripts/                # Utility scripts
├── tests/                  # Tests
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Test fixtures
├── dist/                   # Compiled output (generated)
├── node_modules/           # Dependencies (generated)
├── .github/                # GitHub workflows
├── deploy/                 # Docker configurations
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example            # Example environment variables
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── jest.config.js          # Jest test configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Project dependencies & scripts
├── package-lock.json       # Dependency lock file
└── README.md               # Project documentation
```

**Best Practices:**
- Follow a structured, layered approach
- Group by domain feature within each layer
- Keep domain logic separate from infrastructure
- Use clear, consistent naming conventions
- Isolate third-party dependencies
- Create well-defined interfaces between layers
- Document architecture in README

## Dependency Injection

```typescript
// Application wiring without a DI framework
import express from 'express';
import * as http from 'http';
import { createConnection } from 'typeorm';
import { config } from './infrastructure/config';
import { WinstonLogger } from './infrastructure/logger/winston-logger';
import { TypeORMUserRepository } from './infrastructure/database/typeorm-user-repository';
import { BcryptPasswordService } from './infrastructure/security/bcrypt-password-service';
import { InMemoryEventBus } from './infrastructure/events/in-memory-event-bus';
import { UserService } from './app/services/user-service';
import { UserAPI } from './api/controllers/user-api';
import { requestContextMiddleware } from './api/middlewares/request-context';
import { errorHandlerMiddleware } from './api/middlewares/error-handler';
import { requestLoggingMiddleware } from './api/middlewares/request-logging';
import { createPromMetricsCollector } from './infrastructure/metrics/prometheus-collector';
import { initRoutes } from './api/routes';

async function bootstrap() {
  // Initialize central components
  const logger = new WinstonLogger({ level: config.logging.level });
  const metrics = createPromMetricsCollector();
  
  try {
    logger.info('Starting application', { config: config.env });
    
    // Connect to database
    const connection = await createConnection({
      type: 'postgres',
      url: config.database.url,
      entities: [/* entity paths */],
      synchronize: config.env !== 'production',
      ssl: config.database.ssl
    });
    
    // Create core services
    const eventBus = new InMemoryEventBus();
    const passwordService = new BcryptPasswordService(config.auth.saltRounds);
    
    // Create repositories
    const userRepository = new TypeORMUserRepository(connection);
    
    // Create application services
    const userService = new UserService(
      userRepository,
      passwordService,
      eventBus,
      logger
    );
    
    // Create API controllers
    const userAPI = new UserAPI(userService);
    
    // Setup Express app
    const app = express();
    
    // Global middleware
    app.use(express.json());
    app.use(requestContextMiddleware(logger, metrics));
    app.use(requestLoggingMiddleware());
    
    // Initialize routes
    initRoutes(app, {
      userAPI
      // other APIs...
    });
    
    // Error handling middleware (must be after routes)
    app.use(errorHandlerMiddleware(logger));
    
    // Create and start HTTP server
    const server = http.createServer(app);
    
    server.listen(config.server.port, () => {
      logger.info(`Server listening on port ${config.server.port}`);
    });
    
    // Setup graceful shutdown
    setupGracefulShutdown(server, { 
      connection, 
      logger 
    });
    
    return { app, server };
  } catch (error) {
    logger.error('Failed to start application', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

function setupGracefulShutdown(
  server: http.Server,
  deps: { connection: any, logger: WinstonLogger }
) {
  // Create shutdown handler
  const shutdown = async (signal: string) => {
    deps.logger.info(`${signal} received, starting graceful shutdown`);
    
    // Close HTTP server first
    server.close(() => {
      deps.logger.info('HTTP server closed');
      
      // Close database connection
      deps.connection.close()
        .then(() => {
          deps.logger.info('Database connection closed');
          process.exit(0);
        })
        .catch((err: Error) => {
          deps.logger.error('Error closing database connection', {
            error: err.message
          });
          process.exit(1);
        });
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      deps.logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
  
  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the application
bootstrap().catch(console.error);
```

**Best Practices:**
- Use constructor injection for dependencies
- Consider using a DI framework for larger applications
- Initialize dependencies in the correct order
- Create factory functions for complex objects
- Inject configuration from a central source
- Implement graceful shutdown
- Use interfaces for looser coupling

## Conclusion

This architecture provides a solid foundation for building robust, maintainable TypeScript backend services. By following the Controller-Service-Domain-Repository pattern and implementing these best practices, you can create scalable applications that are easier to test, extend, and maintain.

Key takeaways:
- Keep boundaries between layers clear
- Use TypeScript's type system to enforce contracts between components
- Leverage domain-driven design principles for complex domains
- Implement comprehensive error handling and logging
- Build testable components through dependency injection
- Structure your code for readability and maintainability

For a working example of this architecture, see our [TypeScript Backend Starter](https://github.com/example/typescript-backend-starter) repository. 