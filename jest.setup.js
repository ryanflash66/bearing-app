import "@testing-library/jest-dom";

// Mock Environment Variables
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-key";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "mock-openrouter-key";

// Polyfill for TextEncoder/TextDecoder (required by PDFKit)
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for Request/Response APIs used by Next.js
if (typeof global.Request === "undefined") {
  global.Request = class Request {
    constructor(url, init) {
      Object.defineProperty(this, 'url', {
        value: url,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      this.init = init;
    }
    async json() {
      return JSON.parse((this.init?.body) || "{}");
    }
  };
}

if (typeof global.Response === "undefined") {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.init = init;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || "OK";
      this.headers = new Headers(init?.headers);
    }
    async json() {
      if (typeof this.body === "string") {
        return JSON.parse(this.body || "{}");
      }
      return this.body;
    }
    async text() {
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
    }
    get ok() {
      return this.status >= 200 && this.status < 300;
    }
  };
  
  // Add static json method to Response
  global.Response.json = function(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  };
}

// Polyfill for NextResponse (used by Next.js API routes)
// This needs to be available globally before modules are imported
class NextResponsePolyfill extends Response {
  constructor(body, init) {
    super(body, init);
    this.status = init?.status || 200;
    this.statusText = init?.statusText || "OK";
    this.headers = new Headers(init?.headers);
  }
  static json(data, init) {
    const response = new Response(JSON.stringify(data), {
      ...init,
      status: init?.status || 200,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    // Add status property for compatibility
    Object.defineProperty(response, 'status', {
      value: init?.status || 200,
      writable: false,
    });
    return response;
  }
}

if (typeof global.NextResponse === "undefined") {
  global.NextResponse = NextResponsePolyfill;
}

// Polyfill for matchMedia
if (typeof window !== "undefined") {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Polyfill for ReadableStream (required for streaming responses in tests)
if (typeof global.ReadableStream === "undefined") {
  try {
    const { ReadableStream } = require("node:stream/web");
    global.ReadableStream = ReadableStream;
  } catch (e) {
    // Fallback for older node versions
    global.ReadableStream = class ReadableStream {
      constructor() {}
      getReader() { return { read: async () => ({ done: true }) }; }
    };
  }
}