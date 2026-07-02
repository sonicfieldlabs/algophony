export const DEFAULT_APP_URL = "http://localhost:3001";

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || DEFAULT_APP_URL).replace(/\/+$/, "");
}
