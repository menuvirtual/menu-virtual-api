/** Totais por restaurante, para o dashboard do admin */
export class ResumoRestaurante {
  id: number;
  nome: string;
  slug: string;
  /** Quantidade de menus */
  menus: number;
  /** Id do menu ativo (publicado), se houver */
  menuAtivoId: number | null;
  /** Quantidade de clientes */
  clientes: number;
}

/** Totais para o dashboard do admin */
export class Resumo {
  restaurantes: number;
  menus: number;
  categorias: number;
  subCategorias: number;
  itens: number;
  /** Itens com Visivel = false */
  itensOcultos: number;
  clientes: number;
  tags: number;
  porRestaurante: ResumoRestaurante[];
}
