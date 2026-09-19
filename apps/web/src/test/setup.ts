import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

Object.defineProperty(globalThis, 'TextEncoder', {
  configurable: true,
  value: TextEncoder,
});
