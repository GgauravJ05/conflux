import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';

import theme from './theme';
import LandingPage from './pages/landing';

const renderWithProviders = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );

describe('Landing page', () => {
  test('renders the product name and value proposition', () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getAllByText(/Conflux/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/one stream/i)).toBeInTheDocument();
  });

  test('offers both a sign-up and a guest entry point', () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByRole('button', { name: /start a meeting/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /join as guest/i }).length).toBeGreaterThan(0);
  });
});
