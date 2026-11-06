import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../menus/menu.entity.js';
import { CategoriasController } from './categorias.controller.js';
import { Categoria } from './categoria.entity.js';
import { CategoriasService } from './categorias.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria, Menu])],
  controllers: [CategoriasController],
  providers: [CategoriasService],
})
export class CategoriasModule {}
