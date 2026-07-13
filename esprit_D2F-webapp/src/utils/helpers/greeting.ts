import dayjs from "dayjs";

export function greeting(): { text: string; emoji: string } {
  const h = dayjs().hour();
  if (h < 12) return { text: "Bonjour", emoji: "🌅" };
  if (h < 18) return { text: "Bon après-midi", emoji: "☀️" };
  return { text: "Bonsoir", emoji: "🌙" };
}
