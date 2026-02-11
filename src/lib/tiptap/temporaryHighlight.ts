import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type HighlightState =
  | {
      from: number;
      to: number;
      expiresAt: number;
    }
  | null;

const pluginKey = new PluginKey<HighlightState>("temporaryHighlight");

export const TemporaryHighlight = Extension.create({
  name: "temporaryHighlight",

  addCommands() {
    let activeTimeout: ReturnType<typeof setTimeout> | null = null;

    return {
      setTemporaryHighlight:
        (opts: { from: number; to: number; durationMs?: number }) =>
        ({ editor, tr, dispatch }) => {
          const durationMs = opts.durationMs ?? 2000;
          const from = Math.max(0, Math.min(opts.from, editor.state.doc.content.size));
          const to = Math.max(from, Math.min(opts.to, editor.state.doc.content.size));
          const expiresAt = Date.now() + durationMs;

          if (activeTimeout) {
            clearTimeout(activeTimeout);
            activeTimeout = null;
          }

          dispatch?.(tr.setMeta(pluginKey, { type: "set", from, to, expiresAt }));

          activeTimeout = setTimeout(() => {
            editor.commands.clearTemporaryHighlight();
          }, durationMs);

          return true;
        },

      clearTemporaryHighlight:
        () =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(pluginKey, { type: "clear" }));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<HighlightState>({
        key: pluginKey,
        state: {
          init: () => null,
          apply: (tr, prev) => {
            const meta = tr.getMeta(pluginKey) as
              | { type: "set"; from: number; to: number; expiresAt: number }
              | { type: "clear" }
              | undefined;

            if (!meta) return prev;
            if (meta.type === "clear") return null;
            return { from: meta.from, to: meta.to, expiresAt: meta.expiresAt };
          },
        },
        props: {
          decorations: (state) => {
            const highlight = pluginKey.getState(state);
            if (!highlight) return null;
            if (Date.now() > highlight.expiresAt) return null;

            return DecorationSet.create(state.doc, [
              Decoration.inline(highlight.from, highlight.to, {
                class: "bg-yellow-200/70 transition-colors",
              }),
            ]);
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    temporaryHighlight: {
      setTemporaryHighlight: (opts: { from: number; to: number; durationMs?: number }) => ReturnType;
      clearTemporaryHighlight: () => ReturnType;
    };
  }
}

