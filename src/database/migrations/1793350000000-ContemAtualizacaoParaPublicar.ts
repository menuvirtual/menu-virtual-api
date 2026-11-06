import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Menu.ContemAtualizacaoParaPublicar: true quando o PayloadPreview tem mudanças
 * ainda não publicadas (qualquer escrita em registros do menu liga a flag; "Publicar"
 * copia o preview para o Payload e desliga). Os menus existentes já têm preview e
 * payload iguais, então começam com false.
 */
export class ContemAtualizacaoParaPublicar1793350000000 implements MigrationInterface {
  name = 'ContemAtualizacaoParaPublicar1793350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `Menu` ADD `ContemAtualizacaoParaPublicar` tinyint NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `Menu` DROP COLUMN `ContemAtualizacaoParaPublicar`',
    );
  }
}
