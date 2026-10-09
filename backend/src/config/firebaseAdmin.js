const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const serviceAccount = require(
  path.resolve(
    __dirname,
    "../services/ticket-b8771-firebase-adminsdk-fbsvc-aa26b6ffce.json",
  ),
);

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
