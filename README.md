# ChatLLM

A TypeScript backend service for building AI chat applications with support for various LLM services, conversation management, and tool-calling capabilities.

## Features

- 🤖 OpenAI API integration with custom endpoint support
- 💾 PostgreSQL-based conversation and message history
- 🛠️ Tool/Function calling framework (calculator, echo tools included)
- 🌊 Streaming LLM responses
- 📡 Clean API architecture with TypeScript
- 🧩 Extensible agent/model system

## Getting Started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- PostgreSQL 16+
- OpenAI API key or compatible LLM service

### Installation

```bash
# Clone repository
git clone <repository-url>
cd chatllm

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and API settings
```

### Development

```bash
# Start development server with hot reloading
npm run dev

# Run linting
npm run lint

# Run type checking
npm run type-check

# Format code
npm run format
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# Run database migrations
npm run migration:run
```

## API Usage

```bash
# Send a message
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the square root of 16?",
    "model": "gpt-4",
    "agentMode": true,
    "options": {
      "temperature": 0.7
    }
  }'

# Continue conversation
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Now multiply that by 2",
    "model": "gpt-4",
    "conversationId": "previous-conversation-id",
    "parentMessageId": "previous-message-id",
    "agentMode": true
  }'
```

## Tool Support

### Overview
The ChatLLM API supports various tools that allow the AI to perform actions beyond text generation. These tools enable functionality like calculations, data retrieval, and interaction with external APIs.

### Available Tools

#### Built-in Tools
- **Calculator**: Performs mathematical calculations
- **Echo**: Returns the input text (useful for debugging)

#### OpenAPI Tools
The system supports dynamic integration with any REST API through OpenAPI specifications. This allows the AI to:
- Call external endpoints
- Process the results
- Include the information in its responses

### Using OpenAPI Spec Tools

#### 1. Register an OpenAPI Specification

```bash
curl -X POST http://localhost:3000/api/openapi-specs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "tool_name",
    "description": "Description of the API functionality",
    "specContent": "{\"openapi\":\"3.0.0\",\"info\":{...},\"paths\":{...}}"
  }'
```

Critical components for proper tool registration:
- Each endpoint should have a unique `operationId` defined
- Parameters should be properly documented
- Response schemas should be defined

#### 2. Use the Tool in Conversations

Once registered, the API will automatically make the tool available to the AI. In your request:

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": null,
    "message": "Use the [tool_name] to perform [action]",
    "parentMessageId": null,
    "agentMode": true
  }'
```

The `agentMode: true` parameter is required to enable tool usage.

### Example: Magic String API

The system includes a sample API that converts numbers to strings:

```bash
# Get the Magic Number (Pi)
curl -X GET http://localhost:3000/api/magic/number

# Convert a number to a friendly string
curl -X GET "http://localhost:3000/api/magic/string?number=42"
```

To use this in a conversation with the AI:

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": null,
    "message": "Get the magic number value and convert it to a magic string",
    "parentMessageId": null,
    "agentMode": true
  }'
```

The AI will:
1. Call the magic number API to get the value
2. Use that value with the magic string API
3. Return the result in a natural language response

## Tech Stack

- TypeScript
- Express.js
- TypeORM
- PostgreSQL
- LangChain
- Zod (validation)
- Docker
