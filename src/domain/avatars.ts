/** Avatares genéricos: apenas ícone + cor. Fotos são proibidas (RF-11 / LGPD). */
export const AVATAR_ICONS = [
  "star",
  "rocket",
  "sun",
  "book",
  "heart",
  "cloud",
  "leaf",
  "music",
  "fish",
  "bird",
  "flower",
  "smile",
] as const;
export type AvatarIcon = (typeof AVATAR_ICONS)[number];

export const AVATAR_COLORS = ["sky", "emerald", "amber", "rose", "violet", "teal", "orange", "indigo", "lime", "pink"] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const DEFAULT_AVATAR_ICON: AvatarIcon = "star";
export const DEFAULT_AVATAR_COLOR: AvatarColor = "sky";

export const AVATAR_ICON_NAMES: Record<AvatarIcon, string> = {
  star: "estrela",
  rocket: "foguete",
  sun: "sol",
  book: "livro",
  heart: "coração",
  cloud: "nuvem",
  leaf: "folha",
  music: "música",
  fish: "peixe",
  bird: "pássaro",
  flower: "flor",
  smile: "sorriso",
};

export const AVATAR_COLOR_NAMES: Record<AvatarColor, string> = {
  sky: "azul-claro",
  emerald: "verde",
  amber: "amarelo",
  rose: "rosa",
  violet: "violeta",
  teal: "verde-água",
  orange: "laranja",
  indigo: "anil",
  lime: "verde-limão",
  pink: "pink",
};
