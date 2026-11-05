import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  addDoc
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// The page's small fallback timer listens for this event. If Firebase modules fail
// to load (for example, when opened as file://), it replaces the permanent spinner.
window.dispatchEvent(new Event("aetherink-reviews-ready"));

const MAX_REVIEWS_PER_USER = 3;

const $ = (id) => document.getElementById(id);
const reviewForm = $("reviewForm");
const reviewStatus = $("reviewStatus");
const publicStatus = $("reviewPublicStatus");
const reviewsList = $("reviewsList");
const submitButton = $("reviewSubmitButton");

let auth;
let db;
let activeUser = null;
let initialAuthResolved = false;
let resolveInitialAuth;
const initialAuthState = new Promise(resolve => {
  resolveInitialAuth = resolve;
});

function setStatus(message, type = "") {
  const className = `review-status${type ? ` ${type}` : ""}`;
  if (reviewStatus) {
    reviewStatus.textContent = message;
    reviewStatus.className = className;
  }
  if (publicStatus) {
    publicStatus.textContent = message;
    publicStatus.className = className;
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function initials(name = "Creator") {
  return name.trim().split(/\s+/).slice(0, 2)
    .map(part => part[0] || "").join("").toUpperCase() || "C";
}

function formatReviewDate(value) {
  if (!value || typeof value.toDate !== "function") return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric"
  }).format(value.toDate());
}

function renderReviewCard(review) {
  const card = makeElement("article", "review-card");
  const top = makeElement("div", "review-card-top");
  const identity = makeElement("div", "review-identity");
  const displayName = review.displayName || "Google user";

  if (review.photoURL) {
    const avatar = document.createElement("img");
    avatar.className = "review-avatar";
    avatar.src = review.photoURL;
    avatar.alt = "";
    avatar.referrerPolicy = "no-referrer";
    avatar.onerror = () => {
      avatar.replaceWith(makeElement(
        "span", "review-avatar review-avatar-fallback", initials(displayName)
      ));
    };
    identity.appendChild(avatar);
  } else {
    identity.appendChild(makeElement(
      "span", "review-avatar review-avatar-fallback", initials(displayName)
    ));
  }

  const nameWrap = makeElement("div", "review-name-wrap");
  nameWrap.appendChild(makeElement("strong", "reviewer-name", displayName));
  nameWrap.appendChild(makeElement("span", "review-date", formatReviewDate(review.createdAt)));
  identity.appendChild(nameWrap);
  top.appendChild(identity);

  const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
  const stars = makeElement("div", "review-card-stars", `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`);
  stars.setAttribute("aria-label", `${rating} out of 5 stars`);
  top.appendChild(stars);

  const comment = makeElement("p", "review-comment", review.comment || "");
  card.append(top, comment);
  return card;
}

