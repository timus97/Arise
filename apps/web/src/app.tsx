import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root.js";
import { indexRoute } from "./routes/index.js";
import { loginRoute } from "./routes/login.js";
import { registerRoute } from "./routes/register.js";
import { progressRoute } from "./routes/progress.js";
import { healthRoute } from "./routes/health.js";
import { settingsRoute } from "./routes/settings.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  progressRoute,
  settingsRoute,
  healthRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
