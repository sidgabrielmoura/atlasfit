export function parseDayOfWeekToInt(day: any): number | null {
  if (typeof day === "number") {
    if (day >= 0 && day <= 6) return day;
    return null;
  }
  if (day === null || day === undefined) return null;
  const str = String(day).trim().toLowerCase();
  if (!str) return null;

  if (str.includes("dom") || str === "0") return 0;
  if (str.includes("seg") || str === "1") return 1;
  if (str.includes("ter") || str === "2") return 2;
  if (str.includes("qua") || str === "3") return 3;
  if (str.includes("qui") || str === "4") return 4;
  if (str.includes("sex") || str === "5") return 5;
  if (str.includes("sáb") || str.includes("sab") || str === "6") return 6;

  return null;
}

export function formatDayOfWeekToString(day: any): string | null {
  if (typeof day === "string" && day.trim() !== "") {
    return day;
  }
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  if (typeof day === "number" && day >= 0 && day <= 6) {
    return days[day];
  }
  return null;
}
