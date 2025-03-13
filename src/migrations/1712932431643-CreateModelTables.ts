import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateModelTables1712932431643 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM type for model capabilities
        await queryRunner.query(`
            CREATE TYPE model_capability AS ENUM (
                'text', 'vision', 'function_calling', 'code', 'knowledge_retrieval'
            )
        `);
        
        // Create models table
        await queryRunner.query(`
            CREATE TABLE models (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                display_name VARCHAR(100),
                provider VARCHAR(50) NOT NULL,
                input_per_million NUMERIC(10, 6) DEFAULT 0 CHECK (input_per_million >= 0),
                output_per_million NUMERIC(10, 6) DEFAULT 0 CHECK (output_per_million >= 0),
                context_window INTEGER NOT NULL,
                max_response_tokens INTEGER,
                enabled BOOLEAN DEFAULT TRUE,
                system_token_limit INTEGER,
                display_order INTEGER,
                icon_url TEXT,
                deprecated BOOLEAN DEFAULT FALSE,
                default_parameters JSONB DEFAULT '{
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "presence_penalty": 0,
                    "frequency_penalty": 0
                }'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create model_capabilities table
        await queryRunner.query(`
            CREATE TABLE model_capabilities (
                model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
                capability model_capability NOT NULL,
                PRIMARY KEY (model_id, capability)
            )
        `);
        
        // Create model_required_roles table
        await queryRunner.query(`
            CREATE TABLE model_required_roles (
                model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL,
                PRIMARY KEY (model_id, role)
            )
        `);
        
        // Create model_supported_endpoints table
        await queryRunner.query(`
            CREATE TABLE model_supported_endpoints (
                model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
                endpoint VARCHAR(100) NOT NULL,
                PRIMARY KEY (model_id, endpoint)
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS model_supported_endpoints`);
        await queryRunner.query(`DROP TABLE IF EXISTS model_required_roles`);
        await queryRunner.query(`DROP TABLE IF EXISTS model_capabilities`);
        await queryRunner.query(`DROP TABLE IF EXISTS models`);
        await queryRunner.query(`DROP TYPE IF EXISTS model_capability`);
    }
} 