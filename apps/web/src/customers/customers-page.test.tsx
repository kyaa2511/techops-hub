import { jest } from "@jest/globals";
import type { ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.setTimeout(15000);
let identity = {
  isLoaded: true,
  isSignedIn: true,
  userId: "user-a",
  sessionId: "session-a",
  getToken: async () => "token-a",
};
jest.unstable_mockModule("@clerk/react", () => ({
  useAuth: () => identity,
  ClerkProvider: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
}));
const { MemoryRouter } = await import("react-router-dom");
const { AuthGate } = await import("../auth/auth-gate.tsx");
const { AuthConfigurationContext } =
  await import("../auth/auth-configuration.ts");
const { CustomersPage } = await import("./customers-page.tsx");
const { OrganizationSelection } =
  await import("../auth/organization-selection.tsx");
const { OrganizationContext, tenantQueryKey } =
  await import("../auth/organization-context.ts");
const fetchMock = jest.fn<typeof fetch>();
const orgs = [
  {
    organizationId: "org-a",
    name: "Alpha",
    slug: "alpha",
    membershipId: "member-a",
    role: "OWNER" as const,
  },
  {
    organizationId: "org-b",
    name: "Beta",
    slug: "beta",
    membershipId: "member-b",
    role: "ADMIN" as const,
  },
];
const customer = (id = "org-a") => ({
  id: "customer-" + id,
  organizationId: id,
  name: id === "org-a" ? "Alice" : "Bob",
  email: null,
  phone: "555-0100",
  address: "Main Street",
  notes: "Call first",
  status: "ACTIVE",
  createdAt: "2026-10-11T00:00:00Z",
  updatedAt: "2026-10-11T00:00:00Z",
});
function response(data: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => data } as Response;
}
function defaultFetch(input: RequestInfo | URL, init?: RequestInit) {
  const id = new Headers(init?.headers).get("X-Organization-Id")!;
  if (String(input).endsWith("/organizations"))
    return Promise.resolve(response(orgs));
  if (String(input).endsWith("/auth/context"))
    return Promise.resolve(
      response({
        authenticated: true,
        userId: "local",
        organizationId: id,
        membershipId: "member-" + id,
        role: "OWNER",
      }),
    );
  if (init?.method)
    return Promise.resolve(
      response(customer(id), init.method === "POST" ? 201 : 200),
    );
  return Promise.resolve(
    response({ items: [customer(id)], total: 1, page: 1, limit: 25 }),
  );
}
beforeEach(() => {
  identity = {
    isLoaded: true,
    isSignedIn: true,
    userId: "user-a",
    sessionId: "session-a",
    getToken: async () => "token-a",
  };
  fetchMock.mockReset().mockImplementation(defaultFetch);
  global.fetch = fetchMock;
});
function setup(
  child?: ReactNode,
  role: "OWNER" | "ADMIN" | "MEMBER" = "OWNER",
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      {child ?? (
        <OrganizationContext.Provider
          value={{
            identityId: "user-a",
            organization: { ...orgs[0], role },
            revoke: () => {},
          }}
        >
          <CustomersPage />
        </OrganizationContext.Provider>
      )}
    </QueryClientProvider>,
  );
  return client;
}
async function choose(name: string) {
  await userEvent.click(
    await screen.findByRole("combobox", { name: "Organization" }),
  );
  await userEvent.click(screen.getByRole("option", { name }));
}
it("lists, creates and updates with tenant headers and optional nulls", async () => {
  setup();
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "Add customer" }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Name" }),
    " Carol ",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save customer" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(String(fetchMock.mock.calls[0][0])).toContain(
    "/api/v1/customers?page=1&limit=25",
  );
  const created = fetchMock.mock.calls.find(
    ([, init]) => init?.method === "POST",
  )!;
  expect(String(created[0])).toMatch(/\/api\/v1\/customers$/);
  expect(JSON.parse(created[1]?.body as string)).toMatchObject({
    name: "Carol",
    email: null,
    address: null,
    status: "ACTIVE",
  });
  expect(new Headers(created[1]?.headers).get("X-Organization-Id")).toBe(
    "org-a",
  );
  await userEvent.click(screen.getByRole("button", { name: "Edit Alice" }));
  expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue(
    "Call first",
  );
  await userEvent.clear(screen.getByRole("textbox", { name: "Notes" }));
  await userEvent.click(screen.getByRole("button", { name: "Save customer" }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(true),
  );
  const updated = fetchMock.mock.calls.find(
    ([, init]) => init?.method === "PATCH",
  )!;
  expect(String(updated[0])).toContain("/api/v1/customers/customer-org-a");
  expect(JSON.parse(updated[1]?.body as string)).toMatchObject({
    notes: null,
    name: "Alice",
  });
});
it("keeps failed saves open and offers retry for failed lists", async () => {
  fetchMock.mockResolvedValueOnce(response({}, 500));
  setup();
  await screen.findByText("Unable to load customers.");
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "Edit Alice" }));
  fetchMock.mockResolvedValueOnce(response({}, 400));
  await userEvent.click(screen.getByRole("button", { name: "Save customer" }));
  expect(
    await screen.findByText("Check the customer fields and try again."),
  ).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
