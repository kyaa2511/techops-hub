import { Box, Button, Stack, Typography } from '@mui/material';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import type { ReactNode } from 'react';

export function AuthGate({ children }: { children: ReactNode }) {
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
