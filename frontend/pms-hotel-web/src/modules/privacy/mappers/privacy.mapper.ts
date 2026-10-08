import { object, list, text, flag, date, choice, unique } from "@/lib/validation";
import type { Privacy } from "../model/privacy";

export function mapPrivacy(value: unknown): Privacy {
  const dto = object(value);
  return {
    consents: unique(list(dto.consents).map(raw => {
      const item = object(raw);
      return { id: text(item.consent_id), subject: text(item.subject), purpose: text(item.purpose),
        channel: choice(item.channel, ["Email", "SMS"]), active: flag(item.active), source: text(item.source),
        updatedAt: date(item.updated_at), evidenceVersion: text(item.evidence_version) };
    })),
    requests: unique(list(dto.requests).map(raw => {
      const item = object(raw);
      return { id: text(item.request_id), kind: choice(item.kind, ["export", "anonymize"]),
        status: choice(item.status, ["pending"]), createdAt: date(item.created_at) };
    })),
  };
}

