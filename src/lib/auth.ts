import { db } from "./db";
import { hashPassword, ITERATIONS, newSalt } from "./hash";
import type { Role, User } from "./types";

// This is a lock on the app, not server security: everything lives on the phone, so someone who can open the
// phone's browser storage could still get around it. It keeps customers and staff out of the books.

const SESSION_KEY = "session";
const FAILS_KEY = "loginFails";
const MAX_FAILS = 5;
const LOCK_MS = 30_000;

export const normalizeUsername = (s: string) => s.trim().toLowerCase();

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (u.length < 3) return "نام کاربری باید حداقل ۳ حرف باشد.";
  if (/\s/.test(u)) return "نام کاربری نباید فاصله داشته باشد.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "رمز باید حداقل ۶ کاراکتر باشد.";
  return null;
}

const UNAVAILABLE = "این نام کاربری قابل استفاده نیست.";

async function newUser(username: string, password: string, role: Role): Promise<Omit<User, "id">> {
  const salt = newSalt();
  return {
    username: normalizeUsername(username),
    role,
    salt,
    hash: hashPassword(password, salt),
    iterations: ITERATIONS,
    createdAt: Date.now(),
  };
}

const matches = (user: User, password: string) => hashPassword(password, user.salt, user.iterations) === user.hash;

// First run: both accounts are created together by the person setting the app up.
export async function setupAccounts(
  admin: { username: string; password: string },
  owner: { username: string; password: string },
): Promise<string | null> {
  if ((await db.users.count()) > 0) return "راه‌اندازی قبلاً انجام شده است.";
  for (const a of [admin, owner]) {
    const err = validateUsername(a.username) ?? validatePassword(a.password);
    if (err) return err;
  }
  if (normalizeUsername(admin.username) === normalizeUsername(owner.username)) return "نام‌های کاربری باید متفاوت باشند.";
  await db.users.bulkAdd([await newUser(admin.username, admin.password, "admin"), await newUser(owner.username, owner.password, "owner")]);
  return null;
}

// Accounts baked into the build by the deploy workflow (hashes only), so no phone needs a setup step.
function buildAccounts(): Omit<User, "id">[] {
  try {
    const parsed = JSON.parse(process.env.NEXT_PUBLIC_SEED_ACCOUNTS || "[]");
    return Array.isArray(parsed) && parsed.length === 2 ? parsed : [];
  } catch {
    return [];
  }
}

export const hasBuildAccounts = () => buildAccounts().length === 2;

export async function seedBuildAccounts() {
  if ((await db.users.count()) > 0) return;
  await db.users.bulkAdd(buildAccounts());
}

// Development only: ready-made accounts so every screen can be tried without the setup step.
export async function ensureDemoUsers() {
  if ((await db.users.count()) > 0) return;
  await setupAccounts({ username: "admin", password: "admin123" }, { username: "owner", password: "owner123" });
}

export type LoginResult = { ok: true; user: User } | { ok: false; reason: "invalid" | "locked"; waitSeconds?: number };

export async function login(username: string, password: string): Promise<LoginResult> {
  const fails = JSON.parse(localStorage.getItem(FAILS_KEY) ?? "{}") as { count?: number; until?: number };
  if (fails.until && fails.until > Date.now()) {
    return { ok: false, reason: "locked", waitSeconds: Math.ceil((fails.until - Date.now()) / 1000) };
  }
  const user = await db.users.where("username").equals(normalizeUsername(username)).first();
  // Hash even when the name is unknown so both failures take the same time and say the same thing.
  const good = user ? matches(user, password) : (hashPassword(password, "-"), false);
  if (user && good) {
    localStorage.removeItem(FAILS_KEY);
    return { ok: true, user };
  }
  const count = (fails.count ?? 0) + 1;
  localStorage.setItem(
    FAILS_KEY,
    JSON.stringify(count >= MAX_FAILS ? { count: 0, until: Date.now() + LOCK_MS } : { count, until: 0 }),
  );
  return { ok: false, reason: "invalid" };
}

// Changing his own username and/or password always asks for the current password.
export async function changeOwnAccount(
  userId: number,
  currentPassword: string,
  change: { username?: string; newPassword?: string },
): Promise<string | null> {
  const user = await db.users.get(userId);
  if (!user || !matches(user, currentPassword)) return "رمز فعلی اشتباه است.";
  const patch: Partial<User> = {};
  const wanted = change.username !== undefined ? normalizeUsername(change.username) : user.username;
  if (wanted !== user.username) {
    const err = validateUsername(wanted);
    if (err) return err;
    const taken = await db.users.where("username").equals(wanted).first();
    if (taken) return UNAVAILABLE;
    patch.username = wanted;
  }
  if (change.newPassword) {
    const err = validatePassword(change.newPassword);
    if (err) return err;
    const salt = newSalt();
    Object.assign(patch, { salt, hash: hashPassword(change.newPassword, salt), iterations: ITERATIONS });
  }
  if (Object.keys(patch).length === 0) return "تغییری وارد نشده است.";
  await db.users.update(userId, patch);
  return null;
}

// Only the admin can see every account; anyone else gets nothing back.
export async function listAccounts(actor: User): Promise<User[]> {
  if (actor.role !== "admin") return [];
  return db.users.toArray();
}

// The admin resets the owner's login (forgotten password) without knowing the old one.
export async function adminUpdateOwner(
  actor: User,
  change: { username?: string; newPassword?: string },
): Promise<string | null> {
  if (actor.role !== "admin") return "اجازه این کار را ندارید.";
  const owner = await db.users.filter((u) => u.role === "owner").first();
  if (!owner?.id) return "حساب صاحب آرایشگاه پیدا نشد.";
  const patch: Partial<User> = {};
  if (change.username !== undefined && normalizeUsername(change.username) !== owner.username) {
    const err = validateUsername(change.username);
    if (err) return err;
    const taken = await db.users.where("username").equals(normalizeUsername(change.username)).first();
    if (taken) return UNAVAILABLE;
    patch.username = normalizeUsername(change.username);
  }
  if (change.newPassword) {
    const err = validatePassword(change.newPassword);
    if (err) return err;
    const salt = newSalt();
    Object.assign(patch, { salt, hash: hashPassword(change.newPassword, salt), iterations: ITERATIONS });
  }
  if (Object.keys(patch).length === 0) return "تغییری وارد نشده است.";
  await db.users.update(owner.id, patch);
  return null;
}

export const readSession = (): number | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  return raw ? Number(raw) || null : null;
};

// "Remember me" keeps him signed in on this phone; otherwise the session ends when the app is closed.
export function saveSession(userId: number, remember: boolean) {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, String(userId));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}
