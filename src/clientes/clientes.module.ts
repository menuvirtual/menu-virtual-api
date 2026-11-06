import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { Cliente } from './cliente.entity.js';
import { ClientesController } from './clientes.controller.js';
import { ClientesService } from './clientes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, Restaurante])],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
