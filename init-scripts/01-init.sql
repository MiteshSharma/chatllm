-- Create application user with password
CREATE USER postgres WITH PASSWORD 'postgres';

-- Create database if it doesn't exist
-- Note: This might be redundant as the POSTGRES_DB env var should create the DB
CREATE DATABASE chat_llm WITH OWNER = postgres;

-- Connect to the database
\connect chat_llm

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE chat_llm TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
