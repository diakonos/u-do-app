import { formatDateForDBTimestamp } from '@/lib/date';

export function generateTimestamp(): string {
  const date = new Date();
  return formatDateForDBTimestamp(date);
}
