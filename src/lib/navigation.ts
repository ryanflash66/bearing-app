/**
 * Navigation helper to wrap window.location assignments.
 * This allows for easy mocking in tests where JSDOM locks window.location.
 */
export const navigateTo = (url: string) => {
  window.location.href = url;
};
