module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/firebase-admin/app [external] (firebase-admin/app, esm_import)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

const mod = await __turbopack_context__.y("firebase-admin/app");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/firebase-admin/auth [external] (firebase-admin/auth, esm_import)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

const mod = await __turbopack_context__.y("firebase-admin/auth");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[externals]/firebase-admin/firestore [external] (firebase-admin/firestore, esm_import)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

const mod = await __turbopack_context__.y("firebase-admin/firestore");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[project]/lib/firebase/admin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "adminAuth",
    ()=>adminAuth,
    "adminDb",
    ()=>adminDb
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@opentelemetry+api@1.9.0_react-dom@19.2.0_react@19.2.0__react@19.2.0/node_modules/next/dist/compiled/server-only/empty.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/firebase-admin/app [external] (firebase-admin/app, esm_import)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/firebase-admin/auth [external] (firebase-admin/auth, esm_import)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$29$__ = __turbopack_context__.i("[externals]/firebase-admin/firestore [external] (firebase-admin/firestore, esm_import)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
let cachedApp = null;
function normalizePrivateKey(raw) {
    const normalized = raw.trim();
    const unquoted = normalized.replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1");
    const withEscaped = unquoted.replace(/\\\\n/g, "\n").replace(/\\\\r/g, "\r").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    return withEscaped.replace(/\r\n/g, "\n").replace(/\r/g, "");
}
function getAdminApp() {
    if (cachedApp) return cachedApp;
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new Error("Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.");
    }
    const privateKey = normalizePrivateKey(privateKeyRaw);
    console.log("[Firebase/admin] privateKeyRaw length:", privateKeyRaw.length);
    console.log("[Firebase/admin] privateKey length:", privateKey.length);
    console.log("[Firebase/admin] privateKey first 50:", privateKey.slice(0, 50));
    console.log("[Firebase/admin] privateKey last 50:", privateKey.slice(-50));
    if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
        throw new Error("Firebase Admin private key is invalid. Ensure FIREBASE_ADMIN_PRIVATE_KEY is a single line with \\n escapes.");
    }
    const hasDefaultApp = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__["getApps"])().some((existing)=>existing.name === "[DEFAULT]");
    cachedApp = hasDefaultApp ? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__["getApp"])() : (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__["initializeApp"])({
        credential: (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$29$__["cert"])({
            projectId,
            clientEmail,
            privateKey
        }),
        projectId
    });
    return cachedApp;
}
const adminAuth = new Proxy({}, {
    get (_target, prop) {
        const auth = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$29$__["getAuth"])(getAdminApp());
        const value = auth[prop];
        return typeof value === "function" ? value.bind(auth) : value;
    }
});
const adminDb = new Proxy({}, {
    get (_target, prop) {
        const db = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$29$__["getFirestore"])(getAdminApp());
        const value = db[prop];
        return typeof value === "function" ? value.bind(db) : value;
    }
});
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[externals]/firebase-admin [external] (firebase-admin, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("firebase-admin", () => require("firebase-admin"));

module.exports = mod;
}),
"[project]/lib/firebaseBackofficeAdmin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "backofficeAdminAuth",
    ()=>backofficeAdminAuth,
    "backofficeAdminDb",
    ()=>backofficeAdminDb
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/firebase-admin [external] (firebase-admin, cjs)");
;
const BACKOFFICE_APP_NAME = "backoffice-admin";
const isDev = ("TURBOPACK compile-time value", "development") === "development";
const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-export";
const useEmulators = process.env.USE_FIREBASE_EMULATOR === "true";
let cachedApp = null;
let emulatorConfigured = false;
function getProjectId() {
    if (useEmulators) {
        return ("TURBOPACK compile-time value", "courtly-fc306") || process.env.BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID;
    }
    return process.env.BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID || ("TURBOPACK compile-time value", "courtly-backoffice");
}
function normalizePrivateKey(raw) {
    const normalized = raw.trim();
    const unquoted = normalized.replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1");
    const withEscaped = unquoted.replace(/\\\\n/g, "\n").replace(/\\\\r/g, "\r").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    return withEscaped.replace(/\r\n/g, "\n").replace(/\r/g, "");
}
function getBackofficeAdminApp() {
    if (cachedApp) return cachedApp;
    const existing = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["apps"].find((app)=>app.name === BACKOFFICE_APP_NAME);
    if (existing) {
        cachedApp = existing;
        return cachedApp;
    }
    if (useEmulators) {
        if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
            process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
        }
        if (!process.env.FIRESTORE_EMULATOR_HOST) {
            process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
        }
        __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["initializeApp"]({
            projectId: getProjectId()
        }, BACKOFFICE_APP_NAME);
        cachedApp = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["app"](BACKOFFICE_APP_NAME);
        return cachedApp;
    }
    const projectId = process.env.BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.BACKOFFICE_FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKeyRaw = process.env.BACKOFFICE_FIREBASE_ADMIN_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKeyRaw) {
        if (!isNextBuildPhase) {
            throw new Error("Backoffice Firebase Admin is not configured. Set BACKOFFICE_FIREBASE_ADMIN_PROJECT_ID, BACKOFFICE_FIREBASE_ADMIN_CLIENT_EMAIL, and BACKOFFICE_FIREBASE_ADMIN_PRIVATE_KEY.");
        }
        __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["initializeApp"]({
            projectId: getProjectId()
        }, BACKOFFICE_APP_NAME);
        cachedApp = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["app"](BACKOFFICE_APP_NAME);
        return cachedApp;
    }
    const privateKey = normalizePrivateKey(privateKeyRaw);
    const invalidKey = !privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY");
    if (invalidKey) {
        if (!isNextBuildPhase) {
            throw new Error("Backoffice Firebase Admin private key is invalid. Ensure BACKOFFICE_FIREBASE_ADMIN_PRIVATE_KEY is a single line with \\n escapes.");
        }
        __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["initializeApp"]({
            projectId: getProjectId()
        }, BACKOFFICE_APP_NAME);
        cachedApp = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["app"](BACKOFFICE_APP_NAME);
        return cachedApp;
    }
    try {
        __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["initializeApp"]({
            credential: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["credential"].cert({
                projectId,
                clientEmail,
                privateKey
            }),
            databaseURL: `https://${projectId}.firebaseio.com`
        }, BACKOFFICE_APP_NAME);
        cachedApp = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["app"](BACKOFFICE_APP_NAME);
        return cachedApp;
    } catch (error) {
        if ("TURBOPACK compile-time truthy", 1) {
            console.warn(`[Firebase][backoffice] Admin init failed: ${error?.message || error}`);
        }
        if (!isNextBuildPhase) {
            throw error;
        }
        __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["initializeApp"]({
            projectId: getProjectId()
        }, BACKOFFICE_APP_NAME);
        cachedApp = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin__$5b$external$5d$__$28$firebase$2d$admin$2c$__cjs$29$__["app"](BACKOFFICE_APP_NAME);
        return cachedApp;
    }
}
const backofficeAdminAuth = new Proxy({}, {
    get (_target, prop) {
        const auth = getBackofficeAdminApp().auth();
        const value = auth[prop];
        return typeof value === "function" ? value.bind(auth) : value;
    }
});
const backofficeAdminDb = new Proxy({}, {
    get (_target, prop) {
        const db = getBackofficeAdminApp().firestore();
        if (useEmulators && !emulatorConfigured) {
            try {
                const host = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
                db.settings({
                    host,
                    ssl: false
                });
            } catch  {
            // ignore if settings already applied
            }
            emulatorConfigured = true;
        }
        const value = db[prop];
        return typeof value === "function" ? value.bind(db) : value;
    }
});
if ("TURBOPACK compile-time truthy", 1) {
    const projectId = getProjectId() || "unknown";
    console.log(`[Firebase][backoffice] projectId=${projectId} emulator=${useEmulators ? "ON" : "OFF"}`);
}
}),
"[project]/lib/backoffice/server-auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "requirePlatformAdmin",
    ()=>requirePlatformAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebaseBackofficeAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/firebaseBackofficeAdmin.ts [app-route] (ecmascript)");
