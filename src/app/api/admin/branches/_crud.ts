import type { NextRequest } from "next/server";
import { Types, type Model } from "mongoose";
import { z } from "zod";
import { ApiError, ok, plain, readJson, route } from "@/lib/api";

/**
 * Shared REST plumbing for the admin catalog entities (branches, services, barbers,
 * time-offs, rewards, plans). Each entity route file only declares its schema and rules.
 */

type Data = Record<string, unknown>;
type LeanDoc = Data & { _id: Types.ObjectId };
type IdCtx = { params: Promise<{ id: string }> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

export type CrudConfig = {
  model: AnyModel;
  /** Used in 404 messages, e.g. "La sucursal". */
  label: string;
  parseCreate: (body: unknown) => Data;
  parsePatch: (body: unknown, existing: LeanDoc) => Data;
  /** Cross-entity validation / normalization. May return a replacement data object. */
  check?: (data: Data, existing: LeanDoc | null) => Promise<Data | void>;
  /** When true, DELETE deactivates instead of removing. */
  isReferenced?: (id: Types.ObjectId) => Promise<boolean>;
  /** Cleanup after a hard delete. */
  onHardDelete?: (id: Types.ObjectId) => Promise<void>;
  /** Extra fields merged into POST / PATCH responses. */
  afterWrite?: (item: LeanDoc) => Promise<Data>;
  /** Decorates GET items and adds extra top-level fields. */
  list?: (items: LeanDoc[]) => Promise<Data>;
  sort?: Record<string, 1 | -1>;
  /** New records go last: order = max(order) + 1 when the body has no order. */
  autoOrder?: boolean;
};

const DEFAULT_SORT = { order: 1, name: 1 } as const;
const OBJECT_ID = /^[a-f\d]{24}$/i;

export function parseId(raw: string): Types.ObjectId {
  if (!OBJECT_ID.test(raw)) throw new ApiError(400, "invalid_id", "El identificador no es válido.");
  return new Types.ObjectId(raw);
}

async function readBody(req: NextRequest): Promise<unknown> {
  return readJson(req, z.unknown());
}

function compact(data: Data): Data {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

function notFound(label: string): never {
  throw new ApiError(404, "not_found", `${label} no existe o ya fue eliminada.`);
}

export function collectionHandlers(cfg: CrudConfig) {
  const GET = route(
    async () => {
      const items = (await cfg.model.find().sort(cfg.sort ?? DEFAULT_SORT).lean()) as LeanDoc[];
      const extra = cfg.list ? await cfg.list(items) : { items };
      return ok(plain({ items, ...extra }));
    },
    { admin: true },
  );

  const POST = route(
    async (req) => {
      const body = await readBody(req);
      let data = compact(cfg.parseCreate(body));
      if (cfg.check) data = (await cfg.check(data, null)) ?? data;
      const hasOrder = typeof body === "object" && body !== null && "order" in body;
      if (cfg.autoOrder && !hasOrder) {
        const last = (await cfg.model.findOne().sort({ order: -1 }).select({ order: 1 }).lean()) as {
          order?: number;
        } | null;
        data.order = (last?.order ?? 0) + 1;
      }
      const created = await cfg.model.create(data);
      const item = created.toObject() as LeanDoc;
      const extra = cfg.afterWrite ? await cfg.afterWrite(item) : {};
      return ok(plain({ item, ...extra }), { status: 201 });
    },
    { admin: true },
  );

  return { GET, POST };
}

export function itemHandlers(cfg: CrudConfig) {
  const PATCH = route<{ id: string }>(
    async (req, ctx: IdCtx) => {
      const id = parseId((await ctx.params).id);
      const existing = (await cfg.model.findById(id).lean()) as LeanDoc | null;
      if (!existing) notFound(cfg.label);
      const body = await readBody(req);
      let data = compact(cfg.parsePatch(body, existing));
      if (cfg.check) data = (await cfg.check(data, existing)) ?? data;
      const item = (await cfg.model
        .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
        .lean()) as LeanDoc | null;
      if (!item) notFound(cfg.label);
      const extra = cfg.afterWrite ? await cfg.afterWrite(item) : {};
      return ok(plain({ item, ...extra }));
    },
    { admin: true },
  );

  const DELETE = route<{ id: string }>(
    async (_req, ctx: IdCtx) => {
      const id = parseId((await ctx.params).id);
      if (!(await cfg.model.exists({ _id: id }))) notFound(cfg.label);
      if (cfg.isReferenced && (await cfg.isReferenced(id))) {
        const item = await cfg.model.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }).lean();
        return ok(plain({ result: "deactivated" as const, item }));
      }
      await cfg.model.deleteOne({ _id: id });
      if (cfg.onHardDelete) await cfg.onHardDelete(id);
      return ok({ result: "deleted" as const });
    },
    { admin: true },
  );

  return { PATCH, DELETE };
}

/** Throws 400 unless every id exists in the given model. Returns the ids de-duplicated. */
export async function assertAllExist(model: AnyModel, ids: string[], message: string): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return unique;
  const found = await model.countDocuments({ _id: { $in: unique.map((i) => new Types.ObjectId(i)) } });
  if (found !== unique.length) throw new ApiError(400, "invalid_reference", message);
  return unique;
}
