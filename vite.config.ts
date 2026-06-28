import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const useHttps = process.env.VITE_HTTPS === "true";

export default defineConfig({
  plugins: useHttps ? [basicSsl()] : [],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
