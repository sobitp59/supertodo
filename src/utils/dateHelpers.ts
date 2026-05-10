import { format, getDate } from 'date-fns';

// Ordinal suffix for dates (1st, 2nd, 3rd, 4th, etc.)
export const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatDateDisplay = (date: Date) => {
  const dayName = format(date, 'EEEE');
  const day = getOrdinal(getDate(date));
  const monthYear = format(date, 'MMM yyyy');
  return `${dayName}, ${day} ${monthYear}`;
};
