import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#1a73e8',
    },
    secondary: {
      main: '#0f766e',
    },
    background: {
      default: '#f5f7fb',
    },
  },
  shape: {
    borderRadius: 12,
  },
});
