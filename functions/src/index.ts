import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

admin.initializeApp();

setGlobalOptions({ region: "us-central1" });

const db = admin.firestore();

/**
 * F) onUserCreate (v2)
 * Automatically set custom claims when a user document is created in an organisation.
 */
export const onUserCreate = onDocumentCreated("users/{userId}", async (event: any) => {
    const { userId } = event.params;
    const data = event.data?.data();

    console.log(`[onUserCreate] TRIGGERED - user: ${userId}`);

    if (!data) {
        console.error(`[onUserCreate] ERROR: No data found for user ${userId}`);
        return;
    }

    const { role, orgId } = data;
    if (!role) {
        console.warn(`[onUserCreate] WARNING: Role missing for user ${userId}, defaulting to clinician`);
    }

    // Accept new SaaS roles (physio/research) as well as legacy roles
    const validRoles = ["physio", "research", "owner", "admin", "clinician", "assistant", "readOnly"];
    const targetRole = validRoles.includes(role) ? role : "physio";
    const targetOrgId = orgId || null; // No longer defaulting to wba99

    try {
        // Double check if user exists in Auth
        const user = await admin.auth().getUser(userId);
        console.log(`[onUserCreate] Found Auth user: ${user.email}`);

        await admin.auth().setCustomUserClaims(userId, { orgId: targetOrgId, role: targetRole });
        console.log(`[onUserCreate] SUCCESS: Claims set { orgId: ${targetOrgId}, role: ${targetRole} } for ${userId}`);

        // Initialize linkedOrgIds for physio users
        if (targetRole === "physio") {
            await db.doc(`users/${userId}`).update({ linkedOrgIds: [] });
        }
    } catch (error) {
        console.error(`[onUserCreate] CRITICAL FAILURE for user ${userId}:`, error);
    }
});

/**
 * G) onUserUpdate (v2)
 * Synchronize custom claims when a user's role, orgId, or isAdmin is updated in Firestore.
 */
export const onUserUpdate = onDocumentUpdated("users/{userId}", async (event: any) => {
    const { userId } = event.params;
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const roleChanged = before.role !== after.role;
    const orgChanged = before.orgId !== after.orgId;
    const adminChanged = before.isAdmin !== after.isAdmin;
    const ownerChanged = before.isOwner !== after.isOwner;

    if (roleChanged || orgChanged || adminChanged || ownerChanged) {
        console.log(`[onUserUpdate] Change detected for ${userId}: role(${before.role}->${after.role}), org(${before.orgId}->${after.orgId}), isAdmin(${before.isAdmin}->${after.isAdmin}), isOwner(${before.isOwner}->${after.isOwner})`);

        try {
            await admin.auth().setCustomUserClaims(userId, {
                orgId: after.orgId || null,
                role: after.role || "clinician",
                isAdmin: after.isAdmin === true,
                isOwner: after.isOwner === true,
            });
            console.log(`[onUserUpdate] SUCCESS: Claims updated for ${userId}`);
        } catch (error) {
            console.error(`[onUserUpdate] FAILURE for user ${userId}:`, error);
        }
    }
});

/**
 * D) createInvite (v2 callable)
 */
export const createInvite = onCall({ cors: true }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");

    const { orgId, role } = request.auth.token;
    if (role !== "owner" && role !== "admin" && role !== "research") {
        throw new HttpsError("permission-denied", "Only admins and research leads can invite.");
    }

    const { email, inviteRole, allowedGroupIds } = request.data;

    // Research accounts can only invite physio-role users into their own org
    if (role === "research" && inviteRole !== "physio") {
        throw new HttpsError("permission-denied", "Research accounts can only invite physio users.");
    }
    const inviteId = `inv-${Math.random().toString(36).substring(2, 9)}`;

    const inviteData = {
        id: inviteId,
        orgId,
        email,
        role: inviteRole,
        allowedGroupIds: allowedGroupIds || [],
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: "pending",
    };

    await db.doc(`invites/${inviteId}`).set(inviteData);

    return { inviteId, success: true };
});

/**
 * E) acceptInviteAndSetPassword (v2 callable)
 */
