/**
 * Removes dashes and spaces from an ISBN string.
 */
export function cleanISBN(isbn: string): string {
  if (!isbn) return '';
  return isbn.replace(/[\s-]/g, '');
}

/**
 * Validates an ISBN-10 string.
 * Checks length and checksum.
 * Handles 'X' as the check digit.
 */
export function isValidISBN10(isbn: string): boolean {
  const cleaned = cleanISBN(isbn);
  if (cleaned.length !== 10) return false;

  // Check valid characters (0-9 for first 9, 0-9 or X for last)
  if (!/^\d{9}[\dX]$/i.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i], 10) * (10 - i);
  }

  const lastChar = cleaned[9].toUpperCase();
  const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
  
  sum += lastDigit;

  return sum % 11 === 0;
}

/**
 * Validates an ISBN-13 string.
 * Checks length and checksum.
 */
export function isValidISBN13(isbn: string): boolean {
  const cleaned = cleanISBN(isbn);
  if (cleaned.length !== 13) return false;

  if (!/^\d{13}$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(cleaned[i], 10);
    // Weight is 1 for even indices (0, 2, 4...) and 3 for odd indices (1, 3, 5...)
    const weight = i % 2 === 0 ? 1 : 3;
    sum += digit * weight;
  }

  return sum % 10 === 0;
}
