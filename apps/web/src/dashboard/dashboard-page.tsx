import LanRoundedIcon from '@mui/icons-material/LanRounded';
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { toggleSetupChecklist } from '../app/ui-slice.ts';
import { fetchHealth } from '../shared/api/health.ts';
import { ConnectionSettingsForm } from '../shared/components/connection-settings-form.tsx';

const dashboardMetrics = [
  { label: 'Open tickets', value: '0', icon: <MedicalServicesRoundedIcon color="primary" /> },
  { label: 'Scheduled today', value: '0', icon: <TodayRoundedIcon color="primary" /> },
  { label: 'Outstanding invoices', value: '$0', icon: <ReceiptLongRoundedIcon color="primary" /> },
];

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { apiBaseUrlOverride, showSetupChecklist } = useAppSelector((state) => state.ui);
  const healthQuery = useQuery({
    queryKey: ['health', apiBaseUrlOverride],
    queryFn: () => fetchHealth(apiBaseUrlOverride || undefined),
  });

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="lg">
        <Stack gap={4}>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent="space-between">
            <Box>
              <Typography component="h1" variant="h3">
                TechOps Hub
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }} variant="h6">
                Sprint 0 foundation for a production-ready small-business tech operations platform.
              </Typography>
            </Box>
            <Button onClick={() => dispatch(toggleSetupChecklist())} variant="outlined">
              {showSetupChecklist ? 'Hide setup checklist' : 'Show setup checklist'}
            </Button>
          </Stack>

          <Grid container spacing={3}>
            {dashboardMetrics.map((metric) => (
              <Grid key={metric.label} size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          {metric.label}
                        </Typography>
                        <Typography sx={{ mt: 1 }} variant="h4">
                          {metric.value}
                        </Typography>
                      </Box>
                      {metric.icon}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card>
                <CardContent>
                  <Stack gap={2}>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="h6">API readiness</Typography>
                      <Chip icon={<LanRoundedIcon />} label="/api/v1/health" variant="outlined" />
                    </Stack>
                    {healthQuery.isLoading ? <Alert severity="info">Checking API health…</Alert> : null}
                    {healthQuery.isError ? (
                      <Alert severity="warning">
                        API health check failed. Start the API and PostgreSQL, then refresh the page.
                      </Alert>
                    ) : null}
                    {healthQuery.data ? (
                      <Alert severity="success">
                        API status: {healthQuery.data.status}. Database: {healthQuery.data.database}. Checked at{' '}
                        {new Date(healthQuery.data.timestamp).toLocaleString()}.
                      </Alert>
                    ) : null}
                    <Divider />
                    <Typography color="text.secondary" variant="body2">
                      The frontend is configured with React Router, TanStack Query, Redux Toolkit, React Hook Form,
                      Zod, and Material UI so feature work can begin on a stable application shell.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card>
                <CardContent>
                  <ConnectionSettingsForm currentValue={apiBaseUrlOverride} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {showSetupChecklist ? (
            <Card>
              <CardContent>
                <Stack gap={1.5}>
                  <Typography variant="h6">Sprint 0 verification checklist</Typography>
                  <Typography color="text.secondary" component="div" variant="body2">
                    <ul>
                      <li>Run <code>npm run db:up</code> to start PostgreSQL.</li>
                      <li>Run <code>npm run migration:run</code> to prepare the database.</li>
                      <li>Run <code>npm run dev</code> to start both apps.</li>
                      <li>Open Swagger at <code>http://localhost:3000/api/docs</code>.</li>
                      <li>Confirm the health endpoint returns database-connected status.</li>
                    </ul>
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
