import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Menu } from './menu.entity.js';

/**
 * Tabela "ConfiguracaoMenu": opções de um menu (1:1 com Menu, garantido pelo
 * índice único UQ_ConfiguracaoMenu_MenuId).
 *
 * - Habilita<Idioma>: idiomas oferecidos no cardápio.
 * - HabilitaPesquisaCliente*: pesquisa/cadastro do cliente exibido no cardápio e
 *   quais campos ele pede (nome, data de aniversário, e-mail, telefone).
 */
@Entity('ConfiguracaoMenu')
export class ConfiguracaoMenu {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  /** Menu configurado (cada menu tem no máximo uma configuração) */
  @Index('UQ_ConfiguracaoMenu_MenuId', { unique: true })
  @Column({ name: 'MenuId', type: 'int' })
  menuId: number;

  @Column({ name: 'HabilitaPT', type: 'boolean', default: true })
  habilitaPT: boolean;

  @Column({ name: 'HabilitaEN', type: 'boolean', default: false })
  habilitaEN: boolean;

  @Column({ name: 'HabilitaES', type: 'boolean', default: false })
  habilitaES: boolean;

  @Column({ name: 'HabilitaFR', type: 'boolean', default: false })
  habilitaFR: boolean;

  @Column({ name: 'HabilitaPL', type: 'boolean', default: false })
  habilitaPL: boolean;

  @Column({ name: 'HabilitaDE', type: 'boolean', default: false })
  habilitaDE: boolean;

  /** Exibe a pesquisa/cadastro do cliente no cardápio */
  @Column({ name: 'HabilitaPesquisaCliente', type: 'boolean', default: false })
  habilitaPesquisaCliente: boolean;

  /** A pesquisa pede o nome */
  @Column({
    name: 'HabilitaPesquisaClienteNome',
    type: 'boolean',
    default: false,
  })
  habilitaPesquisaClienteNome: boolean;

  /** A pesquisa pede a data de aniversário */
  @Column({
    name: 'HabilitaPesquisaClienteDataNiver',
    type: 'boolean',
    default: false,
  })
  habilitaPesquisaClienteDataNiver: boolean;

  /** A pesquisa pede o e-mail */
  @Column({
    name: 'HabilitaPesquisaClienteEmail',
    type: 'boolean',
    default: false,
  })
  habilitaPesquisaClienteEmail: boolean;

  /** A pesquisa pede o telefone */
  @Column({
    name: 'HabilitaPesquisaClientePhone',
    type: 'boolean',
    default: false,
  })
  habilitaPesquisaClientePhone: boolean;

  @ManyToOne(() => Menu, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'MenuId',
    foreignKeyConstraintName: 'FK_ConfiguracaoMenu_Menu',
  })
  menu?: Relation<Menu>;
}
