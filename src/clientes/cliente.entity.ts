import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Restaurante } from '../restaurantes/restaurante.entity.js';

/** Tabela "Cliente": cliente de um restaurante (ex.: vindo da pesquisa no cardápio). */
@Entity('Cliente')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  @Column({ name: 'RestauranteId', type: 'int' })
  restauranteId: number;

  @Column({ name: 'Nome', type: 'varchar', length: 255 })
  nome: string;

  /** Data de nascimento, "AAAA-MM-DD" (só a data: sem hora/fuso) */
  @Column({ name: 'DataNascimento', type: 'date', nullable: true })
  dataNascimento: string | null;

  @Column({ name: 'Email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'Phone', type: 'varchar', length: 255, nullable: true })
  phone: string | null;

  @ManyToOne(() => Restaurante, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'RestauranteId',
    foreignKeyConstraintName: 'FK_Cliente_Restaurante',
  })
  restaurante?: Relation<Restaurante>;
}
