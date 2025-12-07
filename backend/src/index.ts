import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  type AppCategory,
  type ProtectionType,
  type User as PrismaUser,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL manquant pour Prisma.");
}
const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL })
  : undefined;
const prisma = new PrismaClient(
  pool ? { adapter: new PrismaPg(pool) } : undefined
);
const app = Fastify({ logger: true });

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: number; email: string; name?: string };
    user: { sub: number; email: string; name?: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.register(cors, {
  origin: true,
  credentials: true,
});

app.register(jwt, {
  secret: JWT_SECRET,
});

app.decorate(
  "authenticate",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      request.log.error(error);
      reply.code(401).send({ message: "Non autorise" });
    }
  }
);

const serializeUser = (user: PrismaUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

const getUserId = (request: FastifyRequest) => {
  const payload = request.user as { sub?: number; id?: number } | undefined;
  return payload?.id ?? payload?.sub ?? null;
};

app.get("/", async () => {
  return { status: "ok" };
});

app.get("/health", async () => ({ status: "ok" }));

app.post("/auth/register", async (request, reply) => {
  const body = request.body as
    | { email?: string; password?: string; name?: string }
    | undefined;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const name = body?.name?.trim();

  if (!email || !password || password.length < 6) {
    reply.code(400).send({
      message: "Email et mot de passe (>= 6 caracteres) requis.",
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    reply.code(409).send({ message: "Un compte existe deja avec cet email." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const token = app.jwt.sign(
    { sub: user.id, email: user.email, name: user.name ?? undefined },
    { expiresIn: "7d" }
  );

  reply.send({ token, user: serializeUser(user) });
});

app.post("/auth/login", async (request, reply) => {
  const body = request.body as
    | { email?: string; password?: string }
    | undefined;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  if (!email || !password) {
    reply.code(400).send({ message: "Email et mot de passe requis." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    reply.code(401).send({ message: "Identifiants invalides." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    reply.code(401).send({ message: "Identifiants invalides." });
    return;
  }

  const token = app.jwt.sign(
    { sub: user.id, email: user.email, name: user.name ?? undefined },
    { expiresIn: "7d" }
  );

  reply.send({ token, user: serializeUser(user) });
});

app.get(
  "/auth/me",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const resolvedId = getUserId(request);
    if (!resolvedId) {
      reply.code(401).send({ message: "Non autorise" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: resolvedId } });
    if (!user) {
      reply.code(404).send({ message: "Utilisateur introuvable." });
      return;
    }
    reply.send({ user: serializeUser(user) });
  }
);

const defaultCategories = [
  { name: "Proxy", description: "Tests de sortie via proxy / reseau" },
  { name: "DLP", description: "Tests de Data Loss Prevention" },
  {
    name: "Threat",
    description: "Sites de protection / blocage menace (phishing, malware)",
  },
  { name: "Custom", description: "Tests personnalises" },
];

const defaultApps: Array<{
  name: string;
  description?: string;
  category: AppCategory;
  isDefault?: boolean;
  endpoints: Array<{
    label: string;
    url: string;
    kind: "WEB" | "API" | "FILE";
    method?: string;
    notes?: string;
  }>;
}> = [
  {
    name: "Dropbox",
    description: "Cloud storage grand public",
    category: "CLOUD_STORAGE",
    isDefault: true,
    endpoints: [
      { label: "Web", url: "https://dropbox.com", kind: "WEB" },
      {
        label: "API v2",
        url: "https://api.dropboxapi.com/2/files/list_folder",
        kind: "API",
        method: "POST",
        notes: "Test API list_folder",
      },
    ],
  },
  {
    name: "Google Drive",
    description: "Stockage Google Workspace",
    category: "CLOUD_STORAGE",
    isDefault: true,
    endpoints: [
      { label: "Web", url: "https://drive.google.com", kind: "WEB" },
      {
        label: "Drive API",
        url: "https://www.googleapis.com/drive/v3/files",
        kind: "API",
        method: "GET",
      },
    ],
  },
  {
    name: "WeTransfer",
    description: "Transfert de fichiers volumineux",
    category: "FILE_TRANSFER",
    isDefault: true,
    endpoints: [
      { label: "Web", url: "https://wetransfer.com", kind: "WEB" },
      {
        label: "Assets CDN",
        url: "https://cdn.wetransfer.net",
        kind: "FILE",
      },
    ],
  },
  {
    name: "Twitter",
    description: "Reseau social / X",
    category: "SOCIAL_MEDIA",
    isDefault: true,
    endpoints: [
      { label: "Web", url: "https://twitter.com", kind: "WEB" },
      {
        label: "API v2",
        url: "https://api.twitter.com/2/tweets",
        kind: "API",
        method: "GET",
      },
    ],
  },
  {
    name: "Salesforce",
    description: "CRM SaaS",
    category: "SAAS",
    isDefault: true,
    endpoints: [
      { label: "Login", url: "https://login.salesforce.com", kind: "WEB" },
      {
        label: "REST API",
        url: "https://your-domain.salesforce.com/services/data/v59.0",
        kind: "API",
        method: "GET",
      },
    ],
  },
];

async function ensureDefaultCategories() {
  await Promise.all(
    defaultCategories.map((cat) =>
      prisma.category.upsert({
        where: { name: cat.name },
        update: { description: cat.description },
        create: { name: cat.name, description: cat.description },
      })
    )
  );
}

async function ensureDefaultApps() {
  for (const app of defaultApps) {
    const created = await prisma.application.upsert({
      where: { name: app.name },
      update: {
        description: app.description,
        category: app.category,
        isDefault: true,
      },
      create: {
        name: app.name,
        description: app.description,
        category: app.category,
        isDefault: true,
      },
    });

    const endpointCount = await prisma.applicationEndpoint.count({
      where: { applicationId: created.id },
    });
    if (endpointCount === 0 && app.endpoints.length) {
      await prisma.applicationEndpoint.createMany({
        data: app.endpoints.map((ep) => ({
          applicationId: created.id,
          label: ep.label,
          url: ep.url,
          kind: ep.kind,
          method: ep.method,
          notes: ep.notes,
        })),
      });
    }
  }
}

app.get("/categories", async () => {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: { targets: true },
  });
  return { categories };
});

app.post(
  "/categories",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const body = request.body as { name?: string; description?: string } | null;
    const name = body?.name?.trim();
    const description = body?.description?.trim();

    if (!name) {
      reply.code(400).send({ message: "Le nom de la categorie est requis." });
      return;
    }

    const created = await prisma.category.create({
      data: { name, description },
    });
    reply.code(201).send({ category: created });
  }
);

app.get("/targets", async () => {
  const targets = await prisma.siteTarget.findMany({
    include: { category: true, createdBy: true },
    orderBy: { createdAt: "desc" },
  });
  return { targets };
});

app.post(
  "/targets",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const body = request.body as {
      name?: string;
      url?: string;
      categoryId?: number;
      protectionType?: ProtectionType;
      notes?: string;
      tags?: string;
    } | null;

    const name = body?.name?.trim();
    const url = body?.url?.trim();
    const categoryId = body?.categoryId;

    if (!name || !url || !categoryId) {
      reply.code(400).send({ message: "Nom, URL et categorie sont requis." });
      return;
    }

    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      reply.code(400).send({ message: "URL invalide." });
      return;
    }

    const resolvedId = getUserId(request);
    const target = await prisma.siteTarget.create({
      data: {
        name,
        url,
        categoryId,
        protectionType: body?.protectionType || "PROXY",
        notes: body?.notes,
        tags: body?.tags,
        createdById: resolvedId,
      },
      include: { category: true },
    });

    reply.code(201).send({ target });
  }
);

app.patch(
  "/targets/:id",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const params = request.params as { id?: string };
    const id = Number(params?.id);
    if (!id || Number.isNaN(id)) {
      reply.code(400).send({ message: "Identifiant invalide." });
      return;
    }

    const body = request.body as {
      name?: string;
      url?: string;
      categoryId?: number;
      protectionType?: ProtectionType;
      notes?: string;
      tags?: string;
    } | null;

    const updates: Record<string, unknown> = {};
    if (body?.name) updates.name = body.name.trim();
    if (body?.url) updates.url = body.url.trim();
    if (body?.categoryId) updates.categoryId = body.categoryId;
    if (body?.protectionType) updates.protectionType = body.protectionType;
    if (body?.notes !== undefined) updates.notes = body.notes;
    if (body?.tags !== undefined) updates.tags = body.tags;

    const updated = await prisma.siteTarget.update({
      where: { id },
      data: updates,
      include: { category: true },
    });
    reply.send({ target: updated });
  }
);

app.delete(
  "/targets/:id",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const params = request.params as { id?: string };
    const id = Number(params?.id);
    if (!id || Number.isNaN(id)) {
      reply.code(400).send({ message: "Identifiant invalide." });
      return;
    }

    await prisma.siteTarget.delete({ where: { id } });
    reply.code(204).send();
  }
);

// Applications (ensembles de liens / APIs / fichiers)
app.get("/apps", async () => {
  const apps = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { endpoints: true },
  });
  return { apps };
});

