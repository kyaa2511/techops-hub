import { Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedApi } from '../shared/api/authenticated-api.ts';

interface SessionResponse {
  authenticated: boolean;
  clerkUserId: string;
}

export function SessionVerification() {
  const authenticatedFetch = useAuthenticatedApi();
  const sessionQuery = useQuery({
    queryKey: ['auth-session'],
    queryFn: async (): Promise<SessionResponse> => {
      const response = await authenticatedFetch('/api/v1/auth/session');
      if (!response.ok) {
        throw new Error(`Authenticated session request failed with status ${response.status}.`);
      }
      return response.json() as Promise<SessionResponse>;
    },
  });

  if (sessionQuery.isPending) {
    return <Alert severity="info">Verifying authenticated API session…</Alert>;
  }

  if (sessionQuery.isError) {
    return <Alert severity="error">The backend could not verify the Clerk session.</Alert>;
  }

  return <Alert severity="success">Authenticated as {sessionQuery.data.clerkUserId}.</Alert>;
}
