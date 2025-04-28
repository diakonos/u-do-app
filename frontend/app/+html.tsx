import { PropsWithChildren } from "react";

export default function HTMLRoot({ children }: PropsWithChildren) {
  return (
    <html>
      <head>
        <title>U Do</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}