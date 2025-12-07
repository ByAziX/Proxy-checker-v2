"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("DATABASE_URL manquant pour Prisma.");
}
const pool = DATABASE_URL
    ? new pg_1.Pool({ connectionString: DATABASE_URL })
    : undefined;
const prisma = new client_1.PrismaClient(pool ? { adapter: new adapter_pg_1.PrismaPg(pool) } : undefined);
const app = (0, fastify_1.default)({ logger: true });
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
app.register(cors_1.default, {
    origin: true,
    credentials: true,
});
app.register(jwt_1.default, {
    secret: JWT_SECRET,
});
app.decorate("authenticate", async (request, reply) => {
    try {
        await request.jwtVerify();
    }
    catch (error) {
        request.log.error(error);
        reply.code(401).send({ message: "Non autorise" });
    }
});
const serializeUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
});
const getUserId = (request) => {
    const payload = request.user;
    return payload?.id ?? payload?.sub ?? null;
};
app.get("/", async () => {
    return { status: "ok" };
});
app.get("/health", async () => ({ status: "ok" }));
app.post("/auth/register", async (request, reply) => {
    const body = request.body;
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
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma.user.create({
        data: { email, passwordHash, name },
    });
    const token = app.jwt.sign({ sub: user.id, email: user.email, name: user.name ?? undefined }, { expiresIn: "7d" });
    reply.send({ token, user: serializeUser(user) });
});
app.post("/auth/login", async (request, reply) => {
    const body = request.body;
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
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid) {
        reply.code(401).send({ message: "Identifiants invalides." });
        return;
    }
    const token = app.jwt.sign({ sub: user.id, email: user.email, name: user.name ?? undefined }, { expiresIn: "7d" });
    reply.send({ token, user: serializeUser(user) });
});
app.get("/auth/me", { preHandler: [app.authenticate] }, async (request, reply) => {
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
});
const defaultCategories = [
    { name: "Proxy", description: "Tests de sortie via proxy / reseau" },
    { name: "DLP", description: "Tests de Data Loss Prevention" },
    {
        name: "Threat",
        description: "Sites de protection / blocage menace (phishing, malware)",
    },
    { name: "Custom", description: "Tests personnalises" },
];
async function ensureDefaultCategories() {
    await Promise.all(defaultCategories.map((cat) => prisma.category.upsert({
        where: { name: cat.name },
        update: { description: cat.description },
        create: { name: cat.name, description: cat.description },
    })));
}
app.get("/categories", async () => {
    const categories = await prisma.category.findMany({
        orderBy: { createdAt: "asc" },
        include: { targets: true },
    });
    return { categories };
});
app.post("/categories", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body;
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
});
app.get("/targets", async () => {
    const targets = await prisma.siteTarget.findMany({
        include: { category: true, createdBy: true },
        orderBy: { createdAt: "desc" },
    });
    return { targets };
});
app.post("/targets", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body;
    const name = body?.name?.trim();
    const url = body?.url?.trim();
    const categoryId = body?.categoryId;
    if (!name || !url || !categoryId) {
        reply.code(400).send({ message: "Nom, URL et categorie sont requis." });
        return;
    }
    try {
        new URL(url.startsWith("http") ? url : `https://${url}`);
    }
    catch {
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
});
app.patch("/targets/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params;
    const id = Number(params?.id);
    if (!id || Number.isNaN(id)) {
        reply.code(400).send({ message: "Identifiant invalide." });
        return;
    }
    const body = request.body;
    const updates = {};
    if (body?.name)
        updates.name = body.name.trim();
    if (body?.url)
        updates.url = body.url.trim();
    if (body?.categoryId)
        updates.categoryId = body.categoryId;
    if (body?.protectionType)
        updates.protectionType = body.protectionType;
    if (body?.notes !== undefined)
        updates.notes = body.notes;
    if (body?.tags !== undefined)
        updates.tags = body.tags;
    const updated = await prisma.siteTarget.update({
        where: { id },
        data: updates,
        include: { category: true },
    });
    reply.send({ target: updated });
});
app.delete("/targets/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params;
    const id = Number(params?.id);
    if (!id || Number.isNaN(id)) {
        reply.code(400).send({ message: "Identifiant invalide." });
        return;
    }
    await prisma.siteTarget.delete({ where: { id } });
    reply.code(204).send();
});
// Applications (ensembles de liens / APIs / fichiers)
app.get("/apps", async () => {
    const apps = await prisma.application.findMany({
        orderBy: { createdAt: "desc" },
        include: { endpoints: true },
    });
    return { apps };
});
app.post("/apps", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body;
    const name = body?.name?.trim();
    const description = body?.description?.trim();
    const userId = getUserId(request);
    if (!name) {
        reply.code(400).send({ message: "Nom de l'application requis." });
        return;
    }
    const appCreated = await prisma.application.create({
        data: { name, description, createdById: userId },
    });
    reply.code(201).send({ app: appCreated });
});
app.post("/apps/:id/endpoints", { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = request.params;
    const appId = Number(params?.id);
    if (!appId || Number.isNaN(appId)) {
        reply.code(400).send({ message: "Identifiant d'application invalide." });
        return;
    }
    const body = request.body;
    const label = body?.label?.trim();
    const url = body?.url?.trim();
    if (!label || !url) {
        reply.code(400).send({ message: "Label et URL requis." });
        return;
    }
    try {
        new URL(url.startsWith("http") ? url : `https://${url}`);
    }
    catch {
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
});
// Test cote serveur (depuis le backend)
app.post("/server-check", async (request, reply) => {
    const body = request.body;
    const rawUrl = body?.url?.trim();
    if (!rawUrl) {
        reply.code(400).send({ message: "URL requise." });
        return;
    }
    const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    let parsed;
    try {
        parsed = new URL(normalized);
    }
    catch {
        reply.code(400).send({ message: "URL invalide." });
        return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const start = performance.now();
    try {
        const headers = {};
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
    }
    catch (error) {
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
    app.listen({ port: 3001, host: "0.0.0.0" });
}
start().catch((error) => {
    app.log.error(error);
    process.exit(1);
});
