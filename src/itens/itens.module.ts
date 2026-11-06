import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import { Tag } from '../tags/tag.entity.js';
import { ItemMedia } from './item-media.entity.js';
import { ItemMediasController } from './item-medias.controller.js';
import { ItemMediasService } from './item-medias.service.js';
import { Item } from './item.entity.js';
import { ItensController } from './itens.controller.js';
import { ItensService } from './itens.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemMedia, SubCategoria, Tag])],
  controllers: [ItensController, ItemMediasController],
  providers: [ItensService, ItemMediasService],
})
export class ItensModule {}