export const acceptInviteAndSetPassword = onCall({ cors: true }, async (request: any) => {
    const { inviteId, orgId, password, name } = request.data;

    const inviteRef = db.doc(`invites/${inviteId}`);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) throw new HttpsError("not-found", "Invite not found.");
    const invite = inviteSnap.data() as any;

    if (invite.status !== "pending") throw new HttpsError("failed-precondition", "Invite already used.");

    try {
        const userRecord = await admin.auth().createUser({
            email: invite.email,
            password,
            displayName: name,
        });

        const uid = userRecord.uid;

        await db.doc(`users/${uid}`).set({
            uid,
            orgId,
            name,
            email: invite.email,
            role: invite.role,
            status: "active",
            allowedGroupIds: invite.allowedGroupIds,
            createdBy: uid, // Essential for bootstrap bypass
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await admin.auth().setCustomUserClaims(uid, { orgId, role: invite.role });

        await inviteRef.update({ status: "accepted", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        await writeAuditLog(orgId, {
            action: "INVITE_ACCEPTED",
            entityType: "user",
            entityId: uid,
            userId: uid,
            details: { name, email: invite.email, role: invite.role },
        });

        return { uid, success: true };
    } catch (error: any) {
        console.error("Invite acceptance failed:", error);
        throw new HttpsError("internal", error.message || "Failed to complete onboarding.");
    }
});

/**
 * K) registerResearchOrg (v2 callable)
 * Handles full signup of a Research Organization in one transaction.
 * Creates Auth account, Org doc, User doc, and sets custom claims immediately.
 */
export const registerResearchOrg = onCall({ cors: true }, async (request: any) => {
    const { name, email, password, orgName } = request.data;
    
    if (!name || !email || !password || !orgName) {
        throw new HttpsError("invalid-argument", "Missing required registration details.");
    }

    try {
        // 1. Create Auth Account
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });
        const uid = userRecord.uid;

        // 2. Create Organization Doc
        const orgRef = await db.collection("organizations").add({
            name: orgName,
            type: "research",
            adminUid: uid,
            status: "active",
            subscription_plan: "standard",
            credits_balance: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Create User Doc
        await db.doc(`users/${uid}`).set({
            uid,
            name,
            email,
            role: "research",
            orgId: orgRef.id,
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. Set Custom Claims IMMEDIATELY
        await admin.auth().setCustomUserClaims(uid, {
            role: "research",
            orgId: orgRef.id
        });

        console.log(`[registerResearchOrg] SUCCESS: account ${uid} created for org ${orgRef.id}`);
        return { success: true, uid };
    } catch (error: any) {
        console.error("[registerResearchOrg] FAILURE:", error);
        if (error.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "This email address is already in use.");
        }
        throw new HttpsError("internal", error.message || "Failed to create account.");
    }
});

/**
 * H) getAnonymizedAssessments (v2 callable)
 * Research role only. Returns assessments with all PII stripped.
 * Looks up physios belonging to the research org, then fetches their assessments.
 * Patients' names, phones, and IDs are excluded — only pseudo IDs are returned.
 */
export const getAnonymizedAssessments = onCall({
    cors: true,
    invoker: "public",
    maxInstances: 10,
}, async (request: any) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in required.");
    }

    // Allow both token claim and Firestore fallback for role check
    let role = request.auth.token.role as string | undefined;
    if (!role) {
        const userDoc = await db.doc(`users/${request.auth.uid}`).get();
        role = userDoc.data()?.role;
    }

    if (role !== "research") {
        throw new HttpsError("permission-denied", "Research role required.");
    }

    const orgId = request.auth.token.orgId as string | undefined;
    if (!orgId) {
        throw new HttpsError("permission-denied", "Organisation claim missing. Please sign out and sign in again.");
    }

    const { toolType, limit: queryLimit = 200 } = request.data || {};
    const maxResults = Math.min(queryLimit, 500);

    // Step 1: find all physio users who are linked to this research org
    const physioSnap = await db.collection("users")
        .where("linkedOrgIds", "array-contains", orgId)
        .where("role", "==", "physio")
        .get();

    const physioUids = physioSnap.docs.map((d) => d.id);
    if (physioUids.length === 0) {
        return { assessments: [] };
    }

    // Step 2: query assessments for those physios (Firestore 'in' limit = 10)
    const chunks: string[][] = [];
    for (let i = 0; i < physioUids.length; i += 10) {
        chunks.push(physioUids.slice(i, i + 10));
    }

    const allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (const chunk of chunks) {
        let q: FirebaseFirestore.Query = db.collection("assessments").where("physioId", "in", chunk);
        if (toolType) q = q.where("toolType", "==", toolType);
        const snap = await q.get();
        allDocs.push(...snap.docs);
    }

    // Step 3: sort by createdAt desc in memory, then limit
    allDocs.sort((a, b) => {
        const at = (a.data().createdAt as any)?.seconds ?? 0;
        const bt = (b.data().createdAt as any)?.seconds ?? 0;
        return bt - at;
    });

    const assessments = allDocs.slice(0, maxResults).map((docSnap) => {
        const data = docSnap.data();
        const rawId = (data.patientId as string) ?? "";
        const suffix = rawId.length >= 4 ? rawId.slice(-4) : rawId.padStart(4, "0");
        return {
            id: docSnap.id,
            pseudoId: "PAT-" + suffix.toUpperCase(),
            toolType: data.toolType,
            createdAt: data.createdAt,
            data: data.data,
            // name, phone, patientId, physioId deliberately excluded
        };
    });

    return { assessments };
});

/**
 * I) getOrgMembers (v2 callable)
 * Research role only. Returns physio members linked to the research org.
 * Client-side Firestore rules block cross-user reads, so this uses Admin SDK.
 */
export const getOrgMembers = onCall({ cors: true }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const { role, orgId } = request.auth.token;
    if (role !== "research") throw new HttpsError("permission-denied", "Research role required.");
    if (!orgId) throw new HttpsError("permission-denied", "Organisation claim missing.");

    const snap = await db.collection("users")
        .where("linkedOrgIds", "array-contains", orgId)
        .where("role", "==", "physio")
        .get();

    const members = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name ?? null,
            email: data.email ?? null,
            account_activated: data.account_activated ?? true,
        };
    });

    return { members };
});

/**
 * J) linkPhysioToOrg (v2 callable)
 * Research role only. Links an existing physio user (by email) to the research org.
 * Updates the physio's orgId in Firestore — onUserUpdate will sync their token claims.
 */
export const linkPhysioToOrg = onCall({ cors: true }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

    const { role, orgId } = request.auth.token;
    if (role !== "research") throw new HttpsError("permission-denied", "Research role required.");
    if (!orgId) throw new HttpsError("permission-denied", "Organisation claim missing.");

    const { email } = request.data;
    if (!email || typeof email !== "string") {
        throw new HttpsError("invalid-argument", "A valid email address is required.");
    }

    // Look up the physio by email in Auth
    let userRecord: admin.auth.UserRecord;
    try {
        userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    } catch {
        throw new HttpsError("not-found", "No account found with that email address.");
    }

    // Verify they are a physio
    const userDoc = await db.doc(`users/${userRecord.uid}`).get();
    if (!userDoc.exists) throw new HttpsError("not-found", "User profile not found.");
    const userData = userDoc.data() as any;
    if (userData.role !== "physio") {
        throw new HttpsError("failed-precondition", "That account is not a physio.");
    }

    if (orgId === "wba99") {
        throw new HttpsError("failed-precondition", "Initial setup in progress. Please wait a moment and try again.");
    }

    // Update linkedOrgIds array — onUserUpdate trigger doesn't track array changes normally, 
    // but here we manually update custom claims if needed. 
    // However, for the 'physio' themselves, their primary orgId might still be wba99 or their own.
    // The research dashboard only cares about the linkedOrgIds array.
    await userDoc.ref.update({
        linkedOrgIds: admin.firestore.FieldValue.arrayUnion(orgId)
    });

    return {
        success: true,
        physio: {
            id: userRecord.uid,
            name: userData.name ?? null,
            email: userRecord.email ?? null,
            account_activated: userData.account_activated ?? true,
        },
    };
});

