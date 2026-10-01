const IST_OFFSET_MINUTES = 5 * 60 + 30;

function toISTParts(date) {
  const istMs = date.getTime() + IST_OFFSET_MINUTES * 60000;
  return new Date(istMs);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function todayIST() {
  const ist = toISTParts(new Date());
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

export function currentMonthIST() {
  return todayIST().slice(0, 7);
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

export function weekdayAbbrev(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const abbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return abbrevs[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function addMonths(monthStr, delta) {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function compareMonth(a, b) {
  return a.localeCompare(b);
}

export function compareDate(a, b) {
  return a.localeCompare(b);
}

export function dateMonth(dateStr) {
  return dateStr.slice(0, 7);
}

export function isValidMonth(monthStr) {
  if (typeof monthStr !== 'string' || !/^\d{4}-\d{2}$/.test(monthStr)) return false;
  const month = Number(monthStr.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function isValidDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const monthStr = dateStr.slice(0, 7);
  if (!isValidMonth(monthStr)) return false;
  const day = Number(dateStr.slice(8, 10));
  return day >= 1 && day <= daysInMonth(monthStr);
}
