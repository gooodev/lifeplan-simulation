import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // GitHub Pages では `/<repo>/` 配下に配信されるため、vite.config.ts の
    // base と同じ VITE_BASE_PATH からルーターのベースパスを合わせる。
    basepath: import.meta.env.VITE_BASE_PATH || "/",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
