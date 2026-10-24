/**
 * Menghitung usia balita dalam hitungan bulan penuh berdasarkan tanggal lahir
 */
export function calculateAgeInMonths(birthDateStr: string, asOfDateStr?: string): number {
  if (!birthDateStr) return 0;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 0;

  const targetDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
  if (isNaN(targetDate.getTime())) return 0;

  let months = (targetDate.getFullYear() - birth.getFullYear()) * 12 + (targetDate.getMonth() - birth.getMonth());
  
  if (targetDate.getDate() < birth.getDate()) {
    months -= 1;
  }
  
  return Math.max(0, months);
}

/**
 * Format tanggal dalam bahasa Indonesia sederhana
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
