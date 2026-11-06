import { Global, Module } from '@nestjs/common';
import { AtualizadorPreview } from './atualizador-preview.js';
import { MenuEventos } from './menu-eventos.service.js';

/**
 * Preview do menu: o evento menu.alterado (MenuEventos) e o handler que regenera o
 * PayloadPreview (AtualizadorPreview). Global para os serviços do cardápio emitirem o evento.
 */
@Global()
@Module({
  providers: [MenuEventos, AtualizadorPreview],
  exports: [MenuEventos, AtualizadorPreview],
})
export class PreviewModule {}
