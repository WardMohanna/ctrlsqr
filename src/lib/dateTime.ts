export function formatDateTime24(
  value: string | number | Date,
  locale?: string,
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export const APP_TIME_ZONE = "Asia/Jerusalem";

function getTimeZoneOffsetMs(date: Date, timeZone = APP_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  const localTimeAsUtc = Date.UTC(
    Number(values.get("year")),
    Number(values.get("month")) - 1,
    Number(values.get("day")),
    Number(values.get("hour")),
    Number(values.get("minute")),
    Number(values.get("second")),
  );

  return localTimeAsUtc - date.getTime();
}

export function getAppDateKey(
  value: string | number | Date = new Date(),
  timeZone = APP_TIME_ZONE,
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function getAppDateRange(dateKey: string, timeZone = APP_TIME_ZONE) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const [, year, month, day] = match;
  const start = getAppDateTimeAsUtc(
    Number(year),
    Number(month),
    Number(day),
    timeZone,
  );
  const nextDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + 1),
  );
  const end = new Date(
    getAppDateTimeAsUtc(
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth() + 1,
      nextDate.getUTCDate(),
      timeZone,
    ).getTime() - 1,
  );

  return { start, end };
}

function getAppDateTimeAsUtc(
  year: number,
  month: number,
  day: number,
  timeZone = APP_TIME_ZONE,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const firstPass = new Date(
    utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, timeZone),
  );
  return new Date(
    utcGuess.getTime() - getTimeZoneOffsetMs(firstPass, timeZone),
  );
}
