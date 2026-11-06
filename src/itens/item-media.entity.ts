import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Item } from './item.entity.js';

/** Valores de ItemMedia.Tipo */
export const TIPOS_MEDIA = {
  /** Imagem */
  I: 'Imagem',
  /** Vídeo */
  V: 'Vídeo',
} as const;
export type TipoMedia = keyof typeof TIPOS_MEDIA;

/** Tabela "ItemMedia": foto ou vídeo de um item, na ordem de exibição. */
@Entity('ItemMedia')
@Index('IX_ItemMedia_ItemId_Ordem', ['itemId', 'ordem'])
export class ItemMedia {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  @Column({ name: 'ItemId', type: 'int' })
  itemId: number;

  /** "I" = imagem, "V" = vídeo */
  @Column({ name: 'Tipo', type: 'char', length: 1 })
  tipo: TipoMedia;

  /** URL completa do arquivo (storage/CDN) */
  @Column({ name: 'Url', type: 'varchar', length: 255 })
  url: string;

  /** Posição na galeria do item (crescente) */
  @Column({ name: 'Ordem', type: 'int', default: 0 })
  ordem: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ItemId', foreignKeyConstraintName: 'FK_ItemMedia_Item' })
  item?: Relation<Item>;
}
