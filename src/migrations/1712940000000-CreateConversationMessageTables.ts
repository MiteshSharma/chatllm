import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateConversationMessageTables1712940000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM type for message roles
        await queryRunner.query(`
            CREATE TYPE message_role AS ENUM (
                'user', 'assistant', 'system', 'tool', 'function'
            )
        `);
        
        // Create conversations table
        await queryRunner.query(`
            CREATE TABLE conversations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID,
                model_id UUID REFERENCES models(id) ON DELETE SET NULL,
                title VARCHAR(255) DEFAULT 'New Conversation',
                system_message TEXT,
                message_count INTEGER DEFAULT 0,
                token_count INTEGER DEFAULT 0,
                settings JSONB DEFAULT '{
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "presence_penalty": 0,
                    "frequency_penalty": 0,
                    "max_tokens": 2048
                }'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create messages table
        await queryRunner.query(`
            CREATE TABLE messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                user_id UUID,
                parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
                role message_role NOT NULL,
                content TEXT NOT NULL,
                token_count INTEGER DEFAULT 0,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes for better performance
        await queryRunner.query(`
            CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
            CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);
            CREATE INDEX idx_conversations_user_id ON conversations(user_id);
            CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables and type in reverse order
        await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_conversation_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_parent_message_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_user_id`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_conversations_updated_at`);
        
        await queryRunner.query(`DROP TABLE IF EXISTS messages`);
        await queryRunner.query(`DROP TABLE IF EXISTS conversations`);
        await queryRunner.query(`DROP TYPE IF EXISTS message_role`);
    }
} 