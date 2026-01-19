import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PublishingSettingsForm from '../../../src/components/manuscripts/PublishingSettingsForm';

// Mock TiptapEditor
jest.mock('../../../src/components/editor/TiptapEditor', () => {
  return function MockTiptapEditor({ content, onUpdate }: any) {
    return (
      <textarea
        data-testid="tiptap-mock"
        defaultValue={content ? JSON.stringify(content) : ''}
        onChange={(e) => {
            try {
                const val = e.target.value;
                onUpdate({ json: val ? JSON.parse(val) : {} });
            } catch (e) {
                // ignore invalid json during type
            }
        }}
      />
    );
  };
});

describe('PublishingSettingsForm', () => {
  const mockOnChange = jest.fn();
  const initialMetadata = {
    isbn13: '978-3-16-148410-0',
    copyright_year: '2026',
    publisher_name: 'Test Publisher',
    bisac_codes: ['FIC000000'],
  };

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders form fields with initial data', () => {
    render(<PublishingSettingsForm metadata={initialMetadata} onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('ISBN-13')).toHaveValue('978-3-16-148410-0');
    expect(screen.getByLabelText('Copyright Year')).toHaveValue('2026');
    expect(screen.getByLabelText('Publisher Name')).toHaveValue('Test Publisher');
    expect(screen.getByLabelText('BISAC Categories')).toHaveValue(['FIC000000']);
  });

  it('calls onChange when fields are updated', () => {
    render(<PublishingSettingsForm metadata={initialMetadata} onChange={mockOnChange} />);
    
    const publisherInput = screen.getByLabelText('Publisher Name');
    fireEvent.change(publisherInput, { target: { value: 'New Publisher' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      publisher_name: 'New Publisher',
    }));
  });

  it('validates ISBN-13 and shows error', () => {
    render(<PublishingSettingsForm metadata={{}} onChange={mockOnChange} />);
    
    const isbnInput = screen.getByLabelText('ISBN-13');
    // Invalid ISBN (wrong checksum)
    fireEvent.change(isbnInput, { target: { value: '978-3-16-148410-1' } });
    
    expect(screen.getByText('Invalid ISBN-13 checksum or format')).toBeInTheDocument();
    
    // Valid ISBN
    fireEvent.change(isbnInput, { target: { value: '978-3-16-148410-0' } });
    
    expect(screen.queryByText('Invalid ISBN-13 checksum or format')).not.toBeInTheDocument();
  });
});
