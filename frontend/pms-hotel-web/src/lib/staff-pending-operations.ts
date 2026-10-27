/** Non-secret local operation references only. Never store tokens or card data here. */
export const staffPendingOperationPrefix = 'pms:staff-operation:';
export function clearStaffPendingOperations(exceptActor?: string) {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter((key): key is string => key !== null);
    for (const key of keys) {
      if (key.startsWith(staffPendingOperationPrefix) && (!exceptActor || !key.startsWith(`${staffPendingOperationPrefix}${exceptActor}:`))) sessionStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable; payment submission fails closed in its own hook. */ }
}
