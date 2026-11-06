import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurante } from './restaurante.entity.js';
import { RestaurantesController } from './restaurantes.controller.js';
import { RestaurantesService } from './restaurantes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurante])],
  controllers: [RestaurantesController],
  providers: [RestaurantesService],
})
export class RestaurantesModule {}
