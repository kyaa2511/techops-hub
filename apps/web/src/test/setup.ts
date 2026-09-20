import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

Object.defineProperty(globalThis, 'TextEncoder', {
  configurable: true,
  value: TextEncoder,
});

process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_placeholder';
