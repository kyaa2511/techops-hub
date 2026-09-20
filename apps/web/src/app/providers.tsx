import { CssBaseline, ThemeProvider } from '@mui/material';
import { ClerkProvider } from '@clerk/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.tsx';
import { store } from './store.ts';
import { appTheme } from './theme.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export interface AppProvidersProps {
  /**
   * Overrides the Clerk publishable key. Intended for tests only; production
   * builds must rely on the Vite-provided `VITE_CLERK_PUBLISHABLE_KEY` value.
   */
  publishableKey?: string;
}

export function AppProviders({ publishableKey }: AppProvidersProps = {}) {
  const clerkPublishableKey = (publishableKey ?? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)?.trim();

  if (!clerkPublishableKey) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required to start the web application.');
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={appTheme}>
            <CssBaseline />
            <RouterProvider router={router} />
          </ThemeProvider>
        </QueryClientProvider>
      </Provider>
    </ClerkProvider>
  );
}
