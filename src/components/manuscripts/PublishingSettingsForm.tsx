"use client";

import { useEffect, useMemo, useState } from "react";
import { BISAC_CODES } from "@/lib/bisac-codes";
import { cleanISBN, isValidISBN13 } from "@/lib/publication-validation";

interface PublishingSettingsFormProps {
  metadata: Record<string, unknown>;
  onChange: (metadata: Record<string, unknown>) => void;
}

interface PublishingSettingsState {
  isbn13: string;
  copyright_year: string;
  publisher_name: string;
  bisac_codes: string[];
}

const DEFAULT_STATE: PublishingSettingsState = {
  isbn13: "",
  copyright_year: "",
  publisher_name: "",
  bisac_codes: [],
};

export default function PublishingSettingsForm({
  metadata,
  onChange,
}: PublishingSettingsFormProps) {
  const initialState = useMemo<PublishingSettingsState>(() => {
    return {
      isbn13: (metadata.isbn13 as string) || "",
      copyright_year: (metadata.copyright_year as string) || "",
      publisher_name: (metadata.publisher_name as string) || "",
      bisac_codes: (metadata.bisac_codes as string[]) || [],
    };
  }, [metadata]);

  const [formState, setFormState] = useState<PublishingSettingsState>(
    initialState
  );
  const [isbnError, setIsbnError] = useState<string | null>(null);

  useEffect(() => {
    setFormState(initialState);
  }, [initialState]);

  const updateMetadata = (next: PublishingSettingsState) => {
    setFormState(next);
    onChange({
      ...metadata,
      isbn13: next.isbn13,
      copyright_year: next.copyright_year,
      publisher_name: next.publisher_name,
      bisac_codes: next.bisac_codes,
    });
  };

  const handleIsbnChange = (value: string) => {
    const cleaned = cleanISBN(value);
    if (cleaned && !isValidISBN13(cleaned)) {
      setIsbnError("Invalid ISBN-13 checksum or format");
    } else {
      setIsbnError(null);
    }

    updateMetadata({ ...formState, isbn13: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="isbn13" className="block text-sm font-medium text-slate-700">
          ISBN-13
        </label>
        <input
          id="isbn13"
          type="text"
          value={formState.isbn13}
          onChange={(event) => handleIsbnChange(event.target.value)}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {isbnError && (
          <p className="mt-1 text-xs text-red-600">{isbnError}</p>
        )}
      </div>

      <div>
        <label htmlFor="copyrightYear" className="block text-sm font-medium text-slate-700">
          Copyright Year
        </label>
        <input
          id="copyrightYear"
          type="text"
          value={formState.copyright_year}
          onChange={(event) =>
            updateMetadata({ ...formState, copyright_year: event.target.value })
          }
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="publisherName" className="block text-sm font-medium text-slate-700">
          Publisher Name
        </label>
        <input
          id="publisherName"
          type="text"
          value={formState.publisher_name}
          onChange={(event) =>
            updateMetadata({ ...formState, publisher_name: event.target.value })
          }
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="bisacCodes" className="block text-sm font-medium text-slate-700">
          BISAC Categories
        </label>
        <select
          id="bisacCodes"
          multiple
          value={formState.bisac_codes}
          onChange={(event) => {
            const selected = Array.from(event.target.selectedOptions).map(
              (option) => option.value
            );
            updateMetadata({ ...formState, bisac_codes: selected });
          }}
          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          {BISAC_CODES.map((code) => (
            <option key={code.code} value={code.code}>
              {code.code} - {code.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
