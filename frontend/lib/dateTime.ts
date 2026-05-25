function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function coerceDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatDateTime(value: Date | string | null | undefined, fallback = 'n/a'): string {
  if (!value) {
    return fallback;
  }

  const date = coerceDate(value);
  if (!date) {
    return fallback;
  }

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}