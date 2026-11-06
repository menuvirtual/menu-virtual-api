import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Not,
  type EntityManager,
  type FindOptionsSelect,
  type Repository,
} from 'typeorm';
import { AcessoService } from '../acesso/acesso.service.js';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado.js';
import { ServicoCrud } from '../comum/servico-crud.js';
import { montarPayload } from '../preview/montador-payload.js';
import { MenuEventos } from '../preview/menu-eventos.service.js';
import { PAYLOAD_PADRAO } from '../preview/payload-padrao.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import type { CreateMenuDto, UpdateMenuDto } from './menu.dto.js';
import { Menu } from './menu.entity.js';

/** Colunas da listagem (sem os payloads, que são grandes) */
const COLUNAS_LISTAGEM: FindOptionsSelect<Menu> = {
  id: true,
  nome: true,
  restauranteId: true,
  isAtivo: true,
  contemAtualizacaoParaPublicar: true,
  restaurante: { id: true, nome: true, slug: true },
};

@Injectable()
export class MenusService extends ServicoCrud<Menu> {
  constructor(
    @InjectRepository(Menu) repositorio: Repository<Menu>,
    acesso: AcessoService,
    eventos: MenuEventos,
    private readonly dataSource: DataSource,
  ) {
    super(repositorio, 'Menu', acesso, 'menu', eventos, { restaurante: true });
  }

  /** Lista os menus (sem os payloads) de um restaurante ou de todos os que o usuário administra. */
  async listar(
    usuario: UsuarioAutenticado,
    restauranteId?: number,
  ): Promise<Menu[]> {
    if (restauranteId) this.acesso.exigirRestaurante(usuario, restauranteId);
    const permitidos = this.acesso.restaurantesPermitidos(usuario);
    if (!restauranteId && permitidos && !permitidos.length) return [];
    return this.repositorio.find({
      select: COLUNAS_LISTAGEM,
      relations: { restaurante: true },
      where: restauranteId
        ? { restauranteId }
        : permitidos
          ? { restauranteId: In(permitidos) }
          : {},
      order: { restauranteId: 'ASC', id: 'DESC' },
    });
  }

  /**
   * Cria um menu vazio (sem categorias). O JSON inicial (Payload e PayloadPreview, iguais)
   * é montado com o nome do restaurante e os textos, moeda e redes sociais do menu ativo
   * dele (ou os padrões, se ainda não houver menu ativo).
   */
  criar(dto: CreateMenuDto, usuario: UsuarioAutenticado): Promise<Menu> {
    this.acesso.exigirRestaurante(usuario, dto.restauranteId);
    return this.dataSource.transaction(async (manager) => {
      const restaurante = await this.travarRestaurante(
        manager,
        dto.restauranteId,
      );
      // lido antes de desativar o menu ativo (se este novo menu for ativado)
      const ativo = await manager.findOneBy(Menu, {
        restauranteId: dto.restauranteId,
        isAtivo: true,
      });
      await this.exigirNomeLivre(manager, dto.restauranteId, dto.nome);
      const menu = manager.create(Menu, {
        restauranteId: dto.restauranteId,
        nome: dto.nome,
        isAtivo: dto.isAtivo ?? false,
        contemAtualizacaoParaPublicar: false,
      });
      menu.payload = montarPayload(
        {
          restauranteNome: restaurante.nome,
          configuracao: null,
          categorias: [],
          subCategorias: [],
          itens: [],
          medias: [],
        },
        ativo?.payload ?? PAYLOAD_PADRAO,
      );
      menu.payloadPreview = menu.payload;
      if (menu.isAtivo) await this.desativarOutros(manager, menu);
      const { id } = await manager.save(menu);
      return this.obterCom(manager, id);
    });
  }

  /** Nome e situação (ativo/inativo) são editáveis; os JSON são gerados pela API. */
  async atualizar(
    id: number,
    dto: UpdateMenuDto,
    usuario: UsuarioAutenticado,
  ): Promise<Menu> {
    await this.exigirAcesso(id, usuario);
    return this.dataSource.transaction(async (manager) => {
      const menu = await manager.findOneBy(Menu, { id });
      if (!menu) throw this.naoEncontrado(id);
      await this.travarRestaurante(manager, menu.restauranteId);
      if (dto.nome !== undefined) {
        // o DTO de alteração aceita omitir o nome, mas não esvaziá-lo (o Aparar transforma "  " em null)
        if (!dto.nome) throw new BadRequestException('nome é obrigatório.');
        if (dto.nome !== menu.nome)
          await this.exigirNomeLivre(manager, menu.restauranteId, dto.nome, id);
      }
      manager.merge(Menu, menu, dto);
      if (menu.isAtivo) await this.desativarOutros(manager, menu);
      await manager.save(menu);
      return this.obterCom(manager, id);
    });
  }

  /**
   * Publica as atualizações: copia o PayloadPreview para o Payload e desliga
   * ContemAtualizacaoParaPublicar. Se o menu estiver ativo, o GET /menu já passa a
   * devolver a nova versão. 409 se não houver nada para publicar.
   *
   * Trava a linha do menu, como o handler do preview: uma publicação nunca copia um
   * preview que está sendo regenerado naquele instante.
   */
  async publicar(id: number, usuario: UsuarioAutenticado): Promise<Menu> {
    await this.exigirAcesso(id, usuario);
    return this.dataSource.transaction(async (manager) => {
      const menu = await manager.findOne(Menu, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!menu) throw this.naoEncontrado(id);
      if (!menu.contemAtualizacaoParaPublicar)
        throw new ConflictException(
          'Este menu não tem atualizações para publicar.',
        );
      menu.payload = menu.payloadPreview;
      menu.contemAtualizacaoParaPublicar = false;
      await manager.save(menu);
      return this.obterCom(manager, id);
    });
  }

  /**
   * Trava a linha do restaurante (SELECT ... FOR UPDATE) para que gravações
   * simultâneas de menus do mesmo restaurante sejam feitas uma de cada vez.
   */
  private async travarRestaurante(
    manager: EntityManager,
    restauranteId: number,
  ): Promise<Restaurante> {
    const restaurante = await manager.findOne(Restaurante, {
      where: { id: restauranteId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!restaurante)
      throw new NotFoundException(
        `Restaurante ${restauranteId} não encontrado(a).`,
      );
    return restaurante;
  }

  /** 409 se o restaurante já tem outro menu com esse nome. */
  private async exigirNomeLivre(
    manager: EntityManager,
    restauranteId: number,
    nome: string,
    exceto?: number,
  ): Promise<void> {
    const existe = await manager.existsBy(Menu, {
      restauranteId,
      nome,
      ...(exceto ? { id: Not(exceto) } : {}),
    });
    if (existe)
      throw new ConflictException(
        `Já existe um menu chamado "${nome}" neste restaurante.`,
      );
  }

  /** Regra de negócio (ver Menu): ativar um menu desativa o que estava ativo no restaurante. */
  private async desativarOutros(
    manager: EntityManager,
    menu: Menu,
  ): Promise<void> {
    await manager.update(
      Menu,
      {
        ...(menu.id ? { id: Not(menu.id) } : {}),
        restauranteId: menu.restauranteId,
        isAtivo: true,
      },
      { isAtivo: false },
    );
  }

  private obterCom(manager: EntityManager, id: number): Promise<Menu> {
    return manager.findOneOrFail(Menu, {
      where: { id },
      relations: { restaurante: true },
    });
  }
}
