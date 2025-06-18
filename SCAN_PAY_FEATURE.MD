
# Zet Pay Super App: Scan & Pay Feature Documentation

This document provides a comprehensive overview of the Scan & Pay feature within the Zet Pay application, detailing its functionalities, user interface flow, and technical implementation.

## 1. Introduction

The Scan & Pay feature allows users to make quick and secure UPI payments by scanning QR codes using their device's camera or by uploading a QR code image. It also includes functionality for users to display their own UPI QR code to receive payments. The feature aims for speed, security, and convenience, incorporating various checks and user-friendly interactions.

---

## 2. Core Functionalities

### 2.1. QR Code Scanning
-   **Functionality:** Users can scan UPI QR codes presented by merchants or individuals.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx`
        -   Utilizes the device camera via `navigator.mediaDevices.getUserMedia`.
        -   A video stream is displayed within a designated scanning area.
        -   A (simulated) QR code decoding library/logic processes the video frames to detect and decode QR codes.
        -   **Auto Torch (Conceptual):** The system attempts to detect ambient light conditions. If low light is detected and the device supports torch control, it can automatically activate the torch or prompt the user. (Simulated via UI toggle for now).
        -   **Stealth Scan Mode:** A discreet scanning mode where the camera preview might be minimal or replaced with an animation, providing haptic feedback on successful scan.
    -   **Permissions:** Prompts user for camera access permission. Handles denial gracefully.

### 2.2. Upload QR Code from Gallery
-   **Functionality:** Users can upload an image of a QR code from their device's gallery.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx`
        -   Uses an `<input type="file" accept="image/*" />`.
        -   The selected image is processed on the client-side (or sent to backend) to decode the QR code data.
        -   (Simulated decoding of uploaded image for this project).

### 2.3. QR Code Decoding & UPI Data Parsing
-   **Functionality:** Extracts relevant information from the decoded QR string, typically a UPI payment URL.
-   **Implementation:**
    -   **Frontend/Backend:** `src/app/(features)/scan/page.tsx` (client-side parsing) and `backend/services/scanService.js` (backend validation).
    -   Parses UPI URL (e.g., `upi://pay?pa=payee@okbank&pn=PayeeName&am=100&tn=PaymentNote`).
    -   Extracts Payee UPI ID (`pa`), Payee Name (`pn`), Amount (`am`), Transaction Note (`tn`), and Signature (`sign`) if present.

### 2.4. Security Checks & Validation
-   **Functionality:** Before proceeding to payment, the scanned QR data is validated for security and authenticity.
-   **Implementation:**
    -   **Frontend -> Backend API Call:** `src/app/(features)/scan/page.tsx` calls `POST /api/scan/validate`.
    -   **Backend (`scanController.js` & `scanService.js`):**
        -   **Verified Merchants:** Checks the payee UPI ID against a `verified_merchants` Firestore collection. A "Verified" badge is displayed if matched.
        -   **Blacklisted QRs/UPIs:** Checks the UPI ID or a hash of the QR data against a `blacklisted_qrs` Firestore collection. Warns or blocks payment if blacklisted.
        -   **Reported QRs:** Checks if the QR data hash matches any entry in `reported_qrs` Firestore collection and displays a warning.
        -   **Digital Signature Verification (Conceptual):** If the QR contains a `sign` parameter (as per some UPI QR specs), this signature would ideally be verified against the PSP's public key to ensure authenticity. (Simulated via mock values like "MOCK_SIGNATURE_VALID").
        -   **Scan Logging:** Every scan attempt (valid or invalid) is logged to the `scan_logs` collection in Firestore with details like `userId`, `qrData`, `qrDataHash`, parsed details, validation results, and timestamp.
    -   **Frontend (`src/app/(features)/scan/page.tsx`):** Displays validation results, warnings (e.g., "Unverified Payee", "Blacklisted QR"), or errors.

### 2.5. Payment Confirmation UI
-   **Functionality:** After a successful scan and validation, the user is navigated to a payment confirmation screen.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/pay/page.tsx`
        -   Pre-fills Payee Name, Payee UPI ID, Amount (if present in QR and not hidden by stealth mode), and Note.
        -   User can modify the amount (if not fixed by QR) and the note.
        -   User selects their source bank account/UPI ID or Zet Pay Wallet.
        -   Displays bank server status for selected UPI account.

### 2.6. Payment Processing
-   **Functionality:** User authorizes the payment (e.g., via UPI PIN or wallet confirmation).
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/pay/page.tsx` calls backend payment endpoints.
    -   **Backend (`upiController.js` for UPI, `walletController.ts` for Wallet):**
        -   Securely processes the payment via the chosen method (UPI or Wallet).
        -   Handles UPI PIN verification (via PSP).
        -   Updates the `scan_logs` entry with `paymentMade: true` and `paymentTransactionId` upon successful payment.
        -   Logs the transaction to the `transactions` collection (handled by `transactionLogger.ts`).
        -   Sends real-time WebSocket updates for transaction status.

