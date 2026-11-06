import { UsuarioRestaurante } from '../acesso/usuario-restaurante.entity.js';
import { Categoria } from '../categorias/categoria.entity.js';
import { Cliente } from '../clientes/cliente.entity.js';
import { ItemMedia } from '../itens/item-media.entity.js';
import { Item } from '../itens/item.entity.js';
import { ConfiguracaoMenu } from '../menus/configuracao-menu.entity.js';
import { Menu } from '../menus/menu.entity.js';
import { Restaurante } from '../restaurantes/restaurante.entity.js';
import { SubCategoria } from '../subcategorias/subcategoria.entity.js';
import { Tag } from '../tags/tag.entity.js';

/** Todas as entidades do TypeORM (registradas explicitamente, sem glob). */
export const entidades = [
  Restaurante,
  Menu,
  ConfiguracaoMenu,
  Categoria,
  SubCategoria,
  Item,
  ItemMedia,
  Tag,
  Cliente,
  UsuarioRestaurante,
];
