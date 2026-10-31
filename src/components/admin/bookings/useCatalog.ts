"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { ScheduleRange } from "./types";

export interface CatalogBranch {
  _id: string;
  name: string;
  active: boolean;
}
export interface CatalogService {
  _id: string;
  name: string;
  durationMin: number;
  price: number;
  includedInPlan: boolean;
  branchIds: string[];
  active: boolean;
}
export interface CatalogBarber {
  _id: string;
  name: string;
  branchId: string;
  serviceIds: string[];
  schedule: ScheduleRange[];
  active: boolean;
}
export interface AdminCatalogData {
  settings: {
    businessName: string;
    timezone: string;
    currency: string;
    slotIntervalMin: number;
    membershipEnabled: boolean;
    loyalty: { enabled: boolean; cardSize: number };
  };
  today: string;
  branches: CatalogBranch[];
  services: CatalogService[];
  barbers: CatalogBarber[];
}

// One in-flight/cached request shared by every component on the page.
let cache: Promise<AdminCatalogData> | null = null;
let cachedAt = 0;
const TTL = 5 * 60_000;

function load(force = false) {
  if (!cache || force || Date.now() - cachedAt > TTL) {
    cachedAt = Date.now();
    cache = api<AdminCatalogData>("/api/admin/catalog").catch((e) => {
      cache = null;
      throw e;
    });
  }
  return cache;
}

export function useCatalog() {
  const [data, setData] = useState<AdminCatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback((force = true) => {
    load(force)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  return { catalog: data, error, refresh };
}

export function barberDoesService(barber: Pick<CatalogBarber, "serviceIds">, serviceId: string) {
  return !barber.serviceIds?.length || barber.serviceIds.includes(serviceId);
}

export function serviceInBranch(service: Pick<CatalogService, "branchIds">, branchId: string) {
  return !service.branchIds?.length || service.branchIds.includes(branchId);
}