### 2.7. "My QR Code" Generation & Display
-   **Functionality:** Users can view and share their own static UPI QR code to receive payments.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx` (Dedicated "My QR" tab)
        -   Fetches the user's primary/default UPI ID and name from their profile (via `getCurrentUserProfile` which calls backend).
        -   Generates a QR code image client-side using a library or an external API (e.g., `api.qrserver.com`).
        -   Displays the QR code along with the user's name and UPI ID.
        -   Includes a "Share QR" button.
    -   **Backend:** User profile data (`users/{userId}`) stores the UPI ID used for generating the QR.

---

## 3. Advanced Features

### 3.1. Stealth Scan Mode
-   **Functionality:** A discreet scanning mode with minimal UI, potentially hiding amount details until payment confirmation. May use haptic feedback.
-   **Implementation:**
    -   **Frontend:** Toggle switch in `src/app/(features)/scan/page.tsx`. When active:
        -   Camera preview might be smaller or replaced by an animation.
        -   Reduces on-screen information.
        -   If amount is present in QR, `pay/page.tsx` might hide it initially or require a tap to reveal.
        -   Payment confirmation is still required.
    -   Backend `validateQr` endpoint receives a `stealthModeInitiated` flag for logging/analytics.

### 3.2. Auto Torch Activation
-   **Functionality:** Detects low ambient light and automatically activates the device torch if supported.
-   **Implementation:**
    -   **Frontend:** Uses `navigator.mediaDevices.getUserMedia` and related track capabilities.
    -   If `MediaStreamTrack.getCapabilities().torch` is true, the torch can be controlled via `applyConstraints`.
    -   Conceptual light sensor API or heuristic (e.g., time of day + camera brightness) could trigger this. (Currently simulated via a manual toggle if torch is supported).

### 3.3. Recent Scans / Quick Pay
-   **Functionality:** Displays a list of recently scanned & paid UPI IDs for quick re-payment.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx`
        -   Calls `GET /api/scan/recent` to fetch distinct, recently paid QRs.
        -   Displays a list with payee name, UPI ID, and potentially last paid amount.
        -   Clicking a recent scan pre-fills the QR data and proceeds to validation/payment flow.
    -   **Backend (`scanController.js`):**
        -   The `/api/scan/recent` endpoint queries the `scan_logs` collection, filters for `userId` and `paymentMade: true`, groups by `parsedPayeeUpi`, and returns recent distinct payees.

### 3.4. Favorite QRs
-   **Functionality:** Users can save frequently scanned QRs as favorites with custom tags and default amounts.
-   **Implementation:**
    -   **Frontend:**
        -   After a successful scan (`src/app/(features)/scan/page.tsx`), an option to "Add to Favorites" appears.
        -   A dialog allows setting a custom tag name and default amount.
        -   Favorites are listed on the scan page for quick selection.
        -   Clicking a favorite QR pre-fills its data for payment.
    -   **Backend (`favoritesController.js` & `scanController.js`):**
        -   `POST /api/favorites/qr`: Adds a new favorite QR (stores full `qrData`, `qrDataHash`, `payeeUpi`, `payeeName`, `customTagName`, `defaultAmount`).
        -   `GET /api/favorites/qr`: Lists favorites for the user.
        -   `DELETE /api/favorites/qr/:qrHash`: Removes a favorite.
        -   `validateQr` in `scanController.js` checks if the scanned QR hash matches any of the user's favorites and returns `isFavorite: true` and `customTagName`.