app.get("/apps/:id", async (request, reply) => {
  const params = request.params as { id?: string };
  const id = Number(params?.id);
  if (!id || Number.isNaN(id)) {
    reply.code(400).send({ message: "Identifiant invalide." });
    return;
  }
  const appItem = await prisma.application.findUnique({
    where: { id },
    include: { endpoints: true },
  });
  if (!appItem) {
    reply.code(404).send({ message: "Application introuvable." });
    return;
  }
  reply.send({ app: appItem });
});

app.post(
  "/apps",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const body = request.body as {
      name?: string;
      description?: string;
      category?: "CLOUD_STORAGE" | "FILE_TRANSFER" | "SOCIAL_MEDIA" | "SAAS" | "OTHER";
    } | null;
    const name = body?.name?.trim();
    const description = body?.description?.trim();
    const userId = getUserId(request);

    if (!name) {
      reply.code(400).send({ message: "Nom de l'application requis." });
      return;
    }

    const appCreated = await prisma.application.create({
      data: {
        name,
        description,
        category: body?.category || "OTHER",
        createdById: userId,
      },
    });
    reply.code(201).send({ app: appCreated });
  }
);

app.post(
  "/apps/:id/endpoints",
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const params = request.params as { id?: string };
    const appId = Number(params?.id);
    if (!appId || Number.isNaN(appId)) {
      reply.code(400).send({ message: "Identifiant d'application invalide." });
      return;
    }

    const appItem = await prisma.application.findUnique({ where: { id: appId } });
    if (!appItem) {
      reply.code(404).send({ message: "Application introuvable." });
      return;
    }
    if (appItem.isDefault) {
      reply.code(403).send({ message: "Edition interdite sur les applications par défaut." });
      return;
    }

    const body = request.body as {
      label?: string;
      url?: string;
      kind?: "WEB" | "API" | "FILE";
      method?: string;
      notes?: string;
    } | null;

    const label = body?.label?.trim();
    const url = body?.url?.trim();
    if (!label || !url) {
      reply.code(400).send({ message: "Label et URL requis." });
      return;
    }

    try {
      new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      reply.code(400).send({ message: "URL invalide." });
      return;
    }

    const endpoint = await prisma.applicationEndpoint.create({
      data: {
        applicationId: appId,
        label,
        url,
        kind: body?.kind || "WEB",
        method: body?.method,
        notes: body?.notes,
      },
    });

    reply.code(201).send({ endpoint });
  }
);