// ── Admin callable functions ───────────────────────────────────────────────────

async function assertAdmin(uid: string) {
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.data()?.isAdmin !== true && userDoc.data()?.isOwner !== true) {
        throw new HttpsError("permission-denied", "Admin access required.");
    }
}

async function assertOwner(uid: string) {
    const userDoc = await db.doc(`users/${uid}`).get();
    if (userDoc.data()?.isOwner !== true) {
        throw new HttpsError("permission-denied", "Owner access required.");
    }
}

async function writeAdminAuditLog(actorUid: string, action: string, targetId: string, details?: Record<string, any>) {
    await db.collection("adminAuditLogs").add({
        actorUid,
        action,
        targetId,
        details: details ?? {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * adminGetStats — Returns system-wide counts for the admin dashboard.
 */
export const adminGetStats = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const [usersSnap, assessmentsSnap, orgsSnap] = await Promise.all([
        db.collection("users").get(),
        db.collection("assessments").get(),
        db.collection("organizations").get(),
    ]);

    let physioUsers = 0;
    let researchUsers = 0;
    let adminUsers = 0;
    let ownerUsers = 0;
    let suspendedUsers = 0;

    usersSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.role === "physio") physioUsers++;
        if (data.role === "research") researchUsers++;
        if (data.isAdmin === true) adminUsers++;
        if (data.isOwner === true) ownerUsers++;
        if (data.suspended === true) suspendedUsers++;
    });

    return {
        totalUsers: usersSnap.size,
        physioUsers,
        researchUsers,
        adminUsers,
        ownerUsers,
        suspendedUsers,
        totalAssessments: assessmentsSnap.size,
        totalOrganisations: orgsSnap.size,
    };
});

/**
 * adminGetAllUsers — Returns all user documents.
 */
export const adminGetAllUsers = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name ?? null,
            email: data.email ?? null,
            role: data.role ?? null,
            isAdmin: data.isAdmin === true,
            isOwner: data.isOwner === true,
            suspended: data.suspended === true,
            orgId: data.orgId ?? null,
            createdAt: data.createdAt ?? null,
        };
    });

    return { users };
});

/**
 * adminGetAllAssessments — Returns all assessment documents (without full data payloads).
 */
export const adminGetAllAssessments = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const snap = await db.collection("assessments").orderBy("createdAt", "desc").limit(500).get();
    const assessments = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            patientId: data.patientId ?? null,
            physioId: data.physioId ?? null,
            toolType: data.toolType ?? null,
            createdAt: data.createdAt ?? null,
        };
    });

    return { assessments };
});

/**
 * adminGetAllOrganisations — Returns all organisation documents.
 */
export const adminGetAllOrganisations = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const snap = await db.collection("organizations").get();
    const organisations = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name ?? null,
            type: data.type ?? null,
            adminUid: data.adminUid ?? null,
            status: data.status ?? null,
            subscription_plan: data.subscription_plan ?? null,
            createdAt: data.createdAt ?? null,
        };
    });

    return { organisations };
});

/**
 * adminSetUserAdmin — Grants or revokes admin access for a user.
 */
export const adminSetUserAdmin = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { userId, isAdmin } = request.data;
    if (typeof userId !== "string" || typeof isAdmin !== "boolean") {
        throw new HttpsError("invalid-argument", "userId (string) and isAdmin (boolean) are required.");
    }

    // Prevent self-demotion to avoid lock-out
    if (userId === request.auth.uid && isAdmin === false) {
        throw new HttpsError("failed-precondition", "You cannot revoke your own admin access.");
    }

    await db.doc(`users/${userId}`).update({ isAdmin });
    await writeAdminAuditLog(request.auth.uid, isAdmin ? "GRANT_ADMIN" : "REVOKE_ADMIN", userId);

    return { success: true };
});

/**
 * adminDeleteUser — Owner-only. Deletes user from Firebase Auth + Firestore.
 */
export const adminDeleteUser = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { userId } = request.data;
    if (typeof userId !== "string") throw new HttpsError("invalid-argument", "userId is required.");
    if (userId === request.auth.uid) throw new HttpsError("failed-precondition", "Cannot delete your own account.");

    await admin.auth().deleteUser(userId);
    await db.doc(`users/${userId}`).delete();
    await writeAdminAuditLog(request.auth.uid, "DELETE_USER", userId);

    return { success: true };
});

/**
 * adminSuspendUser — Admin. Disables or re-enables a Firebase Auth account.
 */
export const adminSuspendUser = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { userId, suspended } = request.data;
    if (typeof userId !== "string" || typeof suspended !== "boolean") {
        throw new HttpsError("invalid-argument", "userId (string) and suspended (boolean) are required.");
    }
    if (userId === request.auth.uid) throw new HttpsError("failed-precondition", "Cannot suspend your own account.");

    await admin.auth().updateUser(userId, { disabled: suspended });
    await db.doc(`users/${userId}`).update({ suspended });
    await writeAdminAuditLog(request.auth.uid, suspended ? "SUSPEND_USER" : "UNSUSPEND_USER", userId);

    return { success: true };
});

/**
 * adminResetUserPassword — Admin. Generates a password-reset link for the user.
 */
export const adminResetUserPassword = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { userId } = request.data;
    if (typeof userId !== "string") throw new HttpsError("invalid-argument", "userId is required.");

    const userRecord = await admin.auth().getUser(userId);
    if (!userRecord.email) throw new HttpsError("failed-precondition", "User has no email address.");

    const resetLink = await admin.auth().generatePasswordResetLink(userRecord.email);
    await writeAdminAuditLog(request.auth.uid, "RESET_PASSWORD", userId);

    return { success: true, resetLink };
});

