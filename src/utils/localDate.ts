export function getLocalDateInputValue(date = new Date()): string {
  const localTime = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return localTime.toISOString().slice(0, 10);
}

export function millisecondsUntilNextLocalDay(date = new Date()): number {
  const nextDay = new Date(date);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(1, nextDay.getTime() - date.getTime());
}

export function getLocalDateRange(dateValue: string): {
  start: string;
  end: string;
} {
  const [year, month, day] = dateValue.split("-").map(Number);
  const startDate = new Date(year, month - 1, day);
  const endDate = new Date(year, month - 1, day + 1);

  if (
    !year ||
    !month ||
    !day ||
    startDate.getFullYear() !== year ||
    startDate.getMonth() !== month - 1 ||
    startDate.getDate() !== day
  ) {
    throw new Error("Choose a valid activity date.");
  }

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}
