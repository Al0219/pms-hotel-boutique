"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapSecurity } from "../mappers/security.mapper";
import { getSecurityDTO, updateSecurityDTO, type Action } from "../service/security.service";
const key = ["private-07", "security"] as const;
export function useSecurity() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: async ({ signal }) => mapSecurity(await getSecurityDTO(signal)), retry: false, refetchOnWindowFocus: false });
  const mutation = useMutation({
    mutationFn: async (action: Action) => mapSecurity(await updateSecurityDTO(action)),
    onSuccess: async data => { await client.cancelQueries({ queryKey: key }); client.setQueryData(key, data); },
    retry: false,
  });
  return { query, mutation };
}

