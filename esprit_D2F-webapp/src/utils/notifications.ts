/**
 * notifications.ts — Singleton bridge to Ant Design's message/notification APIs.
 *
 * Ant Design v5 requires hook-based `App.useApp()` to display toasts inside the
 * theme context. This bridge captures those APIs once at mount (via
 * <NotificationBridge />) so non-React code (axios interceptors, utils) can
 * still trigger toasts.
 */

type MessageApi = {
  success: (content: string) => void;
  error: (content: string) => void;
  warning: (content: string) => void;
  info: (content: string) => void;
};

let messageApi: MessageApi | null = null;

export function registerMessageApi(api: MessageApi): void {
  messageApi = api;
}

export const notify = {
  success(content: string) {
    if (messageApi) messageApi.success(content);
  },
  error(content: string) {
    if (messageApi) messageApi.error(content);
    else if (typeof window !== "undefined") console.error("[notify]", content);
  },
  warning(content: string) {
    if (messageApi) messageApi.warning(content);
  },
  info(content: string) {
    if (messageApi) messageApi.info(content);
  },
};
