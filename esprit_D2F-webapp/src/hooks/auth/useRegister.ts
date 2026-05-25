import { useState } from "react";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { signup } from "@/services/auth/AuthService";
import EnseignantService from "@/services/formation/EnseignantService";

export interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  confirmEmail: string;
  role: string;
  newsletter: boolean;
}

const TEACHER_ROLES = ["Enseignant", "Formateur", "CUP", "CHEF_DEPARTEMENT"];

export function useRegister() {
  const { message } = useAppNotification();
  const [loading, setLoading] = useState(false);

  const register = async (values: RegisterFormValues): Promise<boolean> => {
    setLoading(true);
    try {
      await signup({
        username: values.username,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        email: values.email,
        role: values.role,
        newsletter: values.newsletter,
      });

      if (TEACHER_ROLES.includes(values.role)) {
        try {
          await EnseignantService.createEnseignant({
            nom: values.lastName.toUpperCase(),
            prenom: values.firstName,
            mail: values.email,
            type: "P",
            etat: "A",
            cup: values.role === "CUP" ? "O" : "N",
            chefDepartement: values.role === "CHEF_DEPARTEMENT" ? "O" : "N",
            up: null,
            dept: null,
          });
        } catch {
          message.warning("Compte créé, mais l'ajout à l'annuaire des enseignants a échoué.");
        }
      }

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
