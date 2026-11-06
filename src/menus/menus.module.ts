import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoMenu } from './configuracao-menu.entity.js';
import { ConfiguracoesMenuController } from './configuracoes-menu.controller.js';
import { ConfiguracoesMenuService } from './configuracoes-menu.service.js';
import { Menu } from './menu.entity.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Menu, ConfiguracaoMenu])],
  controllers: [MenusController, ConfiguracoesMenuController],
  providers: [MenusService, ConfiguracoesMenuService],
})
export class MenusModule {}
