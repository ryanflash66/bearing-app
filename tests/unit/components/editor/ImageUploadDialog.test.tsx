
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploadDialog } from '@/components/editor/dialogs/ImageUploadDialog';

// Mock browser-image-compression
jest.mock('browser-image-compression', () => {
  return jest.fn().mockImplementation((file) => Promise.resolve(file));
});

// Mock fetch
global.fetch = jest.fn();

describe('ImageUploadDialog', () => {
  const mockOnInsert = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <ImageUploadDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onInsert={mockOnInsert} 
        manuscriptId="123" 
      />
    );
    expect(screen.getByText('Insert Image')).toBeInTheDocument();
    expect(screen.getByText('Alt Text (Required for Accessibility)')).toBeInTheDocument();
  });

  it('disables upload if alt text is missing', () => {
    render(
        <ImageUploadDialog 
          open={true} 
          onOpenChange={mockOnOpenChange} 
          onInsert={mockOnInsert} 
          manuscriptId="123" 
        />
      );
      
      const fileInput = screen.getByLabelText(/alt text/i);
      expect(screen.getByText('Enter alt text to enable upload.')).toBeInTheDocument();
  });

  it('allows upload when alt text is present', () => {
    render(
        <ImageUploadDialog 
          open={true} 
          onOpenChange={mockOnOpenChange} 
          onInsert={mockOnInsert} 
          manuscriptId="123" 
        />
      );
      
      const altInput = screen.getByLabelText(/alt text/i);
      fireEvent.change(altInput, { target: { value: 'A test image' } });
      
      expect(screen.queryByText('Enter alt text to enable upload.')).not.toBeInTheDocument();
  });

  it('truncates prompt for alt text', async () => {
    const user = userEvent.setup();
    render(
        <ImageUploadDialog 
          open={true} 
          onOpenChange={mockOnOpenChange} 
          onInsert={mockOnInsert} 
          manuscriptId="123" 
        />
      );

      // Switch to AI tab
      const aiTabTrigger = screen.getByRole('tab', { name: /generate with ai/i });
      await user.click(aiTabTrigger);
      
      // Wait for input to appear
      const promptInput = await screen.findByPlaceholderText(/A medieval castle/i, {}, { timeout: 2000 });
      const longPrompt = "This is a very long prompt that exceeds the character limit for the alt text so it should be truncated intelligently by the system to avoid issues with accessibility readers being overwhelmed by too much text.";
      
      // Use fireEvent for instant update instead of userEvent.type which is slow
      fireEvent.change(promptInput, { target: { value: longPrompt } });
      fireEvent.blur(promptInput);
      
      const altInput = screen.getByLabelText(/alt text/i) as HTMLInputElement;
      // Check if it truncated (simple check for length < 130 and having "...")
      expect(altInput.value).toContain('...');
      expect(altInput.value.length).toBeLessThan(130);
  }, 10000); // 10s timeout
});
