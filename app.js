'use strict';

const M = SaldoModel;
const storageKey = 'saldo-financas.v1';
let data;
let storageWarning = '';
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const previous = JSON.parse(saved);
    data = M.removeDemoData(previous);
    if (data !== previous) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        storageWarning = 'O navegador não conseguiu salvar a remoção dos exemplos.';
      }
    }
  } else {
    data = M.initialData();
  }
} catch {
  data = M.initialData();
  storageWarning = 'Não foi possível carregar os dados salvos neste navegador.';
}
const nav = [
  ['dashboard', 'Visão geral', 'grid'],
  ['lancamentos', 'Lançamentos', 'arrows'],
  ['orcamento', 'Orçamento e metas', 'target'],
  ['recorrentes', 'Recorrentes', 'repeat'],
  ['configuracoes', 'Configurações', 'settings']
];
const [currentYear, currentMonth] = M.today().split('-').map(Number);
let period = { year: currentYear, month: currentMonth };
let route;
let filters = { search: '', type: '', status: '', category: '' };
let activeForm;
let toastTimer;
let mobileOpen = false;

const icons = {
  logo: '<path d="M5 18v-5m5 5V9m5 9v-7m5 7V5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
  arrows: '<path d="M7 3v16m-4-4 4 4 4-4m6 6V5m-4 4 4-4 4 4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9.5 3-.7 2.2-2 .9-2.2-.9-2.1 3.6 1.6 1.6v2.8l-1.6 1.6 2.1 3.6 2.2-.9 2 .9.7 2.2h4.2l.7-2.2 2-.9 2.2.9 2.1-3.6-1.6-1.6v-2.8l1.6-1.6-2.1-3.6-2.2.9-2-.9-.7-2.2z"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  in: '<path d="M17 7 7 17M7 8v9h9"/>',
  out: '<path d="M7 17 17 7M8 7h9v9"/>',
  wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V7m18 6h-5a2 2 0 0 0 0 4h5"/>',
  percent: '<path d="M5 19 19 5"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  chart: '<path d="M3 3v18h18M8 16v-3m5 3V8m5 8V5"/>',
  pie: '<path d="M12 3v9h9A9 9 0 1 1 12 3Z"/><path d="M15 3.5V9h5.5A8 8 0 0 0 15 3.5Z"/>',
  alert: '<path d="M10.3 4 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0ZM12 9v4m0 3h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  pencil: '<path d="m15 5 4 4M4 20l4-.7L20 7a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L4.7 16 4 20Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l8 8a2 2 0 0 1 0 3l-6 6a2 2 0 0 1-3 0zM8 8h.01"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  credit: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>'
};
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? ''}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const $ = selector => document.querySelector(selector);
const main = $('#main');
const dialog = $('#dialog');
const button = (label, symbol, attrs, style = '') => `<button type="button" class="button ${style}" ${attrs}>${symbol ? icon(symbol) : ''}<span>${label}</span></button>`;
const iconButton = (label, symbol, attrs) => `<button type="button" class="icon-button" aria-label="${label}" title="${label}" ${attrs}>${icon(symbol)}</button>`;
const options = (items, selected) => items.map(item => {
  const [value, label] = Array.isArray(item) ? item : [item, item];
  return `<option value="${esc(value)}"${String(value) === String(selected) ? ' selected' : ''}>${esc(label)}</option>`;
}).join('');
const empty = (heading, detail, symbol = 'list') => `<div class="empty"><span class="empty-icon">${icon(symbol)}</span><strong>${heading}</strong><p>${detail}</p></div>`;
const statusTag = (status) => `<span class="status ${status === 'Pago' ? 'paid' : status === 'Agendado' ? 'scheduled' : ''}">${esc(status)}</span>`;
const currencyInputValue = amount => amount == null ? '' : (amount / 100).toFixed(2).replace('.', ',');
const money = M.money;
const getRoute = () => nav.some(([id]) => id === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
const periodTransactions = (selected = period) => data.transactions.filter(item => M.matchesPeriod(item, selected));

function toast(message) {
  const target = $('#toast');
  clearTimeout(toastTimer);
  target.textContent = message;
  target.hidden = false;
  toastTimer = setTimeout(() => { target.hidden = true; }, 4500);
}
function update(next, message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    toast('O navegador não conseguiu salvar os dados. Verifique o armazenamento disponível.');
    return false;
  }
  data = next;
  storageWarning = '';
  if (dialog.open) dialog.close();
  render();
  toast(message);
  return true;
}
function go(page) {
  const hash = '#' + page;
  if (location.hash !== hash) {
    history.pushState(null, '', hash);
    render(true);
  } else if (mobileOpen) {
    mobileOpen = false;
    render(true);
  }
}
function render(jump = false) {
  const previousRoute = route;
  route = getRoute();
  if (jump) mobileOpen = false;
  $('#sidebar').classList.toggle('sidebar-open', mobileOpen);
  $('#sidebar').innerHTML = `
    <a href="#dashboard" class="brand" aria-label="Saldo, visão geral">
      <span class="brand-mark">${icon('logo')}</span>
      <span><strong>Saldo<span>.</span></strong><small>Finanças pessoais</small></span>
    </a>
    <nav aria-label="Navegação principal">
      <p class="nav-caption">Menu principal</p>
      ${nav.map(([id, label, symbol]) => `<a href="#${id}" class="nav-link${route === id ? ' active' : ''}"${route === id ? ' aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span></a>`).join('')}
    </nav>`;
  $('#topbar').innerHTML = `<div class="breadcrumb">
    ${iconButton('Abrir menu', mobileOpen ? 'close' : 'menu', `data-action="mobile" aria-expanded="${mobileOpen}" aria-controls="sidebar"`)}
    <span>Finanças pessoais</span>${icon('chevron')}<strong>${nav.find(([id]) => id === route)[1]}</strong>
    </div><span class="top-local"><i></i> Armazenamento local</span>`;
  const screens = { dashboard, lancamentos, orcamento, recorrentes, configuracoes };
  main.innerHTML = (storageWarning ? `<p class="notice warning">${icon('alert')}${storageWarning}</p>` : '') + screens[route]();
  if (jump || (previousRoute && previousRoute !== route)) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}
function periodControl() {
  const years = new Set([...Array.from({ length: 15 }, (_, i) => currentYear - 8 + i), period.year,
    ...data.transactions.map(item => Number(item.date.slice(0, 4))),
    ...data.recurring.map(item => Number(item.start.slice(0, 4)))]);
  return `<details class="period-control">
    <summary class="button period-button">${icon('calendar')}<span>${M.periodLabel(period)}</span>${icon('down', 'chevron')}</summary>
    <div class="period-menu">
      <label>Ano<select data-period="year">${options([...years].sort((a, b) => b - a), period.year)}</select></label>
      <label>Mês<select data-period="month">${options([[0, 'Ano todo'], ...M.months.map((month, i) => [i + 1, month])], period.month)}</select></label>
      ${button('Aplicar período', '', 'data-action="period-apply"', 'primary')}
    </div>
  </details>`;
}
function heading(title, description, actions = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}
function panelHeading(title, description, action = '') {
  return `<div class="panel-heading"><div><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}</div>${action}</div>`;
}
function comparison(now, before, rate = false, expense = false) {
  if (now == null || before == null || (!before && !rate)) return null;
  const diff = rate ? now - before : (now - before) / Math.abs(before) * 100;
  const rounded = Math.round(diff * 10) / 10;
  if (!rounded) return null;
  const sign = rounded > 0 ? '+' : '−';
  const value = rate ? M.percent(Math.abs(rounded)).replace('%', ' p.p.') : M.percent(Math.abs(rounded));
  return { text: sign + value, tone: (expense ? rounded < 0 : rounded > 0) ? 'positive' : 'negative' };
}
function kpi(label, value, symbol, tone, delta, hint, featured = false) {
  return `<article class="kpi${featured ? ' featured' : ''}">
    <div class="kpi-top"><span>${label}</span><span class="kpi-icon ${tone}">${icon(symbol)}</span></div>
    <strong class="kpi-value${featured ? ' ' + tone : ''}">${value}</strong>
    <div class="kpi-foot">${delta ? `<span class="delta ${delta.tone}">${delta.text}</span>` : ''}<small>${hint}</small></div>
  </article>`;
}
function yearChart() {
  const series = M.months.map((_, i) => M.totals(periodTransactions({ year: period.year, month: i + 1 })));
  const chartMax = Math.max(...series.map(item => Math.max(item.income, item.expense)), 400);
  const power = 10 ** Math.floor(Math.log10(chartMax / 4));
  const step = [1, 2, 2.5, 5, 10].map(n => n * power).find(n => n >= chartMax / 4);
  const max = step * 4;
  const axisText = cents => {
    const amount = cents / 100;
    return amount >= 1000 ? 'R$ ' + M.percent(amount / 1000).replace('%', ' mil') : 'R$ ' + M.percent(amount).replace('%', '');
  };
  return `<section class="panel evolution">
    ${panelHeading('Evolução mensal', 'Comparativo de receitas e despesas em ' + period.year,
      '<span class="chart-year">' + period.year + '</span>')}
    <div class="legend chart-legend"><span><i class="dot income-dot"></i> Receitas</span><span><i class="dot expense-dot"></i> Despesas</span></div>
    <div class="chart-wrap">
      <div class="chart-axis" aria-hidden="true">${[4, 3, 2, 1, 0].map(n => `<span>${axisText(step * n)}</span>`).join('')}</div>
      <div class="chart-stage">
        <div class="chart-grid" aria-hidden="true"></div>
        <div class="chart-columns">
          ${series.map((item, i) => {
            const label = M.months[i] + ' · Receitas ' + money(item.income) + ' · Despesas ' + money(item.expense);
            return `<button type="button" class="chart-month${period.month === i + 1 ? ' selected' : ''}" data-action="select-month" data-month="${i + 1}" aria-pressed="${period.month === i + 1}" aria-label="${esc(label)}">
              <span class="month-tooltip" aria-hidden="true"><strong>${M.months[i]}</strong><span>Receitas ${money(item.income)}</span><span>Despesas ${money(item.expense)}</span></span>
              <span class="bar-pair" aria-hidden="true"><i class="bar income-bar" style="--h:${item.income / max * 100}%"></i><i class="bar expense-bar" style="--h:${item.expense / max * 100}%"></i></span>
              <span class="month-label" aria-hidden="true">${M.shortMonths[i]}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>`;
}
function donutChart(records, amount) {
  const slices = M.breakdown(records);
  let current = 0;
  const segments = slices.map(item => {
    const start = current;
    current += item.amount / amount * 100;
    return `${item.color} ${start}% ${current}%`;
  });
  return `<section class="panel categories-panel">
    ${panelHeading('Gastos por categoria', 'Distribuição das despesas pagas')}
    ${amount ? `<div class="donut" style="--segments:${segments.join(',')}" role="img" aria-label="Despesa total de ${money(amount)}">
      <div class="donut-center"><span>Total de saídas</span><strong>${money(amount)}</strong></div>
      </div><ul class="category-legend" aria-label="Categorias de despesa" tabindex="0">${slices.map(item => `<li><span><i class="dot" style="--dot:${item.color}"></i>${esc(item.name)}</span><strong>${M.percent(item.amount / amount * 100)}</strong></li>`).join('')}</ul>` :
      empty('Sem despesas pagas', 'As categorias aparecem quando você registra um pagamento.', 'pie')}
  </section>`;
}
function budgetItems(records) {
  const factor = period.month ? 1 : 12;
  const expenses = new Map(M.breakdown(records).map(item => [item.name, item.amount]));
  return data.budgets.map(item => {
    const limit = item.amount * factor;
    const spent = expenses.get(item.category) ?? 0;
    return { ...item, limit, spent, pct: limit ? spent / limit * 100 : 0 };
  }).sort((a, b) => b.pct - a.pct);
}
function budgetLine(item) {
  const tone = item.pct > 100 ? 'negative' : item.pct >= 85 ? 'warning' : 'positive';
  return `<div class="budget-line ${tone}"><div class="budget-label"><strong>${esc(item.category)}</strong><span><b>${money(item.spent)}</b> / ${money(item.limit)}</span></div>
    <div class="progress" role="progressbar" aria-label="Orçamento de ${esc(item.category)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(100, item.pct))}" aria-valuetext="${M.percent(item.pct)} consumido"><span style="--progress:${Math.min(100, item.pct)}%"></span></div>
  </div>`;
}
function goalSummary(balance, compact = false) {
  if (!data.goal) return compact ? '' : empty('Defina sua meta de poupança', 'Escolha quanto você quer guardar por mês.', 'target');
  const target = data.goal.amount * (period.month ? 1 : 12);
  const rate = balance / target * 100;
  return `<div class="goal-summary${compact ? ' compact' : ''}">
    <div class="goal-copy"><span class="goal-icon ${rate >= 100 ? 'positive' : ''}">${icon(rate >= 100 ? 'check' : 'target')}</span><div><strong>${rate >= 100 ? 'Meta de poupança atingida' : 'Meta de poupança'}</strong><small>${money(Math.max(0, balance))} de ${money(target)} guardados</small></div><b>${M.percent(Math.max(0, rate))}</b></div>
    <div class="progress" role="progressbar" aria-label="Meta de poupança" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.max(0, Math.min(100, rate)))}"><span style="--progress:${Math.max(0, Math.min(100, rate))}%"></span></div>
  </div>`;
}
function recentPanel(records) {
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return `<section class="panel recent-panel">
    ${panelHeading('Lançamentos recentes', 'Do período selecionado', '<a class="text-link" href="#lancamentos">Ver extrato</a>')}
    ${latest.length ? `<ul class="recent-list">${latest.map(item => `<li><span class="transaction-icon ${item.type === 'Receita' ? 'positive' : 'expense'}">${icon(item.type === 'Receita' ? 'in' : 'out')}</span><div class="recent-title"><strong>${esc(item.description)}</strong><small>${esc(item.category)} · ${M.dateLabel(item.date).slice(0, 5)}</small></div><span class="recent-amount"><strong class="${item.type === 'Receita' ? 'positive' : ''}">${item.type === 'Receita' ? '+' : '−'}${money(item.amount)}</strong><small>${item.status}</small></span></li>`).join('')}</ul>` :
    empty('Sem lançamentos no período', 'Acesse o extrato para registrar uma entrada ou saída.')}
  </section>`;
}
function dashboard() {
  const records = periodTransactions();
  const { income, expense, balance, rate } = M.totals(records);
  const previous = period.month === 1 ? { year: period.year - 1, month: 12 } :
    period.month ? { ...period, month: period.month - 1 } : { year: period.year - 1, month: 0 };
  const baseline = M.totals(periodTransactions(previous));
  const budget = budgetItems(records);
  const comparisonLabel = period.month ? 'vs. mês anterior' : 'vs. ano anterior';
  const card = (label, value, symbol, tone, delta, fallback, featured) => kpi(label, value, symbol, tone, delta, delta ? comparisonLabel : fallback, featured);
  const warnings = budget.filter(item => item.pct > 100).length;
  return heading('Visão geral', 'Acompanhe suas finanças e veja para onde vai seu dinheiro.',
    periodControl() + `<button class="button primary" type="button" data-action="new-transaction">${icon('plus')}<span>Novo lançamento</span></button>`) +
    `<div class="kpi-grid">
    ${card('Total de entradas', money(income), 'in', 'positive', comparison(income, baseline.income), 'Receitas pagas')}
    ${card('Total de saídas', money(expense), 'out', 'expense', comparison(expense, baseline.expense, false, true), 'Despesas pagas')}
    ${card('Saldo líquido', money(balance), 'wallet', balance < 0 ? 'negative' : 'positive', comparison(balance, baseline.balance), 'Entradas menos saídas', true)}
    ${card('Taxa de poupança', rate == null ? '—' : M.percent(rate), 'percent', 'violet', comparison(rate, baseline.rate, true), rate == null ? 'Sem receitas pagas' : 'Percentual da receita guardado')}
    </div>
    <div class="dashboard-grid charts-row">${yearChart()}${donutChart(records, expense)}</div>
    <div class="dashboard-grid lower-row">
      <section class="panel budget-panel">
        ${panelHeading('Orçado vs. realizado', period.month ? 'Despesas pagas em relação aos tetos mensais' : 'Despesas pagas em relação a 12 tetos mensais', '<a class="text-link" href="#orcamento">Ver orçamento</a>')}
        ${warnings ? `<p class="notice warning">${icon('alert')}${warnings === 1 ? '1 categoria acima do limite' : warnings + ' categorias acima do limite'}</p>` : ''}
        ${budget.length ? `<div class="budget-lines">${budget.slice(0, 3).map(budgetLine).join('')}</div>` :
          empty('Nenhum orçamento definido', 'Configure um limite mensal por categoria.', 'target')}
        ${goalSummary(balance, true)}
      </section>
      ${recentPanel(records)}
    </div>`;
}

function lancamentos() {
  const records = periodTransactions();
  const { income, expense, balance } = M.totals(records);
  const scheduled = records.filter(item => item.status === 'Agendado');
  const scheduledExpenses = scheduled.filter(item => item.type === 'Despesa').reduce((sum, item) => sum + item.amount, 0);
  const projected = balance + scheduled.reduce((sum, item) => sum + item.amount * (item.type === 'Receita' ? 1 : -1), 0);
  return heading('Lançamentos', 'Registre receitas e despesas e acompanhe o extrato em uma única tabela.',
    periodControl() + button('Novo lançamento', 'plus', 'data-action="new-transaction"', 'primary')) +
    `<div class="four summary-grid">
      <div class="panel mini-summary"><span>Receitas pagas</span><strong class="positive">${money(income)}</strong></div>
      <div class="panel mini-summary"><span>Despesas pagas</span><strong>${money(expense)}</strong></div>
      <div class="panel mini-summary"><span>Despesas agendadas</span><strong class="warning">${money(scheduledExpenses)}</strong></div>
      <div class="panel mini-summary"><span>Saldo projetado</span><strong class="${projected < 0 ? 'negative' : 'positive'}">${money(projected)}</strong></div>
      </div>
      <section class="panel table-panel">
        ${panelHeading('Extrato', M.periodLabel(period))}
        <div class="filters">
          <label class="search-field">${icon('search')}<input type="search" placeholder="Buscar lançamento…" aria-label="Buscar lançamento" data-filter="search" value="${esc(filters.search)}"></label>
          <select aria-label="Filtrar por tipo" data-filter="type">${options([['', 'Todos os tipos'], 'Receita', 'Despesa'], filters.type)}</select>
          <select aria-label="Filtrar por status" data-filter="status">${options([['', 'Todos os status'], 'Pago', 'Agendado'], filters.status)}</select>
          <select aria-label="Filtrar por categoria" data-filter="category">${options([['', 'Todas as categorias'], ...data.settings.categories], filters.category)}</select>
        </div>
        <div id="transaction-results">${transactionTable(records)}</div>
      </section>`;
}
function transactionTable(records = periodTransactions()) {
  const query = filters.search.trim().toLocaleLowerCase('pt-BR');
  const selected = records.filter(item => (!filters.type || filters.type === item.type) &&
    (!filters.status || filters.status === item.status) && (!filters.category || filters.category === item.category) &&
    [item.description, item.category, item.subcategory, item.account, item.method].join(' ').toLocaleLowerCase('pt-BR').includes(query))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!selected.length) return empty('Nenhum lançamento encontrado', records.length ? 'Ajuste os filtros para ver outros resultados.' : 'Altere o período ou registre um lançamento.');
  return `<div class="table-scroll" role="region" aria-label="Tabela de lançamentos" tabindex="0"><table>
    <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Método / Conta</th><th>Status</th><th class="right">Valor</th><th class="right">Ações</th></tr></thead>
    <tbody>${selected.map(item => {
      const attrs = `data-id="${esc(item.id)}"`;
      return `<tr>
      <td class="nowrap">${M.dateLabel(item.date)}</td><td><strong>${esc(item.description)}</strong></td>
      <td>${esc(item.category)}${item.subcategory ? '<small>' + esc(item.subcategory) + '</small>' : ''}</td>
      <td><span class="${item.type === 'Receita' ? 'positive' : ''}">${item.type}</span></td>
      <td>${esc(item.method)}<small>${esc(item.account)}</small></td><td>${statusTag(item.status)}</td>
      <td class="right nowrap amount ${item.type === 'Receita' ? 'positive' : ''}">${item.type === 'Receita' ? '+' : '−'}${money(item.amount)}</td>
      <td><div class="row-actions">
        ${item.status === 'Agendado' ? iconButton('Marcar como pago', 'check', `data-action="pay" ${attrs}`) : ''}
        ${iconButton('Editar lançamento', 'pencil', `data-action="edit-transaction" ${attrs}`)}
        ${iconButton('Excluir lançamento', 'trash', `data-action="delete" data-list="transactions" ${attrs}`)}
      </div></td></tr>`;
    }).join('')}</tbody></table></div>
    <div class="table-footer">${selected.length} ${selected.length === 1 ? 'lançamento' : 'lançamentos'}</div>`;
}
function orcamento() {
  const records = periodTransactions();
  const budgets = budgetItems(records);
  const totalLimits = budgets.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);
  const warnings = budgets.filter(item => item.pct > 100).length;
  return heading('Orçamento e metas', 'Defina limites mensais e acompanhe quanto já gastou em cada categoria.', periodControl() +
    button('Definir limite', 'plus', 'data-action="edit-budget"', 'primary')) +
    `<div class="three summary-grid">
      <div class="panel mini-summary"><span>Limites do período</span><strong>${money(totalLimits)}</strong></div>
      <div class="panel mini-summary"><span>Gasto em categorias com limite</span><strong>${money(totalSpent)}</strong></div>
      <div class="panel mini-summary"><span>Categorias acima do limite</span><strong class="${warnings ? 'negative' : 'positive'}">${warnings}</strong></div>
    </div>
    <div class="split-grid">
      <section class="panel">${panelHeading('Limites por categoria', period.month ? 'Despesas pagas no mês selecionado' : 'A visão anual usa 12 meses de orçamento.')}
        ${budgets.length ? `<div class="budget-detail">${budgets.map(item => `<div class="budget-item">
          ${budgetLine(item)}<span class="budget-pct ${item.pct > 100 ? 'negative' : item.pct >= 85 ? 'warning' : ''}">${M.percent(item.pct)}</span>
          <div class="row-actions">${iconButton('Editar limite', 'pencil', `data-action="edit-budget" data-id="${esc(item.id)}"`)}${iconButton('Excluir limite', 'trash', `data-action="delete" data-list="budgets" data-id="${esc(item.id)}"`)}</div></div>`).join('')}</div>` :
          empty('Nenhum limite definido', 'Escolha uma categoria e defina seu teto mensal.', 'target')}
      </section>
      <section class="panel goal-panel">${panelHeading('Meta de poupança', 'Progresso com base no saldo do período')}
        ${goalSummary(M.totals(records).balance)}
        <div class="goal-actions">${button(data.goal ? 'Editar meta' : 'Definir meta', data.goal ? 'pencil' : 'plus', 'data-action="edit-goal"')}
        ${data.goal ? iconButton('Excluir meta', 'trash', 'data-action="delete" data-list="goal"') : ''}</div>
      </section>
    </div>`;
}
function recurringEntries(record) {
  return (period.month ? [period.month] : M.months.map((_, i) => i + 1))
    .map(month => M.occurrence(record, { year: period.year, month })).filter(Boolean);
}
function recorrentes() {
  const rows = data.recurring.map(record => ({ record, dates: recurringEntries(record) }));
  const total = rows.reduce((sum, { record, dates }) => sum + record.amount * dates.length, 0);
  const pending = rows.reduce((count, { record, dates }) => count + dates.filter(due => !data.transactions.some(item => item.recurringId === record.id && item.occurrenceKey === due.key)).length, 0);
  return heading('Recorrentes e assinaturas', 'Acompanhe contas fixas, assinaturas e compras parceladas.', periodControl() +
    button('Nova recorrência', 'plus', 'data-action="edit-recurring"', 'primary')) +
    `<div class="three summary-grid">
      <div class="panel mini-summary"><span>Recorrências cadastradas</span><strong>${data.recurring.length}</strong></div>
      <div class="panel mini-summary"><span>Valor previsto no período</span><strong>${money(total)}</strong></div>
      <div class="panel mini-summary"><span>Ocorrências a lançar</span><strong>${pending}</strong></div>
    </div>
    <section class="panel table-panel">
      ${panelHeading('Contas e parcelas', 'Gere os pagamentos do período como lançamentos agendados.',
        data.recurring.length ? button('Gerar agendamentos', 'calendar', 'data-action="generate" ' + (pending ? '' : 'disabled')) : '')}
      ${rows.length ? `<div class="table-scroll" role="region" aria-label="Tabela de recorrências" tabindex="0"><table>
      <thead><tr><th>Descrição</th><th>Categoria</th><th>Frequência</th><th>Vencimento</th><th>No extrato</th><th class="right">Valor unitário</th><th class="right">Ações</th></tr></thead>
      <tbody>${rows.map(({ record, dates }) => {
        const entries = dates.map(due => data.transactions.find(item => item.recurringId === record.id && item.occurrenceKey === due.key));
        const found = entries.filter(Boolean).length;
        const status = period.month ? dates.length ? entries[0]?.status ?? 'A lançar' : 'Fora do período' : dates.length ? found + ' de ' + dates.length : 'Fora do período';
        const dateText = period.month ? dates[0] ? M.dateLabel(dates[0].date) : '—' : 'Dia ' + record.day;
        let frequency = record.kind;
        if (record.kind === 'Parcelada') {
          const number = dates.length > 1 ? dates[0].number + '–' + dates.at(-1).number : dates[0]?.number;
          frequency = number == null ? record.total + ' parcelas' : 'Parcela ' + number + '/' + record.total;
        }
        return `<tr><td><strong>${esc(record.description)}</strong><small>${esc(record.method)} · ${esc(record.account)}</small></td>
        <td>${esc(record.category)}</td><td>${frequency}</td><td class="nowrap">${dateText}</td><td>${statusTag(status)}</td><td class="right nowrap amount">${money(record.amount)}</td>
        <td><div class="row-actions">${iconButton('Editar recorrência', 'pencil', `data-action="edit-recurring" data-id="${esc(record.id)}"`)}${iconButton('Excluir recorrência', 'trash', `data-action="delete" data-list="recurring" data-id="${esc(record.id)}"`)}</div></td></tr>`;
      }).join('')}</tbody></table></div>` :
      empty('Nenhuma recorrência cadastrada', 'Adicione uma conta fixa ou uma compra parcelada.', 'repeat')}
    </section>`;
}
const lists = [
  ['categories', 'Categorias', 'Categoria', 'tag'],
  ['subcategories', 'Subcategorias', 'Subcategoria', 'layers'],
  ['accounts', 'Contas e bancos', 'Conta', 'wallet'],
  ['methods', 'Formas de pagamento', 'Forma de pagamento', 'credit']
];
const settingLinks = {
  categories: [['transactions', 'category'], ['budgets', 'category'], ['recurring', 'category']],
  subcategories: [['transactions', 'subcategory']],
  accounts: [['transactions', 'account'], ['recurring', 'account']],
  methods: [['transactions', 'method'], ['recurring', 'method']]
};
function configuracoes() {
  return heading('Configurações', 'Personalize as opções dos formulários e gerencie os dados deste navegador.') +
    `<div class="settings-grid">${lists.map(([key, label, singular, symbol]) => `<section class="panel setting-panel">
      ${panelHeading(label, '', button('Adicionar', 'plus', `data-action="edit-setting" data-list="${key}"`))}
      <div class="settings-list">${data.settings[key].length ? data.settings[key].map(item => `<div class="setting-row"><span>${icon(symbol)}${esc(item)}</span>
        <div class="row-actions">${iconButton('Editar ' + singular.toLowerCase(), 'pencil', `data-action="edit-setting" data-list="${key}" data-id="${esc(item)}"`)}${iconButton('Excluir ' + singular.toLowerCase(), 'trash', `data-action="delete-setting" data-list="${key}" data-id="${esc(item)}"`)}</div></div>`).join('') :
      '<p class="muted">Nenhuma opção cadastrada.</p>'}</div>
      </section>`).join('')}</div>
      <section class="panel storage-panel">${panelHeading('Armazenamento local', 'Seus lançamentos e ajustes ficam salvos neste navegador.')}</section>`;
}

function field(label, name, value = '', opts = {}) {
  const { type = 'text', required = true, placeholder = '', extra = '', wide = false } = opts;
  return `<label class="${wide ? 'span-two' : ''}">${label}<input type="${type}" name="${name}" value="${esc(value)}"${required ? ' required' : ''} placeholder="${esc(placeholder)}" ${extra}></label>`;
}
function selectField(label, name, items, value, required = true) {
  return `<label>${label}<select name="${name}"${required ? ' required' : ''}>${options(items, value)}</select></label>`;
}
function amountField(value, label = 'Valor (R$)') {
  return field(label, 'amount', currencyInputValue(value), { placeholder: '0,00', extra: 'inputmode="decimal" maxlength="18"' });
}
function openDialog({ title, description = '', body = '', submitLabel = 'Salvar', submit, danger = false }) {
  activeForm = submit;
  dialog.innerHTML = `<form>
    <div class="modal-header"><div><h2 id="dialog-title">${title}</h2>${description ? `<p>${description}</p>` : ''}</div>${iconButton('Fechar', 'close', 'data-action="close"')}</div>
    ${body ? `<div class="form-grid">${body}</div>` : ''}
    <p class="form-error" role="alert" hidden></p>
    <div class="modal-footer">${button('Cancelar', '', 'data-action="close"')}<button type="submit" class="button ${danger ? 'danger' : 'primary'}">${submitLabel}</button></div>
  </form>`;
  if (!dialog.open) dialog.showModal();
  const firstField = dialog.querySelector('input:not([type="hidden"]), select') ?? dialog.querySelector('.modal-footer [data-action="close"]');
  firstField?.focus();
}
function chooseFormDate() {
  const now = M.today();
  if (M.matchesPeriod({ date: now }, period)) return now;
  return M.periodKey(period.year, period.month || 1) + '-01';
}
function transactionForm(item) {
  const { categories, subcategories, methods, accounts } = data.settings;
  if (!categories.length || !methods.length || !accounts.length) {
    openDialog({ title: 'Complete as configurações', description: 'Cadastre pelo menos uma categoria, uma forma de pagamento e uma conta antes de lançar.', submitLabel: 'Ir para configurações', submit: () => { dialog.close(); go('configuracoes'); } });
    return;
  }
  openDialog({
    title: item ? 'Editar lançamento' : 'Novo lançamento',
    description: 'Registre uma receita ou despesa no extrato.',
    body: field('Descrição', 'description', item?.description, { placeholder: 'Ex.: Mercado da semana', wide: true, extra: 'maxlength="120"' }) +
      field('Data', 'date', item?.date ?? chooseFormDate(), { type: 'date', extra: 'min="1900-01-01" max="9999-12-31"' }) +
      selectField('Tipo', 'type', ['Despesa', 'Receita'], item?.type) +
      selectField('Categoria', 'category', categories, item?.category) +
      selectField('Subcategoria (opcional)', 'subcategory', [['', 'Sem subcategoria'], ...subcategories], item?.subcategory, false) +
      selectField('Forma de pagamento', 'method', methods, item?.method) +
      selectField('Cartão ou conta', 'account', accounts, item?.account) +
      selectField('Status', 'status', ['Pago', 'Agendado'], item?.status) +
      amountField(item?.amount),
    submit(values) {
      const amount = M.toCents(values.amount);
      if (!values.description.trim() || !amount) return 'Digite uma descrição e um valor maior que zero.';
      const nextItem = { ...item, ...values, description: values.description.trim(), amount, id: item?.id ?? M.uid() };
      const transactions = item ? data.transactions.map(entry => entry.id === item.id ? nextItem : entry) : [...data.transactions, nextItem];
      const oldPeriod = period;
      if (!M.matchesPeriod(nextItem, period)) {
        const [year, month] = nextItem.date.split('-').map(Number);
        period = { year, month };
      }
      if (!update({ ...data, transactions }, item ? 'Lançamento atualizado.' : 'Lançamento registrado.')) period = oldPeriod;
    }
  });
}
function budgetForm(item) {
  const categories = data.settings.categories.filter(category => category === item?.category || !data.budgets.some(budget => budget.category === category));
  if (!categories.length) {
    openDialog({ title: 'Sem categorias disponíveis', description: 'Adicione uma categoria em configurações ou edite um limite existente.', submitLabel: 'Ir para configurações', submit: () => { dialog.close(); go('configuracoes'); } });
    return;
  }
  openDialog({
    title: item ? 'Editar limite mensal' : 'Definir limite mensal',
    body: selectField('Categoria', 'category', categories, item?.category) + amountField(item?.amount, 'Limite mensal (R$)'),
    submit(values) {
      const amount = M.toCents(values.amount);
      if (!amount) return 'Digite um limite mensal maior que zero.';
      const budget = { id: item?.id ?? M.uid(), category: values.category, amount };
      const budgets = item ? data.budgets.map(entry => entry.id === item.id ? budget : entry) : [...data.budgets, budget];
      update({ ...data, budgets }, 'Limite mensal salvo.');
    }
  });
}
function goalForm() {
  openDialog({
    title: 'Meta mensal de poupança', description: 'Defina quanto você pretende guardar por mês.',
    body: amountField(data.goal?.amount, 'Valor da meta (R$)'),
    submit(values) {
      const amount = M.toCents(values.amount);
      if (!amount) return 'Digite um valor maior que zero.';
      update({ ...data, goal: { amount } }, 'Meta salva.');
    }
  });
}
function recurringForm(item) {
  const { categories, methods, accounts } = data.settings;
  if (!categories.length || !methods.length || !accounts.length) {
    openDialog({ title: 'Complete as configurações', description: 'Cadastre uma categoria, uma forma de pagamento e uma conta.', submitLabel: 'Ir para configurações', submit: () => { dialog.close(); go('configuracoes'); } });
    return;
  }
  openDialog({
    title: item ? 'Editar recorrência' : 'Nova recorrência',
    description: 'Cadastre uma conta mensal ou uma compra parcelada.',
    body: field('Descrição', 'description', item?.description, { placeholder: 'Ex.: Internet residencial', wide: true, extra: 'maxlength="100"' }) +
      selectField('Frequência', 'kind', ['Mensal', 'Parcelada'], item?.kind) +
      selectField('Categoria', 'category', categories, item?.category) +
      field('Mês inicial', 'start', item?.start ?? chooseFormDate().slice(0, 7), { type: 'month', extra: 'min="1900-01" max="9999-12"' }) +
      field('Dia do vencimento', 'day', item?.day ?? 10, { type: 'number', extra: 'min="1" max="31" step="1"' }) +
      selectField('Forma de pagamento', 'method', methods, item?.method) +
      selectField('Cartão ou conta', 'account', accounts, item?.account) +
      amountField(item?.amount, 'Valor por pagamento (R$)') +
      `<div class="installment-fields span-two"${item?.kind === 'Parcelada' ? '' : ' hidden'}>
        ${field('Parcela no mês inicial', 'first', item?.first ?? 1, { type: 'number', extra: 'min="1" max="600" step="1"' })}
        ${field('Total de parcelas', 'total', item?.kind === 'Parcelada' ? item.total : 2, { type: 'number', extra: 'min="1" max="600" step="1"' })}
      </div>`,
    submit(values) {
      const amount = M.toCents(values.amount);
      const first = values.kind === 'Parcelada' ? Number(values.first) : 1;
      const total = values.kind === 'Parcelada' ? Number(values.total) : 1;
      if (!amount || !values.description.trim()) return 'Digite uma descrição e um valor maior que zero.';
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.start)) return 'Informe o mês inicial no formato AAAA-MM.';
      if (first > total) return 'A parcela inicial precisa ser menor ou igual ao total de parcelas.';
      const record = { ...values, id: item?.id ?? M.uid(), description: values.description.trim(), day: Number(values.day), amount, first, total };
      const recurring = item ? data.recurring.map(entry => entry.id === item.id ? record : entry) : [...data.recurring, record];
      update({ ...data, recurring }, item ? 'Recorrência atualizada.' : 'Recorrência cadastrada.');
    }
  });
  syncInstallments();
}
function syncInstallments() {
  const group = dialog.querySelector('.installment-fields');
  if (!group) return;
  const visible = dialog.querySelector('[name="kind"]').value === 'Parcelada';
  group.hidden = !visible;
  group.querySelectorAll('input').forEach(input => { input.disabled = !visible; });
}
function settingForm(key, previous) {
  const [, , singular] = lists.find(([id]) => id === key);
  openDialog({
    title: (previous ? 'Editar · ' : 'Adicionar · ') + singular,
    body: field('Nome', 'name', previous, { wide: true, extra: 'maxlength="50"' }),
    submit(values) {
      const name = values.name.trim();
      if (!name) return 'Digite um nome.';
      if (data.settings[key].some(value => value !== previous && value.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return 'Já existe uma opção com esse nome.';
      const items = previous ? data.settings[key].map(value => value === previous ? name : value) : [...data.settings[key], name];
      const next = { ...data, settings: { ...data.settings, [key]: items } };
      if (previous) {
        for (const [list, fieldName] of settingLinks[key]) {
          next[list] = data[list].map(item => item[fieldName] === previous ? { ...item, [fieldName]: name } : item);
        }
        if (key === 'categories' && filters.category === previous) filters.category = name;
      }
      update(next, 'Configuração salva.');
    }
  });
}
function confirmDelete(list, id) {
  const item = list === 'goal' ? data.goal : data[list].find(entry => entry.id === id);
  if (!item) return;
  const descriptions = {
    transactions: 'Excluir “' + item.description + '” do extrato?',
    budgets: 'Remover o limite de “' + item.category + '”?',
    recurring: 'Excluir “' + item.description + '”? Os agendamentos já criados ficam no extrato.',
    goal: 'Remover a meta de poupança?'
  };
  openDialog({ title: 'Confirmar exclusão', description: esc(descriptions[list]), submitLabel: 'Excluir', danger: true,
    submit: () => update({ ...data, [list]: list === 'goal' ? null : data[list].filter(entry => entry.id !== id) }, 'Registro excluído.') });
}
function deleteSetting(key, value) {
  if (settingLinks[key].some(([list, fieldName]) => data[list].some(item => item[fieldName] === value))) {
    toast('Esta opção está em uso. Atualize os registros relacionados para poder excluí-la.');
    return;
  }
  openDialog({ title: 'Excluir opção', description: 'Remover “' + esc(value) + '” das configurações?', submitLabel: 'Excluir', danger: true,
    submit: () => {
      if (key === 'categories' && filters.category === value) filters.category = '';
      update({ ...data, settings: { ...data.settings, [key]: data.settings[key].filter(item => item !== value) } }, 'Opção excluída.');
    } });
}
function generate() {
  const transactions = [...data.transactions];
  for (const record of data.recurring) {
    for (const date of recurringEntries(record)) {
      const item = M.schedule(record, { year: period.year, month: Number(date.key.slice(-2)) }, transactions);
      if (item) transactions.push(item);
    }
  }
  const count = transactions.length - data.transactions.length;
  if (count) update({ ...data, transactions }, count === 1 ? '1 lançamento agendado.' : count + ' lançamentos agendados.');
  else toast('Todos os pagamentos do período já estão no extrato.');
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]:not(.skip)');
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    go(link.hash.slice(1));
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target) {
    if (!event.target.closest('.period-control')) document.querySelector('.period-control[open]')?.removeAttribute('open');
    return;
  }
  const { action, id, list } = target.dataset;
  const find = key => data[key].find(item => item.id === id);
  switch (action) {
    case 'mobile':
      mobileOpen = !mobileOpen;
      render();
      $('#topbar [data-action="mobile"]').focus();
      break;
    case 'period-apply':
      period = { year: Number($('[data-period="year"]').value), month: Number($('[data-period="month"]').value) };
      render();
      $('.period-control summary').focus();
      break;
    case 'select-month':
      period = { ...period, month: Number(target.dataset.month) };
      render();
      $(`[data-month="${period.month}"]`).focus();
      break;
    case 'new-transaction':
      if (route !== 'lancamentos') go('lancamentos');
      transactionForm();
      break;
    case 'edit-transaction': transactionForm(find('transactions')); break;
    case 'edit-budget': budgetForm(find('budgets')); break;
    case 'edit-goal': goalForm(); break;
    case 'edit-recurring': recurringForm(find('recurring')); break;
    case 'edit-setting': settingForm(list, id); break;
    case 'delete-setting': deleteSetting(list, id); break;
    case 'delete': confirmDelete(list, id); break;
    case 'generate': generate(); break;
    case 'close': dialog.close(); break;
    case 'pay': {
      const transactions = data.transactions.map(item => item.id === id ? { ...item, status: 'Pago' } : item);
      update({ ...data, transactions }, 'Lançamento marcado como pago.');
      break;
    }
  }
});
document.addEventListener('input', event => {
  if (event.target.dataset.filter !== 'search') return;
  filters.search = event.target.value;
  $('#transaction-results').innerHTML = transactionTable();
});
document.addEventListener('change', event => {
  const key = event.target.dataset.filter;
  if (key && key !== 'search') {
    filters[key] = event.target.value;
    $('#transaction-results').innerHTML = transactionTable();
  }
  if (event.target.name === 'kind') syncInstallments();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const selector = $('.period-control[open]');
    if (selector) {
      selector.removeAttribute('open');
      selector.querySelector('summary').focus();
    }
  }
});
dialog.addEventListener('submit', event => {
  event.preventDefault();
  const status = dialog.querySelector('.form-error');
  const message = activeForm(Object.fromEntries(new FormData(event.target)));
  status.hidden = typeof message !== 'string';
  status.textContent = typeof message === 'string' ? message : '';
});
window.addEventListener('popstate', () => render(true));
window.addEventListener('storage', event => {
  if (event.key !== storageKey || !event.newValue) return;
  try {
    data = M.removeDemoData(JSON.parse(event.newValue));
    storageWarning = '';
    if (!dialog.open) render();
  } catch {
    storageWarning = 'Não foi possível carregar os dados salvos neste navegador.';
  }
});
render();
