// Mock the soroban service and freighter wallet so Jest doesn't try to
// resolve blockchain SDK packages that are ESM-only and incompatible with Jest/CRA.
jest.mock('./services/sorobanService', () => ({
  __esModule: true,
  default: {
    createVestingPlan: jest.fn(),
    getVestingPlan: jest.fn(),
    getAllPlans: jest.fn().mockResolvedValue([]),
    getPlanCount: jest.fn().mockResolvedValue(0),
    getReleasableAmount: jest.fn().mockResolvedValue(0),
    claimVestedTokens: jest.fn(),
    calculateVestedAmount: jest.fn().mockReturnValue(0),
    getPlansByBeneficiary: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn().mockResolvedValue({ isConnected: false }),
  requestAccess: jest.fn(),
  getAddress: jest.fn(),
  signTransaction: jest.fn(),
}));

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the app with brand name', () => {
  render(<App />);
  expect(screen.getByText('Token Vesting Hub')).toBeInTheDocument();
});

test('renders connect wallet hint on hero page', () => {
  render(<App />);
  expect(screen.getByText(/Connect your Freighter wallet to get started/i)).toBeInTheDocument();
});

test('renders hero section with built on Stellar Soroban badge', () => {
  render(<App />);
  expect(screen.getByText(/Built on Stellar Soroban/i)).toBeInTheDocument();
});