// Test cote serveur (depuis le backend)
app.post("/server-check", async (request, reply) => {
  const body = request.body as {
    url?: string;
    method?: string;
    payload?: string;
    contentType?: string;
  } | null;
  const rawUrl = body?.url?.trim();
  if (!rawUrl) {
    reply.code(400).send({ message: "URL requise." });
    return;
  }

  const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    reply.code(400).send({ message: "URL invalide." });
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  const start = performance.now();

  try {
    const headers: Record<string, string> = {};
    if (body?.payload) {
      headers["Content-Type"] = body.contentType || "text/plain";
    }

    const response = await fetch(parsed.toString(), {
      method: body?.method || "GET",
      redirect: "follow",
      signal: controller.signal,
      body: body?.payload,
      headers: Object.keys(headers).length ? headers : undefined,
    });
    clearTimeout(timeoutId);
    const latencyMs = performance.now() - start;

    reply.send({
      status: response.ok ? "reachable" : "blocked",
      httpStatus: response.status,
      latencyMs,
      url: parsed.toString(),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    reply.send({
      status: "blocked",
      error: error instanceof Error ? error.message : "Echec serveur",
      latencyMs: performance.now() - start,
      url: parsed.toString(),
    });
  }
});

async function start() {
  await ensureDefaultCategories();
  await ensureDefaultApps();
  app.listen({ port: 3001, host: "0.0.0.0" });
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
