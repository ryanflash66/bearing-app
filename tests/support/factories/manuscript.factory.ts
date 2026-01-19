
import { v4 as uuidv4 } from 'uuid';

/**
 * Manuscript Data Factory
 */
export interface ManuscriptData {
  title: string;
  content_text: string;
  metadata: {
    publisher_name?: string;
    copyright_year?: number;
    copyright_holder?: string;
    isbn13?: string;
    dedication?: string;
    acknowledgements?: string;
  };
}

export const createManuscriptData = (
  overrides: Partial<ManuscriptData> = {}
): ManuscriptData => {
  const { metadata: metadataOverrides, ...rest } = overrides;

  return {
    title: `Test Manuscript ${uuidv4().substring(0, 8)}`,
    content_text: `<h1>Chapter 1</h1><p>This is a test manuscript content generated at ${new Date().toISOString()}.</p>`,
    metadata: {
      publisher_name: "Bearing Press",
      copyright_year: new Date().getFullYear(),
      copyright_holder: "Test Author",
      ...(metadataOverrides || {}),
    },
    ...rest,
  };
};
