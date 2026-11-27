import { EVENT_KEYS, type EventKey, type EventStatus, type RouteProfile } from "./types";

export type Route = "ida" | "volta";

export interface EventDefinition {
  key: EventKey;
  order: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  route: Route;
  /** Para eventos de desembarque: o embarque correspondente (RN-14). */
  boardingKey?: EventKey;
}

export const EVENTS: Record<EventKey, EventDefinition> = {
  embarque_escola: { key: "embarque_escola", order: 1, label: "Embarque para escola", shortLabel: "Embarque escola", route: "ida" },
  desembarque_escola: {
    key: "desembarque_escola",
    order: 2,
    label: "Desembarque na escola",
    shortLabel: "Desembarque escola",
    route: "ida",
    boardingKey: "embarque_escola",
  },
  embarque_casa: { key: "embarque_casa", order: 3, label: "Embarque para casa", shortLabel: "Embarque casa", route: "volta" },
  desembarque_casa: {
    key: "desembarque_casa",
    order: 4,
    label: "Desembarque em casa",
    shortLabel: "Desembarque casa",
    route: "volta",
    boardingKey: "embarque_casa",
  },
};

export const EVENT_LIST: EventDefinition[] = EVENT_KEYS.map((k) => EVENTS[k]);

export const ROUTE_LABELS: Record<Route, string> = { ida: "Trajeto de Ida", volta: "Trajeto de Volta" };

export const STATUS_LABELS: Record<EventStatus, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  nao_compareceu: "Não compareceu",
  nao_se_aplica: "Não se aplica",
};

export const ROUTE_PROFILE_LABELS: Record<RouteProfile, string> = {
  ida_e_volta: "Ida e volta",
  somente_ida: "Somente ida",
  somente_volta: "Somente volta",
};

export function isEventKey(value: unknown): value is EventKey {
  return typeof value === "string" && (EVENT_KEYS as readonly string[]).includes(value);
}

/** Eventos dos quais o aluno participa conforme o perfil de trajeto (RN-04). */
export function eventsForProfile(profile: RouteProfile): EventKey[] {
  switch (profile) {
    case "somente_ida":
      return ["embarque_escola", "desembarque_escola"];
    case "somente_volta":
      return ["embarque_casa", "desembarque_casa"];
    default:
      return [...EVENT_KEYS];
  }
}
