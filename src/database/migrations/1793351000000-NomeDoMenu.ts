import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Menu.Nome: identificador do menu no admin (ex.: "Menu dia", "Menu noite", "Menu drinks").
 * Não aparece no cardápio nem no JSON. Obrigatório e único por restaurante.
 *
 * Os menus que já existem recebem um nome: "Menu principal" para o ativo e "Menu <id>"
 * para os demais (únicos, pois o id é único).
 */
export class NomeDoMenu1793351000000 implements MigrationInterface {
  name = 'NomeDoMenu1793351000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q('ALTER TABLE `Menu` ADD `Nome` varchar(80) NULL');
    await q(
      "UPDATE `Menu` SET `Nome` = IF(`IsAtivo` = 1, 'Menu principal', CONCAT('Menu ', `Id`))",
    );
    await q('ALTER TABLE `Menu` MODIFY `Nome` varchar(80) NOT NULL');
    await q(
      'CREATE UNIQUE INDEX `UQ_Menu_Restaurante_Nome` ON `Menu` (`RestauranteId`, `Nome`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // O índice único começa por RestauranteId, e a FK FK_Menu_Restaurante usa esse índice: o
    // MySQL só deixa removê-lo se a FK tiver outro à disposição. Então: solta a FK, remove o
    // índice único e a coluna, e recria a FK (que cria o índice próprio dela).
    await queryRunner.query(
      'ALTER TABLE `Menu` DROP FOREIGN KEY `FK_Menu_Restaurante`',
    );
    await queryRunner.query('DROP INDEX `UQ_Menu_Restaurante_Nome` ON `Menu`');
    await queryRunner.query('ALTER TABLE `Menu` DROP COLUMN `Nome`');
    await queryRunner.query(
      'ALTER TABLE `Menu` ADD CONSTRAINT `FK_Menu_Restaurante` FOREIGN KEY (`RestauranteId`) REFERENCES `Restaurante`(`Id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }
}
