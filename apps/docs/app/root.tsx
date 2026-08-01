import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { RootProvider } from 'fumadocs-ui/provider/react-router'
import type { Route } from './+types/root'
import './app.css'

export const links: Route.LinksFunction = () => [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="only light" />
        <meta name="theme-color" content="#f3f0ee" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          theme={{ enabled: false, defaultTheme: 'light' }}
          search={{ options: { type: 'static', api: '/static.json' } }}
        >
          {children}
        </RootProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Something went wrong'
  let details = 'An unexpected error occurred.'

  if (isRouteErrorResponse(error)) {
    message = `Error ${error.status}`
    details = error.status === 404 ? 'This page does not exist.' : error.statusText
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
  }

  return (
    <main className="pt-16 p-4 w-full max-w-2xl mx-auto text-center">
      <h1 className="text-2xl font-medium">{message}</h1>
      <p className="text-fd-muted-foreground mt-2">{details}</p>
      <a href="/docs" className="text-fd-primary underline mt-4 inline-block">
        Back to the docs
      </a>
    </main>
  )
}
