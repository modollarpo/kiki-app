export async function queryOne<T extends Record<string, unknown>>(
  db: { prepare: (sql: string) => { get: (...params: unknown[]) => Promise<unknown> } },
  sql: string,
  ...params: unknown[]
): Promise<T | undefined> {
  return (await db.prepare(sql).get(...params)) as T | undefined;
}

export async function queryAll<T extends Record<string, unknown>>(
  db: { prepare: (sql: string) => { all: (...params: unknown[]) => Promise<unknown[]> } },
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  return (await db.prepare(sql).all(...params)) as T[];
}

export function mapRow<T extends Record<string, unknown>>(
  row: Record<string, unknown> | undefined,
  mapper: (raw: Record<string, unknown>) => T
): T | undefined {
  if (!row) return undefined;
  return mapper(row);
}
