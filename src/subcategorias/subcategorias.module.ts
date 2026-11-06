import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from '../categorias/categoria.entity.js';
import { SubCategoria } from './subcategoria.entity.js';
import { SubCategoriasController } from './subcategorias.controller.js';
import { SubCategoriasService } from './subcategorias.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SubCategoria, Categoria])],
  controllers: [SubCategoriasController],
  providers: [SubCategoriasService],
})
export class SubCategoriasModule {}
