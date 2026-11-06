import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preview deixa de ser um menu separado e vira uma segunda versão do payload
 * dentro do próprio menu:
 * - nova coluna PayloadPreview, preenchida com uma cópia do Payload;
 * - os menus de preview (IsPreview = 1) são excluídos, com tudo o que depende
 *   deles (configuração, categorias, subcategorias, itens, mídias e tags dos itens,
 *   pelas FKs ON DELETE CASCADE);
 * - saem a coluna IsPreview e o que garantia as regras dela (coluna gerada
 *   PreviewRestauranteId + índice único UQ_Menu_Preview e o CHECK CHK_Menu_PreviewInativo).
 *
 * A regra "no máximo 1 menu ativo por restaurante" continua (UQ_Menu_Ativo).
 */
export class PayloadPreviewNoMenu1793349000000 implements MigrationInterface {
  name = 'PayloadPreviewNoMenu1793349000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string, parametros?: unknown[]) =>
      queryRunner.query(sql, parametros);

    await q('ALTER TABLE `Menu` ADD `PayloadPreview` json NULL');
    await q('UPDATE `Menu` SET `PayloadPreview` = `Payload`');
    await q('ALTER TABLE `Menu` MODIFY `PayloadPreview` json NOT NULL');

    await q('DELETE FROM `Menu` WHERE `IsPreview` = 1');

    await q('ALTER TABLE `Menu` DROP CHECK `CHK_Menu_PreviewInativo`');
    await q('DROP INDEX `UQ_Menu_Preview` ON `Menu`');
    await q('ALTER TABLE `Menu` DROP COLUMN `PreviewRestauranteId`');
    await q(
      "DELETE FROM `typeorm_metadata` WHERE `type` = 'GENERATED_COLUMN' AND `table` = 'Menu' AND `name` = 'PreviewRestauranteId' AND `schema` = ?",
      [await this.bancoAtual(queryRunner)],
    );
    await q('ALTER TABLE `Menu` DROP COLUMN `IsPreview`');
  }

  /**
   * Volta ao modelo anterior. As versões de preview viram de novo menus de preview
   * (um por restaurante, a partir do PayloadPreview do menu ativo), mas SEM a
   * estrutura (categorias, itens...) que os menus de preview tinham: ela foi
   * excluída no up().
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string, parametros?: unknown[]) =>
      queryRunner.query(sql, parametros);

    await q('ALTER TABLE `Menu` ADD `IsPreview` tinyint NOT NULL DEFAULT 0');
    await q(
      'ALTER TABLE `Menu` ADD `PreviewRestauranteId` int AS (CASE WHEN `IsPreview` = 1 THEN `RestauranteId` END) STORED NULL',
    );
    await q(
      'INSERT INTO `typeorm_metadata` (`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, ?, ?, ?, ?)',
      [
        await this.bancoAtual(queryRunner),
        'Menu',
        'GENERATED_COLUMN',
        'PreviewRestauranteId',
        'CASE WHEN `IsPreview` = 1 THEN `RestauranteId` END',
      ],
    );
    await q(
      'CREATE UNIQUE INDEX `UQ_Menu_Preview` ON `Menu` (`PreviewRestauranteId`)',
    );
    await q(
      'ALTER TABLE `Menu` ADD CONSTRAINT `CHK_Menu_PreviewInativo` CHECK (NOT (`IsPreview` = 1 AND `IsAtivo` = 1))',
    );
    await q(
      'INSERT INTO `Menu` (`Payload`, `PayloadPreview`, `RestauranteId`, `IsPreview`, `IsAtivo`) ' +
        'SELECT `PayloadPreview`, `PayloadPreview`, `RestauranteId`, 1, 0 FROM `Menu` WHERE `IsAtivo` = 1',
    );
    await q('ALTER TABLE `Menu` DROP COLUMN `PayloadPreview`');
  }

  private async bancoAtual(queryRunner: QueryRunner): Promise<string> {
    const [{ banco }] = (await queryRunner.query(
      'SELECT DATABASE() AS banco',
    )) as {
      banco: string;
    }[];
    return banco;
  }
}
