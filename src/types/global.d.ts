// Ambient declarations for non-TS asset imports.
// CSS side-effect imports are valid in Next.js (handled by webpack), but
// modern TypeScript versions need an explicit module declaration to accept
// `import "./globals.css"` without a type error.
declare module "*.css";
