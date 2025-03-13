import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentModeToMessage1712970000000 implements MigrationInterface {
    name = 'AddAgentModeToMessage1712970000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "agent_mode" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "agent_mode"`);
    }
} 