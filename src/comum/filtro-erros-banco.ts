import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

/** Mensagens das violações de índice único, pelo nome do índice. */
const MENSAGENS_UNICIDADE: Record<string, string> = {
  UQ_Restaurante_Slug: 'Já existe um restaurante com esse slug.',
  UQ_Menu_Ativo: 'O restaurante já possui um menu ativo.',
  UQ_Menu_Restaurante_Nome:
    'Já existe um menu com esse nome neste restaurante.',
  UQ_ConfiguracaoMenu_MenuId: 'Esse menu já possui configuração.',
};

interface ErroMysql {
  code?: string;
  sqlMessage?: string;
}

/**
 * Traduz erros de integridade do MySQL em respostas HTTP (em vez de 500):
 * - registro duplicado (índice único)        -> 409
 * - exclusão de registro ainda referenciado  -> 409
 * - referência a registro inexistente (FK)   -> 400
 * - violação de CHECK                        -> 400
 *
 * Os serviços já validam esses casos antes de gravar; este filtro é a rede de
 * segurança para condições de corrida e casos não previstos.
 */
@Catch(QueryFailedError)
export class FiltroErrosBanco
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(FiltroErrosBanco.name);

  catch(erro: QueryFailedError, host: ArgumentsHost): void {
    const traduzido = this.traduzir(erro.driverError as ErroMysql);
    if (!traduzido) {
      super.catch(erro, host);
      return;
    }
    this.logger.debug(erro.message);
    super.catch(traduzido, host);
  }

  private traduzir(erro: ErroMysql): HttpException | null {
    switch (erro.code) {
      case 'ER_DUP_ENTRY': {
        const indice = /for key '(?:[^.']+\.)?([^']+)'/.exec(
          erro.sqlMessage ?? '',
        )?.[1];
        return new ConflictException(
          (indice && MENSAGENS_UNICIDADE[indice]) ?? 'Registro duplicado.',
        );
      }
      case 'ER_ROW_IS_REFERENCED':
      case 'ER_ROW_IS_REFERENCED_2':
        return new ConflictException(
          'Não é possível excluir: existem registros vinculados a este.',
        );
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        return new BadRequestException('Registro relacionado não encontrado.');
      case 'ER_CHECK_CONSTRAINT_VIOLATED':
        return new BadRequestException(
          'Os dados violam uma regra do banco de dados.',
        );
      default:
        return null;
    }
  }
}
