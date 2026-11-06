import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Formato aceito para o nome do restaurante na URL: "casa-lusitana", "casa-chef"... */
export const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TAMANHO_MAXIMO_SLUG = 60;

/**
 * Valida o parâmetro "restaurante" (coluna Restaurante.Slug), dando erro claro (400)
 * para valores inválidos antes de consultar o banco.
 */
@Injectable()
export class SlugPipe implements PipeTransform<unknown, string> {
  transform(valor: unknown): string {
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new BadRequestException(
        'Informe o restaurante, ex.: GET /menu?restaurante=casa-lusitana',
      );
    }
    const slug = valor.trim().toLowerCase();
    if (slug.length > TAMANHO_MAXIMO_SLUG || !REGEX_SLUG.test(slug)) {
      throw new BadRequestException(
        'Parâmetro "restaurante" inválido: use letras minúsculas, números e hífen (ex.: casa-lusitana).',
      );
    }
    return slug;
  }
}