;
const isDev = ("TURBOPACK compile-time value", "development") === "development";
function parseBearerToken(headerValue) {
    if (!headerValue) return null;
    const [scheme, token] = headerValue.split(" ");
    if (scheme?.toLowerCase() !== "bearer") return null;
    return token || null;
}
function getAdminAllowlist() {
    const raw = process.env.BACKOFFICE_PLATFORM_ADMIN_EMAILS || "";
    const allowlist = new Set(raw.split(",").map((s)=>s.trim().toLowerCase()).filter(Boolean));
    return {
        allowlist,
        raw
    };
}
async function requirePlatformAdmin(request) {
    const token = parseBearerToken(request.headers.get("authorization"));
    if (!token) {
        throw new Response(JSON.stringify({
            error: "Missing Authorization header"
        }), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    let decoded;
    try {
        decoded = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebaseBackofficeAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backofficeAdminAuth"].verifyIdToken(token);
    } catch  {
        throw new Response(JSON.stringify({
            error: "Invalid token"
        }), {
            status: 401,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    const userRef = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebaseBackofficeAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backofficeAdminDb"].collection("users").doc(decoded.uid);
    let snap = null;
    const { allowlist, raw } = getAdminAllowlist();
    const emailLower = (decoded.email || "").toLowerCase();
    if ("TURBOPACK compile-time truthy", 1) {
        const projectId = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebaseBackofficeAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backofficeAdminAuth"].app?.options?.projectId || "unknown";
        console.log(`[BackofficeAuth] user.email=${decoded.email || ""} uid=${decoded.uid} projectId=${projectId} allowlist=${raw || ""}`);
    }
    if (!raw || allowlist.size === 0) {
        throw new Response(JSON.stringify({
            error: "BACKOFFICE_PLATFORM_ADMIN_EMAILS is not set. Add it to .env.local (e.g. BACKOFFICE_PLATFORM_ADMIN_EMAILS=admin@example.com,other@example.com)."
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    const isAllowlisted = !!emailLower && allowlist.has(emailLower);
    try {
        snap = await userRef.get();
    } catch (error) {
        if ("TURBOPACK compile-time truthy", 1) {
            console.warn(`[BackofficeAuth] Failed to read user doc: ${error?.message || error}`);
        }
        if (isAllowlisted) {
            // Allow allowlisted user even if Firestore is unavailable.
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebaseBackofficeAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backofficeAdminAuth"].setCustomUserClaims(decoded.uid, {
                    platform_admin: true
                });
            } catch (claimError) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.warn(`[BackofficeAuth] Failed to set custom claims: ${claimError?.message || claimError}`);
                }
            }
            return {
                uid: decoded.uid,
                email: decoded.email
            };
        }
        throw new Response(JSON.stringify({
            error: "Backoffice Firestore is unavailable. Enable Firestore in the backoffice project or add the user to BACKOFFICE_PLATFORM_ADMIN_EMAILS."
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    if (isDev && snap) {
        console.log(`[BackofficeAuth] roleDoc.exists=${snap.exists} roleDoc.data=${snap.exists ? JSON.stringify(snap.data() || {}) : "null"}`);
    }
    if (isAllowlisted) {
        // Allow allowlisted users even if role doc is missing or outdated.
        try {
            await userRef.set({
                role: "platform_admin",
                lastLoginAt: new Date()
            }, {
                merge: true
            });
        } catch (error) {
            if ("TURBOPACK compile-time truthy", 1) {
                console.warn(`[BackofficeAuth] Failed to upsert role doc: ${error?.message || error}`);
            }
        }
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebaseBackofficeAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backofficeAdminAuth"].setCustomUserClaims(decoded.uid, {
                platform_admin: true
            });
        } catch (error) {
            if ("TURBOPACK compile-time truthy", 1) {
                console.warn(`[BackofficeAuth] Failed to set custom claims: ${error?.message || error}`);
            }
        }
        return {
            uid: decoded.uid,
            email: decoded.email
        };
    }
    if (!snap.exists) {
        // Bootstrap: if the email is allowlisted, create platform_admin user doc.
        throw new Response(JSON.stringify({
            error: "Forbidden"
        }), {
            status: 403,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    const data = snap.data();
    if (data?.role !== "platform_admin") {
        throw new Response(JSON.stringify({
            error: "Forbidden"
        }), {
            status: 403,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    await userRef.set({
        lastLoginAt: new Date()
    }, {
        merge: true
    });
    return {
        uid: decoded.uid,
        email: decoded.email
    };
}
}),
"[project]/app/api/backoffice/bookings/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@opentelemetry+api@1.9.0_react-dom@19.2.0_react@19.2.0__react@19.2.0/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/firebase/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backoffice$2f$server$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/backoffice/server-auth.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
async function GET(request) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$backoffice$2f$server$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requirePlatformAdmin"])(request);
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        let items = [];
        try {
            const snap = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminDb"].collectionGroup("bookings").orderBy("createdAt", "desc").limit(limit).get();
            items = snap.docs.map((d)=>({
                    id: d.id,
                    path: d.ref.path,
                    ...d.data()
                }));
        } catch  {
            try {
                const snap = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$firebase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["adminDb"].collectionGroup("bookings").orderBy("startAt", "desc").limit(limit).get();
                items = snap.docs.map((d)=>({
                        id: d.id,
                        path: d.ref.path,
                        ...d.data()
                    }));
            } catch  {
                items = [];
            }
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            items
        });
    } catch (e) {
        if (e instanceof Response) return e;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$0_react$40$19$2e$2$2e$0_$5f$react$40$19$2e$2$2e$0$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: e?.message || "Failed"
        }, {
            status: 500
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__cdf3cdaa._.js.map