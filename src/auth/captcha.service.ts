// Captcha temporariamente desativado; implementação preservada para retomada.
// import { BadRequestException, Injectable } from '@nestjs/common';
// import {
//   createChallenge,
//   randomInt,
//   verifySolution,
//   type Challenge,
//   type Payload,
// } from 'altcha-lib';
// import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
// import { createHmac } from 'node:crypto';
// import { configuracao } from '../configuracao.js';
//
// /**
//  * Captcha do login com ALTCHA (https://altcha.org): em vez de imagens, o navegador
//  * resolve uma prova de trabalho (~1 s) assinada pela API. Encarece robôs e ataques
//  * de força bruta, sem serviço externo nem rastreamento do usuário.
//  *
//  * Cada desafio vale por `configuracao.captcha.validadeSegundos` e só pode ser usado
//  * uma vez. Os desafios usados ficam em memória: com mais de uma instância da API,
//  * troque por um armazenamento compartilhado (ex.: Redis).
//  */
// @Injectable()
// export class CaptchaService {
//   private readonly segredo = configuracao.captcha.segredo;
//   private readonly segredoChave = createHmac('sha256', this.segredo)
//     .update('chave')
//     .digest('hex');
//   /** nonce do desafio já usado -> expira em (ms) */
//   private readonly usados = new Map<string, number>();
//
//   /** Novo desafio para o widget (GET /auth/captcha). */
//   criarDesafio(): Promise<Challenge> {
//     return createChallenge({
//       algorithm: 'PBKDF2/SHA-256',
//       cost: 1_000,
//       counter: randomInt(2_000, 5_000),
//       deriveKey,
//       hmacSignatureSecret: this.segredo,
//       hmacKeySignatureSecret: this.segredoChave,
//       expiresAt: new Date(
//         Date.now() + configuracao.captcha.validadeSegundos * 1000,
//       ),
//     });
//   }
//
//   /**
//    * Valida a resposta do widget (base64 do JSON { challenge, solution }).
//    * 400 se for inválida, expirada ou já usada.
//    */
//   async exigirValido(resposta: string): Promise<void> {
//     let payload: Payload;
//     try {
//       payload = JSON.parse(
//         Buffer.from(resposta, 'base64').toString('utf8'),
//       ) as Payload;
//     } catch {
//       throw this.invalido();
//     }
//     if (!payload?.challenge?.parameters || !payload.solution)
//       throw this.invalido();
//
//     const resultado = await verifySolution({
//       challenge: payload.challenge,
//       solution: payload.solution,
//       deriveKey,
//       hmacSignatureSecret: this.segredo,
//       hmacKeySignatureSecret: this.segredoChave,
//     }).catch(() => null);
//     if (resultado?.expired)
//       throw new BadRequestException(
//         'A verificação de segurança expirou. Marque "Não sou um robô" de novo.',
//       );
//     if (!resultado?.verified) throw this.invalido();
//
//     this.limparExpirados();
//     const { nonce, expiresAt } = payload.challenge.parameters;
//     if (this.usados.has(nonce)) throw this.invalido();
//     this.usados.set(nonce, (expiresAt ?? 0) * 1000 || Date.now() + 3_600_000);
//   }
//
//   private limparExpirados(): void {
//     const agora = Date.now();
//     for (const [nonce, expira] of this.usados)
//       if (expira < agora) this.usados.delete(nonce);
//   }
//
//   private invalido(): BadRequestException {
//     return new BadRequestException(
//       'Verificação de segurança inválida. Marque "Não sou um robô" de novo.',
//     );
//   }
// }
//

export {};
