import { PartialType } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';
import { Aparar } from '../comum/idiomas.dto.js';
import { IdObrigatorio, OrdemOpcional } from '../comum/validacoes.js';
import { TIPOS_MEDIA, type TipoMedia } from './item-media.entity.js';

export class CreateItemMediaDto {
  /** Item da mídia */
  @IdObrigatorio()
  itemId: number;

  /** "I" = imagem, "V" = vídeo */
  @IsIn(Object.keys(TIPOS_MEDIA), {
    message: 'tipo deve ser "I" (imagem) ou "V" (vídeo).',
  })
  tipo: TipoMedia;

  /**
   * URL completa do arquivo
   * @example "https://cdn.exemplo.com/imagens/casa-lusitana/picanha.jpg"
   */
  @Aparar()
  @IsNotEmpty({ message: 'url é obrigatória.' })
  @MaxLength(255, { message: 'url deve ter no máximo 255 caracteres.' })
  @IsUrl(
    {
      require_tld: false,
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'url deve ser uma URL http(s) válida.' },
  )
  url: string;

  /** Posição na galeria do item. Se omitida na criação, vai para o fim. */
  @OrdemOpcional()
  ordem?: number;
}

export class UpdateItemMediaDto extends PartialType(CreateItemMediaDto) {}