### 3.5. In-App Chat with Payee
-   **Functionality:** If the scanned payee is also a Zet Pay user (identified via UPI ID format or backend check), an option to initiate a chat appears.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx`
        -   After QR validation, if `validationResult.isZetPayUser` (hypothetical field from backend) is true, show a "Chat" button.
        -   Uses the `ZetChat` component (`src/components/zet-chat.tsx`).
    -   **Backend:**
        -   The `scanService.js` or `upiProviderService.js` might perform a lookup to determine if a UPI ID belongs to a Zet Pay user.
        -   Chat backend infrastructure (`chatController.js`, `chatService.js`, WebSockets) handles messaging.

### 3.6. Report Suspicious QR
-   **Functionality:** Allows users to report a QR code they believe is fraudulent or suspicious.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx`
        -   A "Report QR" button is available after scanning.
        -   Opens a dialog for the user to enter a reason.
        -   Calls `POST /api/scan/report` with `qrData` and `reason`.
    -   **Backend (`scanController.js` & `scanService.js`):**
        -   The `/api/scan/report` endpoint saves the report to the `reported_qrs` collection in Firestore (includes `reporterUserId`, `qrData`, `qrDataHash`, `parsedPayeeUpi`, `reason`, `timestamp`, `status: 'pending_review'`).
        -   These reports can be reviewed by admins. If confirmed malicious, the QR hash or UPI ID can be added to `blacklisted_qrs`.

### 3.7. Recently Scanned QR Cooldown & Suggestion
-   **Functionality:** If the same QR code is scanned multiple times locally within a short period (e.g., 15 seconds), the UI can show a subtle warning or skip redundant validation calls initially if the user confirms. If a QR for a previously paid contact is scanned, suggest pre-filling past payment amounts.
-   **Implementation:**
    -   **Frontend:** `src/app/(features)/scan/page.tsx`
        -   Uses `localStorage` to store a timestamp and hash of the last few locally scanned QRs.
        -   If a QR matches a very recent local scan, it can briefly inform the user or slightly alter the UI flow (e.g., "Scanned again, proceed?").
        -   The `validateQr` result from the backend includes `pastPaymentSuggestions`. If present, a dialog prompts the user if they want to use one of those amounts.

---

## 4. User Interface Flow

1.  **Access:** User taps "Scan & Pay" from the home screen or other entry points.
2.  **Default View (Scan Tab):**
    *   Camera preview opens immediately.
    *   Guidelines on screen to help align QR code.
    *   Options: "Upload from Gallery", "Torch" toggle (if supported), "My QR Code" tab, potentially "Stealth Mode" toggle.
    *   Lists "Recent Scans" and "Favorite QRs" for quick access.
3.  **Scanning:**
    *   User points camera at QR.
    *   System attempts to auto-detect and decode.
    *   On successful decode:
        *   Camera stream stops.
        *   "Processing QR..." loading state.
        *   Backend validation is triggered.
4.  **QR Validation Display:**
    *   If `scannedUpiData` and `validationResult` are available:
        *   Payee Name and UPI ID are shown.
        *   Security badges (Verified, Blacklisted, Reported, Authentic QR, Unverified) are displayed.
        *   If it's a favorite, the custom tag is shown.
        *   User is prompted with "Pay Now" and "Rescan" options.
        *   "Report QR", "Chat", "Save Contact/Favorite" options are available.
        *   If past payment amounts are suggested, a modal appears.
    *   If QR is invalid or validation fails critically:
        *   Error message is shown.
        *   Option to "Scan Again".
5.  **Upload QR:**
    *   User taps "Upload from Gallery".
    *   File picker opens. User selects image.
    *   "Processing Image..." loading state.
    *   Flow continues to QR Validation Display (Step 4).
6.  **Proceed to Payment:**
    *   User taps "Pay Now".
    *   Navigates to `/pay` page with pre-filled details (Payee UPI, Name, Amount if present, Note).
    *   User confirms amount, selects payment source, enters UPI PIN (if UPI payment).
    *   Payment is processed. (See UPI & Wallet Features documentation for payment flow).
7.  **My QR Code Tab:**
    *   Displays user's name, UPI ID, and their scannable UPI QR code.
    *   "Share QR" button allows sharing the QR image or UPI ID string.

---

## 5. Technical Implementation Details

### 5.1. Frontend
-   **Main Page:** `src/app/(features)/scan/page.tsx`
    -   Manages camera access (`navigator.mediaDevices.getUserMedia`).
    -   Simulates QR decoding from video stream (or would use a library like `html5-qrcode-scanner` or `react-qr-reader`).
    -   Handles image upload and simulated decoding.
    -   Calls backend `/api/scan/validate` for security checks.
    -   Displays parsed data, validation results, warnings, and user actions.
    -   Manages "Recent Scans" and "Favorite QRs" display by calling respective backend APIs.
    -   Redirects to `/pay` with scanned details.
-   **Payment Confirmation Page:** `src/app/(features)/pay/page.tsx`
    -   Receives parameters from `scan/page.tsx` via URL query.
    -   Handles payment method selection and final payment authorization.
