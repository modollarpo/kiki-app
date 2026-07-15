// ============================================================
// Next.js type shims (local fallback)
//
// The installed `next` package in this environment is missing its
// bundled TypeScript declarations (node_modules/next/index.d.ts,
// server.d.ts, etc. are absent). This shim restores type-checking
// for `npm run type-check` (tsc) against our own source code.
//
// NOTE: `next build` already sets `typescript.ignoreBuildErrors`,
// so the build pipeline is unaffected. These declarations mirror
// the subset of the Next 15 public API actually used by the app.
// Replace by reinstalling a complete `next` package when online.
// ============================================================

declare module "next" {
  import type { ReactNode } from "react";

  export type Metadata = {
    title?: string | { default: string; template?: string } | undefined;
    description?: string | undefined;
    keywords?: string | string[] | undefined;
    authors?: { name: string; url?: string }[] | undefined;
    openGraph?: Record<string, unknown> | undefined;
    twitter?: Record<string, unknown> | undefined;
    robots?: { index?: boolean; follow?: boolean } | string | undefined;
    canonical?: string | undefined;
    alternates?: Record<string, unknown> | undefined;
    icons?: Record<string, unknown> | undefined;
    metadataBase?: URL | undefined;
    [key: string]: unknown;
  };

  export type Viewport = {
    themeColor?: string | Array<{ color: string; media?: string }> | undefined;
    width?: string | undefined;
    initialScale?: number | undefined;
    [key: string]: unknown;
  };

  export namespace MetadataRoute {
    export type Robots = {
      rules?: unknown;
      sitemap?: string | string[];
      host?: string;
      [key: string]: unknown;
    };
    export type Sitemap = Array<{
      url: string;
      lastModified?: string | Date;
      changeFrequency?: string;
      priority?: number;
      [key: string]: unknown;
    }>;
    export type Manifest = Record<string, unknown>;
    export type Icons = Record<string, unknown>;
  }

  export type NextConfig = {
    [key: string]: unknown;
  };

  export type ResolvingMetadata = Record<string, unknown>;
}

declare module "next/server" {
  export class NextRequest extends Request {
    nextUrl: URL;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      set(name: string, value: string): void;
      delete(name: string): void;
    };
    geo?: { city?: string; country?: string; region?: string; latitude?: number; longitude?: number };
    ip?: string;
    json(): Promise<any>;
    text(): Promise<string>;
    formData(): Promise<FormData>;
  }

  export class NextResponse extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit);
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
    static rewrite(url: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      set(name: string, value: string): void;
      delete(name: string): void;
    };
  }

  export type NextContext = {
    params: Promise<Record<string, string | string[]>> | Record<string, string | string[]>;
  };

  export type NextFetchEvent = {
    waitUntil(promise: Promise<unknown>): void;
    request: NextRequest;
  };

  export function userAgent(req: NextRequest): { isBot: boolean; browser: string; device: string; engine: string; os: string };
}

declare module "next/navigation" {
  import type { ComponentType } from "react";
  export function useRouter(): {
    push(url: string): void;
    replace(url: string): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(url: string): void;
  };
  export function usePathname(): string | null;
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = Record<string, string | string[]>>(): T;
  export function useSelectedLayoutSegment(): string | null;
  export function useSelectedLayoutSegments(): string[];
  export function redirect(url: string, type?: "replace" | "push"): never;
  export function permanentRedirect(url: string, type?: "replace" | "push"): never;
  export function notFound(): never;
  export const Link: ComponentType<any>;
}

declare module "next/link" {
  import type { ComponentType } from "react";
  const Link: ComponentType<any>;
  export default Link;
}

declare module "next/headers" {
  export function cookies(): {
    get(name: string): { name: string; value: string } | undefined;
    getAll(): { name: string; value: string }[];
    set(name: string, value: string, options?: Record<string, unknown>): void;
    delete(name: string): void;
  };
  export function headers(): Promise<Headers>;
  export function draftMode(): { isEnabled: boolean; enable(): void; disable(): void };
}

declare module "next/image" {
  import type { ComponentType } from "react";
  const Image: ComponentType<any>;
  export default Image;
  export const ImageProps: Record<string, unknown>;
}

declare module "next/og" {
  export class ImageResponse {
    constructor(element: unknown, options?: Record<string, unknown>);
  }
}

declare module "next/font/google" {
  export function Inter(options: Record<string, unknown>): { className: string; style: Record<string, unknown>; variable: string };
  export function JetBrains_Mono(options: Record<string, unknown>): { className: string; style: Record<string, unknown>; variable: string };
  const fn: (options: Record<string, unknown>) => { className: string; style: Record<string, unknown>; variable: string };
  export default fn;
}

declare module "next/dist/lib/metadata/types/metadata-interface" {
  export type Metadata = Record<string, unknown>;
  export type Viewport = Record<string, unknown>;
  export type ResolvingMetadata = Record<string, unknown>;
  export type ResolvingViewport = Record<string, unknown>;
  export type TemplateString = string;
}

// `.js`-suffixed variants used by Next's generated `.next/types` files.
declare module "next/server.js" {
  export class NextRequest extends Request {
    nextUrl: URL;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      set(name: string, value: string): void;
      delete(name: string): void;
    };
    geo?: { city?: string; country?: string; region?: string; latitude?: number; longitude?: number };
    ip?: string;
    json(): Promise<any>;
    text(): Promise<string>;
    formData(): Promise<FormData>;
  }

  export class NextResponse extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit);
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
    static rewrite(url: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
    cookies: {
      get(name: string): { name: string; value: string } | undefined;
      getAll(): { name: string; value: string }[];
      set(name: string, value: string): void;
      delete(name: string): void;
    };
  }

  export type NextContext = {
    params: Promise<Record<string, string | string[]>> | Record<string, string | string[]>;
  };

  export type NextFetchEvent = {
    waitUntil(promise: Promise<unknown>): void;
    request: NextRequest;
  };

  export function userAgent(req: NextRequest): { isBot: boolean; browser: string; device: string; engine: string; os: string };
}

declare module "next/dist/lib/metadata/types/metadata-interface.js" {
  export type Metadata = Record<string, unknown>;
  export type Viewport = Record<string, unknown>;
  export type ResolvingMetadata = Record<string, unknown>;
  export type ResolvingViewport = Record<string, unknown>;
  export type TemplateString = string;
}
