# Physiotherapy Case Assessment Platform

Premium React + Vite experience tailored for physiotherapists and admins. It feels modern, dark-mode first, and adaptable to Capacitor deployments.

## Highlights

- **Dark mode-first design system** with CSS variables, Tailwind theme extensions, subtle glass surfaces, and smooth micro-interactions inspired by Apple and Linear.
- **Role-based SaaS shell** – physiotherapist and admin routes are guarded by Zustand-powered auth backed by Firebase Firestore persistence.
- **Firestore data layer** keeps `users`, `patients`, `cases`, and `reports` centralized so every deployment shares the same records.
- **Media-forward workflows** for case creation (multi-step wizard, drag & drop slots, progress bars, auto-save) and reporting (observations, gait metrics, interpretation areas, and recommendation drafts).
- **Admin cockpit** with dashboards, filters, assignments, and status timelines that keep teams aligned.
- **Theme toggle + persistence**, responsive layouts, and Tailwind utilities for a premium healthcare SaaS vibe.
- **Firebase Authentication** secures login and signup, while Firestore stores the resulting user metadata.
## Tech stack

- React + Vite + TypeScript
- Tailwind CSS (via CLI) with CSS variables + gradient/glass styling
- Zustand for global store (auth, theme, data)
- React Router DOM for nested, guarded routes
- React Hook Form + Zod for validation
- React Dropzone for media uploads
- Lucide icons
- Firebase Firestore serves as the persistence layer for the shared workspace data.

## Getting started

```bash
npm install
npm run dev        # start local dev server
npm run build      # production build (also verifies type checks)
npm run preview    # preview the build
```

## Credentials

Two demo users (password `demo`) unlock each workspace, and new accounts can be created via signup:

- `physio@demo.com` → physiotherapist shell
- `admin@demo.com` → admin workspace

Signup can create additional users/roles stored in Firestore; each uses the password entered during signup and can sign in immediately afterward.

## Notable internals

- **Theme handling** lives in `src/lib/theme.ts`. Switching the toggle updates CSS variables, writes `wba99-theme`, and keeps dark mode as default.
- **Global state** lives in `src/store/useAppStore.ts` and wires auth, theme, users, patients, cases, and reports through Firebase Firestore.
- **Firebase bootstrap** lives in `src/lib/firebase.ts`; the same file also exposes Firebase Auth so signup/login go through `createUserWithEmailAndPassword`/`signInWithEmailAndPassword`.
- **Routing** is defined in `src/App.tsx` with protected nests for `/dashboard` and `/admin/*`. `ProtectedRoute` renders `ProtectedShell` for elegant nav + theme toggle.
- **Wizard auto-save** keeps step data + media in `localStorage` (`case-wizard-draft`) and shows a “Saved just now” indicator.
- **Media UI** uses custom sections with drag & drop (React Dropzone), progress bars, remove/replace controls, and check icons for completion.

## Next steps

1. Harden Firestore security rules and consider moving to Firebase Authentication before sharing the workspace more widely.
2. Add animation polish (Framer Motion) for step transitions and toast notifications.
3. Layer in accessibility reviews (ARIA labeling, keyboard drag-and-drop enhancements).
