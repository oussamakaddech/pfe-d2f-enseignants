type NavigateFunc = (to: string, options?: { replace?: boolean } | undefined) => void;

let _navigate: NavigateFunc | null = null;

export const setNavigate = (fn: NavigateFunc) => {
  _navigate = fn;
};

export const navigate = (to: string, options?: { replace?: boolean }) => {
  if (_navigate) {
    try {
      _navigate(to, options);
      return;
    } catch (e) {
      // fallback to location change if react-router navigation fails
      console.debug("[navigation] react-router navigate failed", e);
    }
  }

  if (options?.replace) {
    window.location.replace(to);
  } else {
    window.location.href = to;
  }
};

export const resetNavigate = () => {
  _navigate = null;
};
