import { NotFoundException } from '@nestjs/common';
import type {
  FindOptionsRelations,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import type { AcessoService, Alvo } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import type { MenuEventos } from '../preview/menu-eventos.service.js';

/**
 * Operações comuns dos CRUDs: buscar por id e excluir, sempre conferindo se o
 * usuário administra o restaurante do registro (404 se não existir, 403 sem acesso).
 *
 * Registros que fazem parte de um menu (configuração, categoria, subcategoria, item,
 * mídia) avisam o menu depois de gravar (notificarMenus -> evento menu.alterado), para o
 * preview ser regenerado.
 */
export abstract class ServicoCrud<T extends ObjectLiteral & { id: number }> {
  protected constructor(
    protected readonly repositorio: Repository<T>,
    /** Nome usado nas mensagens, ex.: "Restaurante" */
    private readonly nomeEntidade: string,
    protected readonly acesso: AcessoService,
    /** Tipo de registro para as regras de acesso (null = não depende de restaurante) */
    private readonly alvo: Alvo | null,
    protected readonly eventos: MenuEventos,
    /** Relações carregadas ao buscar por id */
    private readonly relacoes: FindOptionsRelations<T> = {},
  ) {}

  async obter(id: number, usuario: UsuarioAutenticado): Promise<T> {
    await this.exigirAcesso(id, usuario);
    return this.buscar(id);
  }

  async remover(id: number, usuario: UsuarioAutenticado): Promise<void> {
    await this.exigirAcesso(id, usuario);
    // o menu precisa ser descoberto antes: depois de excluir o registro, não dá mais
    const menuId = await this.menuDoRegistro(id);
    const resultado = await this.repositorio.delete(id);
    if (!resultado.affected) throw this.naoEncontrado(id);
    await this.notificarMenus(menuId);
  }

  /** 404 se o registro não existir; 403 se for de um restaurante que o usuário não administra. */
  protected async exigirAcesso(
    id: number,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    if (this.alvo) await this.acesso.exigir(usuario, this.alvo, id);
  }

  /** Menu a que o registro pertence (null para o que não faz parte de um menu). */
  protected menuDoRegistro(id: number): Promise<number | null> {
    return this.alvo
      ? this.eventos.menuDe(this.alvo, id)
      : Promise.resolve(null);
  }

  /** Avisa que os menus mudaram: o preview deles é regenerado e eles passam a ter algo a publicar. */
  protected notificarMenus(...menuIds: (number | null)[]): Promise<void> {
    return this.eventos.notificar(menuIds, this.nomeEntidade);
  }

  /** Busca por id, sem conferir acesso (uso interno, depois de exigirAcesso). */
  protected async buscar(id: number): Promise<T> {
    const entidade = await this.repositorio.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations: this.relacoes,
    });
    if (!entidade) throw this.naoEncontrado(id);
    return entidade;
  }

  protected naoEncontrado(id: number): NotFoundException {
    return new NotFoundException(
      `${this.nomeEntidade} ${id} não encontrado(a).`,
    );
  }
}
