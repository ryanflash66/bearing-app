
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MagicIngest from '@/components/manuscripts/MagicIngest';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/utils/supabase/client');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/lib/manuscripts', () => ({
  createManuscript: jest.fn(),
  updateManuscript: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('MagicIngest Component', () => {
  const mockRouter = { push: jest.fn(), refresh: jest.fn() };
  const mockSupabase = { auth: { getUser: jest.fn() } };
  const mockUser = { id: 'test-user-id' } as any;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (global.fetch as jest.Mock).mockClear();
  });

  it('shows fallback UI when parsing returns poor results (single chapter)', async () => {
    // Setup fetch mock to return single chapter
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chapters: [{ title: 'Draft', content: 'Some content without breaks' }],
      }),
    });

    render(<MagicIngest accountId="acc_123" user={mockUser} />);

    // Simulate file drop or selection
    const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const input = screen.getByLabelText(/drop docx/i, { selector: 'input' }); // Adjust selector if needed
    
    // Using a simpler approach to find the input if label text is tricky
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    // Expect "parsing" state
    expect(screen.getByText(/Uploading test.docx/i)).toBeInTheDocument();

    // Wait for fallback UI
    // This expects the text mandated by AC 2.5.4
    await waitFor(() => {
      expect(screen.getByText(/We couldn't detect chapters/i)).toBeInTheDocument();
    });


    expect(screen.getByText(/Would you like to add chapter breaks manually/i)).toBeInTheDocument();
  });

  it('allows manual splitting of chapters', async () => {
     (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        chapters: [{ title: 'Draft', content: 'Chapter 1\nText\nChapter 2\nText' }],
      }),
    });

    render(<MagicIngest accountId="acc_123" user={mockUser} />);
    
    // Upload file
    const file = new File(['content'], 'novel.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    // Wait for fallback
    await waitFor(() => {
      expect(screen.getByText(/We couldn't detect chapters/i)).toBeInTheDocument();
    });

    // Click "Yes, Add Breaks"
    fireEvent.click(screen.getByText(/Yes, Add Breaks/i));

    // Expect textarea
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Chapter 1\nText\nChapter 2\nText');

    // Add break
    fireEvent.change(textarea, { target: { value: 'Chapter 1\nText\n---\nChapter 2\nText' } });

    // Click Process
    fireEvent.click(screen.getByText(/Process & Import/i));

    // Expect ingestion to start
    await waitFor(() => {
         expect(screen.getByText(/Ingesting: Chapter 1/i)).toBeInTheDocument();
    });
    // Since we mocked time, we might need to fast-forward timeouts if we were using real timers, but here we just wait or rely on the loop.
    // Actually the component uses `setTimeout`.
  });
});

