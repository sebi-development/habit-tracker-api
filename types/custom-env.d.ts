// custom-env ships no type definitions
declare module 'custom-env' {
  export function env(envName?: string, path?: string): void
}
