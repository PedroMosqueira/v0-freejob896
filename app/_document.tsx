import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Polyfill btoa para suportar UTF-8
              (function() {
                var originalBtoa = window.btoa;
                window.btoa = function(str) {
                  try {
                    return originalBtoa(str);
                  } catch (e) {
                    // Se falhar, converter UTF-8 para Latin1 primeiro
                    return originalBtoa(unescape(encodeURIComponent(str)));
                  }
                };
                console.log('[v0] btoa UTF-8 fix aplicado');
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
