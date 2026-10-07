import { HttpStatusError, httpRequest } from '@/lib/http';
import { passwordLoginInput } from '@/lib/login-input';
import type { UnifiedLoginDTO } from '../dtos/unified-login.dto';
import type { AuthContext } from '../model/unified-login';
export function loginWithCredentials(email: string, password: string, context?: AuthContext): Promise<UnifiedLoginDTO> {
  const credentials = passwordLoginInput(email, password);
  if (!credentials) throw new HttpStatusError(400, 'Invalid authentication input');
  return httpRequest({ path: new URL('/api/auth/login', window.location.origin).href, method: 'POST', withAuth: false,
    json: { ...credentials, ...(context ? { context } : {}) } });
}
