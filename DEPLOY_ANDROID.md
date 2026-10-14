# TrustPay Cloud and Android Deployment

The existing React/Vite application remains the only frontend source:

`frontend/src` → `npm run build` → `frontend/dist` → `npx cap sync android` → APK

## A. MongoDB Atlas

1. Create an Atlas cluster and a database user with a strong unique password.
2. Give the user read/write access to the TrustPay databases. TrustPay uses the central `trustpay` database plus cached per-merchant databases named `trustpay_MER...`.
3. In Network Access, allow connections from the Render service. If Render does not provide a fixed outbound IP on the selected plan, use `0.0.0.0/0` and rely on the strong database credentials, then restrict it later when a fixed egress IP is available.
4. Copy the Node.js SRV connection string. URL-encode special characters in the password.
5. Set the complete value as Render's `MONGODB_URI`. Do not commit it.

Schemas, collections, and merchant databases are created through the existing Mongoose models. Do not manually rename the current collections.

## B. Render backend

Create a **Web Service** from this repository with:

- Runtime: `Node`
- Root Directory: `backend`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/api/health`

The repository also includes `render.yaml` with these non-secret settings. Render supplies `PORT`; do not set it to `10000` in code.

## C. Render environment variables

Set these in the Render dashboard:

```text
NODE_ENV=production
MONGODB_URI=<Atlas SRV connection string>
JWT_SECRET=<long cryptographically random value>
TRUSTPAY_SECRET=<different long cryptographically random value>
CORS_ORIGINS=<comma-separated hosted web frontend origins>
FRONTEND_URL=<public hosted TrustPay web frontend origin>
RAZORPAY_KEY_ID=<Razorpay key ID>
RAZORPAY_KEY_SECRET=<Razorpay key secret>
RAZORPAY_WEBHOOK_SECRET=<Razorpay webhook signing secret>
EMAIL_PROVIDER=resend
RESEND_API_KEY=<Resend API key>
EMAIL_FROM=TrustPay <no-reply@your-verified-domain.example>
GOOGLE_CLIENT_ID=<Google OAuth web client ID, if used>
GOOGLE_CLIENT_SECRET=<Google OAuth secret, if used by a future server-side flow>
TWILIO_ACCOUNT_SID=<required for phone OTP>
TWILIO_AUTH_TOKEN=<required for phone OTP>
TWILIO_FROM_NUMBER=<required for phone OTP>
OTP_HASH_SECRET=<long random value>
OTP_EXPIRES_MINUTES=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_MAX_SENDS_PER_HOUR=5
```

`CORS_ORIGINS` is for hosted browser frontends. The backend already explicitly accepts `capacitor://localhost`, `http://localhost`, `https://localhost`, and local Vite development origins. Authentication uses Bearer JWTs, not cookies.

## D. Razorpay webhook

In Razorpay Dashboard, create a webhook pointing to:

```text
https://<your-render-service-domain>/api/webhooks/razorpay
```

Subscribe at least to `payment.captured`, `payment.failed`, and `order.paid`. Put the same webhook secret in `RAZORPAY_WEBHOOK_SECRET`. This endpoint verifies Razorpay's signature against the raw request body; do not add JSON middleware before it.

## E. Resend

1. Add and verify a sending domain in Resend (including the DNS records it provides).
2. Create an API key restricted appropriately for sending mail.
3. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and an `EMAIL_FROM` address on the verified domain in Render.
4. Set `FRONTEND_URL` so Guardian invitation links point to the public TrustPay frontend.

Without email configuration, registration and Guardian flows continue but report/log that email delivery is unavailable. Secrets are never sent to the frontend.

## F. Frontend production environment

Create `frontend/.env.production` locally (it is ignored by Git):

```text
VITE_API_BASE_URL=https://<your-render-service-domain>
VITE_PUBLIC_APP_URL=https://<your-public-web-frontend-domain>
VITE_GOOGLE_CLIENT_ID=<Google OAuth web client ID, if used>
```

Vite variables are public. Never put Razorpay secret keys, webhook secrets, JWT secrets, Resend keys, Twilio secrets, or database credentials in a `VITE_` variable. The Razorpay public key ID is returned by the backend when an order is created, so no frontend Razorpay variable is required.

A production build intentionally fails if `VITE_API_BASE_URL` is missing, non-HTTPS, or local. `VITE_PUBLIC_APP_URL` must be a real hosted frontend if other customers need to open merchant payment QR links; `capacitor://localhost` is not a shareable payment address.

## G–J. Build, sync, open, and run Android

Requirements: Node.js, Android Studio, Android SDK Platform 36, and JDK 21 (Android Studio's bundled JBR is suitable for Capacitor 8).

From PowerShell:

```powershell
cd frontend
npm ci
npm run build
npx cap sync android
npx cap open android
```

Connect an Android device with USB debugging enabled (or create an emulator), select it in Android Studio, and press **Run**. The app bundles `dist`; Capacitor is not configured to load a localhost development server.

The existing QR workflow scans uploaded PNG/JPEG/WebP images and uses `BarcodeDetector` with a `jsQR` fallback. It does not currently provide live-camera scanning, so no camera permission was added. Android's file picker works through the existing `input type="file"` controls. Proof images are sent as in-memory base64 data and are not persisted to Render's filesystem.

## K. Debug APK

Either use Android Studio: **Build → Build APK(s)**, or:

```powershell
cd frontend\android
.\gradlew.bat assembleDebug
```

Output:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## L. Release APK

In Android Studio use **Build → Generate Signed App Bundle or APK → APK**, create/select a private keystore, choose `release`, and finish the wizard. Never commit the keystore or its passwords.

Command-line release builds are possible after adding signing configuration locally:

```powershell
cd frontend\android
.\gradlew.bat assembleRelease
```

Typical output:

```text
frontend/android/app/build/outputs/apk/release/app-release.apk
```

An unsigned output may be named `app-release-unsigned.apk`; sign it through Android Studio before distribution.

## M–N. Future frontend updates

After every React change:

```powershell
cd frontend
npm run android:sync
npm run android:open
```

Then rebuild the APK in Android Studio or run Gradle again. Do not edit the copied files under `android/app/src/main/assets/public`; `cap sync` replaces them from `dist`.

## Authentication notes

- Email/password authentication works through the public HTTPS API.
- Phone OTP requires valid Twilio and OTP environment variables.
- The existing Google Identity Services browser flow is preserved. Google can block embedded WebViews. A reliable native Google flow requires creating an Android OAuth client for package `com.trustpay.app`, registering the signing certificate SHA-1/SHA-256 fingerprints, and integrating a native Google authentication plugin. Those credentials cannot be invented; complete this Google Cloud setup before claiming Google sign-in works in the APK.
