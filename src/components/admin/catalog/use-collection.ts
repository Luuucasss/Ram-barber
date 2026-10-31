"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/client-api";
import type { DeleteResult } from "./types";

type Identified = { _id: string };

export function byOrderName<T extends { order: number; name: string }>(a: T, b: T) {
  return a.order - b.order || a.name.localeCompare(b.name, "es");
}

/**
 * Local state mirror of an admin REST collection (`/api/admin/<entity>`), with
 * create / update / optimistic patch / delete that keep the list sorted.
 */
export function useCollection<T extends Identified>(endpoint: string, initial: T[], sort?: (a: T, b: T) => number) {
  // `sort` is expected to be a stable (module-level) comparator.
  const [items, setItems] = useState<T[]>(() => (sort ? [...initial].sort(sort) : initial));

  const upsert = useCallback(
    (item: T) => {
      setItems((list) => {
        const exists = list.some((i) => i._id === item._id);
        const next = exists ? list.map((i) => (i._id === item._id ? item : i)) : [...list, item];
        return sort ? [...next].sort(sort) : next;
      });
    },
    [sort],
  );

  const create = useCallback(
    async <R extends { item: T }>(body: unknown): Promise<R> => {
      const res = await api<R>(endpoint, { method: "POST", body });
      upsert(res.item);
      return res;
    },
    [endpoint, upsert],
  );

  const update = useCallback(
    async <R extends { item: T }>(id: string, body: Partial<T> | Record<string, unknown>): Promise<R> => {
      const res = await api<R>(`${endpoint}/${id}`, { method: "PATCH", body });
      upsert(res.item);
      return res;
    },
    [endpoint, upsert],
  );

  /** Applies the change immediately and rolls back that record if the request fails. */
  const patchOptimistic = useCallback(
    async (id: string, patch: Partial<T>) => {
      let previous: T | undefined;
      setItems((list) =>
        list.map((i) => {
          if (i._id !== id) return i;
          previous = i;
          return { ...i, ...patch };
        }),
      );
      try {
        const res = await api<{ item: T }>(`${endpoint}/${id}`, { method: "PATCH", body: patch });
        upsert(res.item);
      } catch (e) {
        if (previous) {
          const restore = previous;
          setItems((list) => list.map((i) => (i._id === id ? restore : i)));
        }
        throw e;
      }
    },
    [endpoint, upsert],
  );

  const remove = useCallback(
    async (id: string): Promise<DeleteResult<T>["result"]> => {
      const res = await api<DeleteResult<T>>(`${endpoint}/${id}`, { method: "DELETE" });
      if (res.result === "deleted") setItems((list) => list.filter((i) => i._id !== id));
      else upsert(res.item);
      return res.result;
    },
    [endpoint, upsert],
  );

  return { items, setItems, upsert, create, update, patchOptimistic, remove };
}
