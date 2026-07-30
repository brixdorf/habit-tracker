function pad(n) {
  return String(n).padStart(2, '0');
}

export function daysInMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthToDates(monthStr) {
  const total = daysInMonth(monthStr);
  const dates = [];
  for (let day = 1; day <= total; day++) {
    dates.push(`${monthStr}-${pad(day)}`);
  }
  return dates;
}

const WEEKDAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayAbbrev(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return WEEKDAY_ABBREVS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function dayNumber(dateStr) {
  return Number(dateStr.slice(8, 10));
}

export function addMonths(monthStr, delta) {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatMonthLabel(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
