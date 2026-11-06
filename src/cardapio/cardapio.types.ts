/*
 * Formato do payload do cardápio (coluna Menu.Payload).
 *
 * O payload já vem pronto para o FrontEnd: textos com todos os idiomas,
 * URLs completas das imagens etc. A API devolve o payload como está.
 *
 * São classes (e não interfaces) para que o Swagger consiga documentar o formato.
 * Prefixo "Payload" para não conflitar com as entidades (Restaurante, Categoria, Item...).
 */
import { ApiProperty } from '@nestjs/swagger';

/** Código de idioma, ex.: "pt", "en", "es" */
export type CodigoIdioma = string;

/** Texto por idioma, ex.: { pt: "Bebidas", en: "Drinks", es: "Bebidas" } */
export type Traducao = Record<CodigoIdioma, string>;

/** Esquema Swagger de um texto traduzido */
const TRADUCAO = {
  type: 'object',
  additionalProperties: { type: 'string' },
  description: 'Texto por idioma (chave = código do idioma)',
  example: { pt: 'Bebidas', en: 'Drinks', es: 'Bebidas' },
} as const;

export class PayloadMoeda {
  @ApiProperty({ example: 'BRL' })
  codigo: string;

  @ApiProperty({ example: 'R$' })
  simbolo: string;

  @ApiProperty({
    example: 'pt-BR',
    description: 'Locale para formatar os preços',
  })
  locale: string;
}

export class PayloadRedesSociais {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'https://instagram.com/casalusitana',
  })
  instagram: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  facebook: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description: 'Link de avaliação no Google',
  })
  avaliacaoGoogle: string | null;
}

export class PayloadIdioma {
  @ApiProperty({ example: 'pt' })
  codigo: CodigoIdioma;

  @ApiProperty({ example: 'PT', description: 'Texto do botão de idioma' })
  rotulo: string;

  @ApiProperty({ example: 'Português' })
  nome: string;

  @ApiProperty({ example: 'pt-BR' })
  locale: string;
}

export class PayloadRotulo {
  @ApiProperty({ example: 'vegano' })
  id: string;

  @ApiProperty(TRADUCAO)
  nome: Traducao;
}

export class PayloadItem {
  @ApiProperty({ example: 'cartuxa-colheita' })
  id: string;

  @ApiProperty(TRADUCAO)
  nome: Traducao;

  @ApiProperty({ ...TRADUCAO, nullable: true })
  descricao: Traducao | null;

  @ApiProperty({
    type: 'array',
    items: { type: 'number', nullable: true },
    example: [49, 289],
    description:
      'Um preço por coluna da subcategoria; null = não disponível nesse tamanho',
  })
  precos: (number | null)[];

  @ApiProperty({
    type: [String],
    example: ['http://localhost:3000/imagens/casa-lusitana/cartuxa.jpg'],
    description: 'URLs completas das imagens; lista vazia = item sem foto',
  })
  fotos: string[];

  @ApiProperty({
    type: [String],
    example: ['semGluten'],
    description: 'Ids de "filtros" que o item atende',
  })
  dieta: string[];

  @ApiProperty({ type: [PayloadRotulo] })
  tags: PayloadRotulo[];
}

export class PayloadSubcategoria {
  @ApiProperty({ example: 'vinhos-tintos' })
  id: string;

  @ApiProperty(TRADUCAO)
  nome: Traducao;

  @ApiProperty({
    type: 'array',
    items: TRADUCAO,
    minItems: 1,
    maxItems: 4,
    description: 'Rótulos das colunas de preço (1 a 4)',
    example: [
      { pt: 'Taça', en: 'Glass', es: 'Copa' },
      { pt: 'Garrafa', en: 'Bottle', es: 'Botella' },
    ],
  })
  colunas: Traducao[];

  @ApiProperty({ type: [PayloadItem] })
  itens: PayloadItem[];
}

export class PayloadCategoria {
  @ApiProperty({ example: 'bebidas' })
  id: string;

  @ApiProperty(TRADUCAO)
  nome: Traducao;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'bi-cup-straw',
    description: 'Classe do Bootstrap Icons',
  })
  icone: string | null;

  @ApiProperty({ type: [PayloadSubcategoria] })
  subcategorias: PayloadSubcategoria[];
}

export class PayloadRestaurante {
  @ApiProperty({
    ...TRADUCAO,
    example: { pt: 'Casa Lusitana', en: 'Casa Lusitana', es: 'Casa Lusitana' },
  })
  nome: Traducao;

  @ApiProperty({
    ...TRADUCAO,
    nullable: true,
    example: {
      pt: 'Cozinha portuguesa & vinhos',
      en: 'Portuguese cuisine & wines',
    },
  })
  slogan: Traducao | null;
}

export class MenuPayload {
  @ApiProperty({ type: PayloadRestaurante })
  restaurante: PayloadRestaurante;

  @ApiProperty({ type: PayloadMoeda })
  moeda: PayloadMoeda;

  @ApiProperty({
    type: [PayloadIdioma],
    description: 'Idiomas configurados (botões PT / EN / ES...)',
  })
  idiomas: PayloadIdioma[];

  @ApiProperty({ example: 'pt' })
  idiomaPadrao: CodigoIdioma;

  @ApiProperty({
    type: 'object',
    additionalProperties: TRADUCAO,
    description:
      'Textos fixos da interface (botões, popups, mensagens), por chave',
    example: { 'filtro.botao': { pt: 'Filtrar', en: 'Filter', es: 'Filtrar' } },
  })
  textos: Record<string, Traducao>;

  @ApiProperty({
    type: [PayloadRotulo],
    description: 'Opções do popup "Filtrar"',
  })
  filtros: PayloadRotulo[];

  @ApiProperty({ type: PayloadRedesSociais })
  redesSociais: PayloadRedesSociais;

  @ApiProperty({ type: [PayloadCategoria] })
  categorias: PayloadCategoria[];
}
