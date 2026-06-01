import { memo, useEffect } from "react";
import { App } from "antd";
import { registerMessageApi } from "@/utils/helpers/notifications";

/**
 * Mount inside <AntdApp> to expose Ant Design's message API to non-React code
 * (axios interceptors, utility functions) via the `notify.*` singleton.
 */
const NotificationBridge = memo(function NotificationBridge() {
  const { message } = App.useApp();

  useEffect(() => {
    registerMessageApi({
      success: (c) => { message.success(c); },
      error: (c) => { message.error(c); },
      warning: (c) => { message.warning(c); },
      info: (c) => { message.info(c); },
    });
  }, [message]);

  return null;
});

export default NotificationBridge;




