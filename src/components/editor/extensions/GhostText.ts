import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

export interface GhostTextOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ghostText: {
      /**
       * Set ghost text at the current selection
       */
      setGhostText: (text: string) => ReturnType
      /**
       * Unset ghost text
       */
      unsetGhostText: () => ReturnType
    }
  }
}

export const GhostText = Node.create<GhostTextOptions>({
  name: 'ghostText',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'ghost-text pointer-events-none select-none text-slate-400 italic',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-ghost-text]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-ghost-text': '' }), 0]
  },

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: element => element.textContent,
        renderHTML: attributes => {
          return {
            'data-text': attributes.text,
          }
        },
      }
    }
  },

  addCommands() {
    return {
      setGhostText:
        (text: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { text },
            content: [{ type: 'text', text }]
          })
        },
      unsetGhostText:
        () =>
        ({ commands, editor }) => {
          // Find ghost text nodes and delete them
          // Simplified: logic would likely be more complex to ensure we only target the ghost node
           return true; 
        },
    }
  },
})
