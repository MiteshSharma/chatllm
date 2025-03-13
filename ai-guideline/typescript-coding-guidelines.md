# TypeScript Coding Guidelines

## Core Principles

These guidelines aim to ensure our TypeScript code is:

1. **Readable** - Code should be easy to understand at a glance
2. **Maintainable** - Future developers should be able to modify code safely
3. **Type-Safe** - Leverage TypeScript's type system to prevent errors
4. **Testable** - Code should be structured to facilitate testing
5. **Consistent** - Follow established patterns across the codebase

## Code Style and Formatting

### Formatting

- Use 2 spaces for indentation
- Use semicolons at the end of statements
- Line length should not exceed 100 characters
- Use single quotes for strings by default
- Add trailing commas in multi-line object/array literals

### File Organization

```typescript
// 1. Imports (grouped and sorted)
import { Component } from 'react';
import { connect } from 'react-redux';
import { isEmpty, sortBy } from 'lodash';

// 2. Interfaces, Types, and Enums
interface UserProps {
  id: string;
  name: string;
}

type UserState = {
  isLoading: boolean;
};

enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
}

// 3. Constants
const MAX_USERS = 10;
const API_ENDPOINT = '/api/users';

// 4. Class or Function Component
export class UserComponent extends Component<UserProps, UserState> {
  // Class implementation
}

// 5. Helper Functions
function formatUserName(name: string): string {
  return name.trim();
}

// 6. Default Export (if applicable)
export default UserComponent;
```

### Naming Conventions

- **camelCase** for variables, functions, methods, and instances
  ```typescript
  const userData = fetchUserData();
  ```

- **PascalCase** for classes, interfaces, types, enums, and type parameters
  ```typescript
  interface UserData {}
  class UserService {}
  type UserResponse = {...}
  enum HttpStatus {...}
  ```

- **UPPER_SNAKE_CASE** for constants and static readonly properties
  ```typescript
  const MAX_RETRY_COUNT = 3;
  static readonly DEFAULT_TIMEOUT = 5000;
  ```

- Use descriptive names; avoid abbreviations except for common terms (e.g., HTTP, URL)

### Comments

- Use JSDoc comments for exported functions, classes, and interfaces
  ```typescript
  /**
   * Fetches user data from the API
   * @param userId - The ID of the user to fetch
   * @returns Promise that resolves with user data
   * @throws {ApiError} If the API request fails
   */
  async function fetchUserData(userId: string): Promise<UserData> {
    // Implementation
  }
  ```

- Use inline comments sparingly, preferring self-documenting code
- Write comments to explain "why" rather than "what" when possible

## TypeScript-Specific Guidelines

### Type Annotations

- Let TypeScript infer types when possible
  ```typescript
  // Good - type is inferred as string
  const name = 'John';
  
  // Unnecessary
  const name: string = 'John';
  ```

- Explicitly annotate function parameters and return types
  ```typescript
  function calculateTotal(prices: number[]): number {
    return prices.reduce((sum, price) => sum + price, 0);
  }
  ```

- Use type annotations for object literals with many properties or when inference might be ambiguous

### Interfaces vs. Types

- Prefer `interface` for public API definitions, object shapes, and inheritance
  ```typescript
  // Public API
  interface UserService {
    getUser(id: string): Promise<User>;
    createUser(data: UserCreateData): Promise<User>;
  }
  
  // Extension
  interface AdminUser extends User {
    permissions: string[];
  }
  ```

- Use `type` for unions, intersections, mapped types, and complex types
  ```typescript
  // Union type
  type Status = 'pending' | 'approved' | 'rejected';
  
  // Mapped type
  type Readonly<T> = {
    readonly [P in keyof T]: T[P];
  };
  ```

### Type Safety