it("sends no customer request for MEMBER", async () => {
  setup(undefined, "MEMBER");
  expect(
    screen.getByText(/Customer management is available/),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not show prior customer or retain its query after switching", async () => {
  const client = setup(
    <OrganizationSelection identityId="user-a">
      <CustomersPage />
    </OrganizationSelection>,
  );
  await choose("Alpha (alpha)");
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "Edit Alice" }));
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await choose("Beta (beta)");
  await screen.findByText("Bob");
  expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    client.getQueriesData({
      queryKey: tenantQueryKey("user-a", "org-a", "customers"),
    }),
  ).toEqual([]);
});
it("aborts an in-flight save on workspace replacement and discards its late result", async () => {
  let resolve!: (value: Response) => void;
  fetchMock.mockImplementation((input, init) =>
    init?.method === "PATCH"
      ? new Promise<Response>((done) => {
          resolve = done;
        })
      : defaultFetch(input, init),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function workspace(index: number) {
    return (
      <QueryClientProvider client={client}>
        <OrganizationContext.Provider
          key={index}
          value={{
            identityId: "user-a",
            organization: orgs[index],
            revoke: () => {},
          }}
        >
          <CustomersPage />
        </OrganizationContext.Provider>
      </QueryClientProvider>
    );
  }
  const view = render(workspace(0));
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "Edit Alice" }));
  await userEvent.click(screen.getByRole("button", { name: "Save customer" }));
  await waitFor(() => expect(resolve).toBeDefined());
  const mutation = fetchMock.mock.calls.find(
    ([, init]) => init?.method === "PATCH",
  )!;
  view.rerender(workspace(1));
  await screen.findByText("Bob");
  expect(mutation[1]?.signal?.aborted).toBe(true);
  await act(async () => resolve(response({}, 403)));
  expect(screen.getByText("Bob")).toBeInTheDocument();
  expect(screen.queryByText("Alice")).not.toBeInTheDocument();
});

it("shows the empty customer directory", async () => {
  fetchMock.mockResolvedValue(
    response({ items: [], total: 0, page: 1, limit: 25 }),
  );
  setup();
  expect(
    await screen.findByText("No customers on this page."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});

it("clears customer data and drafts on identity change and sign-out", async () => {
  function tree() {
    return (
      <MemoryRouter>
        <AuthConfigurationContext.Provider value="pk_test_configured">
          <AuthGate>
            <CustomersPage />
          </AuthGate>
        </AuthConfigurationContext.Provider>
      </MemoryRouter>
    );
  }
  const view = render(tree());
  await choose("Alpha (alpha)");
  await screen.findByText("Alice");
  await userEvent.click(screen.getByRole("button", { name: "Edit Alice" }));
  identity = {
    ...identity,
    userId: "user-b",
    sessionId: "session-b",
    getToken: async () => "token-b",
  };
  view.rerender(tree());
  await screen.findByRole("combobox", { name: "Organization" });
  expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fetchMock.mockImplementation((input, init) =>
    String(input).includes("/customers")
      ? Promise.resolve(
          response({
            items: [{ ...customer(), name: "Carol" }],
            total: 1,
            page: 1,
            limit: 25,
          }),
        )
      : defaultFetch(input, init),
  );
  await choose("Alpha (alpha)");
  await screen.findByText("Carol");
  expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  const call = fetchMock.mock.calls
    .filter(([input]) => String(input).includes("/customers"))
    .at(-1)!;
  expect(new Headers(call[1]?.headers).get("Authorization")).toBe(
    "Bearer token-b",
  );
  identity = { ...identity, isSignedIn: false };
  view.rerender(tree());
  expect(screen.getByText("Welcome to TechOps Hub")).toBeInTheDocument();
  expect(screen.queryByText("Carol")).not.toBeInTheDocument();
});
