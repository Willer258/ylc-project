"use client";

const UUID_KEY = "ycl_device_uuid";
const NAME_KEY = "ycl_user_name";
const TEAM_KEY = "ycl_team_id";
const EVENT_KEY = "ycl_event_id";

export function getDeviceUUID(): string {
  if (typeof window === "undefined") return "";

  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

export function setUserName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function getTeamId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TEAM_KEY);
}

export function setTeamId(teamId: string): void {
  localStorage.setItem(TEAM_KEY, teamId);
}

export function getEventId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EVENT_KEY);
}

export function setEventId(eventId: string): void {
  localStorage.setItem(EVENT_KEY, eventId);
}

export function isAuthenticated(): boolean {
  return !!getUserName() && !!getDeviceUUID();
}

export function clearTeamId(): void {
  localStorage.removeItem(TEAM_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(UUID_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(TEAM_KEY);
  localStorage.removeItem(EVENT_KEY);
}
