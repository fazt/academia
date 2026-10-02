import { Hono } from "hono";
import { type AppEnv, requireAdmin } from "../../middleware/auth";
import { adminCatalogRoutes } from "./catalog";
import { adminCourseRoutes } from "./courses";
import { adminPeopleRoutes } from "./people";
import { adminStatsRoutes } from "./stats";

export const adminRoutes = new Hono<AppEnv>()
  .use(requireAdmin)
  .route("/", adminStatsRoutes)
  .route("/", adminCourseRoutes)
  .route("/", adminCatalogRoutes)
  .route("/", adminPeopleRoutes);
