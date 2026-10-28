/**
 * Utilitários de Formatação de Data e Moeda
 * Requisitos:
 * - Datas no formato DD/MM/AAAA
 * - Horários no formato 24 horas
 * - Fuso horário America/Recife (UTC-3)
 */

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    // Se vier no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-');
      return `${d}/${m}/${y}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch (err) {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Recife',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch (err) {
    return dateString;
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatCompetencyName(key: string): string {
  if (!key) return '';
  const [yearStr, monthStr] = key.split('-');
  const month = parseInt(monthStr, 10);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = months[month - 1] || monthStr;
  return `${monthName}/${yearStr}`;
}
