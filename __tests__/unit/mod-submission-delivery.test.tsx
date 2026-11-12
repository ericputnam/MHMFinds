/**
 * The submission form asks one question first: "Upload the file" or "Link to
 * it". File mode hides the download link; link mode needs a download link or
 * a blog/source page (either one); a file set aside by switching to links is
 * never sent. The file field follows the chosen game (Sims 4 or Minecraft) and
 * the choice disappears for games we cannot host.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ModSubmissionForm } from '../../components/admin/ModSubmissionForm';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ enabled: true }), { status: 200 })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(initialData: Record<string, unknown> = { title: 'Example', uploadId: 'stale-upload' }) {
  const onSubmit = vi.fn(async () => {});
  const view = render(
    <ModSubmissionForm
      onSubmit={onSubmit}
      allowHostedFile
      showAdminFields={false}
      initialData={initialData as never}
    />,
  );
  const form = view.container.querySelector('form')!;
  const gameSelect = () =>
    Array.from(view.container.querySelectorAll('select')).find((s) =>
      Array.from(s.options).some((o) => o.value === 'Minecraft'),
    )!;
  return { onSubmit, view, form, gameSelect };
}

const radio = (name: string) => screen.getByRole('radio', { name: new RegExp(name) });

describe('file or link choice', () => {
  it('defaults to "Upload the file" once hosting is on, and hides the download link', async () => {
    setup();
    await waitFor(() => expect(radio('Upload the file').getAttribute('aria-checked')).toBe('true'));
    expect(screen.queryByPlaceholderText('https://example.com/download')).toBeNull();
    expect(screen.getByText('(optional credit)')).toBeTruthy();
  });

  it('the file field follows the game, and the choice goes away for games we cannot host', async () => {
    const { gameSelect } = setup();
    await waitFor(() => radio('Upload the file'));
    expect(screen.getByText(/Upload your \.package, \.ts4script or \.zip/)).toBeTruthy();

    fireEvent.change(gameSelect(), { target: { value: 'Minecraft' } });
    expect(screen.getByText(/Upload your \.jar, \.mcpack, \.mcaddon, \.mcworld, \.mctemplate or \.zip/)).toBeTruthy();

    fireEvent.change(gameSelect(), { target: { value: 'Stardew Valley' } });
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByPlaceholderText('https://example.com/download')).toBeTruthy();
  });

  it('file mode with no file asks for the file', async () => {
    const { form, onSubmit } = setup({ title: 'Example' });
    await waitFor(() => expect(radio('Upload the file').getAttribute('aria-checked')).toBe('true'));
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText('Upload the mod file, or switch to "Link to it"')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('link mode needs a download link or a source page, and never sends the set-aside file', async () => {
    const { form, onSubmit } = setup();
    await waitFor(() => radio('Link to it'));
    fireEvent.click(radio('Link to it'));
    expect(screen.getByText(/At least one is required/)).toBeTruthy();

    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText('Add a download link or a blog/source page')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('https://patreon.com/post/...'), {
      target: { value: 'https://example.com/my-mod-post' },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = (onSubmit.mock.calls[0] as unknown[])[0] as { uploadId: unknown; sourceUrl: string; downloadUrl: string };
    expect(sent.uploadId).toBeNull();
    expect(sent.sourceUrl).toBe('https://example.com/my-mod-post');
    expect(sent.downloadUrl).toBe('');
  });

  it('without hosting there is no choice, only the link fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ enabled: false }), { status: 200 })));
    setup();
    await waitFor(() => expect(screen.getByText(/At least one is required/)).toBeTruthy());
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
