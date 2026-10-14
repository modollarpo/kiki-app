import { getDb } from '@/lib/db'

export async function query(tenantId: string, _body: any) {
  return {
    ok: true,
    answer: 'In-repo NL analytics ready. Configure real embeddings/service for deeper Qs.',
    suggestions: [],
  }
}

export async function suggestions(tenantId: string) {
  return { ok: true, suggestions: [] }
}
