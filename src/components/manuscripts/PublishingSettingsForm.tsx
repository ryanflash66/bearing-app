"use client";

import { useState, useEffect } from "react";
import { BISAC_CODES } from "@/lib/bisac-codes";
import { isValidISBN10, isValidISBN13, cleanISBN } from "@/lib/publication-validation";
import TiptapEditor from "../editor/TiptapEditor";

export interface PublishingMetadata {
  isbn13?: string;
  isbn10?: string;
  copyright_year?: string;
  copyright_holder?: string;
  publisher_name?: string;
  edition_number?: string;
  dedication?: any; // JSON content for rich text
  acknowledgements?: any; // JSON content for rich text
  bisac_codes?: string[];
  keywords?: string[];
}

interface PublishingSettingsFormProps {
  metadata: PublishingMetadata;
  onChange: (metadata: PublishingMetadata) => void;
}

export default function PublishingSettingsForm({
  metadata,
  onChange,
}: PublishingSettingsFormProps) {
  const [formData, setFormData] = useState<PublishingMetadata>(metadata || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(metadata || {});
  }, [metadata]);

  const handleChange = (field: keyof PublishingMetadata, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleISBNChange = (field: 'isbn13' | 'isbn10', value: string) => {
    handleChange(field, value); // Store raw value for user input, validate separately

    if (field === 'isbn13') {
        if (value && !isValidISBN13(value)) {
            setErrors(prev => ({ ...prev, isbn13: "Invalid ISBN-13 checksum or format" }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.isbn13;
                return newErrors;
            });
        }
    } else if (field === 'isbn10') {
        if (value && !isValidISBN10(value)) {
             setErrors(prev => ({ ...prev, isbn10: "Invalid ISBN-10 checksum or format" }));
        } else {
             setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.isbn10;
                return newErrors;
            });
        }
    }
  };

  const [bisacSearch, setBisacSearch] = useState("");

  const filteredBisac = BISAC_CODES.filter(b => 
    b.code.toLowerCase().includes(bisacSearch.toLowerCase()) || 
    b.label.toLowerCase().includes(bisacSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Identifiers Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
          Identifiers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="isbn13" className="block text-sm font-medium text-slate-700">ISBN-13</label>
            <input
              id="isbn13"
              type="text"
              value={formData.isbn13 || ""}
              onChange={(e) => handleISBNChange('isbn13', e.target.value)}
              placeholder="978-..."
              className={`mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.isbn13 ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
              }`}
            />
            {errors.isbn13 && <p className="mt-1 text-xs text-red-600">{errors.isbn13}</p>}
          </div>
          <div>
            <label htmlFor="isbn10" className="block text-sm font-medium text-slate-700">ISBN-10</label>
            <input
              id="isbn10"
              type="text"
              value={formData.isbn10 || ""}
              onChange={(e) => handleISBNChange('isbn10', e.target.value)}
              placeholder="0-..."
              className={`mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.isbn10 ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""
              }`}
            />
             {errors.isbn10 && <p className="mt-1 text-xs text-red-600">{errors.isbn10}</p>}
          </div>
        </div>
      </section>

      {/* Copyright Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
          Copyright & Publisher
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="copyright_year" className="block text-sm font-medium text-slate-700">Copyright Year</label>
            <input
              id="copyright_year"
              type="text"
              value={formData.copyright_year || ""}
              onChange={(e) => handleChange("copyright_year", e.target.value)}
              placeholder={new Date().getFullYear().toString()}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="copyright_holder" className="block text-sm font-medium text-slate-700">Copyright Holder</label>
            <input
              id="copyright_holder"
              type="text"
              value={formData.copyright_holder || ""}
              onChange={(e) => handleChange("copyright_holder", e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="publisher_name" className="block text-sm font-medium text-slate-700">Publisher Name</label>
            <input
              id="publisher_name"
              type="text"
              value={formData.publisher_name || ""}
              onChange={(e) => handleChange("publisher_name", e.target.value)}
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="edition_number" className="block text-sm font-medium text-slate-700">Edition Number</label>
            <input
              id="edition_number"
              type="text"
              value={formData.edition_number || ""}
              onChange={(e) => handleChange("edition_number", e.target.value)}
              placeholder="1"
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Categorization */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
          Categorization
        </h3>
        <div>
          <label htmlFor="bisac_codes" className="block text-sm font-medium text-slate-700 mb-1">BISAC Categories</label>
          <div className="mt-1 space-y-2">
            <input 
              type="text"
              placeholder="Search categories..."
              value={bisacSearch}
              onChange={(e) => setBisacSearch(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-2"
            />
            <select
              id="bisac_codes"
              multiple
              value={formData.bisac_codes || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleChange("bisac_codes", selected);
              }}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-32"
            >
              {filteredBisac.map((bisac) => (
                <option key={bisac.code} value={bisac.code}>
                  {bisac.code} - {bisac.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Hold Ctrl/Cmd to select multiple. {filteredBisac.length} of {BISAC_CODES.length} shown.</p>
          </div>
        </div>
        <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-slate-700">SEO Keywords</label>
            <div className="mt-1 flex flex-wrap gap-2 p-2 border border-slate-300 rounded-md bg-white min-h-[42px]">
                {formData.keywords?.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                        {tag}
                        <button 
                            type="button" 
                            onClick={() => handleChange("keywords", formData.keywords?.filter((_, idx) => idx !== i))}
                            className="hover:text-indigo-900"
                        >
                            &times;
                        </button>
                    </span>
                ))}
                <input
                  id="keywords"
                  type="text"
                  onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val && !formData.keywords?.includes(val)) {
                              handleChange("keywords", [...(formData.keywords || []), val]);
                              e.currentTarget.value = "";
                          }
                      }
                  }}
                  placeholder="Type tag and press Enter..."
                  className="flex-1 min-w-[120px] border-none focus:ring-0 sm:text-sm p-0"
                />
            </div>
            <p className="text-xs text-slate-500 mt-1">Press Enter or comma to add a keyword.</p>
        </div>
      </section>

      {/* Frontmatter Content */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
          Frontmatter
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Dedication</label>
          <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
            <TiptapEditor
              content={formData.dedication || { type: "doc", content: [] }}
              onUpdate={({ json }) => handleChange("dedication", json)}
              placeholder="To my loving family..."
              className="min-h-[150px] p-4"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Acknowledgements</label>
          <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
            <TiptapEditor
              content={formData.acknowledgements || { type: "doc", content: [] }}
              onUpdate={({ json }) => handleChange("acknowledgements", json)}
              placeholder="I would like to thank..."
              className="min-h-[150px] p-4"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
