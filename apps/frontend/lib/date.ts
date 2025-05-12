/** Pads a number to two digits */
export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDateUI(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Formats a Date as yyyy-mm-dd (local time) */
export function formatDateYMD(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Formats a Date as yyyy-mm-ddTHH:mm:ss.sss (local time, no Z) */
export function formatDateYMDTime(date: Date): string {
  return `${formatDateYMD(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.000`;
}

/** Formats a Date as yyyy-mm-ddTHH:mm:ss.sss+00:00 (UTC time) */
export function formatDateForDBTimestamp(date: Date): string {
  return date.toISOString().replace('Z', '').concat('+00:00');
}
