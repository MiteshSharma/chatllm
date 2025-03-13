# TypeScript Testing Guidelines

## Overview

This document outlines our approach to testing TypeScript applications. Effective testing provides confidence in our code, enables refactoring, and serves as documentation. These guidelines ensure consistent and effective testing practices across our projects.

## Core Testing Principles

1. **Write Tests First** - Consider test-driven development (TDD) for critical paths
2. **Test Behavior, Not Implementation** - Focus on what code does, not how it does it
3. **Keep Tests Fast** - Tests should run quickly to encourage frequent execution
4. **Maintain Test Independence** - Tests should not depend on each other
5. **Use Realistic Data** - Tests should use data that resembles production

## Test Types and Organization

### Project Structure

We follow a co-located test approach, keeping test files next to the source files they test. This makes tests easier to find and maintain.

```
/
├── src/                          # Source code
│   ├── app/
│   │   ├── services/
│   │   │   ├── user-service.ts
│   │   │   └── user-service.test.ts  # Unit test for user service
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── user.test.ts
│   │   ├── errors/
│   │   │   └── application-error.test.ts
│   └── infrastructure/
│       ├── database/
│       │   └── user-repository.test.ts
│       └── api/
│           └── user-controller.int.test.ts      # API integration tests
├── e2e/                          # End-to-end tests
│   └── utils/
├── test-utils/                   # Shared test utilities
│   ├── fixtures/                 # Test data
│   └── test-setup.ts             # Test configuration
├── jest.config.js                # Jest configuration
└── package.json
```

#### Benefits of Co-location

- Tests are easier to find when working on a particular file
- Better visibility encourages developers to keep tests updated 
- Clearer relationship between code and its tests
- Promotes test coverage as part of the development workflow

### Configuration

Example Jest configuration for TypeScript with co-located tests:

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/types/**/*.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test-utils/test-setup.ts']
};
```

## Unit Testing

Unit tests verify that individual units of code (functions, classes, modules) work as expected in isolation from other parts of the system.

### Best Practices

1. **Focus on Public APIs** - Test the behavior exposed by the unit, not internal details
2. **Mock Dependencies** - Isolate the unit from its dependencies
3. **Test Edge Cases** - Cover error conditions, boundary values, and edge cases
4. **Keep Tests Small** - Each test should focus on one aspect of behavior
5. **Use Descriptive Test Names** - Names should describe the expected behavior

### Example Unit Test

Using Jest with TypeScript:

```typescript
// src/app/services/user-service.ts
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getUserById(id: string): Promise<User | null> {
    if (!id) {
      throw new Error('User ID is required');
    }
    return this.userRepository.findById(id);
  }
}

// src/app/services/user-service.test.ts
import { UserService } from './user-service';
import { NotFoundError } from '../../domain/errors/application-error';

describe('UserService', () => {
  // Setup mock dependencies
  let mockUserRepository: jest.Mocked<UserRepository>;
  let userService: UserService;

  beforeEach(() => {
    // Create mock with type safety
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    userService = new UserService(mockUserRepository);
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: '123', name: 'Test User', email: 'test@example.com' };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById('123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById('123');

      // Assert
      expect(result).toBeNull();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw error when id is empty', async () => {
      // Act & Assert
      await expect(userService.getUserById('')).rejects.toThrow('User ID is required');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });
});
```

### Testing Asynchronous Code

```typescript
// Promise-based API
it('should handle async operations', async () => {
  // Arrange
  mockUserRepository.findById.mockResolvedValue({ id: '123', name: 'Test User' });
  
  // Act
  const user = await userService.getUserById('123');
  
  // Assert
  expect(user).toEqual({ id: '123', name: 'Test User' });
});

// Error handling
it('should handle async errors', async () => {
  // Arrange
  mockUserRepository.findById.mockRejectedValue(new Error('Database error'));
  
  // Act & Assert
  await expect(userService.getUserById('123')).rejects.toThrow('Database error');
});
```

## Integration Testing

Integration tests verify that different parts of the system work together correctly.

### API Integration Tests

```typescript
// src/infrastructure/api/user-controller.int.test.ts
import request from 'supertest';
import { createApp } from '../../app';
import { createTestDatabase } from '../../../test-utils/db-setup';