-   **Libraries/Hooks:**
    -   `lucide-react` for icons.
    -   `shadcn/ui` components (Button, Card, Input, Dialog, Avatar, Badge, etc.).
    -   `useToast` for notifications.
    -   Client-side QR generation for "My QR" (e.g., using a library or `api.qrserver.com`).

### 5.2. Backend
-   **Scan Controller & Service (`scanController.js`, `scanService.js`):**
    -   `POST /api/scan/validate`:
        -   Input: `qrData`, `signature` (optional), `stealthModeInitiated` (optional).
        -   `scanService.parseUpiDataFromQr`: Parses the raw QR string.
        -   `scanService.validateScannedQr`:
            -   Checks Firestore: `verified_merchants`, `blacklisted_qrs`, `reported_qrs`.
            -   (Conceptually) Validates digital signature if present.
            -   Queries `transactions` for past payments to this payee by the user.
            -   Queries `user_favorite_qrs` for favorite status.
            -   Calls `scanService.logScan` to save scan attempt to `scan_logs`.
        -   Returns structured validation result (`ApiQrValidationResult`).
    -   `POST /api/scan/report`:
        -   Input: `qrData`, `reason`.
        -   `scanService.reportQrCode`: Saves report to `reported_qrs` in Firestore.
    -   `GET /api/scan/recent`:
        -   Queries `scan_logs` for `userId` and `paymentMade: true`, groups by payee, orders by recency, limits results.
-   **Favorites Controller & Service (`favoritesController.js`, `favoritesService.js` - assuming existence):**
    -   `POST /api/favorites/qr`: Adds to `user_favorite_qrs`.
    -   `GET /api/favorites/qr`: Lists from `user_favorite_qrs`.
    -   `DELETE /api/favorites/qr/:qrHash`: Removes from `user_favorite_qrs`.
-   **UPI/Wallet Controllers (`upiController.js`, `walletController.ts`):**
    -   Handle the actual payment processing after details are confirmed on `/pay` page.
-   **Middleware:** `authMiddleware.js` protects all these backend endpoints.

### 5.3. Data Storage (Firestore)
-   **`scan_logs`:**
    -   Fields: `userId`, `qrData`, `qrDataHash`, `parsedPayeeUpi`, `parsedPayeeName`, `parsedAmount`, `timestamp`, `isVerifiedMerchant`, `isFlaggedBlacklisted`, `hasValidSignature`, `isReportedPreviously`, `stealthMode`, `paymentMade`, `paymentTransactionId`, `validationMessage`.
-   **`verified_merchants`:** (Document ID: UPI ID)
    -   Fields: `upiId`, `merchantName`, `category`, `logoUrl`, `isVerified: true`, `addedAt`.
-   **`blacklisted_qrs`:** (Document ID: UPI ID or QR Hash)
    -   Fields: `identifier` (UPI ID or QR Hash), `identifierType`, `reason`, `blacklistedAt`, `source`.
-   **`reported_qrs`:** (Auto-generated Document ID)
    -   Fields: `reporterUserId`, `qrData`, `qrDataHash`, `parsedPayeeUpi`, `reason`, `status` (`pending_review`, `resolved_blacklisted`, etc.), `reportedAt`.
-   **`user_favorite_qrs`:** (Auto-generated Document ID or composite `userId_qrDataHash`)
    -   Fields: `userId`, `qrDataHash`, `qrData`, `payeeUpi`, `payeeName`, `customTagName` (optional), `defaultAmount` (optional), `createdAt`, `updatedAt`.
-   **`transactions`:** Standard transaction log used by payment controllers. The `scanLogId` can be stored here to link payment back to the scan.

### 5.4. Security Considerations
-   **Input Validation:** Validate all inputs on both frontend and backend, especially the raw `qrData`.
-   **Backend Validation is Key:** Client-side parsing is for UX, but all critical security checks (blacklist, verified status) MUST happen on the backend.
-   **Preventing Malicious QRs:**
    -   Sanitize displayed data from QR codes (e.g., Payee Name, Note) to prevent XSS if ever rendered directly without appropriate encoding.
    -   Warn users about unverified payees.
    -   Backend checks against known malicious patterns or domains in UPI IDs if possible.
-   **Secure Payment Flow:** The actual payment is handled by the secure UPI/Wallet payment flow, which requires PIN or other authentication.
-   **Rate Limiting:** Apply to backend validation and reporting endpoints to prevent abuse.
-   **Camera Permissions:** Handle requests and denials gracefully. Ensure camera access is only active when the "Scan QR" tab is visible and active. Stop camera stream when navigating away or processing.

---

This Scan & Pay feature provides a crucial entry point for payments, integrating user convenience with necessary security checks.
