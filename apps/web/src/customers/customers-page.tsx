import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantQueryKey,
  useOrganization,
} from "../auth/organization-context.ts";
import { useOrganizationApi } from "../shared/api/authenticated-api.ts";

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}
interface CustomerPage {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
}
const blank = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  status: "ACTIVE" as Customer["status"],
};
type Draft = typeof blank;

async function failure(response: Response): Promise<never> {
  let message = "Unable to complete the customer request. Please try again.";
  if (response.status === 400)
    message = "Check the customer fields and try again.";
  if (response.status === 404)
    message =
      "This customer is no longer available. Close the editor and refresh the list.";
  throw new Error(message);
}

export function CustomersPage() {
  const { identityId, organization } = useOrganization();
  const api = useOrganizationApi();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );
  const allowed =
    organization.role === "OWNER" || organization.role === "ADMIN";
  const key = tenantQueryKey(
    identityId,
    organization.organizationId,
    "customers",
  );
  const customers = useQuery<CustomerPage>({
    queryKey: [...key, page],
    enabled: allowed,
    queryFn: async ({ signal }) => {
      const response = await api(`/api/v1/customers?page=${page}&limit=25`, {
        signal,
      });
      if (!response.ok) return failure(response);
      return response.json() as Promise<CustomerPage>;
    },
  });

  function open(customer: Customer | "new") {
    setError("");
    setDraft(
      customer === "new"
        ? { ...blank }
        : {
            name: customer.name,
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            address: customer.address ?? "",
            notes: customer.notes ?? "",
            status: customer.status,
          },
    );
    setEditing(customer);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || saving) return;
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    setError("");
    try {
      const body = {
        name: draft.name.trim(),
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        notes: draft.notes.trim() || null,
        status: draft.status,
      };
      const response = await api(
        editing === "new"
          ? "/api/v1/customers"
          : `/api/v1/customers/${editing.id}`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) await failure(response);
      if (controller.signal.aborted) return;
      setEditing(null);
      await client.invalidateQueries({ queryKey: key });
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : "Unable to save customer.",
        );
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  if (!allowed)
    return (
      <Alert severity="info">
        Customer management is available to organization owners and
        administrators.
      </Alert>
    );
  return (
    <Card>
      <CardContent>
        <Stack gap={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" component="h2">
              Customers
            </Typography>
            <Button variant="contained" onClick={() => open("new")}>
              Add customer
            </Button>
          </Stack>
          <Typography color="text.secondary">
            Customers in {organization.name}
          </Typography>
          {customers.isPending && (
            <Alert severity="info">Loading customers…</Alert>
          )}
          {customers.isError && (
            <Alert
              severity="error"
              action={
                <Button onClick={() => void customers.refetch()}>Retry</Button>
              }
            >
              Unable to load customers.
            </Alert>
          )}
          {!customers.isError && customers.data && (
            <>
              {customers.data.items.length === 0 && (
                <Typography>No customers on this page.</Typography>
              )}
              {customers.data.items.map((customer) => (
                <Box
                  key={customer.id}
                  sx={{ borderBottom: 1, borderColor: "divider", pb: 2 }}
                >
                  <Stack direction="row" justifyContent="space-between" gap={2}>
                    <Box>
                      <Typography variant="h6">{customer.name}</Typography>
                      <Typography>
                        {customer.email || "No email"} ·{" "}
                        {customer.phone || "No phone"}
                      </Typography>
                      <Typography color="text.secondary">
                        {customer.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Typography>
                    </Box>
                    <Button
                      onClick={() => open(customer)}
                      aria-label={`Edit ${customer.name}`}
                    >
                      View / edit
                    </Button>
                  </Stack>
                </Box>
              ))}
              <Stack direction="row" gap={2} alignItems="center">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Typography>
                  Page {page} · {customers.data.total} customers
                </Typography>
                <Button
                  disabled={page * 25 >= customers.data.total}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
                <Button onClick={() => void customers.refetch()}>
                  Refresh
                </Button>
              </Stack>
            </>
          )}
        </Stack>
        <Dialog
          open={editing !== null}
          onClose={() => {
            if (!saving) setEditing(null);
          }}
          fullWidth
          maxWidth="sm"
        >
          <Box component="form" onSubmit={save}>
            <DialogTitle>
              {editing === "new" ? "Add customer" : "Customer details"}
            </DialogTitle>
            <DialogContent>
              <Stack gap={2} sx={{ pt: 1 }}>
                {error && <Alert severity="error">{error}</Alert>}
                {(["name", "email", "phone", "address", "notes"] as const).map(
                  (field) => (
                    <TextField
                      key={field}
                      label={field[0].toUpperCase() + field.slice(1)}
                      value={draft[field]}
                      required={field === "name"}
                      type={field === "email" ? "email" : "text"}
                      disabled={saving}
                      multiline={field === "address" || field === "notes"}
                      minRows={field === "notes" ? 3 : undefined}
                      slotProps={{
                        htmlInput: {
                          maxLength: {
                            name: 120,
                            email: 254,
                            phone: 40,
                            address: 1000,
                            notes: 5000,
                          }[field],
                        },
                      }}
                      onChange={(event) =>
                        setDraft((value) => ({
                          ...value,
                          [field]: event.target.value,
                        }))
                      }
                    />
                  ),
                )}
                <TextField
                  select
                  label="Status"
                  value={draft.status}
                  disabled={saving}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      status: event.target.value as Customer["status"],
                    }))
                  }
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                </TextField>
                {editing && editing !== "new" && (
                  <Typography variant="body2" color="text.secondary">
                    Created {new Date(editing.createdAt).toLocaleString()} ·
                    Updated {new Date(editing.updatedAt).toLocaleString()}
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !draft.name.trim()}
              >
                {saving ? "Saving…" : "Save customer"}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </CardContent>
    </Card>
  );
}
