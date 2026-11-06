import { gerarClientes, type Aleatorio } from './gerador-clientes.js';

/** Gerador pseudo-aleatório determinístico (mulberry32) */
function semente(inicial: number): Aleatorio {
  let estado = inicial;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOJE = new Date('2026-10-31T12:00:00Z');
const opcoes = (s = 1) => ({ aleatorio: semente(s), hoje: HOJE });

describe('gerarClientes', () => {
  it('gera a quantidade pedida (inclusive zero)', () => {
    expect(gerarClientes(0, opcoes())).toEqual([]);
    expect(gerarClientes(50, opcoes())).toHaveLength(50);
  });

  it('é determinístico para a mesma semente e varia entre sementes', () => {
    expect(gerarClientes(10, opcoes(7))).toEqual(gerarClientes(10, opcoes(7)));
    expect(gerarClientes(10, opcoes(7))).not.toEqual(
      gerarClientes(10, opcoes(8)),
    );
  });

  it('nomes completos (nome + sobrenome) e sem repetição', () => {
    const clientes = gerarClientes(200, opcoes());
    for (const { nome } of clientes)
      expect(nome.split(' ').length).toBeGreaterThanOrEqual(2);
    expect(new Set(clientes.map((c) => c.nome)).size).toBe(200);
  });

  it('e-mails válidos, em minúsculas, sem acento e únicos (inclusive os já existentes)', () => {
    const existentes = ['ana.silva@gmail.com'];
    const clientes = gerarClientes(300, {
      ...opcoes(),
      emailsExistentes: existentes,
    });
    const emails = clientes.flatMap((c) => (c.email ? [c.email] : []));
    for (const email of emails)
      expect(email).toMatch(/^[a-z0-9.]+@[a-z0-9.]+\.[a-z.]+$/);
    expect(new Set(emails).size).toBe(emails.length);
    expect(emails).not.toContain('ana.silva@gmail.com');
  });

  it('datas de nascimento existem no calendário, são de maiores de idade e não são futuras', () => {
    const datas = gerarClientes(500, opcoes()).flatMap((c) =>
      c.dataNascimento ? [c.dataNascimento] : [],
    );
    expect(datas.length).toBeGreaterThan(400);
    for (const data of datas) {
      expect(data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(`${data}T00:00:00Z`);
      expect(d.toISOString().startsWith(data)).toBe(true); // sem 30/02 etc.
      const anos = (HOJE.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      expect(anos).toBeGreaterThanOrEqual(18);
      expect(anos).toBeLessThanOrEqual(76);
    }
  });

  it('telefones no formato +55 DDD 9XXXX-XXXX', () => {
    const telefones = gerarClientes(300, opcoes()).flatMap((c) =>
      c.phone ? [c.phone] : [],
    );
    expect(telefones.length).toBeGreaterThan(200);
    for (const phone of telefones)
      expect(phone).toMatch(/^\+55 \d{2} 9\d{4}-\d{4}$/);
  });

  it('alguns dados opcionais faltam, mas todo cliente tem e-mail ou telefone', () => {
    const clientes = gerarClientes(500, opcoes());
    expect(clientes.some((c) => c.dataNascimento === null)).toBe(true);
    expect(clientes.some((c) => c.email === null)).toBe(true);
    expect(clientes.some((c) => c.phone === null)).toBe(true);
    expect(clientes.every((c) => c.email !== null || c.phone !== null)).toBe(
      true,
    );
  });

  it('respeita os limites do banco (nome e e-mail até 255, telefone até 30)', () => {
    for (const c of gerarClientes(300, opcoes())) {
      expect(c.nome.length).toBeLessThanOrEqual(255);
      expect(c.email?.length ?? 0).toBeLessThanOrEqual(255);
      expect(c.phone?.length ?? 0).toBeLessThanOrEqual(30);
    }
  });
});
