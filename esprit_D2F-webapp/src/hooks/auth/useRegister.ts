import { useState } from "react";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { signup } from "@/services/auth/AuthService";

export interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  confirmEmail: string;
  newsletter: boolean;
}

export function useRegister() {
  const { message } = useAppNotification();
  const [loading, setLoading] = useState(false);

  const register = async (values: RegisterFormValues): Promise<boolean> => {
    setLoading(true);
    try {
      // SÉCURITÉ (audit DSI – BLOCKER #1) : aucun rôle n'est envoyé. Le backend
      // crée systématiquement un compte ENSEIGNANT ; l'attribution d'un rôle
      // privilégié relève de l'administrateur (gestion des comptes).
      await signup({
        username: values.username,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        email: values.email,
      });

      message.success("Inscription réussie ! Un email de confirmation vous a été envoyé.");
      return true;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      message.error(axiosErr.response?.data?.message || "Une erreur est survenue pendant l'inscription.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, register };
}
