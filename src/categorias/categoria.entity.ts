import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Menu } from '../menus/menu.entity.js';

/**
 * Tabela "Categoria": seção do cardápio (ex.: Entradas, Bebidas) de um menu.
 * Descrição em 6 idiomas (PT obrigatório). Excluir a categoria exclui as
 * subcategorias e itens dela.
 */
@Entity('Categoria')
@Index('IX_Categoria_MenuId_Ordem', ['menuId', 'ordem'])
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  @Column({ name: 'MenuId', type: 'int' })
  menuId: number;

  /** Posição no cardápio (crescente) */
  @Column({ name: 'Ordem', type: 'int', default: 0 })
  ordem: number;

  @Column({ name: 'DescricaoPT', type: 'varchar', length: 255 })
  descricaoPT: string;

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

  @ManyToOne(() => Menu, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'MenuId', foreignKeyConstraintName: 'FK_Categoria_Menu' })
  menu?: Relation<Menu>;
}
