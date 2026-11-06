/*
 * Dados aleatórios (mas plausíveis) de clientes, para desenvolvimento e demonstração.
 * Função pura: recebe o gerador de números aleatórios, então os testes são determinísticos.
 */

/** Número em [0, 1), como Math.random */
export type Aleatorio = () => number;

export interface DadosCliente {
  nome: string;
  /** AAAA-MM-DD (maior de idade, nunca no futuro) ou null */
  dataNascimento: string | null;
  email: string | null;
  phone: string | null;
}

const NOMES = [
  'Ana',
  'Beatriz',
  'Bruna',
  'Camila',
  'Carla',
  'Carolina',
  'Clara',
  'Daniela',
  'Eduarda',
  'Fernanda',
  'Gabriela',
  'Helena',
  'Isabela',
  'Juliana',
  'Larissa',
  'Letícia',
  'Luana',
  'Luiza',
  'Marcela',
  'Mariana',
  'Natália',
  'Patrícia',
  'Rafaela',
  'Renata',
  'Sofia',
  'Tatiane',
  'Vanessa',
  'Vitória',
  'Yasmin',
  'Aline',
  'André',
  'Antônio',
  'Bruno',
  'Caio',
  'Carlos',
  'Daniel',
  'Diego',
  'Eduardo',
  'Felipe',
  'Fernando',
  'Gabriel',
  'Gustavo',
  'Henrique',
  'Igor',
  'João',
  'José',
  'Leonardo',
  'Lucas',
  'Luís',
  'Marcelo',
  'Marcos',
  'Mateus',
  'Nicolas',
  'Paulo',
  'Pedro',
  'Rafael',
  'Ricardo',
  'Rodrigo',
  'Thiago',
  'Vinícius',
];

const SOBRENOMES = [
  'Almeida',
  'Alves',
  'Araújo',
  'Barbosa',
  'Barros',
  'Batista',
  'Borges',
  'Campos',
  'Cardoso',
  'Carvalho',
  'Castro',
  'Coelho',
  'Costa',
  'Cunha',
  'Dias',
  'Duarte',
  'Freitas',
  'Fernandes',
  'Ferreira',
  'Garcia',
  'Gomes',
  'Gonçalves',
  'Lima',
  'Lopes',
  'Machado',
  'Marques',
  'Martins',
  'Melo',
  'Mendes',
  'Moraes',
  'Moreira',
  'Moura',
  'Nascimento',
  'Nunes',
  'Oliveira',
  'Pereira',
  'Pinto',
  'Ramos',
  'Reis',
  'Ribeiro',
  'Rocha',
  'Rodrigues',
  'Santos',
  'Silva',
  'Soares',
  'Sousa',
  'Teixeira',
  'Vieira',
];

const PROVEDORES = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com.br',
  'uol.com.br',
  'icloud.com',
];

/** DDDs das principais cidades */
const DDDS = [11, 19, 21, 27, 31, 41, 47, 51, 61, 71, 81, 85];

/** Chance de um dado opcional não ter sido informado pelo cliente */
const CHANCE_SEM_DADO = 0.1;

const IDADE_MINIMA = 18;
const IDADE_MAXIMA = 75;

const sortear = <T>(lista: readonly T[], aleatorio: Aleatorio): T =>
  lista[Math.floor(aleatorio() * lista.length)];

const inteiro = (
  minimo: number,
  maximo: number,
  aleatorio: Aleatorio,
): number => minimo + Math.floor(aleatorio() * (maximo - minimo + 1));

/** "José Araújo" -> "jose.araujo" */
function paraEmail(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function dataNascimento(aleatorio: Aleatorio, hoje: Date): string {
  const anoHoje = hoje.getUTCFullYear();
  const ano = inteiro(
    anoHoje - IDADE_MAXIMA,
    anoHoje - IDADE_MINIMA,
    aleatorio,
  );
  const mes = inteiro(1, 12, aleatorio);
  // até o dia 28 existe em todos os meses (sem 30/02 nem 29/02 em ano não bissexto)
  const dia = inteiro(1, 28, aleatorio);
  // No ano-limite, mês/dia depois de hoje ainda são menores de idade: recua um ano.
  const fezAniversario =
    mes < hoje.getUTCMonth() + 1 ||
    (mes === hoje.getUTCMonth() + 1 && dia <= hoje.getUTCDate());
  const anoFinal =
    ano === anoHoje - IDADE_MINIMA && !fezAniversario ? ano - 1 : ano;
  return `${anoFinal}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** "+55 11 98765-4321" */
function telefone(aleatorio: Aleatorio): string {
  const ddd = sortear(DDDS, aleatorio);
  const parte1 = String(inteiro(0, 9999, aleatorio)).padStart(4, '0');
  const parte2 = String(inteiro(0, 9999, aleatorio)).padStart(4, '0');
  return `+55 ${ddd} 9${parte1}-${parte2}`;
}

/**
 * Gera `quantidade` clientes. Os e-mails são únicos dentro do lote (e entre os
 * `emailsExistentes`). Cerca de 10% dos clientes não informam data de nascimento, e-mail
 * ou telefone, mas todo cliente tem ao menos um contato (e-mail ou telefone).
 */
export function gerarClientes(
  quantidade: number,
  {
    aleatorio = Math.random,
    hoje = new Date(),
    emailsExistentes = [] as string[],
  } = {},
): DadosCliente[] {
  const emailsUsados = new Set(emailsExistentes.map((e) => e.toLowerCase()));
  const nomesUsados = new Set<string>();
  const clientes: DadosCliente[] = [];

  while (clientes.length < quantidade) {
    const nomeCompleto = [
      sortear(NOMES, aleatorio),
      sortear(SOBRENOMES, aleatorio),
      ...(aleatorio() < 0.5 ? [sortear(SOBRENOMES, aleatorio)] : []),
    ].join(' ');
    if (nomesUsados.has(nomeCompleto)) continue;
    nomesUsados.add(nomeCompleto);

    let email: string | null = null;
    const base = paraEmail(nomeCompleto);
    for (let tentativa = 0; tentativa < 20 && !email; tentativa++) {
      const candidato = `${base}${aleatorio() < 0.4 ? inteiro(1, 99, aleatorio) : ''}@${sortear(PROVEDORES, aleatorio)}`;
      if (!emailsUsados.has(candidato)) email = candidato;
    }

    const semEmail = aleatorio() < CHANCE_SEM_DADO;
    const semTelefone = aleatorio() < CHANCE_SEM_DADO;
    const mantemEmail = !semEmail || semTelefone; // ao menos um contato
    if (mantemEmail && email) emailsUsados.add(email);

    clientes.push({
      nome: nomeCompleto,
      dataNascimento:
        aleatorio() < CHANCE_SEM_DADO ? null : dataNascimento(aleatorio, hoje),
      email: mantemEmail ? email : null,
      phone: semTelefone ? null : telefone(aleatorio),
    });
  }
  return clientes;
}
