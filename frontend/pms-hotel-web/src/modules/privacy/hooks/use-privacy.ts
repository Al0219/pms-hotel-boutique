"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapPrivacy } from "../mappers/privacy.mapper";
import { getPrivacyDTO, updatePrivacyDTO, type Action } from "../service/privacy.service";
const key = ["private-07", "privacy"] as const;
export function usePrivacy() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: async ({ signal }) => mapPrivacy(await getPrivacyDTO(signal)), retry: false, refetchOnWindowFocus: false });
  const mutation = useMutation({
    mutationFn: async (action: Action) => mapPrivacy(await updatePrivacyDTO(action)),
    onSuccess: async data => { await client.cancelQueries({ queryKey: key }); client.setQueryData(key, data); },
    retry: false,
  });
  return { query, mutation };
}

