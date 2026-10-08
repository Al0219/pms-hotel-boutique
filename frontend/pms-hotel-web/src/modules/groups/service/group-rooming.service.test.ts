import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { addRoomingEntry, removeRoomingEntry } from "./group-rooming.service";

const ENDPOINT = "http://pms.test/contract/groups";

const GROUP = {
  group_id: "GRP-001",
  property_id: "GT-HB-01",
  name: "Convención Maya",
  lifecycle_status: "DEFINITE",
  room_block_reference: "BLK-001",
  audit_reference: null,
  block_start_date: "2026-10-01",
  block_end_date: "2026-10-05",
  rooms_blocked: 20,
  rooms_picked_up: 14,
  rooming_list: [],
};

describe("addRoomingEntry", () => {
  it("POSTs the guest and returns the updated group", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/groups/:groupId/rooming-list", async ({ request, params }) => {
        expect(params.groupId).toBe("GRP-001");
        const body = (await request.json()) as { guest_name: string; room_label: string };
        expect(body).toEqual({ guest_name: "Ana Ruiz", room_label: "201" });

        return HttpResponse.json({
          ...GROUP,
          rooms_picked_up: 15,
          rooming_list: [{ entry_id: "RL-01", guest_name: "Ana Ruiz", room_label: "201" }],
        });
      }),
    );

    await expect(
      addRoomingEntry({ endpoint: ENDPOINT, propertyId: "GT-HB-01", groupId: "GRP-001", guestName: "Ana Ruiz", roomLabel: "201" }),
    ).resolves.toMatchObject({ group_id: "GRP-001", rooms_picked_up: 15 });
  });

  it("surfaces backend rejections to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/groups/:groupId/rooming-list", () =>
        HttpResponse.json({ error: "BLOCK_FULL" }, { status: 409 }),
      ),
    );

    await expect(
      addRoomingEntry({ endpoint: ENDPOINT, propertyId: "GT-HB-01", groupId: "GRP-001", guestName: "Ana Ruiz", roomLabel: "201" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});

describe("removeRoomingEntry", () => {
  it("DELETEs the entry and returns the updated group", async () => {
    mockServer.use(
      http.delete("http://pms.test/contract/groups/:groupId/rooming-list/:entryId", ({ params }) => {
        expect(params).toMatchObject({ groupId: "GRP-001", entryId: "RL-01" });
        return HttpResponse.json({ ...GROUP, rooms_picked_up: 13, rooming_list: [] });
      }),
    );

    await expect(
      removeRoomingEntry({ endpoint: ENDPOINT, propertyId: "GT-HB-01", groupId: "GRP-001", entryId: "RL-01" }),
    ).resolves.toMatchObject({ group_id: "GRP-001", rooms_picked_up: 13 });
  });
});
