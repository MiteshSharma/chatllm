import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOpenAPISpecsTable1712950000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE openapi_specs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                spec_content TEXT NOT NULL,
                auth_config JSONB,
                is_enabled BOOLEAN DEFAULT TRUE,
                created_by VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create index for better performance
        await queryRunner.query(`
            CREATE INDEX idx_openapi_specs_name ON openapi_specs(name);
            CREATE INDEX idx_openapi_specs_created_at ON openapi_specs(created_at);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_openapi_specs_name`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_openapi_specs_created_at`);
        await queryRunner.query(`DROP TABLE IF EXISTS openapi_specs`);
    }
}