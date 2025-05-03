// Funções utilitárias para formatação de datas

/**
 * Formata uma data para o formato DD/MM/YYYY
 * @param date Data a ser formatada
 * @returns String no formato DD/MM/YYYY
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data para o formato DD/MM/YYYY HH:MM
 * @param date Data a ser formatada
 * @returns String no formato DD/MM/YYYY HH:MM
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
} 