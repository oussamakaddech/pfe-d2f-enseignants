import { createContext } from "react";
import type { AuthContextValue } from "../models/auth";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