describe('User API Integration', () => {
  let app: Express;
  let db: Database;
  
  beforeAll(async () => {
    db = await createTestDatabase();
    app = createApp({ db });
  });
  
  afterAll(async () => {
    await db.close();
  });
  
  beforeEach(async () => {
    await db.clearAllCollections();
  });
  
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
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
      expect(savedUser).toMatchObject({
        name: userData.name,
        email: userData.email
      });
    });
  });
});
```

### Database Integration Tests

```typescript
// src/infrastructure/database/user-repository.test.ts
import { UserRepository } from './user-repository';
import { createTestDatabase } from '../../../test-utils/db-setup';

describe('UserRepository', () => {
  let db: Database;
  let userRepository: UserRepository;
  
  beforeAll(async () => {
    db = await createTestDatabase();
    userRepository = new UserRepository(db);
  });
  
  afterAll(async () => {
    await db.close();
  });
  
  beforeEach(async () => {
    await db.users.deleteMany({});
  });
  
  describe('create', () => {
    it('should create a new user', async () => {
      const user = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed_password'
      };
      
      const createdUser = await userRepository.create(user);
      
      expect(createdUser).toMatchObject(user);
      expect(createdUser.id).toBeDefined();
      
      // Verify directly in database
      const savedUser = await db.users.findOne({ email: user.email });
      expect(savedUser).toMatchObject(user);
    });
  });
});
```

## End-to-End Testing

End-to-end tests verify the entire application stack works together correctly.

```typescript
// e2e/api-tests/user-flow.test.ts
import request from 'supertest';
import { startTestServer } from '../utils/server';

describe('User Flow E2E', () => {
  let baseUrl: string;
  let stopServer: () => Promise<void>;
  
  beforeAll(async () => {
    const server = await startTestServer();
    baseUrl = server.url;
    stopServer = server.stop;
  });
  
  afterAll(async () => {
    await stopServer();
  });
  
  it('should register, login, and fetch user profile', async () => {
    // Step 1: Register new user
    const userData = {
      name: 'E2E Test User',
      email: `e2e-test-${Date.now()}@example.com`,
      password: 'securePassword123'
    };
    
    const registerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);
    
    expect(registerResponse.body.data.email).toBe(userData.email);
    
    // Step 2: Login with created user
    const loginResponse = await request(baseUrl)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);
    
    const token = loginResponse.body.data.token;
    expect(token).toBeDefined();
    
    // Step 3: Fetch user profile with token
    const profileResponse = await request(baseUrl)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(profileResponse.body.data).toMatchObject({
      name: userData.name,
      email: userData.email
    });
  });
});
```

## Mocking

### Mocking Dependencies

```typescript
// src/app/services/email-service.test.ts
import { EmailService } from './email-service';

describe('EmailService', () => {
  let emailService: EmailService;
  let mockSendGrid: jest.Mocked<SendGridClient>;
  
  beforeEach(() => {
    mockSendGrid = {
      send: jest.fn().mockResolvedValue({ statusCode: 202 })
    } as any;
    
    emailService = new EmailService(mockSendGrid);
  });
  
  it('should send welcome email', async () => {
    await emailService.sendWelcomeEmail('test@example.com', 'Test User');
    
    expect(mockSendGrid.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Welcome')
      })
    );
  });
});
```

### Mocking HTTP Requests

```typescript
// src/infrastructure/external/weather-api-client.test.ts
import axios from 'axios';
import { WeatherApiClient } from './weather-api-client';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherApiClient', () => {
  let weatherClient: WeatherApiClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    weatherClient = new WeatherApiClient('fake-api-key');
  });
  
  it('should fetch current weather', async () => {
    // Mock response
    mockAxios.get.mockResolvedValueOnce({
      data: {
        main: { temp: 20, humidity: 50 },
        weather: [{ description: 'clear sky' }]
      }
    });
    
    const weather = await weatherClient.getCurrentWeather('London');
    
    expect(weather).toEqual({
      temperature: 20,
      humidity: 50,
      description: 'clear sky'
    });
    
    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('London'),
      expect.any(Object)
    );
  });
});
```

## Testing React Components

For frontend TypeScript applications:

```typescript
// src/components/UserProfile/UserProfile.tsx
export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {user.isAdmin && <span className="admin-badge">Admin</span>}
    </div>
  );
};

