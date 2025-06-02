import type { UserConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default {
  plugins: [basicSsl()],
  server: {
    port: 3000,
    https: true, // enable HTTPS
    allowedHosts: [".loca.lt"], // allow requests from localtunnel
  },
} satisfies UserConfig;
