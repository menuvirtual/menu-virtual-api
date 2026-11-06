import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Domínio do cardápio (menudomain):
 * - MenuPayload -> Menu (+ IsAtivo). Os dados existentes são mantidos: os menus não-preview
 *   ficam ativos (a tabela antiga garantia no máximo 1 por restaurante).
 * - Regras do Menu no banco: colunas geradas + índices únicos (1 preview e 1 ativo por
 *   restaurante) e CHECK (preview nunca ativo).
 * - Novas tabelas: ConfiguracaoMenu, Categoria, SubCategoria, Item, ItemMedia, Tag,
 *   ItemTag e Cliente.
 * - Restaurante não é mais excluído em cascata com os menus (ON DELETE RESTRICT).
 */
export class DominioCardapio1793321075304 implements MigrationInterface {
  name = 'DominioCardapio1793321075304';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string, parametros?: unknown[]) =>
      queryRunner.query(sql, parametros);

    // MenuPayload -> Menu
    await q(
      'ALTER TABLE `MenuPayload` DROP FOREIGN KEY `FK_MenuPayload_Restaurante`',
    );
    await q(
      'DROP INDEX `UQ_MenuPayload_RestauranteId_IsPreview` ON `MenuPayload`',
    );
    await q('RENAME TABLE `MenuPayload` TO `Menu`');
    await q('ALTER TABLE `Menu` ADD `IsAtivo` tinyint NOT NULL DEFAULT 0');
    await q('UPDATE `Menu` SET `IsAtivo` = 1 WHERE `IsPreview` = 0');
    await q(
      'ALTER TABLE `Menu`' +
        ' ADD `PreviewRestauranteId` int AS (CASE WHEN `IsPreview` = 1 THEN `RestauranteId` END) STORED NULL,' +
        ' ADD `AtivoRestauranteId` int AS (CASE WHEN `IsAtivo` = 1 THEN `RestauranteId` END) STORED NULL',
    );
    // Registro das colunas geradas, usado pelo TypeORM para comparar o schema
    const banco = await this.bancoAtual(queryRunner);
    for (const [coluna, expressao] of [
      [
        'PreviewRestauranteId',
        'CASE WHEN `IsPreview` = 1 THEN `RestauranteId` END',
      ],
      [
        'AtivoRestauranteId',
        'CASE WHEN `IsAtivo` = 1 THEN `RestauranteId` END',
      ],
    ])
      await q(
        'INSERT INTO `typeorm_metadata` (`database`, `schema`, `table`, `type`, `name`, `value`) VALUES (DEFAULT, ?, ?, ?, ?, ?)',
        [banco, 'Menu', 'GENERATED_COLUMN', coluna, expressao],
      );
    await q(
      'CREATE UNIQUE INDEX `UQ_Menu_Preview` ON `Menu` (`PreviewRestauranteId`)',
    );
    await q(
      'CREATE UNIQUE INDEX `UQ_Menu_Ativo` ON `Menu` (`AtivoRestauranteId`)',
    );
    await q(
      'ALTER TABLE `Menu` ADD CONSTRAINT `CHK_Menu_PreviewInativo` CHECK (NOT (`IsPreview` = 1 AND `IsAtivo` = 1))',
    );
    await q(
      'ALTER TABLE `Menu` ADD CONSTRAINT `FK_Menu_Restaurante` FOREIGN KEY (`RestauranteId`) REFERENCES `Restaurante`(`Id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    );

    // Novas tabelas
    await q(
      'CREATE TABLE `ConfiguracaoMenu` (`Id` int NOT NULL AUTO_INCREMENT, `MenuId` int NOT NULL, `HabilitaPT` tinyint NOT NULL DEFAULT 1, `HabilitaEN` tinyint NOT NULL DEFAULT 0, `HabilitaES` tinyint NOT NULL DEFAULT 0, `HabilitaFR` tinyint NOT NULL DEFAULT 0, `HabilitaPL` tinyint NOT NULL DEFAULT 0, `HabilitaDE` tinyint NOT NULL DEFAULT 0, `HabilitaPesquisaCliente` tinyint NOT NULL DEFAULT 0, `HabilitaPesquisaClienteNome` tinyint NOT NULL DEFAULT 0, `HabilitaPesquisaClienteDataNiver` tinyint NOT NULL DEFAULT 0, `HabilitaPesquisaClienteEmail` tinyint NOT NULL DEFAULT 0, `HabilitaPesquisaClientePhone` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX `UQ_ConfiguracaoMenu_MenuId` (`MenuId`), PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );
    await q(
      'CREATE TABLE `Categoria` (`Id` int NOT NULL AUTO_INCREMENT, `MenuId` int NOT NULL, `Ordem` int NOT NULL DEFAULT 0, `DescricaoPT` varchar(255) NOT NULL, `DescricaoEN` varchar(255) NULL, `DescricaoES` varchar(255) NULL, `DescricaoFR` varchar(255) NULL, `DescricaoPL` varchar(255) NULL, `DescricaoDE` varchar(255) NULL, INDEX `IX_Categoria_MenuId_Ordem` (`MenuId`, `Ordem`), PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );
    await q(
      'CREATE TABLE `SubCategoria` (`Id` int NOT NULL AUTO_INCREMENT, `CategoriaId` int NOT NULL, `Ordem` int NOT NULL DEFAULT 0, `DescricaoPT` varchar(255) NOT NULL, `DescricaoEN` varchar(255) NULL, `DescricaoES` varchar(255) NULL, `DescricaoFR` varchar(255) NULL, `DescricaoPL` varchar(255) NULL, `DescricaoDE` varchar(255) NULL, INDEX `IX_SubCategoria_CategoriaId_Ordem` (`CategoriaId`, `Ordem`), PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );
    await q(
      'CREATE TABLE `Item` (`Id` int NOT NULL AUTO_INCREMENT, `SubCategoriaId` int NOT NULL, `Ordem` int NOT NULL DEFAULT 0, `NomePT` varchar(255) NOT NULL, `NomeEN` varchar(255) NULL, `NomeES` varchar(255) NULL, `NomeFR` varchar(255) NULL, `NomePL` varchar(255) NULL, `NomeDE` varchar(255) NULL, `DescricaoPT` varchar(255) NULL, `DescricaoEN` varchar(255) NULL, `DescricaoES` varchar(255) NULL, `DescricaoFR` varchar(255) NULL, `DescricaoPL` varchar(255) NULL, `DescricaoDE` varchar(255) NULL, `Visivel` tinyint NOT NULL DEFAULT 1, INDEX `IX_Item_SubCategoriaId_Ordem` (`SubCategoriaId`, `Ordem`), PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );
    await q(
      'CREATE TABLE `ItemMedia` (`Id` int NOT NULL AUTO_INCREMENT, `ItemId` int NOT NULL, `Tipo` char(1) NOT NULL, `Url` varchar(255) NOT NULL, `Ordem` int NOT NULL DEFAULT 0, INDEX `IX_ItemMedia_ItemId_Ordem` (`ItemId`, `Ordem`), PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );
    await q(
      'CREATE TABLE `Tag` (`Id` int NOT NULL AUTO_INCREMENT, `DescricaoPT` varchar(255) NOT NULL, `DescricaoEN` varchar(255) NULL, `DescricaoES` varchar(255) NULL, `DescricaoFR` varchar(255) NULL, `DescricaoPL` varchar(255) NULL, `DescricaoDE` varchar(255) NULL, `VisibleLista` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );
    // Índices com o nome que o TypeORM gera para a tabela de ligação
    await q(
      'CREATE TABLE `ItemTag` (`ItemId` int NOT NULL, `TagId` int NOT NULL, INDEX `IDX_767f6ff5ff5f4b59aeb37f5027` (`ItemId`), INDEX `IDX_c41960231a84c5f51ee064e520` (`TagId`), PRIMARY KEY (`ItemId`, `TagId`)) ENGINE=InnoDB',
    );
    await q(
      'CREATE TABLE `Cliente` (`Id` int NOT NULL AUTO_INCREMENT, `RestauranteId` int NOT NULL, `Nome` varchar(255) NOT NULL, `DataNascimento` date NULL, `Email` varchar(255) NULL, `Phone` varchar(255) NULL, PRIMARY KEY (`Id`)) ENGINE=InnoDB',
    );

    // Chaves estrangeiras
    await q(
      'ALTER TABLE `ConfiguracaoMenu` ADD CONSTRAINT `FK_ConfiguracaoMenu_Menu` FOREIGN KEY (`MenuId`) REFERENCES `Menu`(`Id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await q(
      'ALTER TABLE `Categoria` ADD CONSTRAINT `FK_Categoria_Menu` FOREIGN KEY (`MenuId`) REFERENCES `Menu`(`Id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await q(
      'ALTER TABLE `SubCategoria` ADD CONSTRAINT `FK_SubCategoria_Categoria` FOREIGN KEY (`CategoriaId`) REFERENCES `Categoria`(`Id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await q(
      'ALTER TABLE `Item` ADD CONSTRAINT `FK_Item_SubCategoria` FOREIGN KEY (`SubCategoriaId`) REFERENCES `SubCategoria`(`Id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await q(
      'ALTER TABLE `ItemMedia` ADD CONSTRAINT `FK_ItemMedia_Item` FOREIGN KEY (`ItemId`) REFERENCES `Item`(`Id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await q(
      'ALTER TABLE `ItemTag` ADD CONSTRAINT `FK_ItemTag_Item` FOREIGN KEY (`ItemId`) REFERENCES `Item`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await q(
      'ALTER TABLE `ItemTag` ADD CONSTRAINT `FK_ItemTag_Tag` FOREIGN KEY (`TagId`) REFERENCES `Tag`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await q(
      'ALTER TABLE `Cliente` ADD CONSTRAINT `FK_Cliente_Restaurante` FOREIGN KEY (`RestauranteId`) REFERENCES `Restaurante`(`Id`) ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }

  /**
   * Volta ao schema anterior. ATENÇÃO: apaga as novas tabelas e os menus não-preview
   * inativos (a tabela antiga só comportava 1 menu não-preview por restaurante).
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string, parametros?: unknown[]) =>
      queryRunner.query(sql, parametros);

    for (const tabela of [
      'ItemTag',
      'ItemMedia',
      'Item',
      'SubCategoria',
      'Categoria',
      'ConfiguracaoMenu',
      'Tag',
      'Cliente',
    ])
      await q(`DROP TABLE \`${tabela}\``);

    await q('ALTER TABLE `Menu` DROP FOREIGN KEY `FK_Menu_Restaurante`');
    await q('DROP INDEX `FK_Menu_Restaurante` ON `Menu`');
    await q('ALTER TABLE `Menu` DROP CHECK `CHK_Menu_PreviewInativo`');
    await q('DROP INDEX `UQ_Menu_Ativo` ON `Menu`');
    await q('DROP INDEX `UQ_Menu_Preview` ON `Menu`');
    await q(
      "DELETE FROM `typeorm_metadata` WHERE `type` = 'GENERATED_COLUMN' AND `table` = 'Menu' AND `schema` = ?",
      [await this.bancoAtual(queryRunner)],
    );
    await q(
      'ALTER TABLE `Menu` DROP COLUMN `AtivoRestauranteId`, DROP COLUMN `PreviewRestauranteId`',
    );
    await q('DELETE FROM `Menu` WHERE `IsPreview` = 0 AND `IsAtivo` = 0');
    await q('ALTER TABLE `Menu` DROP COLUMN `IsAtivo`');
    await q('RENAME TABLE `Menu` TO `MenuPayload`');
    await q(
      'CREATE UNIQUE INDEX `UQ_MenuPayload_RestauranteId_IsPreview` ON `MenuPayload` (`RestauranteId`, `IsPreview`)',
    );
    await q(
      'ALTER TABLE `MenuPayload` ADD CONSTRAINT `FK_MenuPayload_Restaurante` FOREIGN KEY (`RestauranteId`) REFERENCES `Restaurante`(`Id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  private async bancoAtual(queryRunner: QueryRunner): Promise<string> {
    const [{ banco }] = (await queryRunner.query(
      'SELECT DATABASE() AS banco',
    )) as { banco: string }[];
    return banco;
  }
}
