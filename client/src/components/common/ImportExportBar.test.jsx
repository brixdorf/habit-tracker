import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExportBar } from './ImportExportBar.jsx';
import { stubApi, jsonResponse } from '../../test/fakeApi.js';

function stubObjectUrls() {
  URL.createObjectURL = vi.fn(() => 'blob:export');
  URL.revokeObjectURL = vi.fn();
}

describe('ImportExportBar', () => {
  it('downloads the export using the filename from the server', async () => {
    stubApi((method, path) =>
      path === '/api/export'
        ? jsonResponse(200, { version: 1 }, {
            'content-disposition': 'attachment; filename="habit-tracker-export-2026-10-01.json"',
          })
        : undefined
    );
    stubObjectUrls();
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloads.push(this.download);
    });

    render(<ImportExportBar onImported={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(downloads).toEqual(['habit-tracker-export-2026-10-01.json']);
  });

  it('shows an error instead of downloading when the export fails', async () => {
    stubApi(() => jsonResponse(401, { error: 'Not authenticated.' }));
    stubObjectUrls();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ImportExportBar onImported={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByText('Not authenticated.')).toBeInTheDocument();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('imports a chosen file after confirmation', async () => {
    const imported = vi.fn();
    const fetchMock = stubApi((method, path) =>
      method === 'POST' && path === '/api/import' ? { ok: true } : undefined
    );
    const user = userEvent.setup();
    const { container } = render(<ImportExportBar onImported={imported} />);

    const snapshot = { version: 1, habits: [], habitGoals: [], checks: [], notes: [] };
    const file = new File([JSON.stringify(snapshot)], 'backup.json', { type: 'application/json' });
    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(await screen.findByRole('button', { name: 'Replace everything' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/import', expect.objectContaining({ method: 'POST' }));
    expect(imported).toHaveBeenCalledTimes(1);
  });
});
