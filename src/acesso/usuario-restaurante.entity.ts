import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Restaurante } from '../restaurantes/restaurante.entity.js';

/**
 * Tabela "UsuarioRestaurante": restaurantes que cada usuário (do Cognito) administra.
 *
 * O usuário é identificado pelo username do Cognito (claim "username" do access
 * token; a comparação não diferencia maiúsculas de minúsculas, pelo collation).
 * Superusuários (grupo do Cognito, ver configuracao.cognito.grupoSuperUsuario)
 * acessam todos os restaurantes e não precisam de linhas aqui.
 */
@Entity('UsuarioRestaurante')
export class UsuarioRestaurante {
  @PrimaryColumn({ name: 'Usuario', type: 'varchar', length: 128 })
  usuario: string;

  @PrimaryColumn({ name: 'RestauranteId', type: 'int' })
  restauranteId: number;

  @ManyToOne(() => Restaurante, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'RestauranteId',
    foreignKeyConstraintName: 'FK_UsuarioRestaurante_Restaurante',
  })
  restaurante?: Relation<Restaurante>;
}
