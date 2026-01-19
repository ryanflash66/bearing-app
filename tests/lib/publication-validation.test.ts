import { isValidISBN10, isValidISBN13, cleanISBN } from '../../src/lib/publication-validation';

describe('Publication Validation Utilities', () => {
  describe('cleanISBN', () => {
    it('should remove dashes and spaces', () => {
      expect(cleanISBN('978-3-16-148410-0')).toBe('9783161484100');
      expect(cleanISBN('0 321 14653 0')).toBe('0321146530');
    });
  });

  describe('isValidISBN10', () => {
    it('should return true for valid ISBN-10', () => {
      expect(isValidISBN10('0-321-14653-0')).toBe(true); // Clean Code
      expect(isValidISBN10('0321146530')).toBe(true);
      expect(isValidISBN10('0-13-110362-8')).toBe(true); // C Programming Language
    });

    it('should handle X as checksum', () => {
        expect(isValidISBN10('0-8044-2957-X')).toBe(true);
    });

    it('should return false for invalid ISBN-10', () => {
      expect(isValidISBN10('0-321-14653-1')).toBe(false); // Wrong checksum
      expect(isValidISBN10('123')).toBe(false); // Too short
      expect(isValidISBN10('0-321-14653-00')).toBe(false); // Too long
    });
  });

  describe('isValidISBN13', () => {
    it('should return true for valid ISBN-13', () => {
      expect(isValidISBN13('978-3-16-148410-0')).toBe(true);
      expect(isValidISBN13('9783161484100')).toBe(true);
    });

    it('should return false for invalid ISBN-13', () => {
      expect(isValidISBN13('978-3-16-148410-1')).toBe(false); // Wrong checksum
      expect(isValidISBN13('123')).toBe(false); // Too short
    });
  });
});
