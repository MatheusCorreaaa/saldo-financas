'use strict';

const SaldoModel = (() => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const colors = ['#b7f48b', '#6be1c1', '#8b9dff', '#b797f5', '#f5c580', '#f78ba6', '#70bdec', '#a3adbc'];
  const moneyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const pad = value => String(value).padStart(2, '0');
  const periodKey = (year, month) => year + '-' + pad(month);
  const money = cents => moneyFormat.format(cents / 100);
  const percent = value => decimalFormat.format(value) + '%';
  const uid = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  const dateLabel = value => value.split('-').reverse().join('/');
  const periodLabel = ({ year, month }) => month ? months[month - 1] + ' de ' + year : 'Ano todo · ' + year;
  const index = (year, month) => year * 12 + month - 1;
  const monthCount = ({ year, month }, start) => index(year, month) - index(...start.split('-').slice(0, 2).map(Number));
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts();
    return ['year', 'month', 'day'].map(unit => parts.find(item => item.type === unit).value).join('-');
  };
  function toCents(value) {
    const raw = String(value).trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
    let decimal = raw;
    if (raw.includes(',')) {
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(raw)) return null;
      decimal = raw.replaceAll('.', '').replace(',', '.');
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) {
      decimal = raw.replaceAll('.', '');
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(decimal)) return null;
    const [whole, fraction = ''] = decimal.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents <= 99999999999 ? cents : null;
  }
  function matchesPeriod(record, { year, month }) {
    return record.date.startsWith(month ? periodKey(year, month) + '-' : year + '-');
  }
  function totals(records) {
    let income = 0;
    let expense = 0;
    for (const item of records) {
      if (item.status !== 'Pago') continue;
      if (item.type === 'Receita') income += item.amount;
      else expense += item.amount;
    }
    return { income, expense, balance: income - expense, rate: income ? (income - expense) / income * 100 : null };
  }
  function breakdown(records) {
    const categories = new Map();
    for (const item of records) {
      if (item.type === 'Despesa' && item.status === 'Pago') {
        categories.set(item.category, (categories.get(item.category) ?? 0) + item.amount);
      }
    }
    return [...categories].map(([name, amount], i) => ({ name, amount, color: colors[i % colors.length] }))
      .sort((a, b) => b.amount - a.amount)
      .map((item, i) => ({ ...item, color: colors[i % colors.length] }));
  }
  function occurrence(record, period) {
    const elapsed = monthCount(period, record.start);
    const number = record.first + elapsed;
    if (elapsed < 0 || (record.kind === 'Parcelada' && number > record.total)) return null;
    const { year, month } = period;
    const day = Math.min(record.day, new Date(year, month, 0).getDate());
    return { date: periodKey(year, month) + '-' + pad(day), number, key: periodKey(year, month) };
  }
  function schedule(record, period, transactions) {
    const due = occurrence(record, period);
    if (!due || transactions.some(entry => entry.recurringId === record.id && entry.occurrenceKey === due.key)) return null;
    return {
      id: uid(), recurringId: record.id, occurrenceKey: due.key, date: due.date,
      type: 'Despesa', category: record.category, subcategory: '',
      description: record.description + (record.kind === 'Parcelada' ? ' · Parcela ' + due.number + '/' + record.total : ''),
      method: record.method, account: record.account, status: 'Agendado', amount: record.amount
    };
  }
  function initialData() {
    const settings = {
      categories: ['Alimentação', 'Transporte', 'Moradia', 'Hardware/Setup', 'Lazer', 'Educação', 'Assinaturas', 'Saúde', 'Salário', 'Freelance', 'Monetização', 'Outros'],
      subcategories: ['Mercado', 'Delivery', 'Combustível', 'Streaming', 'Ferramentas', 'Eletrônicos'],
      accounts: ['Nubank', 'Inter', 'Carteira'],
      methods: ['Pix', 'Cartão de Crédito', 'Débito', 'Dinheiro']
    };
    return { settings, transactions: [], budgets: [], recurring: [], goal: null };
  }

  function removeDemoData(saved) {
    const transactions = saved.transactions.filter(item => item.demo !== true);
    const budgets = saved.budgets.filter(item => item.demo !== true);
    const recurring = saved.recurring.filter(item => item.demo !== true);
    const goal = saved.goal?.demo === true ? null : saved.goal;
    if (transactions.length === saved.transactions.length && budgets.length === saved.budgets.length &&
        recurring.length === saved.recurring.length && goal === saved.goal) return saved;
    return { ...saved, transactions, budgets, recurring, goal };
  }

  return { months, shortMonths, colors, pad, periodKey, money, percent, uid, dateLabel, periodLabel, today, toCents, matchesPeriod, totals, breakdown, occurrence, schedule, initialData, removeDemoData };
})();

if (typeof module !== 'undefined') module.exports = SaldoModel;
