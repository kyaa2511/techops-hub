export interface AuthenticatedIdentity {
  clerkUserId: string;
}

export interface AuthenticatedRequest {
  authenticatedIdentity?: AuthenticatedIdentity;
}
