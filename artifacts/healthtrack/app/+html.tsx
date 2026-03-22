import { type PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <title>Vital – Health Tracker</title>
        <meta
          name="description"
          content="Personal health tracking for medications and skincare routines."
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#34C78B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Vital" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />

        <meta name="msapplication-TileColor" content="#34C78B" />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; }
              body { overflow: hidden; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
