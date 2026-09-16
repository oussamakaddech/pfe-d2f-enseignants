import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setNavigate } from "../utils/helpers/navigation";

export function NavigationSetter() {
  const nav = useNavigate();
  useEffect(() => {
    setNavigate((to, opts) => nav(to, { replace: !!opts?.replace }));
  }, [nav]);
  return null;
}




