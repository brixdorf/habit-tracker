import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal.jsx';

describe('Modal', () => {
  it('closes from the close button', async () => {
    const onClose = vi.fn();
    render(<Modal title="Edit habit" onClose={onClose}>body</Modal>);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the backdrop but not when clicking inside the dialog', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Edit habit" onClose={onClose}>
        <p>Dialog body</p>
      </Modal>
    );

    await userEvent.click(screen.getByText('Dialog body'));
    expect(onClose).not.toHaveBeenCalled();

    // The backdrop is the dialog panel's parent.
    await userEvent.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
