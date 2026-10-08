"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapRoles, toRolesDTO } from "../mappers/roles.mapper";
import { getRolesDTO, updateRolesDTO } from "../service/roles.service";
import type { RolePreview } from "../model/role";
type Action = { type: "save"; roles: RolePreview[] } | { type: "reset" };
const key = ["private-07", "roles"] as const;
export function useRoles() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: async ({ signal }) => mapRoles(await getRolesDTO(signal)), retry: false, refetchOnWindowFocus: false });
  const mutation = useMutation({
    mutationFn: async (action: Action) => mapRoles(await updateRolesDTO(action.type === "save" ? { type: "save", ...toRolesDTO(action.roles) } : action)),
    onSuccess: async data => { await client.cancelQueries({ queryKey: key }); client.setQueryData(key, data); },
    retry: false,
  });
  return { query, mutation };
}
