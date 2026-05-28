import "axios";

// Axios module augmentation
declare module "axios" {
  export interface AxiosRequestConfig {
    /**
     * Per-request metadata read by the global response interceptor.
     * Set `meta: { silent: true }` to suppress the automatic error toast
     * when the caller handles the error itself.
     */
    meta?: {
      silent?: boolean;
    };
  }
}




