import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Categoria } from '../categorias/categoria.entity.js';

/**
 * Tabela "SubCategoria": agrupamento dentro de uma categoria (ex.: Bebidas >
 * Vinhos tintos). Descrição em 6 idiomas (PT obrigatório). Excluir a
 * subcategoria exclui os itens dela.
 */
@Entity('SubCategoria')
@Index('IX_SubCategoria_CategoriaId_Ordem', ['categoriaId', 'ordem'])
export class SubCategoria {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  @Column({ name: 'CategoriaId', type: 'int' })
  categoriaId: number;

  /** Posição dentro da categoria (crescente) */
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

  @ManyToOne(() => Categoria, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'CategoriaId',
    foreignKeyConstraintName: 'FK_SubCategoria_Categoria',
  })
  categoria?: Relation<Categoria>;
}
