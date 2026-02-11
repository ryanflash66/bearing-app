
import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      class: {
        default: 'manuscript-image', // Enforce class for CSP
      }
    };
  },

  renderHTML({ HTMLAttributes }) {
    // Force the class
    HTMLAttributes.class = 'manuscript-image';
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
});
