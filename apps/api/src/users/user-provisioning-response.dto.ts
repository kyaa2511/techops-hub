export class UserProvisioningResponseDto {
  constructor(
    public readonly userId: string,
    public readonly clerkUserId: string,
    public readonly created: boolean,
  ) {}
}
