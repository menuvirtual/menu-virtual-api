import type { MenuPayload } from '../cardapio/cardapio.types.js';

/**
 * Base dos textos fixos da interface, moeda e redes sociais para o primeiro menu de um
 * restaurante (os menus seguintes copiam do menu ativo do restaurante). O que vem das
 * tabelas (nome do restaurante, idiomas, categorias, itens...) é preenchido pelo montador.
 */
export const PAYLOAD_PADRAO: MenuPayload = {
  restaurante: {
    nome: {
      pt: '',
    },
    slogan: null,
  },
  moeda: {
    codigo: 'BRL',
    simbolo: 'R$',
    locale: 'pt-BR',
  },
  idiomas: [
    {
      codigo: 'pt',
      rotulo: 'PT',
      nome: 'Português',
      locale: 'pt-BR',
    },
    {
      codigo: 'en',
      rotulo: 'EN',
      nome: 'English',
      locale: 'en',
    },
    {
      codigo: 'es',
      rotulo: 'ES',
      nome: 'Español',
      locale: 'es',
    },
  ],
  idiomaPadrao: 'pt',
  textos: {
    'rodape.precosEm': {
      pt: 'Preços em',
      en: 'Prices in',
      es: 'Precios en',
    },
    'rodape.imagensIlustrativas': {
      pt: 'Imagens meramente ilustrativas.',
      en: 'Images for illustration purposes only.',
      es: 'Imágenes meramente ilustrativas.',
    },
    'rodape.avaliarGoogle': {
      pt: 'Avalie-nos no Google',
      en: 'Review us on Google',
      es: 'Califícanos en Google',
    },
    'geral.fechar': {
      pt: 'Fechar',
      en: 'Close',
      es: 'Cerrar',
    },
    'carrossel.anterior': {
      pt: 'Anterior',
      en: 'Previous',
      es: 'Anterior',
    },
    'carrossel.proxima': {
      pt: 'Próxima',
      en: 'Next',
      es: 'Siguiente',
    },
    'carrossel.foto': {
      pt: 'Foto',
      en: 'Photo',
      es: 'Foto',
    },
    'carrossel.fotos': {
      pt: 'fotos',
      en: 'photos',
      es: 'fotos',
    },
    'fonte.diminuir': {
      pt: 'Diminuir letras',
      en: 'Smaller text',
      es: 'Reducir letra',
    },
    'fonte.aumentar': {
      pt: 'Aumentar letras',
      en: 'Larger text',
      es: 'Aumentar letra',
    },
    'filtro.botao': {
      pt: 'Filtrar',
      en: 'Filter',
      es: 'Filtrar',
    },
    'filtro.titulo': {
      pt: 'Filtros',
      en: 'Filters',
      es: 'Filtros',
    },
    'filtro.dica': {
      pt: 'Mostrar apenas itens:',
      en: 'Show only items that are:',
      es: 'Mostrar solo productos:',
    },
    'filtro.limpar': {
      pt: 'Limpar',
      en: 'Clear',
      es: 'Limpiar',
    },
    'filtro.aplicar': {
      pt: 'Aplicar',
      en: 'Apply',
      es: 'Aplicar',
    },
    'filtro.limparFiltros': {
      pt: 'Limpar filtros',
      en: 'Clear filters',
      es: 'Limpiar filtros',
    },
    'filtro.semResultado': {
      pt: 'Nenhum item desta aba atende aos filtros selecionados.',
      en: 'No items in this section match the selected filters.',
      es: 'Ningún producto de esta sección cumple los filtros seleccionados.',
    },
    'cadastro.titulo': {
      pt: 'Queremos conhecer você',
      en: "We'd like to get to know you",
      es: 'Queremos conocerte',
    },
    'cadastro.subtitulo': {
      pt: 'Preencha seus dados para receber novidades e ofertas especiais.',
      en: 'Share your details to receive news and special offers.',
      es: 'Completa tus datos para recibir novedades y ofertas especiales.',
    },
    'cadastro.nome': {
      pt: 'Nome',
      en: 'Name',
      es: 'Nombre',
    },
    'cadastro.sexo': {
      pt: 'Sexo',
      en: 'Gender',
      es: 'Sexo',
    },
    'cadastro.sexo.selecione': {
      pt: 'Selecione',
      en: 'Select',
      es: 'Selecciona',
    },
    'cadastro.sexo.feminino': {
      pt: 'Feminino',
      en: 'Female',
      es: 'Femenino',
    },
    'cadastro.sexo.masculino': {
      pt: 'Masculino',
      en: 'Male',
      es: 'Masculino',
    },
    'cadastro.sexo.outro': {
      pt: 'Outro',
      en: 'Other',
      es: 'Otro',
    },
    'cadastro.sexo.naoInformado': {
      pt: 'Prefiro não informar',
      en: 'Prefer not to say',
      es: 'Prefiero no decirlo',
    },
    'cadastro.aniversario': {
      pt: 'Data de aniversário',
      en: 'Birthday',
      es: 'Cumpleaños',
    },
    'cadastro.telefone': {
      pt: 'Telefone',
      en: 'Phone',
      es: 'Teléfono',
    },
    'cadastro.email': {
      pt: 'E-mail',
      en: 'Email',
      es: 'Correo electrónico',
    },
    'cadastro.aviso': {
      pt: 'Seus dados serão usados apenas pelo restaurante para contato e novidades.',
      en: 'Your data will only be used by the restaurant to contact you and share news.',
      es: 'Tus datos solo serán usados por el restaurante para contacto y novedades.',
    },
    'cadastro.pular': {
      pt: 'Pular',
      en: 'Skip',
      es: 'Omitir',
    },
    'cadastro.enviar': {
      pt: 'Enviar',
      en: 'Submit',
      es: 'Enviar',
    },
    'cadastro.obrigado': {
      pt: 'Obrigado',
      en: 'Thank you',
      es: 'Gracias',
    },
    'cadastro.bomApetite': {
      pt: 'Bom apetite!',
      en: 'Enjoy your meal!',
      es: '¡Buen provecho!',
    },
    'cadastro.erro.envio': {
      pt: 'Não foi possível enviar. Tente novamente.',
      en: 'Could not send. Please try again.',
      es: 'No se pudo enviar. Inténtalo de nuevo.',
    },
    'cadastro.erro.nome': {
      pt: 'Informe seu nome.',
      en: 'Please enter your name.',
      es: 'Introduce tu nombre.',
    },
    'cadastro.erro.contato': {
      pt: 'Informe um telefone ou e-mail.',
      en: 'Please enter a phone number or email.',
      es: 'Introduce un teléfono o correo.',
    },
    'cadastro.erro.telefone': {
      pt: 'Informe um telefone válido.',
      en: 'Please enter a valid phone number.',
      es: 'Introduce un teléfono válido.',
    },
    'cadastro.erro.email': {
      pt: 'Informe um e-mail válido.',
      en: 'Please enter a valid email.',
      es: 'Introduce un correo válido.',
    },
    'cadastro.erro.aniversario': {
      pt: 'Informe uma data válida.',
      en: 'Please enter a valid date.',
      es: 'Introduce una fecha válida.',
    },
  },
  filtros: [],
  redesSociais: {
    instagram: null,
    facebook: null,
    avaliacaoGoogle: null,
  },
  categorias: [],
};
