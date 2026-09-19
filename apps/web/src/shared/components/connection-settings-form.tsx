import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAppDispatch } from '../../app/hooks.ts';
import { setApiBaseUrlOverride } from '../../app/ui-slice.ts';
import { normalizeApiBaseUrl } from '../api/health.ts';

const connectionSettingsSchema = z.object({
  apiBaseUrl: z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') {
        return true;
      }

      const url = new URL(value);
      return url.pathname === '/' && url.search === '' && url.hash === '';
    }, 'Enter an origin only, for example https://api.techopshub.example')
    .refine((value) => value === '' || /^https?:\/\//.test(value), 'Use an http or https origin.'),
});

type ConnectionSettingsValues = z.infer<typeof connectionSettingsSchema>;

interface ConnectionSettingsFormProps {
  currentValue: string;
}

export function ConnectionSettingsForm({ currentValue }: ConnectionSettingsFormProps) {
  const dispatch = useAppDispatch();
  const {
    control,
    formState: { errors, isSubmitSuccessful },
    handleSubmit,
    reset,
  } = useForm<ConnectionSettingsValues>({
    defaultValues: {
      apiBaseUrl: currentValue,
    },
    resolver: zodResolver(connectionSettingsSchema),
  });

  useEffect(() => {
    reset({ apiBaseUrl: currentValue });
  }, [currentValue, reset]);

  const onSubmit = (values: ConnectionSettingsValues) => {
    dispatch(setApiBaseUrlOverride(values.apiBaseUrl ? normalizeApiBaseUrl(values.apiBaseUrl) : ''));
  };

  return (
    <Stack component="form" gap={2} onSubmit={handleSubmit(onSubmit)}>
      <Box>
        <Typography variant="h6">Connection settings</Typography>
        <Typography color="text.secondary" variant="body2">
          Leave the API base URL blank to use the Vite proxy during local development.
        </Typography>
      </Box>

      <Controller
        control={control}
        name="apiBaseUrl"
        render={({ field }) => (
          <TextField
            {...field}
            error={Boolean(errors.apiBaseUrl)}
            fullWidth
            helperText={errors.apiBaseUrl?.message ?? 'Example: https://api.techopshub.example'}
            label="API base URL override"
            placeholder="https://api.techopshub.example"
          />
        )}
      />

      <Button startIcon={<SaveRoundedIcon />} type="submit" variant="contained">
        Save connection settings
      </Button>

      {isSubmitSuccessful ? (
        <Alert icon={<CheckCircleOutlineRoundedIcon fontSize="inherit" />} severity="success">
          Connection settings updated.
        </Alert>
      ) : null}
    </Stack>
  );
}
