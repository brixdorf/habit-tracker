import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HabitFormModal } from './HabitFormModal.jsx';

const fullMonthSwitch = () => screen.getByRole('checkbox', { name: /full month/i });
const goalInput = () => screen.getByLabelText(/monthly goal/i);

describe('HabitFormModal Full Month toggle', () => {
  it('is off by default and a numeric goal is required', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<HabitFormModal mode="create" onSubmit={onSubmit} onClose={() => {}} />);

    expect(fullMonthSwitch()).not.toBeChecked();
    await user.type(screen.getByLabelText('Name'), 'Read');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Goal must be a positive whole number.')).toBeInTheDocument();
  });

  it('creates a Full Month habit without a numeric goal', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<HabitFormModal mode="create" onSubmit={onSubmit} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Name'), 'Meditate');
    await user.click(fullMonthSwitch());
    expect(goalInput()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Meditate', goal: undefined, fullMonth: true });
  });

  it('shows and changes the setting when editing, keeping the numeric goal', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <HabitFormModal
        mode="edit"
        initialName="Meditate"
        initialGoal={12}
        initialFullMonth
        onSubmit={onSubmit}
        onClose={() => {}}
      />
    );

    expect(fullMonthSwitch()).toBeChecked();
    expect(goalInput()).toBeDisabled();
    expect(goalInput()).toHaveValue(12);

    await user.click(fullMonthSwitch());
    expect(goalInput()).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Meditate', goal: 12, fullMonth: false });
  });
});
