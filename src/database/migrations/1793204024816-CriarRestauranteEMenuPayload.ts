import { MigrationInterface, QueryRunner } from 'typeorm';

export class CriarRestauranteEMenuPayload1793204024816 implements MigrationInterface {
  name = 'CriarRestauranteEMenuPayload1793204024816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`Restaurante\` (\`Id\` int NOT NULL AUTO_INCREMENT, \`Nome\` varchar(120) NOT NULL, \`Slug\` varchar(60) NOT NULL, UNIQUE INDEX \`UQ_Restaurante_Slug\` (\`Slug\`), PRIMARY KEY (\`Id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`MenuPayload\` (\`Id\` int NOT NULL AUTO_INCREMENT, \`Payload\` json NOT NULL, \`IsPreview\` tinyint NOT NULL DEFAULT 0, \`RestauranteId\` int NOT NULL, UNIQUE INDEX \`UQ_MenuPayload_RestauranteId_IsPreview\` (\`RestauranteId\`, \`IsPreview\`), PRIMARY KEY (\`Id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`MenuPayload\` ADD CONSTRAINT \`FK_MenuPayload_Restaurante\` FOREIGN KEY (\`RestauranteId\`) REFERENCES \`Restaurante\`(\`Id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`MenuPayload\` DROP FOREIGN KEY \`FK_MenuPayload_Restaurante\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_MenuPayload_RestauranteId_IsPreview\` ON \`MenuPayload\``,
    );
    await queryRunner.query(`DROP TABLE \`MenuPayload\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_Restaurante_Slug\` ON \`Restaurante\``,
    );
    await queryRunner.query(`DROP TABLE \`Restaurante\``);
  }
}
