import {cleanup} from '@testing-library/react-native';
import {QueryClient,type QueryClientConfig} from '@tanstack/react-query';

const clients=new Set<QueryClient>();

/** Keep production cache semantics during assertions, then release each test's resources. */
export function createTestQueryClient(config?:QueryClientConfig):QueryClient {
  const client=new QueryClient(config);clients.add(client);return client;
}

afterEach(async()=>{
  // Unsubscribe before clearing: unmount itself schedules the default five-minute GC timer.
  await cleanup();
  for(const client of clients){
    await client.cancelQueries();
    // QueryClient.clear() clears the cache but TanStack does not destroy mutation GC timers.
    for(const mutation of client.getMutationCache().getAll())mutation.destroy();
    client.clear();
  }
  clients.clear();
});
