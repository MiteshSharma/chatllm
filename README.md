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

## Tools

ChatLLM comes with built-in tools:
- Calculator - Evaluates mathematical expressions using mathjs
- Echo - Repeats input (useful for testing)

Add custom tools by creating implementations in the `src/domain/agent/tools` directory.

## Tech Stack

- TypeScript
- Express.js
- TypeORM
- PostgreSQL
- LangChain
- Zod (validation)
- Docker
