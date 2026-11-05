# AetherInk Studio — Reviews and GitHub Pages Setup

The Reviews section is directly below About Us. Visitors can read reviews without signing in. The review form is visible without a separate **Continue with Google** button.

When someone presses **Publish Review**, Firebase checks whether this website already has a remembered Google session. If not, it opens Google's secure account confirmation window and then publishes the review. A browser being signed in to Gmail does not automatically share that identity with every website; this one-time confirmation is required to prevent people from posting under someone else's name.

Each verified Google account gets one review and can update that review later. Firestore rules allow public reading, but only a verified account can create/update its own review.

## 1. Connect Firebase

1. Open https://console.firebase.google.com/ and create a Firebase project.
2. In Project settings → General → Your apps, register a Web app (`</>`).
3. Copy the web app config values into `firebase-config.js`:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
4. In Firebase Console → Authentication → Sign-in method/providers, enable **Google** and save.
5. In Authentication → Settings → Authorized domains, add:
   - `localhost` for local testing
   - `YOUR-GITHUB-USERNAME.github.io` after publishing
   - Your custom domain if you use one
6. Create a Cloud Firestore database.
7. In Firestore → Rules, publish the contents of `firestore.rules`.

Do not leave Firestore in test mode. The supplied rules allow public reads and restrict review writes to the matching, verified Google account.

## 2. Test locally

1. Open `LOCAL-PROJECT` in VS Code.
2. Use the **Live Server** extension to run `index.html`. Do not open the file by double-clicking it (`file://`), because browsers can block JavaScript modules in that mode.
3. Open Reviews below About Us.
4. Enter a star rating and a review of 10–600 characters.
5. Press **Publish Review**. If this site has not previously verified a Google account in this browser, a Google confirmation window opens. After successful verification, the review is saved.
6. Refresh or open the website in another browser to confirm the review is publicly visible.

If the review area says Firebase setup is required, replace the placeholders in `firebase-config.js`. If it says the site domain is unauthorized, add the exact hostname in Firebase Authentication → Settings → Authorized domains. If it reports a Firestore permissions error, publish the included rules.

The page now replaces the loading message with a clear error if Firebase does not respond; it should not spin forever.

## 3. Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload the **contents** of `GITHUB-PAGES-READY` to the repository root (not the outer folder).
3. In repository Settings → Pages, choose **Deploy from a branch**, branch `main`, folder `/(root)`, then Save.
4. Add the live hostname (for example `yourname.github.io`) to Firebase Authentication → Settings → Authorized domains.
5. Test a review on the live GitHub Pages URL.

GitHub Pages is static hosting. Keep `admin.html` out of the public deployment folder. Firebase handles review authentication/storage; never put a Firebase service-account key or other server secret in this front-end project.

Official guides:
- Firebase web setup: https://firebase.google.com/docs/web/setup
- Google sign-in: https://firebase.google.com/docs/auth/web/google-signin
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
