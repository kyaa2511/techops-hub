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
    borderRadius: 6,
  },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: { MuiButton: { defaultProps: { disableElevation: true } } },
});
