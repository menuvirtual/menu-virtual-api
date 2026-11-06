import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcessoModule } from './acesso/acesso.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CardapioModule } from './cardapio/cardapio.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { FiltroErrosBanco } from './comum/filtro-erros-banco.js';
import { PipeValidacao } from './comum/pipe-validacao.js';
import { opcoesBanco } from './database/opcoes-banco.js';
import { ItensModule } from './itens/itens.module.js';
import { MenusModule } from './menus/menus.module.js';
import { PreviewModule } from './preview/preview.module.js';
import { RestaurantesModule } from './restaurantes/restaurantes.module.js';
import { ResumoModule } from './resumo/resumo.module.js';
import { SubCategoriasModule } from './subcategorias/subcategorias.module.js';
import { TagsModule } from './tags/tags.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot(opcoesBanco()),
    // Login e proteção das rotas (Bearer token do Cognito) + regras de acesso por restaurante
    AuthModule,
    AcessoModule,
    // Eventos (menu.alterado) que mantêm o PayloadPreview em dia
    EventEmitterModule.forRoot(),
    PreviewModule,
    // Público
    CardapioModule,
    // Admin (/admin/...)
    RestaurantesModule,
    MenusModule,
    CategoriasModule,
    SubCategoriasModule,
    ItensModule,
    ClientesModule,
    TagsModule,
    ResumoModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: PipeValidacao },
    { provide: APP_FILTER, useClass: FiltroErrosBanco },
  ],
})
export class AppModule {}
