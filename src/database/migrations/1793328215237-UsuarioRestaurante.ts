import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Restaurantes que cada usuário do Cognito administra (superusuários acessam todos
 * pelo grupo do Cognito e não precisam de linhas aqui).
 */

export class UsuarioRestaurante1793328215237 implements MigrationInterface {
  name = 'UsuarioRestaurante1793328215237';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`UsuarioRestaurante\` (\`Usuario\` varchar(128) NOT NULL, \`RestauranteId\` int NOT NULL, PRIMARY KEY (\`Usuario\`, \`RestauranteId\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`UsuarioRestaurante\` ADD CONSTRAINT \`FK_UsuarioRestaurante_Restaurante\` FOREIGN KEY (\`RestauranteId\`) REFERENCES \`Restaurante\`(\`Id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`UsuarioRestaurante\` DROP FOREIGN KEY \`FK_UsuarioRestaurante_Restaurante\``,
    );
    await queryRunner.query(`DROP TABLE \`UsuarioRestaurante\``);
  }
}
