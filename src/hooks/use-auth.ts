"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDeviceUUID,
  getUserName,
  setUserName as storeUserName,
  getTeamId,
  setTeamId as storeTeamId,
  clearTeamId as clearStoredTeamId,
  clearAuth as clearStoredAuth,
  getEventId,
  isAuthenticated,
} from "@/lib/auth";

export interface AuthState {
  uuid: string;
  userName: string | null;
  teamId: string | null;
  eventId: string | null;
  isReady: boolean;
  isOnboarded: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    uuid: "",
    userName: null,
    teamId: null,
    eventId: null,
    isReady: false,
    isOnboarded: false,
  });

  useEffect(() => {
    const uuid = getDeviceUUID();
    const userName = getUserName();
    const teamId = getTeamId();
    const eventId = getEventId();

    setState({
      uuid,
      userName,
      teamId,
      eventId,
      isReady: true,
      isOnboarded: isAuthenticated(),
    });
  }, []);

  const setUserName = useCallback((name: string) => {
    storeUserName(name);
    setState((prev) => ({ ...prev, userName: name, isOnboarded: true }));
  }, []);

  const setTeamId = useCallback((teamId: string) => {
    storeTeamId(teamId);
    setState((prev) => ({ ...prev, teamId }));
  }, []);

  const clearTeamId = useCallback(() => {
    clearStoredTeamId();
    setState((prev) => ({ ...prev, teamId: null }));
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setState({
      uuid: "",
      userName: null,
      teamId: null,
      eventId: null,
      isReady: true,
      isOnboarded: false,
    });
  }, []);

  return { ...state, setUserName, setTeamId, clearTeamId, logout };
}
