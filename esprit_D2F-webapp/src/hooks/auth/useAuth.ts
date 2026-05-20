import { useContext } from "react";
import { AuthContext } from "@/components/common/AuthProvider";
import type { AuthContextValue } from "@/models/auth";

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
