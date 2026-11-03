export const DEFAULT_TEST_DATABASE_URL = "postgresql://127.0.0.1:5433/inventory_test";

export function assertTestDatabase(databaseUrl: string): void {
  try {
    const url = new URL(databaseUrl);
    const databaseName = decodeURIComponent(url.pathname.slice(1));
    if (
      (url.protocol === "postgresql:" || url.protocol === "postgres:") &&
      databaseName.endsWith("_test")
    ) {
      return;
    }
  } catch {
    throw new Error(
      'Integration tests require a valid PostgreSQL URL whose database name ends in "_test".',
    );
  }

  throw new Error(
    'Integration tests require a valid PostgreSQL URL whose database name ends in "_test".',
  );
}
