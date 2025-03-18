import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCapabilitiesToMCPServers1712960000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE mcp_servers
            ADD COLUMN capabilities JSONB DEFAULT '[]'::jsonb NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE mcp_servers
            DROP COLUMN capabilities
        `);
    }
} 