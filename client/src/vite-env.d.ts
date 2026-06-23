/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL; empty string means same-origin in production. */
  readonly VITE_API_URL?: string;
  /** Build id baked in at build time; used to detect a stale cached bundle. */
  readonly VITE_BUILD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