function isFirebaseConfigReady() {
  const values = [
    firebaseConfig?.apiKey,
    firebaseConfig?.authDomain,
    firebaseConfig?.projectId,
    firebaseConfig?.appId
  ];
  return values.every(value =>
    typeof value === "string" &&
    value.trim() &&
    !/PASTE_|YOUR_PROJECT_ID/i.test(value)
  );
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function countUserReviews(userId) {
  const q = query(collection(db, "reviews"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

async function loadReviews() {
  if (!db || !reviewsList) return;

  $("reviewsCount").textContent = "Loading reviews…";
  reviewsList.replaceChildren(makeElement(
    "p", "reviews-loading", "Loading community reviews…"
  ));

  try {
    const snapshot = await Promise.race([
      getDocs(collection(db, "reviews")),
      wait(15000).then(() => {
        const error = new Error("Reviews request timed out.");
        error.code = "reviews/timeout";
        throw error;
      })
    ]);

    const reviews = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    reviews.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    const count = reviews.length;
    const average = count
      ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / count
      : 0;

    $("reviewsAverage").textContent = count ? average.toFixed(1) : "—";
    $("reviewsCount").textContent = `${count} ${count === 1 ? "review" : "reviews"}`;
    reviewsList.replaceChildren();

    if (!count) {
      reviewsList.appendChild(makeElement(
        "div", "reviews-empty", "No reviews yet. Be the first to share your experience!"
      ));
      return;
    }

    reviews.slice(0, 30).forEach(review => {
      reviewsList.appendChild(renderReviewCard(review));
    });
  } catch (error) {
    console.error("Unable to load AetherInk reviews:", error);
    $("reviewsAverage").textContent = "—";
    $("reviewsCount").textContent = "Reviews unavailable";

    let message = "Reviews could not be loaded. Check your internet connection and Firebase Firestore settings.";
    if (error.code === "permission-denied") {
      message = "Firestore is blocking public review reads. Publish the provided firestore.rules and allow public read access to the reviews collection.";
    } else if (error.code === "reviews/timeout") {
      message = "The reviews database did not respond within 15 seconds. Check the Firebase project, Firestore database, and internet connection.";
    } else if (error.code === "unavailable") {
      message = "Firebase is temporarily unavailable. Please refresh the page in a moment.";
    }

    reviewsList.replaceChildren(makeElement("div", "reviews-empty", message));
  }
}

async function refreshUserReviewStatus(user) {
  if (!user || !submitButton) return;
  try {
    const count = await countUserReviews(user.uid);
    const remaining = Math.max(0, MAX_REVIEWS_PER_USER - count);
    if (remaining <= 0) {
      submitButton.disabled = true;
      submitButton.textContent = "Limit reached (3 reviews)";
      setStatus(
        `You have already published ${MAX_REVIEWS_PER_USER} reviews — that is the maximum allowed per account.`,
        "notice"
      );
    } else {
      submitButton.disabled = false;
      submitButton.textContent = "Publish Review";
      setStatus(
        `Your Google account is connected. You can publish ${remaining} more review${remaining === 1 ? "" : "s"} (max ${MAX_REVIEWS_PER_USER} per account).`,
        "success"
      );
    }
  } catch (error) {
    console.error("Unable to count user reviews:", error);
    submitButton.disabled = false;
    submitButton.textContent = "Publish Review";
    setStatus("Your Google account is connected. You can publish a review.", "success");
  }
}

async function getVerifiedUser(provider) {
  if (!initialAuthResolved) {
    await Promise.race([initialAuthState, wait(1800)]);
  }
  if (activeUser) return activeUser;

  setStatus(
    "Please confirm your Google account in the secure sign-in window. Your review will publish immediately after verification.",
    "notice"
  );
  const credential = await signInWithPopup(auth, provider);
  activeUser = credential.user;
  return activeUser;
}

function authErrorMessage(error) {
  if (error.code === "auth/unauthorized-domain") {
    return "This website domain is not authorized in Firebase. Add your GitHub Pages hostname under Authentication → Settings → Authorized domains.";
  }
  if (error.code === "auth/popup-blocked") {
    return "Your browser blocked the Google verification window. Allow pop-ups for this website and try again.";
  }
  if (error.code === "auth/popup-closed-by-user") {
    return "Google verification was cancelled. Your review has not been published.";
  }
  if (error.code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in Firebase Console.";
  }
  if (error.code === "reviews/limit") {
    return `You can only publish up to ${MAX_REVIEWS_PER_USER} reviews with one Google account.`;
  }
  return "Your account could not be verified or the review could not be saved. Check Firebase setup and try again.";
}

async function startReviews() {
  if (!isFirebaseConfigReady()) {
    $("reviewsAverage").textContent = "—";
    $("reviewsCount").textContent = "Firebase setup required";
    reviewsList.replaceChildren(makeElement(
      "div", "reviews-empty",
      "Reviews are not connected yet. Add your Firebase web app settings to firebase-config.js, then reload the website."
    ));
    submitButton.disabled = true;
    setStatus(
      "Review publishing is not active yet. Complete the Firebase setup guide and add your project configuration first.",
      "notice"
    );
    return;
  }

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  onAuthStateChanged(auth, async user => {
    activeUser = user;
    if (!initialAuthResolved) {
      initialAuthResolved = true;
      resolveInitialAuth(user);
    }

    if (user) {
      await refreshUserReviewStatus(user);
    } else {
      setStatus(
        "You can read reviews without signing in. Your Google account is verified only when you publish a review."
      );
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Publish Review";
      }
    }
  });

  reviewForm.addEventListener("submit", async event => {
    event.preventDefault();

    const rating = Number(
      reviewForm.querySelector('input[name="reviewRating"]:checked')?.value || 0
    );
    const comment = $("reviewComment").value.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setStatus("Please choose a star rating from 1 to 5.", "error");
      return;
    }
    if (comment.length < 10 || comment.length > 600) {
      setStatus("Your review must be between 10 and 600 characters.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Verifying account…";

    try {
      const user = await getVerifiedUser(provider);
      submitButton.textContent = "Checking limit…";

      const existingCount = await countUserReviews(user.uid);
      if (existingCount >= MAX_REVIEWS_PER_USER) {
        const err = new Error("Review limit reached");
        err.code = "reviews/limit";
        throw err;
      }

      submitButton.textContent = "Publishing…";

      const reviewData = {
        userId: user.uid,
        displayName: (user.displayName || user.email || "Google user").slice(0, 80),
        photoURL: user.photoURL || "",
        rating,
        comment,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "reviews"), reviewData);

      $("reviewComment").value = "";
      const rating5 = reviewForm.querySelector('input[name="reviewRating"][value="5"]');
      if (rating5) rating5.checked = true;

      const remaining = MAX_REVIEWS_PER_USER - existingCount - 1;
      if (remaining <= 0) {
        submitButton.textContent = "Limit reached (3 reviews)";
        submitButton.disabled = true;
        setStatus(
          `Thank you! Your review is live. You have reached the maximum of ${MAX_REVIEWS_PER_USER} reviews per account.`,
          "success"
        );
      } else {
        submitButton.textContent = "Publish Review";
        submitButton.disabled = false;
        setStatus(
          `Thank you! Your review has been published. You can still post ${remaining} more review${remaining === 1 ? "" : "s"}.`,
          "success"
        );
      }

      await loadReviews();
    } catch (error) {
      console.error("Review submission failed:", error);
      setStatus(authErrorMessage(error), "error");
      if (error.code === "reviews/limit") {
        submitButton.textContent = "Limit reached (3 reviews)";
        submitButton.disabled = true;
      } else {
        submitButton.textContent = "Publish Review";
        submitButton.disabled = false;
      }
    } finally {
      if (submitButton.textContent !== "Limit reached (3 reviews)") {
        submitButton.disabled = false;
      }
    }
  });

  await loadReviews();
}

startReviews().catch(error => {
  console.error("Firebase reviews initialization failed:", error);
  $("reviewsAverage").textContent = "—";
  $("reviewsCount").textContent = "Reviews unavailable";
  reviewsList.replaceChildren(makeElement(
    "div", "reviews-empty",
    "Firebase could not start. Check the values in firebase-config.js and reload the site."
  ));
  submitButton.disabled = true;
  setStatus("Firebase setup needs attention before reviews can be used.", "error");
});
