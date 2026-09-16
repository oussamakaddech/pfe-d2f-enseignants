import { useMemo, type ReactNode } from "react";
import { App } from "antd";

export interface ToastOptions {
  /** Description secondaire sous le titre. */
  description?: ReactNode;
  /** Durée en secondes avant fermeture automatique (défaut 4 s). */
  duration?: number;
}

/**
 * Toasts applicatifs — remplace tout alert()/console.error visible.
 * Position bas-droite, auto-dismiss 4 s, empilables (Ant Design notification).
 *
 *   const toast = useToast();
 *   toast.success("Formation créée");
 *   toast.error("Échec de l'enregistrement", { description: err.message });
 *
 * Hors composant React (intercepteurs axios…), utiliser le singleton
 * `notify` de @/utils/helpers/notifications.
 */
export function useToast() {
  const { notification } = App.useApp();

  return useMemo(() => {
    const fire =
      (type: "success" | "error" | "warning" | "info") =>
      (message: ReactNode, options?: ToastOptions) => {
        notification[type]({
          message,
          description: options?.description,
          placement: "bottomRight",
          duration: options?.duration ?? 4,
        });
      };

    return {
      success: fire("success"),
      error: fire("error"),
      warning: fire("warning"),
      info: fire("info"),
    };
  }, [notification]);
}

export default useToast;
