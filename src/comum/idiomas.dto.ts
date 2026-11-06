/*
 * Campos traduzidos usados por várias entidades (uma coluna por idioma:
 * PT, EN, ES, FR, PL, DE). O PT é obrigatório onde o texto é obrigatório;
 * os demais são opcionais (null = sem tradução).
 */
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { aplicar } from './validacoes.js';

/** Siglas dos idiomas suportados, na ordem em que aparecem no admin. */
export const IDIOMAS = ['PT', 'EN', 'ES', 'FR', 'PL', 'DE'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Remove espaços das pontas; texto vazio vira null. */
export const Aparar = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  );

/** Texto obrigatório (padrão: até 255 caracteres). */
export const TextoObrigatorio = (tamanhoMaximo = 255) =>
  aplicar(
    Aparar(),
    IsNotEmpty({ message: '$property é obrigatório.' }),
    IsString({ message: '$property deve ser um texto.' }),
    MaxLength(tamanhoMaximo, {
      message: '$property deve ter no máximo $constraint1 caracteres.',
    }),
  );

/** Texto opcional (padrão: até 255 caracteres; null/vazio = sem texto). */
export const TextoOpcional = (tamanhoMaximo = 255) =>
  aplicar(
    Aparar(),
    IsOptional(),
    IsString({ message: '$property deve ser um texto.' }),
    MaxLength(tamanhoMaximo, {
      message: '$property deve ter no máximo $constraint1 caracteres.',
    }),
  );

/** Descrição em 6 idiomas; PT obrigatório. */
export class DescricoesDto {
  /** Descrição em português */
  @TextoObrigatorio()
  descricaoPT: string;

  /** Descrição em inglês */
  @TextoOpcional()
  descricaoEN?: string | null;

  /** Descrição em espanhol */
  @TextoOpcional()
  descricaoES?: string | null;

  /** Descrição em francês */
  @TextoOpcional()
  descricaoFR?: string | null;

  /** Descrição em polonês */
  @TextoOpcional()
  descricaoPL?: string | null;

  /** Descrição em alemão */
  @TextoOpcional()
  descricaoDE?: string | null;
}

/** Descrição em 6 idiomas; todas opcionais. */
export class DescricoesOpcionaisDto {
  /** Descrição em português */
  @TextoOpcional()
  descricaoPT?: string | null;

  /** Descrição em inglês */
  @TextoOpcional()
  descricaoEN?: string | null;

  /** Descrição em espanhol */
  @TextoOpcional()
  descricaoES?: string | null;

  /** Descrição em francês */
  @TextoOpcional()
  descricaoFR?: string | null;

  /** Descrição em polonês */
  @TextoOpcional()
  descricaoPL?: string | null;

  /** Descrição em alemão */
  @TextoOpcional()
  descricaoDE?: string | null;
}

/** Nome em 6 idiomas; PT obrigatório. */
export class NomesDto {
  /** Nome em português */
  @TextoObrigatorio()
  nomePT: string;

  /** Nome em inglês */
  @TextoOpcional()
  nomeEN?: string | null;

  /** Nome em espanhol */
  @TextoOpcional()
  nomeES?: string | null;

  /** Nome em francês */
  @TextoOpcional()
  nomeFR?: string | null;

  /** Nome em polonês */
  @TextoOpcional()
  nomePL?: string | null;

  /** Nome em alemão */
  @TextoOpcional()
  nomeDE?: string | null;
}
