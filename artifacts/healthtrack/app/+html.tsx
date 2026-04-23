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

        <title>PrivaCare – Private Health Tracker</title>
        <meta
          name="description"
          content="Personal health tracking for medications and skincare routines."
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#34C78B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PrivaCare" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />

        <meta name="msapplication-TileColor" content="#34C78B" />

        {/*
          GitHub Pages SPA redirect receiver.
          Companion to public/404.html — restores the URL from the ?p= param
          set by the 404 redirect so deep links and refreshes work on GitHub Pages.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=new URLSearchParams(window.location.search).get('p');if(p){var h=new URLSearchParams(window.location.search).get('h')||'';var qs=window.location.search.replace(/[?&]p=[^&]*/,'').replace(/[?&]h=[^&]*/,'').replace(/^[?&]/,'');var url='/'+decodeURIComponent(p)+(qs?'?'+qs:'')+(h?'#'+decodeURIComponent(h):'');window.history.replaceState(null,null,url);}})();`,
          }}
        />
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
