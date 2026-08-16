import { createRoute } from "@tanstack/react-router";
import { ProgressView } from "../features/progress/ProgressView.js";
import { rootRoute } from "./__root.js";

export const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  component: ProgressView,
});
