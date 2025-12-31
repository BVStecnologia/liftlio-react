// Funções utilitárias para formatação de datas
// Atualizado: 2025-12-31 - Fix timezone UTC para exibição local

/**
 * Converte uma string de timestamp do Supabase para Date interpretando como UTC.
 */
export function parseUTCTimestamp(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  try {
    let normalized = dateString.trim().replace(' ', 'T');
    if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
      normalized += 'Z';
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
      console.warn('[parseUTCTimestamp] Invalid date:', dateString);
      return null;
    }
    return date;
  } catch (error) {
    console.error('[parseUTCTimestamp] Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Formata uma data para o formato DD/MM/YYYY
 */
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    const parsed = parseUTCTimestamp(date);
    if (!parsed) return '';
    d = parsed;
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data para o formato DD/MM/YYYY HH:MM
 */
export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    const parsed = parseUTCTimestamp(date);
    if (!parsed) return '';
    d = parsed;
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata uma data usando toLocaleDateString com opções personalizadas
 */
export function formatDateLocale(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  },
  locale: string = 'pt-BR'
): string {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    const parsed = parseUTCTimestamp(date);
    if (!parsed) return '';
    d = parsed;
  } else {
    d = new Date(date);
  }
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, options);
}

/**
 * Verifica se uma data é "hoje" no timezone local do usuário
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  let d: Date;
  if (typeof date === 'string') {
    const parsed = parseUTCTimestamp(date);
    if (!parsed) return false;
    d = parsed;
  } else {
    d = date;
  }
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

export function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getTodayEnd(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}
