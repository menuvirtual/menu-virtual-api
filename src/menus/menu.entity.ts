import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import type { MenuPayload } from '../cardapio/cardapio.types.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';

/**
 * Tabela "Menu": uma versão do cardápio de um restaurante.
 *
 * Cada menu guarda dois JSON no formato MenuPayload, que o usuário só pode ver:
 * - Payload: a versão publicada, que o GET /menu devolve quando o menu está ativo;
 * - PayloadPreview: a versão de pré-visualização, que o GET /menu?preview=true devolve,
 *   também do menu ativo. É gerada a partir das tabelas a cada escrita (evento
 *   menu.alterado) e vai para o Payload quando o usuário publica.
 *
 * Regra de negócio: um restaurante pode ter vários menus, mas **só 1 ativo**
 * (IsAtivo = true). Ao ativar um menu, MenusService desativa o que estava ativo
 * (na mesma transação, com lock na linha do restaurante); no banco, o índice único
 * sobre a coluna gerada AtivoRestauranteId (NULL quando inativo) garante a regra.
 *
 * Excluir um menu exclui em cascata a configuração, categorias, subcategorias,
 * itens e mídias dele.
 */
@Entity('Menu')
@Index('UQ_Menu_Restaurante_Nome', ['restauranteId', 'nome'], { unique: true })
export class Menu {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  /**
   * Identificador do menu no admin (ex.: "Menu dia", "Menu noite", "Menu drinks").
   * Não aparece no cardápio nem no JSON. Único por restaurante.
   */
  @Column({ name: 'Nome', type: 'varchar', length: 80 })
  nome: string;

  /**
   * Versão publicada: JSON que o GET /menu devolve (formato MenuPayload).
   * Só leitura para o usuário: vem da publicação do preview (POST /admin/menus/:id/publicar).
   */
  @Column({ name: 'Payload', type: 'json' })
  payload: MenuPayload;

  /**
   * Versão de pré-visualização: JSON que o GET /menu?preview=true devolve (formato MenuPayload).
   * Só leitura para o usuário: é regenerado a partir das tabelas (categorias, itens...)
   * a cada escrita no menu (ver src/preview).
   */
  @Column({ name: 'PayloadPreview', type: 'json' })
  payloadPreview: MenuPayload;

  @Column({ name: 'RestauranteId', type: 'int' })
  restauranteId: number;

  /**
   * true quando o PayloadPreview tem mudanças ainda não publicadas: liga a cada escrita
   * em registros do menu (e em tags/restaurante que o afetem) e desliga ao publicar.
   */
  @Column({
    name: 'ContemAtualizacaoParaPublicar',
    type: 'boolean',
    default: false,
  })
  contemAtualizacaoParaPublicar: boolean;

  /** true = menu publicado (no máximo 1 por restaurante) */
  @Column({ name: 'IsAtivo', type: 'boolean', default: false })
  isAtivo: boolean;

  /** Coluna gerada: RestauranteId quando IsAtivo = 1; garante 1 ativo por restaurante */
  @ApiHideProperty()
  @Index('UQ_Menu_Ativo', { unique: true })
  @Column({
    name: 'AtivoRestauranteId',
    type: 'int',
    nullable: true,
    generatedType: 'STORED',
    asExpression: 'CASE WHEN `IsAtivo` = 1 THEN `RestauranteId` END',
    insert: false,
    update: false,
    select: false,
  })
  ativoRestauranteId?: number | null;

  @ManyToOne(() => Restaurante, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'RestauranteId',
    foreignKeyConstraintName: 'FK_Menu_Restaurante',
  })
  restaurante?: Relation<Restaurante>;
}