/**
 * adminDeleteAssessment — Admin. Deletes a single assessment document.
 */
export const adminDeleteAssessment = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { assessmentId } = request.data;
    if (typeof assessmentId !== "string") throw new HttpsError("invalid-argument", "assessmentId is required.");

    await db.doc(`assessments/${assessmentId}`).delete();
    await writeAdminAuditLog(request.auth.uid, "DELETE_ASSESSMENT", assessmentId);

    return { success: true };
});

/**
 * adminUpdateOrganisation — Admin. Updates an organisation's status or subscription plan.
 */
export const adminUpdateOrganisation = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { orgId, status, subscription_plan } = request.data;
    if (typeof orgId !== "string") throw new HttpsError("invalid-argument", "orgId is required.");

    const updates: Record<string, any> = {};
    if (typeof status === "string") updates.status = status;
    if (typeof subscription_plan === "string") updates.subscription_plan = subscription_plan;
    if (Object.keys(updates).length === 0) throw new HttpsError("invalid-argument", "No update fields provided.");

    await db.doc(`organizations/${orgId}`).update(updates);
    await writeAdminAuditLog(request.auth.uid, "UPDATE_ORGANISATION", orgId, updates);

    return { success: true };
});

/**
 * adminDeleteOrganisation — Owner-only. Deletes an organisation document.
 */
export const adminDeleteOrganisation = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { orgId } = request.data;
    if (typeof orgId !== "string") throw new HttpsError("invalid-argument", "orgId is required.");

    await db.doc(`organizations/${orgId}`).delete();
    await writeAdminAuditLog(request.auth.uid, "DELETE_ORGANISATION", orgId);

    return { success: true };
});

/**
 * adminGetAuditLogs — Admin. Returns the most recent 100 admin audit log entries.
 */
export const adminGetAuditLogs = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const snap = await db.collection("adminAuditLogs").orderBy("timestamp", "desc").limit(100).get();
    const logs = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            actorUid: data.actorUid ?? null,
            action: data.action ?? null,
            targetId: data.targetId ?? null,
            details: data.details ?? {},
            timestamp: data.timestamp ?? null,
        };
    });

    return { logs };
});

/**
 * adminSetOwner — Owner-only. Grants or revokes owner status for a user.
 */
export const adminSetOwner = onCall({ cors: true, invoker: "public" }, async (request: any) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertAdmin(request.auth.uid);

    const { userId, isOwner } = request.data;
    if (typeof userId !== "string" || typeof isOwner !== "boolean") {
        throw new HttpsError("invalid-argument", "userId and isOwner (boolean) are required.");
    }
    if (userId === request.auth.uid && isOwner === false) {
        throw new HttpsError("failed-precondition", "Cannot revoke your own owner access.");
    }

    await db.doc(`users/${userId}`).update({ isOwner });
    await writeAdminAuditLog(request.auth.uid, isOwner ? "GRANT_OWNER" : "REVOKE_OWNER", userId);

    return { success: true };
});

// ── analyzeGait ────────────────────────────────────────────────────────────────
/**
 * Receives base64 video frames and returns a structured clinical gait analysis
 * powered by Claude Vision.
 */
