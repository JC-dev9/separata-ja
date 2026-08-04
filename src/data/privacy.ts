/**
 * Texto da política de privacidade mostrado dentro da app.
 *
 * Duplica o `PRIVACY.md` da raiz do repositório, que continua a ser a fonte do
 * URL público exigido pela Google Play e pela App Store — ao alterar um, alterar
 * o outro. A app leva-o embutido porque é 100% offline: uma política que só se lê
 * com rede é uma política que o utilizador não consegue ler quando quer.
 *
 * As secções "Contacto" e "Notas para publicação nas lojas" do `PRIVACY.md`
 * ficam de fora: a primeira tem campos por preencher, a segunda é uma nota de
 * trabalho e não faz parte da política.
 */

export const LAST_UPDATED = '29 de Julho de 2026';

export interface PrivacyBlock {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Tabela simples de duas colunas: o que é guardado e para quê. */
  rows?: { what: string; why: string }[];
  /** Ligação externa no fim do bloco. */
  link?: { label: string; url: string };
}

export const PRIVACY_BLOCKS: PrivacyBlock[] = [
  {
    paragraphs: [
      'Esta política descreve como a aplicação Separata JA trata a informação dos seus utilizadores.',
    ],
  },
  {
    heading: 'Resumo',
    paragraphs: [
      'A Separata JA não recolhe, não armazena e não transmite dados pessoais. Não há contas de utilizador, não há registo, não há servidores nossos a receber informação tua. Tudo o que a aplicação guarda fica no teu dispositivo.',
    ],
  },
  {
    heading: 'Informação armazenada no dispositivo',
    paragraphs: [
      'A aplicação guarda localmente, e apenas no teu telemóvel, as seguintes preferências:',
    ],
    rows: [
      { what: 'Lista de hinos favoritos', why: 'Mostrar os teus favoritos' },
      { what: 'Edições de acordes que faças', why: 'Preservar as tuas alterações' },
      { what: 'Tamanho do texto', why: 'Manter a tua preferência de leitura' },
      { what: 'Instrumento por omissão', why: 'Abrir os acordes no instrumento que tocas' },
      { what: 'Estado do dicionário de acordes', why: 'Lembrar se o deixaste aberto ou fechado' },
    ],
  },
  {
    paragraphs: ['Esta informação:'],
    bullets: [
      'Nunca sai do dispositivo;',
      'Não é enviada para nós nem para terceiros;',
      'É apagada quando desinstalas a aplicação, quando limpas os dados nas definições do sistema, ou quando usas a secção "Gestão de dados" desta aplicação.',
    ],
  },
  {
    heading: 'Microfone',
    paragraphs: [
      'A aplicação pede acesso ao microfone exclusivamente para o afinador de instrumentos.',
    ],
    bullets: [
      'O áudio é processado em tempo real e apenas no dispositivo, para detectar a frequência da nota que estás a tocar.',
      'O áudio não é gravado, não é guardado e não é enviado para lado nenhum.',
      'O microfone só é activado enquanto tens o separador do afinador aberto.',
      'Podes recusar a permissão: o resto da aplicação continua a funcionar normalmente, só o afinador fica indisponível.',
    ],
  },
  {
    heading: 'Ligações a serviços externos',
    paragraphs: [
      'Ao usares a função "Ouvir", a aplicação abre uma pesquisa no YouTube fora da aplicação — no teu browser ou na aplicação do YouTube. A Separata JA não embute o YouTube no seu interior, por isso nunca tem acesso à tua sessão nem aos teus dados de navegação. A partir desse momento aplicam-se os termos e a política de privacidade do YouTube/Google, sobre os quais não temos controlo.',
      'Não enviamos qualquer informação tua para o YouTube além do termo de pesquisa (o título do hino).',
    ],
    link: {
      label: 'Política de privacidade do Google',
      url: 'https://policies.google.com/privacy',
    },
  },
  {
    heading: 'Actualizações da aplicação',
    paragraphs: [
      'A aplicação pode descarregar actualizações de conteúdo e correcções através do serviço Expo Updates. Este processo transfere apenas ficheiros da aplicação; não envia informação sobre ti.',
    ],
  },
  {
    heading: 'Crianças',
    paragraphs: ['A aplicação não recolhe dados de ninguém, incluindo menores de 13 anos.'],
  },
  {
    heading: 'Alterações a esta política',
    paragraphs: [
      'Se esta política mudar, a nova versão será publicada com a data de actualização revista.',
    ],
  },
];
