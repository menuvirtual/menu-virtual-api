import type { MigrationInterface } from 'typeorm';
import { CriarRestauranteEMenuPayload1793204024816 } from './1793204024816-CriarRestauranteEMenuPayload.js';
import { DominioCardapio1793321075304 } from './1793321075304-DominioCardapio.js';
import { UsuarioRestaurante1793328215237 } from './1793328215237-UsuarioRestaurante.js';
import { PayloadPreviewNoMenu1793349000000 } from './1793349000000-PayloadPreviewNoMenu.js';
import { ContemAtualizacaoParaPublicar1793350000000 } from './1793350000000-ContemAtualizacaoParaPublicar.js';
import { NomeDoMenu1793351000000 } from './1793351000000-NomeDoMenu.js';

/**
 * Migrations aplicadas, em ordem. Ao gerar uma nova migration, registre a classe aqui.
 */
export const migrations: (new () => MigrationInterface)[] = [
  CriarRestauranteEMenuPayload1793204024816,
  DominioCardapio1793321075304,
  UsuarioRestaurante1793328215237,
  PayloadPreviewNoMenu1793349000000,
  ContemAtualizacaoParaPublicar1793350000000,
  NomeDoMenu1793351000000,
];
