import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("locale", "routes/locale.tsx"),
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("keys", "routes/keys.tsx"),
    route("support", "routes/support.tsx"),
    route("admin/keys", "routes/admin.keys.tsx"),
    route("admin/customers", "routes/admin.customers.tsx"),
    route("admin/stats", "routes/admin.stats.tsx"),
  ]),
] satisfies RouteConfig;
