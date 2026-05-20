import { App } from "antd";

export function useAppNotification() {
  const { message, notification, modal } = App.useApp();
  return { message, notification, modal };
}

export default useAppNotification;




