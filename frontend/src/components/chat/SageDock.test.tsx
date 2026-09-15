import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SageDock } from './SageDock';
import { renderWithProviders } from '../../test/render';

describe('SageDock', () => {
  it('opens a chat window from the corner button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SageDock />, { route: '/dashboard', withAuth: false });

    await user.click(screen.getByRole('button', { name: 'Ask Sage' }));
    expect(await screen.findByRole('dialog', { name: 'Sage' })).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how many calories have i eaten today/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(screen.queryByRole('dialog', { name: 'Sage' })).not.toBeInTheDocument();
  });

  it('stays hidden on the full chat page', () => {
    renderWithProviders(<SageDock />, { route: '/chat', withAuth: false });
    expect(screen.queryByRole('button', { name: 'Ask Sage' })).not.toBeInTheDocument();
  });
});
