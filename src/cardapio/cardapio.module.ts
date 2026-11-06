import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../menus/menu.entity.js';
import { CardapioController } from './cardapio.controller.js';
import {
  CardapioRepository,
  CardapioTypeOrmRepository,
} from './cardapio.repository.js';
import { CardapioService } from './cardapio.service.js';

/** Endpoint público do cardápio: GET /menu */
@Module({
  imports: [TypeOrmModule.forFeature([Menu])],
  controllers: [CardapioController],
  providers: [
    CardapioService,
    { provide: CardapioRepository, useClass: CardapioTypeOrmRepository },
  ],
})
export class CardapioModule {}
