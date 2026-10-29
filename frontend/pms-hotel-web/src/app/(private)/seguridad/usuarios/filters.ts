/** Only non-sensitive navigation state; never cursors or organization authority. */
export function navigationFilters(query: Record<string, string | string[] | undefined>) {
  return {
    username: typeof query.username === 'string' ? query.username.slice(0, 80) : '',
    roleCode: typeof query.roleCode === 'string' && ['SUPER_ADMIN', 'GERENCIA', 'RECEPCION', 'OPERACIONES', 'AUDITOR'].includes(query.roleCode) ? query.roleCode : '',
    status: typeof query.status === 'string' && ['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(query.status) ? query.status : '',
    limit: typeof query.limit === 'string' && ['5', '10', '25', '50', '100'].includes(query.limit) ? Number(query.limit) : 50,
  };
}
