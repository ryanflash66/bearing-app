declare module "pagedjs" {
  export class Previewer {
    preview(
      content: unknown,
      stylesheets?: string[],
      renderTo?: unknown
    ): Promise<unknown>;
  }
}