- Avoid using `any` - it defeats the purpose of TypeScript
- If type is truly unknown, use `unknown` instead of `any`
- Use non-null assertion operator (`!`) only when you're absolutely certain a value isn't null/undefined
- Enable strict TypeScript compiler options:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "strictFunctionTypes": true,
      "strictPropertyInitialization": true,
      "noImplicitThis": true,
      "alwaysStrict": true
    }
  }
  ```

### Generics

- Use generics to create reusable components
  ```typescript
  function firstElement<T>(arr: T[]): T | undefined {
    return arr[0];
  }
  ```

- Use constraints to ensure generic types have required capabilities
  ```typescript
  function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
  }
  ```

- Use descriptive type parameter names:
  - `T`, `U`, `V` for general types
  - `TData`, `TResponse` for more specific context
  - `TProps`, `TState` for React components

### Null and Undefined

- Prefer `undefined` over `null` in most cases
- Use optional parameters and properties instead of explicitly setting `undefined`
  ```typescript
  // Prefer this
  interface User {
    name: string;
    email?: string;
  }
  
  // Over this
  interface User {
    name: string;
    email: string | undefined;
  }
  ```

- Use nullish coalescing (`??`) and optional chaining (`?.`) operators
  ```typescript
  const name = user?.name ?? 'Anonymous';
  ```

## Asynchronous Code

### Promises and Async/Await

- Prefer `async/await` over Promise chains for readability
  ```typescript
  // Preferred
  async function fetchUserData(userId: string): Promise<UserData> {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user data', { userId, error });
      throw new ApiError('Failed to fetch user data');
    }
  }
  
  // Avoid
  function fetchUserData(userId: string): Promise<UserData> {
    return api.get(`/users/${userId}`)
      .then(response => response.data)
      .catch(error => {
        logger.error('Failed to fetch user data', { userId, error });
        throw new ApiError('Failed to fetch user data');
      });
  }
  ```

- Always handle Promise rejections with try/catch or `.catch()`
- Return early from async functions when possible to avoid deep nesting

### Error Handling

- Create custom error classes for different error types
  ```typescript
  export class ApiError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number = 500,
      public readonly code: string = 'API_ERROR'
    ) {
      super(message);
      this.name = this.constructor.name;
      // Maintains proper stack trace in V8 engines
      Error.captureStackTrace(this, this.constructor);
    }
  }
  ```

- Use type guards for error handling
  ```typescript
  try {
    await api.request();
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle API error
    } else if (error instanceof ValidationError) {
      // Handle validation error
    } else {
      // Handle unknown error
      logger.error('Unknown error', { error });
    }
  }
  ```

- Include contextual information in errors
  ```typescript
  throw new ValidationError('Invalid user data', { 
    fields: ['email', 'name'],
    details: 'Email is already in use'
  });
  ```

## Code Organization

### Module Structure

- One class/interface/function per file for larger components
- Group related functionality in the same directory
- Create barrels (`index.ts`) to simplify imports
  ```typescript
  // services/index.ts
  export * from './user-service';
  export * from './auth-service';
  export * from './product-service';
  
  // Elsewhere in the code
  import { UserService, AuthService } from './services';
  ```

### Imports

- Sort imports in groups:
  1. External libraries
  2. Internal modules
  3. Relative imports
  4. Type imports

```typescript
// External libraries
import express from 'express';
import { z } from 'zod';

// Internal modules
import { logger } from '@/utils/logger';
import { config } from '@/config';

// Relative imports
import { UserService } from './services/user-service';
import { validateUser } from './validators';

// Type imports
import type { User, UserCreateRequest } from './types';
```

- Use absolute imports with path aliases for cleaner imports
  ```typescript
  // tsconfig.json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"]
      }
    }
  }
  
  // Usage
  import { logger } from '@/utils/logger';
  ```

### Dependency Injection

- Use constructor injection for dependencies
  ```typescript
  class UserService {
    constructor(
      private userRepository: UserRepository,
      private emailService: EmailService,
      private logger: Logger
    ) {}
    
    async createUser(data: UserCreateData): Promise<User> {
      // Implementation using injected dependencies
    }
  }
  ```

- Make dependencies explicit through interfaces
  ```typescript
  interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  }
  
  class UserService {
    constructor(private logger: Logger) {}
  }
  ```

## Testing

### Unit Testing

- Test units in isolation, mocking dependencies
  ```typescript
  describe('UserService', () => {
    let userService: UserService;
    let mockUserRepository: jest.Mocked<UserRepository>;
    
    beforeEach(() => {
      mockUserRepository = {
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      };
      
      userService = new UserService(mockUserRepository);
    });
    
    it('should create a user successfully', async () => {
      // Arrange
      const userData = { name: 'Test User', email: 'test@example.com' };
      mockUserRepository.create.mockResolvedValue({ id: '123', ...userData });
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toEqual({ id: '123', ...userData });
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });
  });
  ```

- Structure tests with Arrange-Act-Assert pattern
- Test error cases and edge conditions
- Use test coverage to identify untested code paths

### Integration Testing

- Test interactions between multiple components
- Set up test databases for database testing
- Use environment variables to configure test environment

```typescript
describe('User API Integration', () => {
  let app: Express;
  let db: Database;
  
  beforeAll(async () => {
    db = await setupTestDatabase();
    app = createApp({ db });
  });
  
  afterAll(async () => {
    await db.close();
  });
  
  it('should create a user via API', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);
    
    expect(response.body.data).toMatchObject({
      name: userData.name,
      email: userData.email
    });
    
    // Verify user was saved to database
    const savedUser = await db.users.findOne({ email: userData.email });
    expect(savedUser).toMatchObject(userData);
  });
});
```

## Performance

### General Guidelines

- Minimize dependencies on heavy libraries
- Use lazy loading where appropriate
- Avoid excessive memory usage
- Use efficient data structures and algorithms

### TypeScript-Specific Optimizations

- Consider enabling `skipLibCheck` for faster compilation
- Use project references for large projects to improve incremental builds
- Use `--incremental` flag or `tsc --build` for faster builds
- Consider bundlers like esbuild for production builds

## Security

- Validate all user inputs
- Use parameterized queries for database operations
- Implement proper authentication and authorization
- Follow OWASP security guidelines
- Keep dependencies updated to avoid vulnerabilities
- Use security linters like `eslint-plugin-security`

## Conclusion

These guidelines aim to establish consistent patterns for TypeScript code across our projects. Following these guidelines will help create maintainable, type-safe, and performant applications.

Remember that these are guidelines, not strict rules. There may be exceptions where breaking a guideline leads to more readable or maintainable code. Use your judgment and discuss with your team when in doubt. 