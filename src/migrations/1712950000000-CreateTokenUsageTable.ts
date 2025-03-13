import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateTokenUsageTable1712950000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create request_type enum type
        await queryRunner.query(`
            CREATE TYPE request_type AS ENUM (
                'message', 'completion', 'embedding', 'edit', 
                'translation', 'summarization', 'image', 'audio'
            )
        `);
        
        // Create token_usage table
        await queryRunner.query(`
            CREATE TABLE token_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
                message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
                model VARCHAR(100) NOT NULL,
                endpoint VARCHAR(100),
                prompt_tokens INTEGER NOT NULL DEFAULT 0,
                completion_tokens INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                prompt_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
                completion_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
                total_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
                request_type request_type NOT NULL DEFAULT 'message'
            )
        `);
        
        // Create indexes for better performance
        await queryRunner.query(`
            CREATE INDEX idx_token_usage_user_id ON token_usage(user_id);
            CREATE INDEX idx_token_usage_timestamp ON token_usage(timestamp);
            CREATE INDEX idx_token_usage_conversation_id ON token_usage(conversation_id);
            CREATE INDEX idx_token_usage_model ON token_usage(model);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop table and enum
        await queryRunner.query(`DROP INDEX IF EXISTS idx_token_usage_user_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_token_usage_timestamp`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_token_usage_conversation_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_token_usage_model`);
        
        await queryRunner.query(`DROP TABLE IF EXISTS token_usage`);
        await queryRunner.query(`DROP TYPE IF EXISTS request_type`);
    }
} 