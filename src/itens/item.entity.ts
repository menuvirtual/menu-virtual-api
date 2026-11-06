import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import { Tag } from '../tags/tag.entity.js';

/**
 * Tabela "Item": produto do cardápio, dentro de uma subcategoria.
 * Nome (PT obrigatório) e descrição (opcional) em 6 idiomas.
 *
 * - Tags: N:N pela tabela "ItemTag" (ItemId, TagId).
 * - Fotos/vídeos: tabela "ItemMedia".
 * Excluir o item exclui as mídias e as ligações com tags.
 */
@Entity('Item')
@Index('IX_Item_SubCategoriaId_Ordem', ['subCategoriaId', 'ordem'])
export class Item {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  @Column({ name: 'SubCategoriaId', type: 'int' })
  subCategoriaId: number;

  /** Posição dentro da subcategoria (crescente) */
  @Column({ name: 'Ordem', type: 'int', default: 0 })
  ordem: number;

  @Column({ name: 'NomePT', type: 'varchar', length: 255 })
  nomePT: string;

  @Column({ name: 'NomeEN', type: 'varchar', length: 255, nullable: true })
  nomeEN: string | null;

  @Column({ name: 'NomeES', type: 'varchar', length: 255, nullable: true })
  nomeES: string | null;

  @Column({ name: 'NomeFR', type: 'varchar', length: 255, nullable: true })
  nomeFR: string | null;

  @Column({ name: 'NomePL', type: 'varchar', length: 255, nullable: true })
  nomePL: string | null;

  @Column({ name: 'NomeDE', type: 'varchar', length: 255, nullable: true })
  nomeDE: string | null;

  @Column({ name: 'DescricaoPT', type: 'varchar', length: 255, nullable: true })
  descricaoPT: string | null;

  @Column({ name: 'DescricaoEN', type: 'varchar', length: 255, nullable: true })
  descricaoEN: string | null;

  @Column({ name: 'DescricaoES', type: 'varchar', length: 255, nullable: true })
  descricaoES: string | null;

  @Column({ name: 'DescricaoFR', type: 'varchar', length: 255, nullable: true })
  descricaoFR: string | null;

  @Column({ name: 'DescricaoPL', type: 'varchar', length: 255, nullable: true })
  descricaoPL: string | null;

  @Column({ name: 'DescricaoDE', type: 'varchar', length: 255, nullable: true })
  descricaoDE: string | null;

  /** false = item escondido do cardápio */
  @Column({ name: 'Visivel', type: 'boolean', default: true })
  visivel: boolean;

  @ManyToOne(() => SubCategoria, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'SubCategoriaId',
    foreignKeyConstraintName: 'FK_Item_SubCategoria',
  })
  subCategoria?: Relation<SubCategoria>;

  /** Tags do item (tabela de ligação ItemTag) */
  @ManyToMany(() => Tag, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'ItemTag',
    joinColumn: {
      name: 'ItemId',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_ItemTag_Item',
    },
    inverseJoinColumn: {
      name: 'TagId',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_ItemTag_Tag',
    },
  })
  tags?: Relation<Tag>[];
}
