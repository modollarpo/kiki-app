export async function listCreators(tenantId: string) {
  return { ok: true, creators: [] }
}
export async function createCreator(tenantId: string, _body: any) {
  return { ok: true, creatorId: 'inf_' + Date.now() }
}
