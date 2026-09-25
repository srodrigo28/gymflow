import type { EatingStyle, EatingStyleId } from '@/src/types/nutrition';

/** Frase que acompanha todo conteúdo alimentar do app. */
export const NUTRITION_DISCLAIMER = 'Orientação geral, não substitui nutricionista.';

// Seis jeitos de comer, sem número de calorias e sem promessa: a pessoa escolhe o que cabe na
// rotina dela. As trocas são as que costumam ser fáceis de manter, não as mais "perfeitas".
export const eatingStyles: EatingStyle[] = [
  {
    dayExample: {
      almoco: 'Arroz, feijão, frango grelhado e salada.',
      cafe: 'Pão integral com ovo, uma fruta e café.',
      jantar: 'Omelete com legumes ou sopa de legumes com carne.',
      lanche: 'Iogurte com banana e aveia.',
    },
    id: 'equilibrada',
    summary: 'Um pouco de tudo no prato, sem cortar nenhum grupo de alimentos.',
    swaps: [
      { from: 'pão branco', to: 'pão integral ou tapioca com ovo' },
      { from: 'suco de caixinha', to: 'fruta inteira e água' },
      { from: 'fritura no almoço', to: 'assado, grelhado ou cozido' },
      { from: 'biscoito recheado no lanche', to: 'fruta com castanhas ou iogurte' },
      { from: 'prato só de massa', to: 'metade do prato com salada e legumes' },
    ],
    title: 'Equilibrada',
    whenItFits: 'Para quem quer comer bem sem regra rígida e sem pensar em comida o dia inteiro.',
  },
  {
    dayExample: {
      almoco: 'Arroz, feijão, carne magra e salada.',
      cafe: 'Ovos mexidos com pão integral e café com leite.',
      jantar: 'Frango ou peixe com legumes assados.',
      lanche: 'Iogurte natural com fruta e aveia.',
    },
    id: 'mais_proteina',
    summary: 'Uma fonte de proteína em cada refeição; o resto do prato segue normal.',
    swaps: [
      { from: 'pão com manteiga', to: 'pão com ovo, queijo ou frango desfiado' },
      { from: 'lanche só de fruta', to: 'fruta com iogurte, castanhas ou pasta de amendoim' },
      { from: 'macarrão puro', to: 'macarrão com frango ou carne moída' },
      { from: 'biscoito depois do treino', to: 'ovo cozido, iogurte ou leite com fruta' },
      { from: 'sopa só de legumes', to: 'sopa com feijão, lentilha ou carne' },
    ],
    title: 'Mais proteína',
    whenItFits: 'Para quem treina força com regularidade e quer que a comida acompanhe o ritmo do treino.',
  },
  {
    dayExample: {
      almoco: 'Arroz, feijão, carne e salada, com água com gás e limão para beber.',
      cafe: 'Café com pouco ou nenhum açúcar, pão com queijo e uma fruta.',
      jantar: 'Sanduíche integral com frango e salada.',
      lanche: 'Fruta com pasta de amendoim ou iogurte natural.',
    },
    id: 'menos_acucar',
    summary: 'Trocas aos poucos para o doce e o refrigerante pesarem menos no dia.',
    swaps: [
      { from: 'refrigerante', to: 'água com gás e limão' },
      { from: 'suco adoçado', to: 'água saborizada com fruta ou chá gelado sem açúcar' },
      { from: 'sobremesa todo dia', to: 'fruta ou um pedacinho de chocolate meio amargo' },
      { from: 'achocolatado', to: 'café com leite ou cacau em pó sem açúcar' },
      { from: 'biscoito doce', to: 'pipoca feita em casa ou castanhas' },
    ],
    title: 'Menos açúcar e refrigerante',
    whenItFits:
      'Para quem toma refrigerante quase todo dia ou sente que o doce virou hábito, e prefere reduzir sem cortar de vez.',
  },
  {
    dayExample: {
      almoco: 'Arroz, feijão, ovo, legumes refogados e salada.',
      cafe: 'Pão integral com queijo, uma fruta e café.',
      jantar: 'Omelete com legumes ou lentilha com arroz.',
      lanche: 'Iogurte com granola ou fruta com castanhas.',
    },
    id: 'vegetariana',
    summary: 'Sem carne; feijões, ovos, laticínios e grãos entram no lugar.',
    swaps: [
      { from: 'carne do almoço', to: 'feijão, lentilha ou grão-de-bico em porção maior' },
      { from: 'frango do jantar', to: 'omelete, tofu ou ovos com legumes' },
      { from: 'sanduíche de presunto', to: 'sanduíche de queijo, ovo ou homus' },
      { from: 'salada só de folhas', to: 'salada com grão-de-bico, milho e sementes' },
      { from: 'carne moída do molho', to: 'molho com lentilha ou proteína de soja' },
    ],
    title: 'Vegetariana',
    whenItFits: 'Para quem já não come carne ou quer diminuir, sem deixar a proteína de lado.',
  },
  {
    dayExample: {
      almoco: 'Peixe ou frango com arroz integral, legumes e salada com azeite.',
      cafe: 'Pão integral com queijo, tomate e azeite; uma fruta e café.',
      jantar: 'Salada grande com grão-de-bico, ovo e pão integral.',
      lanche: 'Iogurte natural com fruta e castanhas.',
    },
    id: 'mediterranea',
    summary: 'Azeite, peixe, legumes, frutas, grãos e castanhas; carne vermelha de vez em quando.',
    swaps: [
      { from: 'manteiga ou margarina', to: 'azeite' },
      { from: 'carne vermelha todo dia', to: 'peixe, frango ou ovos em parte dos dias' },
      { from: 'salgadinho', to: 'azeitonas, castanhas ou amendoim' },
      { from: 'pão branco', to: 'pão integral ou de fermentação natural' },
      { from: 'molho pronto', to: 'tomate, alho, azeite e ervas' },
    ],
    title: 'Mediterrânea',
    whenItFits:
      'Para quem gosta de comida fresca e simples, de peixe e de salada, e cozinha em casa pelo menos parte da semana.',
  },
  {
    dayExample: {
      almoco: 'Prato feito com arroz, feijão, carne e salada, no restaurante ou na marmita.',
      cafe: 'Iogurte com granola e uma fruta.',
      jantar: 'Omelete com legumes congelados e pão integral.',
      lanche: 'Fruta com castanhas ou sanduíche natural.',
    },
    id: 'pratica',
    summary: 'Poucos ingredientes, pouco preparo e opções que funcionam na correria.',
    swaps: [
      { from: 'pular o café da manhã', to: 'iogurte com fruta ou pão com queijo, mesmo que rápido' },
      { from: 'salgado da padaria', to: 'sanduíche de pão integral com ovo ou frango' },
      { from: 'marmita comprada todo dia', to: 'marmitas da semana feitas de uma vez' },
      { from: 'lanche da máquina', to: 'fruta, castanhas ou barra de cereal com poucos ingredientes' },
      { from: 'delivery no jantar', to: 'ovo, legumes congelados e arroz pronto em 15 minutos' },
    ],
    title: 'Prática para quem tem pouco tempo',
    whenItFits: 'Para quem almoça fora, cozinha pouco ou come no intervalo do trabalho.',
  },
];

/** Ordem em que o dia de exemplo é mostrado. */
export const dayExampleMeals: { key: keyof EatingStyle['dayExample']; label: string }[] = [
  { key: 'cafe', label: 'Café' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'jantar', label: 'Jantar' },
];

export function findEatingStyle(id: EatingStyleId) {
  return eatingStyles.find((style) => style.id === id);
}

// O que está salvo pode ser de uma versão antiga do app; só vale se ainda for um estilo conhecido.
export function isEatingStyleId(value: unknown): value is EatingStyleId {
  return typeof value === 'string' && eatingStyles.some((style) => style.id === value);
}
