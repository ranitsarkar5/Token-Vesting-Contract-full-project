import { render, screen } from '@testing-library/react';
import App from './App';

test('renders brand tagline', () => {
  render(<App />);
  const taglineElement = screen.getByText(/Permissionless Vesting on Soroban/i);
  expect(taglineElement).toBeInTheDocument();
});