// src/components/UserProfile/UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('should display user information', () => {
    const user = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      isAdmin: false
    };
    
    render(<UserProfile user={user} />);
    
    expect(screen.getByText(user.name)).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });
  
  it('should show admin badge for admin users', () => {
    const adminUser = {
      id: '123',
      name: 'Admin User',
      email: 'admin@example.com',
      isAdmin: true
    };
    
    render(<UserProfile user={adminUser} />);
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
```

## Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Test Data Management

### Fixtures

```typescript
// test-utils/fixtures/users.ts
export const testUsers = [
  {
    id: 'user1',
    name: 'Test User 1',
    email: 'user1@example.com',
    role: 'user'
  },
  {
    id: 'user2',
    name: 'Test User 2',
    email: 'user2@example.com',
    role: 'admin'
  }
];

// In your test
import { testUsers } from '../../../test-utils/fixtures/users';

it('should filter admin users', () => {
  const adminUsers = filterAdminUsers(testUsers);
  expect(adminUsers).toHaveLength(1);
  expect(adminUsers[0].id).toBe('user2');
});
```

### Factories

```typescript
// test-utils/factories/user-factory.ts
export function createUser(overrides = {}) {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    role: 'user',
    createdAt: new Date(),
    ...overrides
  };
}

// In your test
import { createUser } from '../../../test-utils/factories/user-factory';

it('should update user email', () => {
  const user = createUser();
  const updatedUser = updateUserEmail(user, 'new@example.com');
  expect(updatedUser.email).toBe('new@example.com');
});
```

## Test Organization

### Recommended Patterns

1. **Describe-It Pattern**:
   ```typescript
   describe('UserService', () => {
     describe('getUserById', () => {
       it('should return user when found', () => {
         // Test implementation
       });
       
       it('should return null when user not found', () => {
         // Test implementation
       });
     });
   });
   ```

2. **Arrange-Act-Assert Pattern**:
   ```typescript
   it('should update user name', async () => {
     // Arrange
     const user = createUser();
     mockUserRepository.findById.mockResolvedValue(user);
     mockUserRepository.update.mockResolvedValue({ ...user, name: 'New Name' });
     
     // Act
     const result = await userService.updateUserName(user.id, 'New Name');
     
     // Assert
     expect(result.name).toBe('New Name');
     expect(mockUserRepository.update).toHaveBeenCalledWith(user.id, { name: 'New Name' });
   });
   ```

## Testing Utilities

### Custom Jest Matchers

```typescript
// test-utils/custom-matchers.ts
import { expect } from '@jest/globals';

// Add custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  }
});

// In your test
import '../../../test-utils/custom-matchers';

it('should be within range', () => {
  expect(5).toBeWithinRange(1, 10);
});
```

### Test Environment Setup

```typescript
// test-utils/test-setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Clean up after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Reset database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
```

## Conclusion

Effective testing is a cornerstone of maintainable TypeScript applications. By following these guidelines and keeping tests co-located with their source files, you can build a comprehensive testing strategy that ensures code quality, prevents regressions, and supports future development.

Remember that testing is an investment that pays dividends through improved reliability, faster development cycles, and more confident deployments.

Key takeaways:
- Keep tests alongside the source code they test for better visibility and maintainability
- Write tests at multiple levels (unit, integration, e2e)
- Leverage TypeScript's type system in your tests
- Create proper test isolation with mocks and dependency injection
- Use descriptive test names that serve as documentation
- Structure tests consistently across your codebase 