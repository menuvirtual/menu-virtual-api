import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Tabela "Tag": rótulo aplicável aos itens (ex.: "Sem glúten", "Vegano").
 * É global (compartilhada por todos os restaurantes); a ligação com os itens
 * fica na tabela ItemTag. Descrição em 6 idiomas (PT obrigatório).
 */
@Entity('Tag')
export class Tag {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

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

  /** true = aparece na lista de filtros do cardápio (ex.: "Vegano") */
  @Column({ name: 'VisibleLista', type: 'boolean', default: true })
  visibleLista: boolean;
}
