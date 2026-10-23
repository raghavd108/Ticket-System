const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.resolve(
  __dirname,
  "../../",
  process.env.Firebase_path,
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Firebase service account file not found: ${serviceAccountPath}`,
  );
}

const serviceAccount = require(serviceAccountPath);

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

const messaging = getMessaging(firebaseApp);

module.exports = {
  firebaseApp,
  messaging,
};
