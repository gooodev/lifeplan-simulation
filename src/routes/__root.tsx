import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../index.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ライフプラン・シミュレーション" },
    ],
    // GitHub Pages では base path 配下（/<repo>/favicon.svg）に配信されるため、
    // 固定の "/favicon.svg" ではなく Vite の BASE_URL から組み立てる。
    links: [{ rel: "icon", type: "image/svg+xml", href: `${import.meta.env.BASE_URL}favicon.svg` }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      {/* next-themes: システム設定への自動追従・手動トグルの両方を1つの仕組みで扱う */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={200}>
          <Outlet />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
