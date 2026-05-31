import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firebaseAuth, firebaseDB, firebaseFunctions } from "../core/firebase";
import type { AppUser, UserRole } from "../types";

// Prevents onAuthStateChanged from erroring on new Google users while signupWithGoogle
// is still writing the user doc to Firestore.
let isGoogleSignupInProgress = false;

// ── State ──────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "SET_LOADING" }
  | { type: "SET_USER"; payload: AppUser }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: true, error: null };
    case "SET_USER":
      return { user: action.payload, loading: false, error: null };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "CLEAR":
      return { user: null, loading: false, error: null };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    orgName?: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<"existing" | "new">;
  signupWithGoogle: (role: UserRole, orgName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled. Contact support.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
    "auth/popup-blocked": "Popup was blocked by the browser. Please allow popups for this site.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method.",
  };
  return map[code] ?? (err instanceof Error ? err.message : "Authentication failed. Please try again.");
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    error: null,
  });

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        dispatch({ type: "CLEAR" });
        return;
      }

      try {
        const isGoogleProvider = firebaseUser.providerData.some(
          (p) => p.providerId === "google.com"
        );

        // Retry loop: handles race where signup writes the user doc slightly
        // after onAuthStateChanged fires. Google sign-ups need extra time because
        // signupWithGoogle creates the doc after signInWithPopup resolves.
        let userDoc = await getDoc(doc(firebaseDB, "users", firebaseUser.uid));
        if (!userDoc.exists()) {
          const delays = isGoogleProvider ? [500, 800, 1200, 1500, 2000] : [800];
          for (const delay of delays) {
            await new Promise((r) => setTimeout(r, delay));
            userDoc = await getDoc(doc(firebaseDB, "users", firebaseUser.uid));
            if (userDoc.exists()) break;
          }
        }
        if (!userDoc.exists()) {
          // A Google user with no profile doc ended up here via loginWithGoogle
          // (not signupWithGoogle). Sign them out silently — the UI shows a prompt.
          if (isGoogleProvider && !isGoogleSignupInProgress) {
            await signOut(firebaseAuth);
            dispatch({ type: "CLEAR" });
            return;
          }
          dispatch({ type: "SET_ERROR", payload: "User profile not found." });
          return;
        }
        const data = userDoc.data();

        // Wait for onUserCreate Cloud Function to set custom claims, then
        // force-refresh the token so Firestore rules get the role claim directly
        // (avoiding the slower per-query user-doc fallback that can fail under
        // race conditions). Retry with backoff — cold-start functions can take
        // 3-6 seconds on a new deployment.
        let tokenResult = await firebaseUser.getIdTokenResult();
        const isResearch = data.role === "research";

        // For existing users who might have legacy wba99 IDs, we still have a fallback
        // but for new users, the Cloud Function ensures this is ready immediately.
        const hasValidOrg = tokenResult.claims.orgId && tokenResult.claims.orgId !== "wba99";

        if (!tokenResult.claims.role || (isResearch && !hasValidOrg)) {
          console.log("[AuthContext] Waiting for custom claims synchronization...");
          const delays = [1000, 2000, 3000];
          for (const delay of delays) {
            await new Promise((r) => setTimeout(r, delay));
            await firebaseUser.getIdToken(true);
            tokenResult = await firebaseUser.getIdTokenResult(true);
            
            const nowHasRole = !!tokenResult.claims.role;
            const nowHasValidOrg = tokenResult.claims.orgId && tokenResult.claims.orgId !== "wba99";
            
            if (isResearch) {
              if (nowHasRole && nowHasValidOrg) break;
            } else {
              if (nowHasRole) break;
            }
          }
        }

        dispatch({
          type: "SET_USER",
          payload: {
            uid: firebaseUser.uid,
            name: data.name ?? "",
            email: data.email ?? firebaseUser.email ?? "",
            role: data.role as UserRole,
            orgId: data.orgId,
            createdAt: data.createdAt ?? "",
            isAdmin: data.isAdmin === true,
            isOwner: data.isOwner === true,
            suspended: data.suspended === true,
          },
        });
      } catch {
        dispatch({ type: "SET_ERROR", payload: "Failed to load user profile." });
      }
    });

    return unsubscribe;
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function login(email: string, password: string) {
    dispatch({ type: "SET_LOADING" });
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // onAuthStateChanged handles state update
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", payload: friendlyAuthError(err) });
      throw err;
    }
  }

  async function logout() {
    await signOut(firebaseAuth);
    dispatch({ type: "CLEAR" });
  }

  async function signup(
    name: string,
    email: string,
    password: string,
    role: UserRole,
    orgName?: string
  ) {
    dispatch({ type: "SET_LOADING" });
    try {
      if (role === "research") {
        // Use the Specialized Cloud Function for immediate setup
        const registerFn = httpsCallable<{ name: string; email: string; password: string; orgName: string }, { success: boolean; uid: string }>(
          firebaseFunctions,
          "registerResearchOrg"
        );
        await registerFn({ name, email, password, orgName: orgName || "" });

        // After the cloud function creates the user, we MUST sign in manually on the client
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        // Standard client-side signup for physio and other roles
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const uid = credential.user.uid;

        await setDoc(doc(firebaseDB, "users", uid), {
          name,
          email,
          role,
          createdAt: serverTimestamp(),
        });
      }
      // onAuthStateChanged handles user state update
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", payload: friendlyAuthError(err) });
      throw err;
    }
  }

  async function loginWithGoogle(): Promise<"existing" | "new"> {
    dispatch({ type: "SET_LOADING" });
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(firebaseAuth, provider);
      const userDocRef = doc(firebaseDB, "users", credential.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        // Existing user — onAuthStateChanged handles state update
        return "existing";
      }
      // New user — sign out and tell the caller so the UI can redirect to signup
      await signOut(firebaseAuth);
      dispatch({ type: "CLEAR" });
      return "new";
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", payload: friendlyAuthError(err) });
      throw err;
    }
  }

  async function signupWithGoogle(role: UserRole, orgName?: string): Promise<void> {
    dispatch({ type: "SET_LOADING" });
    isGoogleSignupInProgress = true;
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(firebaseAuth, provider);
      const { user: googleUser } = credential;

      const userDocRef = doc(firebaseDB, "users", googleUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Account already exists — just log them in
        isGoogleSignupInProgress = false;
        return;
      }

      const displayName = googleUser.displayName || googleUser.email?.split("@")[0] || "";

      if (role === "research") {
        const orgRef = doc(collection(firebaseDB, "organisations"));
        await setDoc(orgRef, {
          name: orgName || "",
          adminUid: googleUser.uid,
          createdAt: serverTimestamp(),
        });
        await setDoc(userDocRef, {
          name: displayName,
          email: googleUser.email || "",
          role,
          orgId: orgRef.id,
          createdAt: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, {
          name: displayName,
          email: googleUser.email || "",
          role,
          createdAt: serverTimestamp(),
        });
      }
      // onAuthStateChanged handles state update after doc is created
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", payload: friendlyAuthError(err) });
      throw err;
    } finally {
      isGoogleSignupInProgress = false;
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, signup, loginWithGoogle, signupWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
