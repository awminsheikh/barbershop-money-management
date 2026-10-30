"use client";

import { createContext, useContext } from "react";
import type { User } from "./types";

export const AuthContext = createContext<{ user: User; logout: () => void } | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth outside the signed-in app");
  return value;
}
