import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Server code (loaders/actions) reads process.env; load apps/dashboard/.env for local runs.
  // Variables that are already set (CI, hosting) win over the file.
  Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ""), ...process.env });

  return {
    plugins: [reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port: Number(process.env.PORT ?? 3000),
      strictPort: true,
    },
  };
});
