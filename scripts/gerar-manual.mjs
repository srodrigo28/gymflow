// Gera o manual.md a partir do JSON embutido no manual.html, com a mesma regra de porcentagem da
// página. O manual.html fica na raiz do workspace (D:\dev\gynflow), uma pasta acima deste
// repositório. Para atualizar o manual: edite o bloco "manual-data" do manual.html e rode, daqui,
// node scripts/gerar-manual.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const [htmlPath = '../manual.html', mdPath = 'manual.md'] = process.argv.slice(2);
const html = readFileSync(htmlPath, 'utf8');
const json = html.match(/<script id="manual-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
const data = JSON.parse(json);

const SCORE = { done: 1, partial: 0.5, todo: 0 };
const ICON = { done: '✅', partial: '🟨', todo: '⬜' };
const LABEL = { done: 'Pronto', partial: 'Parcial', todo: 'A fazer' };
const AREA = { app: 'App', api: 'API', future: 'Próximas fases' };

function tally(items) {
  const count = { done: 0, partial: 0, todo: 0 };
  let score = 0;
  for (const item of items) {
    count[item.status] += 1;
    score += SCORE[item.status];
  }
  const total = items.length;
  return { ...count, pct: total ? Math.round((score / total) * 100) : 0, total };
}

const itemsOf = (areas) => data.groups.filter((g) => areas.includes(g.area)).flatMap((g) => g.items);
const app = tally(itemsOf(['app']));
const api = tally(itemsOf(['api']));
const current = tally(itemsOf(['app', 'api']));
const full = tally(itemsOf(['app', 'api', 'future']));

const out = [];
out.push('# Manual do projeto Gyn Flow', '');
out.push(`Atualizado em ${data.updated}. Versão interativa, com filtros e busca: [manual.html](../manual.html), na raiz do workspace (abra no navegador).`, '');
out.push('Onde o app e a API estão hoje: o que já funciona, o que está pela metade e o que falta, agrupado do jeito que o app se organiza.', '');

out.push('## Resumo', '');
out.push('| Área | Prontas | Parciais | A fazer | Andamento |', '| --- | ---: | ---: | ---: | ---: |');
out.push(`| **App** (frontend em Expo) | ${app.done} | ${app.partial} | ${app.todo} | **${app.pct}%** |`);
out.push(`| **API** (gymflow-api) | ${api.done} | ${api.partial} | ${api.todo} | **${api.pct}%** |`);
out.push(`| **Geral** (Fases 1 a 6, app e API) | ${current.done} | ${current.partial} | ${current.todo} | **${current.pct}%** |`);
if (full.total > current.total) {
  out.push(`| Plano completo, com as próximas fases | ${full.done} | ${full.partial} | ${full.todo} | ${full.pct}% |`);
}
out.push('');
out.push(
  '**Como ler:** cada função vale 1 ponto quando está pronta, meio ponto quando está parcial e zero quando falta; a porcentagem é a soma dividida pelo total listado. O número conta funções, não esforço: a Frase do dia pesa o mesmo que o registro de treino.',
  '',
);
out.push('Legenda: ✅ pronto · 🟨 parcial · ⬜ a fazer.', '');

out.push('## Linha do projeto', '');
data.phases.forEach((phase, index) => {
  out.push(`${index + 1}. ${ICON[phase.status]} **${phase.title}**: ${phase.note}`);
});
out.push('');

out.push('## Próximos passos, na ordem sugerida', '');
data.next.forEach((item, index) => {
  out.push(`${index + 1}. **${item.step}** (${item.tag}): ${item.note}`);
});
out.push('');

const sections = [
  ['app', 'App (frontend)'],
  ['api', 'API (gymflow-api)'],
  ['future', 'Próximas fases'],
];

for (const [area, heading] of sections) {
  if (!data.groups.some((g) => g.area === area)) continue;
  out.push(`## ${heading}`, '');
  for (const group of data.groups.filter((g) => g.area === area)) {
    const stats = tally(group.items);
    out.push(`### ${group.title} · ${group.phase}`, '');
    const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
    out.push(
      `${stats.pct}% · ${plural(stats.done, 'pronta', 'prontas')}, ${plural(stats.partial, 'parcial', 'parciais')}, ${stats.todo} a fazer`,
      '',
    );
    for (const item of group.items) {
      const parts = [`${ICON[item.status]} **${item.name}**`];
      if (item.note) parts.push(item.note);
      if (item.where) parts.push(`\`${item.where}\``);
      out.push(`- ${parts.join(' · ')}`);
    }
    out.push('');
  }
}

out.push('## Como rodar', '');
for (const block of data.commands) {
  out.push(`**${block.title}** (\`${block.where}\`)`, '', '```bash', ...block.lines, '```', '', block.note, '');
}

out.push('## Onde está cada coisa', '');
for (const place of data.places) {
  // Endereço da web vira link; caminho de arquivo continua como código.
  out.push(`- **${place.label}:** ${place.value.startsWith('https://') ? `<${place.value}>` : `\`${place.value}\``}`);
}
out.push('');

writeFileSync(mdPath, out.join('\n'), 'utf8');
console.log(`manual.md: app ${app.pct}% · api ${api.pct}% · geral ${current.pct}% · plano completo ${full.pct}%`);
console.log(`itens: app ${app.total} · api ${api.total} · futuro ${full.total - current.total}`);
