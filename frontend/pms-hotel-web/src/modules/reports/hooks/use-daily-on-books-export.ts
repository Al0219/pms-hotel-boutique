"use client";

import { useEffect, useRef, useState } from "react";
import type { PropertyScope } from "@/modules/properties";

import { mapDailyOnBooksExport } from "../mappers/daily-on-books-export.mapper";
import { getDailyOnBooksExport } from "../service/daily-on-books-export.service";

export function useDailyOnBooksExport(sessionId: string, scope: PropertyScope) {
  const scopeKey = `${sessionId}:${scope.kind}:${scope.propertyIds.join(",")}`;
  const [state, setState] = useState<{ key: string; value: "idle" | "pending" | "success" | "error" }>({ key: scopeKey, value: "idle" });
  const status = state.key === scopeKey ? state.value : "idle";
  const setStatus = (value: typeof state.value) => setState({ key: scopeKey, value });
  const active = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => {
    active.current?.abort();
    active.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, [scopeKey]);

  const download = async (from: string, to: string) => {
    if (active.current || !sessionId) return;
    const controller = new AbortController();
    active.current = controller;
    setStatus("pending");
    try {
      const file = mapDailyOnBooksExport(await getDailyOnBooksExport(scope, from, to, controller.signal), from, to);
      if (controller.signal.aborted) return;
      objectUrl.current = URL.createObjectURL(file.content);
      const anchor = document.createElement("a");
      anchor.href = objectUrl.current;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
      // The browser owns the download after click; do not retain the Blob URL.
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
      setStatus("success");
    } catch {
      if (!controller.signal.aborted) setStatus("error");
    } finally {
      if (active.current === controller) active.current = null;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  };
  return { status, download };
}
