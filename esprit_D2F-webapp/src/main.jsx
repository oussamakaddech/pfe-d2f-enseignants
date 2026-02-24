// src/main.jsx
import "@ant-design/v5-patch-for-react-19";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import { ConfigProvider, theme } from "antd";
import App from "./App.jsx";

const { defaultAlgorithm } = theme;

createRoot(document.getElementById("root")).render(
  <ConfigProvider
    theme={{
      algorithm: defaultAlgorithm,
      token: {
        colorPrimary: "#B51200" 
      },
    }}
  >
    <App />
  </ConfigProvider>
);
