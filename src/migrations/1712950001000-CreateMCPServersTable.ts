import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMCPServersTable1712950001000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the table with direct SQL
        await queryRunner.query(`
            CREATE TABLE mcp_servers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                type VARCHAR(100) NOT NULL DEFAULT 'stdio',
                command VARCHAR(255),
                args TEXT,
                url VARCHAR(255),
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                env JSONB,
                created_at TIMESTAMP NOT NULL DEFAULT now(),
                updated_at TIMESTAMP NOT NULL DEFAULT now()
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE mcp_servers`);
    }
}