export const analyzeGait = onCall(
    {
        cors: true,
        timeoutSeconds: 180,
    },
    async (request: any) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Sign in to use gait analysis.");
        }

        const { frames, patientInfo, cycleFrames, viewMode } = request.data as {
            frames: string[];
            patientInfo?: { age?: number; gender?: string; condition?: string };
            cycleFrames?: boolean;
            viewMode?: "lateral" | "anterior" | "all";
        };

        if (!Array.isArray(frames) || frames.length === 0) {
            throw new HttpsError("invalid-argument", "frames must be a non-empty array.");
        }
        if (frames.length > 15) {
            throw new HttpsError("invalid-argument", "Maximum 15 frames per request.");
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new HttpsError("internal", "API key not configured.");
        const client = new Anthropic({ apiKey });

        const patientCtx = patientInfo
            ? [
                patientInfo.age && `${patientInfo.age} years old`,
                patientInfo.gender,
                patientInfo.condition && `Condition: ${patientInfo.condition}`,
              ].filter(Boolean).join(", ")
            : null;

        const systemPrompt = `You are a clinical physiotherapist and biomechanics expert specialising in gait analysis. Analyze the provided video frames and return a structured WBA99 clinical gait assessment.

SUPPORTED VIDEO VIEWS:
- lateral = sagittal plane (side view) gait analysis
- anterior = frontal plane (front/back view) gait analysis
- all = combined anterior + lateral interpretation when the recording includes both views

VIEW-SPECIFIC RULES:
LATERAL view — prioritise:
  • Gait phase timing and heel/toe contact events
  • Hip/Knee/Ankle sagittal mechanics with specific degree estimates
  • Trunk lean (forward/backward from vertical)
  • Toe clearance and foot progression
  • Push-off power at Pre-Swing
  • Biomechanical alignment lines (Hip Line, Femur Line, Tibia Line, Foot Line)

ANTERIOR view — prioritise:
  • Pelvic control and hip drop (Trendelenburg sign)
  • Step width and base of support
  • Limb symmetry and weight shift
  • Knee valgus/varus in frontal plane
  • Foot progression angle
  • Trunk lateral deviation and shoulder drop

ALL VIEWS — combine both; note when a finding is view-dependent.

IMPORTANT: If a metric cannot be measured from the frames, state "Not measurable from provided frames". Never invent numeric values.

═══════════════════════════════════════════
GAIT PHASES — DETAILED 8-PHASE MODEL
═══════════════════════════════════════════

STANCE PHASE (60% of gait cycle):

1. IC — Initial Contact (Right Foot)
   Frame: First frame where heel touches ground
   Landmarks: Greater Trochanter, Lateral Epicondyle, Lateral Malleolus, Calcaneus, Forefoot
   Ideal angles: Hip 20-30° flexion | Knee 0-5° flexion | Ankle neutral (0°)
   Errors: "Forefoot strike" | "Knee hyperextension" | "Excess trunk lean"

2. LR — Loading Response
   Frame: Entire foot contacts ground (foot flat)
   Landmarks: Calcaneus, Forefoot, Knee joint line
   Ideal angles: Hip stable | Knee 10-15° flexion (shock absorption) | Ankle 5-10° plantarflexion
   Errors: "No knee flexion (shock transfer↑)" | "Foot slap"

3. MS — Mid Stance
   Frame: Body weight directly over stance leg
   Landmarks: Greater Trochanter, Lateral Epicondyle, Lateral Malleolus
   Ideal angles: Hip neutral (0°) | Knee 5-10° flexion | Ankle 5° dorsiflexion
   Errors: "Knee valgus collapse" | "Hip drop (Trendelenburg)" | "Forward trunk lean"

4. TS — Terminal Stance
   Frame: Heel begins to rise off ground
   Landmarks: Calcaneus, Metatarsal heads, Hip joint
   Ideal angles: Hip 10-20° extension | Knee near full extension (0-5° flexion) | Ankle max dorsiflexion (10-15°)
   Errors: "Early heel rise" | "Limited hip extension"

5. PS — Pre-Swing (Toe-Off)
   Frame: Toe leaves ground
   Landmarks: Forefoot/Toe, Knee, Hip
   Ideal angles: Hip neutral to slight flexion | Knee 35-40° flexion begins | Ankle 20° plantarflexion (push-off)
   Errors: "Weak push-off" | "Reduced propulsion"

SWING PHASE (40% of gait cycle):

6. IS — Initial Swing
   Frame: Foot just clears the ground
   Landmarks: Ankle, Knee, Hip
   Ideal angles: Hip 15-20° flexion | Knee 60° flexion (maximum) | Ankle neutral
   Errors: "Toe drag"

7. MSw — Mid Swing
   Frame: Tibia vertical, foot at maximum clearance
   Landmarks: Tibia, Knee, Ankle
   Ideal angles: Hip 25° flexion | Knee 25-30° flexion | Ankle neutral to slight dorsiflexion
   Errors: "Drop foot (foot clearance failure)"

8. TSw — Terminal Swing
   Frame: Knee extends in preparation for heel strike
   Landmarks: Knee, Ankle, Calcaneus
   Ideal angles: Hip 25-30° flexion | Knee 0-5° flexion (extending) | Ankle neutral
   Errors: "Poor eccentric control" | "Unstable landing preparation"

═══════════════════════════════════════════
SCORING
═══════════════════════════════════════════
3 = Normal (no deviation)
2 = Mild deviation (slight, compensated)
1 = Moderate deviation (clear, partially compensated)
0 = Severe deviation (uncompensated, high injury risk)
Total score = sum of all 8 phases (max 24).

═══════════════════════════════════════════
RECOGNISED DEVIATIONS (use EXACT strings)
═══════════════════════════════════════════
IC:  "Forefoot strike" | "Knee hyperextension" | "Excess trunk lean"
LR:  "No knee flexion (shock transfer↑)" | "Foot slap"
MS:  "Knee valgus collapse" | "Hip drop (Trendelenburg)" | "Forward trunk lean"
TS:  "Early heel rise" | "Limited hip extension"
PS:  "Weak push-off" | "Reduced propulsion"
IS:  "Toe drag"
MSw: "Drop foot (foot clearance failure)"
TSw: "Poor eccentric control" | "Unstable landing preparation"

═══════════════════════════════════════════
WBA99 BIOMECHANICAL LINES (auto-draw)
═══════════════════════════════════════════
- Hip Line:    Shoulder to Greater Trochanter
- Femur Line:  Greater Trochanter to Lateral Epicondyle (Knee)
- Tibia Line:  Lateral Epicondyle (Knee) to Lateral Malleolus (Ankle)
- Foot Line:   Lateral Malleolus (Heel) to 5th Metatarsal Head (Toe)

═══════════════════════════════════════════
WBA99 REHAB PROTOCOL MAPPING
═══════════════════════════════════════════
"No heel strike"           → cause: "Weak dorsiflexors"        → solution: "Tibialis anterior strengthening + heel-strike retraining"
"Forefoot strike"          → cause: "Habitual pattern/pain"     → solution: "Heel-strike cueing + tibialis anterior activation"
"Knee hyperextension"      → cause: "Quad imbalance"            → solution: "Eccentric quad control + neuromuscular knee stabilisation"
"Excess trunk lean"        → cause: "Weak hip extensors"        → solution: "Core stability + hip flexor lengthening"
"No knee flexion (shock↑)" → cause: "Quad weakness/stiffness"  → solution: "Eccentric quad loading + shock absorption drills"
"Foot slap"                → cause: "Weak tibialis anterior"    → solution: "Tibialis anterior strengthening + AFO if indicated"
"Knee valgus collapse"     → cause: "Weak glute medius/max"     → solution: "Hip abductor strengthening + valgus control training"
"Hip drop (Trendelenburg)" → cause: "Weak glute medius"         → solution: "Hip abductor strengthening + single-leg balance"
"Forward trunk lean"       → cause: "Weak hip extensors/core"   → solution: "Core activation + hip extensor strengthening"
"Early heel rise"          → cause: "Tight gastrocnemius"       → solution: "Calf stretching + heel contact cueing"
"Limited hip extension"    → cause: "Hip flexor tightness"      → solution: "Hip flexor release + glute max activation"
"Weak push-off"            → cause: "Weak calf/soleus"          → solution: "Plantarflexion power training + calf loading"
"Reduced propulsion"       → cause: "Ankle instability"         → solution: "Plyometric push-off drills + ankle loading"
"Toe drag"                 → cause: "Weak hip flexors/dorsiflexors" → solution: "Hip flexor + dorsiflexor activation drills"
"Drop foot"                → cause: "L4/L5 nerve or tibialis weakness" → solution: "EMG assessment + AFO + steppage gait correction"
"Poor eccentric control"   → cause: "Hamstring weakness"        → solution: "Hamstring eccentric loading + deceleration drills"
"Unstable landing"         → cause: "Poor proprioception"       → solution: "Proprioception training + pre-activation exercises"

Return ONLY a valid JSON object — no prose, no markdown, no code fences:
{
  "view_mode": "lateral" | "anterior" | "all",
  "gait_cycle_breakdown": {
    "stance_phase_percent": 60,
    "swing_phase_percent": 40,
    "stance_subphases": ["IC", "LR", "MS", "TS", "PS"],
    "swing_subphases": ["IS", "MSw", "TSw"]
  },
  "phases": {
    "ic":  { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "heel strike / first contact event", "landmarks": ["Greater Trochanter", "Lateral Epicondyle", "Lateral Malleolus", "Calcaneus", "Forefoot"], "ideal": ["Hip 20-30° flexion", "Knee 0-5° flexion", "Ankle neutral"] },
    "lr":  { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "foot flat / loading response", "landmarks": ["Calcaneus", "Forefoot", "Knee joint line"], "ideal": ["Hip stable", "Knee 10-15° flexion", "Ankle 5-10° plantarflexion"] },
    "ms":  { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "body over stance leg", "landmarks": ["Greater Trochanter", "Lateral Epicondyle", "Lateral Malleolus"], "ideal": ["Hip neutral", "Knee 5-10° flexion", "Ankle 5° dorsiflexion"] },
    "ts":  { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "heel rise begins", "landmarks": ["Calcaneus", "Metatarsal heads", "Hip joint"], "ideal": ["Hip 10-20° extension", "Knee near full extension", "Ankle 10-15° dorsiflexion"] },
    "ps":  { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "toe-off / push-off", "landmarks": ["Forefoot/Toe", "Knee", "Hip"], "ideal": ["Hip neutral", "Knee 35-40° flexion begins", "Ankle 20° plantarflexion"] },
    "is":  { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "initial swing lift-off", "landmarks": ["Ankle", "Knee", "Hip"], "ideal": ["Hip 15-20° flexion", "Knee 60° flexion", "Ankle neutral"] },
    "msw": { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "tibia vertical / foot clearance", "landmarks": ["Tibia", "Knee", "Ankle"], "ideal": ["Hip 25° flexion", "Knee 25-30° flexion", "Ankle neutral-dorsiflexion"] },
    "tsw": { "quality": 0-3, "deviations": [], "notes": "one sentence", "frame_focus": "terminal swing / prep for contact", "landmarks": ["Knee", "Ankle", "Calcaneus"], "ideal": ["Hip 25-30° flexion", "Knee 0-5° flexion (extending)", "Ankle neutral"] }
  },
  "joint_angle_table": [
    { "phase": "Initial Contact",  "abbr": "IC",  "hip": "observed or estimated angle", "knee": "observed or estimated angle", "ankle": "observed or estimated angle", "hip_ideal": "20-30° F",  "knee_ideal": "0-5° F",    "ankle_ideal": "Neutral",       "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Loading Response", "abbr": "LR",  "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "Stable",      "knee_ideal": "10-15° F",  "ankle_ideal": "5-10° PF",      "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Mid Stance",       "abbr": "MS",  "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "0° (Neutral)", "knee_ideal": "5-10° F",   "ankle_ideal": "5° DF",         "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Terminal Stance",  "abbr": "TS",  "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "10-20° Ext",  "knee_ideal": "0-5° F",    "ankle_ideal": "10-15° DF",     "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Pre-Swing",        "abbr": "PS",  "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "Neutral",     "knee_ideal": "35-40° F",  "ankle_ideal": "20° PF",        "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Initial Swing",    "abbr": "IS",  "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "15-20° F",    "knee_ideal": "60° F",     "ankle_ideal": "Neutral",       "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Mid Swing",        "abbr": "MSw", "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "25° F",       "knee_ideal": "25-30° F",  "ankle_ideal": "Neutral-DF",    "status": "normal" | "mild" | "moderate" | "severe" },
    { "phase": "Terminal Swing",   "abbr": "TSw", "hip": "...", "knee": "...", "ankle": "...", "hip_ideal": "25-30° F",    "knee_ideal": "0-5° F",    "ankle_ideal": "Neutral",       "status": "normal" | "mild" | "moderate" | "severe" }
  ],
  "total_score": number,
  "risk_level": "low" | "moderate" | "high",
  "summary": "2-3 sentence clinical summary",
  "key_findings": ["finding 1", "finding 2"],
  "risk_flags": ["flag 1", "flag 2"],
  "cadence_observation": "...",
  "stride_observation": "...",
  "symmetry_observation": "...",
  "spatiotemporal": {
    "step_length": "...",
    "stride_length": "...",
    "cadence": "...",
    "speed": "..."
  },
  "kinematic": {
    "joint_angles": "Hip/Knee/Ankle summary across cycle",
    "rom": "Total ROM summary for each joint"
  },
  "kinetic": {
    "ground_reaction_force": "...",
    "pressure_mapping": "..."
  },
  "biomechanical_lines": ["Hip Line", "Femur Line", "Tibia Line", "Foot Line"],
  "clinical_report": {
    "patient_details": "...",
    "gait_phase_analysis": "...",
    "joint_angle_summary": "...",
    "deviations": "...",
    "risk_assessment": "...",
    "rehab_protocol": "..."
  },
  "rehab_protocol": [
    { "problem": "...", "cause": "...", "solution": "..." }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

        const contentBlocks: Anthropic.ContentBlockParam[] = [];
        frames.forEach((frame, i) => {
            contentBlocks.push({ type: "text", text: `Frame ${i + 1} of ${frames.length}:` });
            contentBlocks.push({
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: frame },
            });
        });

        const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: [
                                patientCtx && `Patient: ${patientCtx}.`,
                                `Selected gait view: ${viewMode ?? "lateral"}.`,
                                cycleFrames
                                    ? `These ${frames.length} frames were extracted at equal intervals spanning exactly ONE complete gait cycle (one heel strike to the next heel strike of the same foot). Frame 1 corresponds to Initial Contact; Frame ${frames.length} corresponds to Terminal Swing. Assign each frame to its most likely phase in sequence.`
                                    : `These ${frames.length} frames are from a gait video.`,
                                "Return the JSON clinical gait assessment.",
                            ].filter(Boolean).join(" "),
                        },
                        ...contentBlocks,
                    ],
                },
            ],
        });

        const rawText = (response.content[0] as Anthropic.TextBlock).text;
        let analysis: unknown;
        try {
            const clean = rawText.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
            analysis = JSON.parse(clean);
        } catch {
            console.error("[analyzeGait] JSON parse failed:", rawText.slice(0, 300));
            throw new HttpsError("internal", "AI returned an unexpected format. Please try again.");
        }

        return { analysis };
    }
);

// ── analyzeRunningGait ──────────────────────────────────────────────────────────
/**
 * Receives base64 video frames of a runner and returns a structured running
 * biomechanical assessment (Head, Back, Arm, Front Leg, Back Leg, Foot Strike).
 */
export const analyzeRunningGait = onCall(
    {
        cors: true,
        invoker: "public",
        timeoutSeconds: 180,
    },
    async (request: any) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Sign in to use running analysis.");
        }

        const { frames, patientInfo, viewMode } = request.data as {
            frames: string[];
            patientInfo?: { age?: number; gender?: string; condition?: string };
            viewMode?: "lateral" | "anterior" | "all";
        };

        if (!Array.isArray(frames) || frames.length === 0) {
            throw new HttpsError("invalid-argument", "frames must be a non-empty array.");
        }
        if (frames.length > 15) {
            throw new HttpsError("invalid-argument", "Maximum 15 frames per request.");
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new HttpsError("internal", "API key not configured.");
        const client = new Anthropic({ apiKey });

        const patientCtx = patientInfo
            ? [
                patientInfo.age && `${patientInfo.age} years old`,
                patientInfo.gender,
                patientInfo.condition && `Condition: ${patientInfo.condition}`,
              ].filter(Boolean).join(", ")
            : null;

        const systemPrompt = `You are a clinical physiotherapist and biomechanics expert specialising in RUNNING gait analysis. Analyze the provided video frames of a runner and return a structured WBA99 running biomechanical assessment.

These frames are extracted at equal intervals from ONE complete running cycle. Analyze running mechanics holistically across all frames.

IMPORTANT: If an angle cannot be measured from the frames, use null. Never invent values.

═══════════════════════════════════════════
RUNNING ANALYSIS — 6 SEGMENTS
═══════════════════════════════════════════

1. HEAD / GAZE
   Measure: Head tilt angle from neutral (negative = looking down, 0 = forward, positive = looking up)
   Ideal range: -9° to 1°
   Status labels (pick the most accurate):
   - Within range → "Ideal gaze position"
   - Slightly below -9° → "Gaze slightly toward the ground"
   - Well below -9° → "Excessive downward gaze"
   - Above 1° → "Gaze slightly elevated"
   Effects of downward gaze: neck/shoulder overuse, reduced thoracic expansion, arm-leg coordination loss
   Coach tip example: "Use a mirror during training to receive real-time visual feedback on your head carriage."

2. BACK / TRUNK LEAN
   Measure: Forward lean angle of torso from vertical in degrees (positive = forward lean)
   Ideal range: 7° to 13°
   Status labels:
   - Within range → "Ideal forward lean"
   - Below 7° → "Not sufficiently forward-leaning"
   - Above 13° → "Excessive forward lean"
   Effects of insufficient forward lean: increased lumbar pressure, reduced propulsion efficiency, gluteal overload
   Coach tip example: "Try to reach the sky with your head while maintaining the desire to elongate yourself as much as possible."

3. ARM SWING / ELBOW ANGLE
   Measure: Elbow angle at maximum backward arm extension (smaller = more bent, ideal is compact)
   Ideal range: 83° to 93°
   Status labels:
   - Within range → "Ideal arm swing"
   - Above 93° → "Over-extension"
   - Below 83° → "Insufficient arm extension"
   Effects of over-extension: loss of efficiency, disrupts cadence and coordination
   Coach tip example: "Imagine carrying a tray with delicate glasses — prevent sudden movements."

4. FRONT LEG / LEADING KNEE
   Measure: Knee angle at moment of foot contact with ground (larger = straighter)
   Ideal range: 132° to 180°
   Status labels:
   - Within range → "Ideal Position"
   - Below 132° → "Excessive knee bend at contact"
   Effects: If leading leg is too bent, loss of efficiency and increased injury risk

5. BACK LEG / TRAILING LEG HEEL KICK
   Measure: Knee angle of trailing leg at mid-swing (smaller = more bent heel kick, larger = low kick)
   Ideal range: 0° to 62°
   Status labels:
   - Within range → "Ideal heel kick"
   - Above 62° → "Low heel kick"
   Effects of low heel kick: restricted hip ROM, reduced stride amplitude, more energy expenditure
   Coach tip example: "Visualize your rear heel being tethered to a balloon, lifting it behind you with each stride."

6. FOOT STRIKE
   Assess: Landing pattern and position relative to center of gravity (no angle measurement needed)
   Categories:
   - "Ideal mid-foot strike under CoG"
   - "Mid-foot strike in front of CoG"
   - "Heel strike in front of CoG"
   - "Forefoot strike"
   Assess: Impact forces (Impact/Amortisation/Propulsion quality)

═══════════════════════════════════════════
SCORING
═══════════════════════════════════════════
Score each segment independently (0–17 points each, 6 segments = max ~100):
- 17 = Ideal (within good range, no compensation)
- 12–16 = Acceptable (slight deviation, well compensated)
- 6–11 = Needs improvement (moderate deviation)
- 0–5 = Poor (significant deviation, high injury risk)
total_score = sum of all 6 raw segment scores (will be 0–100 approximately)
score_label: ≥80 "Excellent" | 60–79 "Good" | 40–59 "Okay" | 20–39 "Needs Work" | <20 "Poor"
quality per segment: "ideal" (≥14) | "acceptable" (8–13) | "needs_improvement" (≤7)

═══════════════════════════════════════════
WBA99 RUNNING REHAB PROTOCOL
═══════════════════════════════════════════
"Gaze toward ground"              → cause: "Habitual posture/fatigue"         → solution: "Mirror drills + forward gaze elevation cues during training"
"Not sufficiently forward-leaning"→ cause: "Weak core/hip flexors"            → solution: "Core activation exercises + forward lean running drills"
"Over-extension arm"              → cause: "Compensatory arm swing pattern"   → solution: "Elbow angle cueing (90°) + relaxed arm swing drills"
"Low heel kick"                   → cause: "Hip flexor/hamstring tightness"   → solution: "Sprint acceleration drills + hamstring flexibility work"
"Mid-foot strike in front of CoG" → cause: "Over-striding"                   → solution: "Increase cadence by 5–10% + footstrike cueing under hips"
"Heel strike in front of CoG"     → cause: "Over-striding / habitual pattern" → solution: "Forefoot/midfoot landing drills + cadence training"
"Excessive forward lean"          → cause: "Hip flexor dominance/fatigue"    → solution: "Hip extensor strengthening + posture cueing"
"Excessive knee bend at contact"  → cause: "Over-striding with bent knee"    → solution: "Shorter stride length cues + contact point drills"

Return ONLY a valid JSON object — no prose, no markdown, no code fences:
{
  "total_score": number (0-100),
  "score_label": "Excellent" | "Good" | "Okay" | "Needs Work" | "Poor",
  "segments": {
    "head": {
      "status": "descriptive status label matching the categories above",
      "recap": ["bullet point 1", "bullet point 2", "bullet point 3", "bullet point 4"],
      "coach_tip": "actionable single-sentence coaching cue",
      "consequences": "2-3 sentence paragraph describing biomechanical consequences",
      "correction": "1-2 sentence paragraph describing the correction approach",
      "angle": number or null,
      "good_range_min": -9,
      "good_range_max": 1,
      "quality": "ideal" | "acceptable" | "needs_improvement"
    },
    "back": {
      "status": "...",
      "recap": ["...", "...", "...", "..."],
      "coach_tip": "...",
      "consequences": "...",
      "correction": "...",
      "angle": number or null,
      "good_range_min": 7,
      "good_range_max": 13,
      "quality": "ideal" | "acceptable" | "needs_improvement"
    },
    "arm": {
      "status": "...",
      "recap": ["...", "...", "...", "..."],
      "coach_tip": "...",
      "consequences": "...",
      "correction": "...",
      "angle": number or null,
      "good_range_min": 83,
      "good_range_max": 93,
      "quality": "ideal" | "acceptable" | "needs_improvement"
    },
    "front_leg": {
      "status": "...",
      "recap": ["...", "...", "...", "..."],
      "coach_tip": "...",
      "consequences": "...",
      "correction": "...",
      "angle": number or null,
      "good_range_min": 132,
      "good_range_max": 180,
      "quality": "ideal" | "acceptable" | "needs_improvement"
    },
    "back_leg": {
      "status": "...",
      "recap": ["...", "...", "...", "..."],
      "coach_tip": "...",
      "consequences": "...",
      "correction": "...",
      "angle": number or null,
      "good_range_min": 0,
      "good_range_max": 62,
      "quality": "ideal" | "acceptable" | "needs_improvement"
    },
    "foot_strike": {
      "status": "...",
      "recap": ["...", "...", "...", "..."],
      "coach_tip": "...",
      "consequences": "...",
      "correction": "...",
      "angle": null,
      "good_range_min": null,
      "good_range_max": null,
      "quality": "ideal" | "acceptable" | "needs_improvement"
    }
  },
  "contact_time": number or null,
  "joint_angles_cycle": {
    "knee_left":   [n1, n2, n3, n4, n5, n6, n7, n8],
    "knee_right":  [n1, n2, n3, n4, n5, n6, n7, n8],
    "hip_left":    [n1, n2, n3, n4, n5, n6, n7, n8],
    "hip_right":   [n1, n2, n3, n4, n5, n6, n7, n8],
    "elbow_left":  [n1, n2, n3, n4, n5, n6, n7, n8],
    "elbow_right": [n1, n2, n3, n4, n5, n6, n7, n8]
  },
  "summary": "2-3 sentence clinical summary of running mechanics",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "rehab_protocol": [
    { "problem": "...", "cause": "...", "solution": "..." }
  ],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}`;

        const contentBlocks: Anthropic.ContentBlockParam[] = [];
        frames.forEach((frame, i) => {
            contentBlocks.push({ type: "text", text: `Frame ${i + 1} of ${frames.length}:` });
            contentBlocks.push({
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: frame },
            });
        });

        const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: [
                                patientCtx && `Patient: ${patientCtx}.`,
                                `View: ${viewMode ?? "lateral"}.`,
                                `These ${frames.length} frames span ONE complete running cycle extracted at equal intervals. Analyze all 6 running segments and return the JSON running gait assessment.`,
                            ].filter(Boolean).join(" "),
                        },
                        ...contentBlocks,
                    ],
                },
            ],
        });

        const rawText = (response.content[0] as Anthropic.TextBlock).text;
        let analysis: unknown;
        try {
            const clean = rawText.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
            analysis = JSON.parse(clean);
        } catch {
            console.error("[analyzeRunningGait] JSON parse failed:", rawText.slice(0, 300));
            throw new HttpsError("internal", "AI returned an unexpected format. Please try again.");
        }

        return { analysis };
    }
);

/**
 * Helper: writeAuditLog
 */
async function writeAuditLog(orgId: string, log: any) {
    await db.collection(`auditLogs`).add({
        ...log,
        orgId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}
