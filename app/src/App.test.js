import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the app header with brand name', () => {
  render(<App />);
  const heading = screen.getByText(/Token Vesting Hub/i);
  expect(heading).toBeInTheDocument();
});

test('renders connect wallet prompt when not connected', () => {
  render(<App />);
  const hint = screen.getByText(/Connect your Freighter wallet to get started/i);
  expect(hint).toBeInTheDocument();
});

test('renders hero title with Permissionless text', () => {
  render(<App />);
  const heroTitle = screen.getByText(/Permissionless/i);
  expect(heroTitle).toBeInTheDocument();
});
