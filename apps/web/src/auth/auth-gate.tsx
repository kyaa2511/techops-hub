import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ClerkProvider, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { AuthConfigurationContext } from './auth-configuration.ts';

export function AuthGate({ children }: { children: ReactNode }) {
  const configured = useContext(AuthConfigurationContext);
  if (!configured) {
    return <Box sx={{ maxWidth: 600, mx: 'auto', p: 4 }}><Alert severity="info">Workspace sign-in is not configured in this environment.</Alert><Button component={Link} to="/demo" sx={{ mt: 2 }}>Explore the demo</Button></Box>;
  }
  return <ClerkProvider publishableKey={configured}><ConfiguredAuthGate>{children}</ConfiguredAuthGate></ClerkProvider>;
}

function ConfiguredAuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <Box sx={{ py: 12, textAlign: 'center' }}>
        <Stack alignItems="center" gap={2}>
          <Typography component="h1" variant="h3">
            Welcome to TechOps Hub
          </Typography>
          <Typography color="text.secondary">Sign in or create an account to continue.</Typography>
          <Stack direction="row" gap={2}>
            <SignInButton mode="modal">
              <Button variant="contained">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outlined">Sign up</Button>
            </SignUpButton>
          </Stack>
          <Button component={Link} to="/demo">Explore the public demo</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Stack alignItems="flex-end" sx={{ p: 2 }}>
        <UserButton />
      </Stack>
      {children}
    </>
  );
}
