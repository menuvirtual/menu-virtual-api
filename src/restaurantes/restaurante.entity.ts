import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Tabela "Restaurante".
 *
 * Um restaurante tem vários menus (Menu) e clientes (Cliente). Não pode ser
 * excluído enquanto tiver menus ou clientes (FK com ON DELETE RESTRICT).
 */
@Entity('Restaurante')
export class Restaurante {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  /** Nome do restaurante */
  @Column({ name: 'Nome', type: 'varchar', length: 120 })
  nome: string;

  /** Chave usada na URL do cardápio: GET /menu?restaurante=<slug> (ex.: "casa-lusitana") */
  @Index('UQ_Restaurante_Slug', { unique: true })
  @Column({ name: 'Slug', type: 'varchar', length: 60 })
  slug: string;
}
