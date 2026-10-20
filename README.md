# Ticket System – Setup and Installation Guide

## 1. Prerequisites

Install the following tools before running the project:

- Node.js and npm
- MySQL
- Git
- Android Studio and Android SDK
- React Native CLI development environment

## 2. Backend Setup

### Navigate to the Backend

```bash
cd backend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file inside the `backend` directory.

```env
PORT=3000

DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/DATABASE_NAME"

# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json
```

Replace the placeholder values with your actual credentials.

Make sure the MySQL database exists and the Firebase service account JSON file is available at the configured path.

### Generate Prisma Client

```bash
npx prisma generate
```

### Apply Database Migrations

```bash
npx prisma migrate dev
```

If migrations have already been applied and you only need to synchronize an existing development database, check your current Prisma migration setup before running additional migrations.

### Start the Backend Server

```bash
npm run dev
```

If the project does not define a `dev` script, use the appropriate script from `package.json`, for example:

```bash
npm start
```

The backend server runs at:

```text
http://localhost:3000
```

For requests from the Android emulator, use:

```text
http://10.0.2.2:3000
```

Keep the backend terminal running while using the application.

## 3. Frontend Setup

The frontend is built using React Native CLI for Android.

### Navigate to the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

If your frontend directory has a different name, use its actual path.

### Install Dependencies

```bash
npm install
```

### Start Metro Bundler

```bash
npm start
```

Metro bundles the JavaScript code required by the React Native application.

Keep this terminal running.

### Run the Android Application

Open another terminal in the frontend directory and execute:

```bash
npm run android
```

Ensure that an Android emulator is running or a physical Android device is connected.

### Frontend Backend Configuration

Configure the API base URL in the frontend according to your environment.

For the Android emulator:

```text
http://10.0.2.2:3000
```

For a physical Android device, use your computer's local network IP address, for example:

```text
http://192.168.1.10:3000
```

Replace the example IP address with your computer's actual local IP address. Ensure both devices are connected to the same network and the backend accepts connections from the device.

## 4. Firebase Configuration

The application uses Firebase Cloud Messaging (FCM) for push notifications.

### Frontend Firebase Configuration

Download `google-services.json` from the Firebase Console.

File location:

```text
frontend/
└── android/
    └── app/
        └── google-services.json
```

Steps to obtain the file:

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select the project's Firebase project.
3. Open Project Settings.
4. Select the registered Android application.
5. Download `google-services.json`.
6. Place the file inside `frontend/android/app/`.

Ensure the Android package name registered in Firebase matches the `applicationId` in `frontend/android/app/build.gradle`.

The Android project must also have the Google Services Gradle plugin configured according to the Firebase Android setup requirements.

### Backend Firebase Configuration

The backend uses a separate Firebase service account JSON file for the Firebase Admin SDK.

Configure its path in the backend `.env` file:

```env
GOOGLE_APPLICATION_CREDENTIALS=./path-to-service-account.json
```

Use the actual path to your service account file.

Keep the backend service account JSON private. Do not expose it in the frontend or commit it to a public repository.

## 5. Services and Technologies Used

### Backend

- **Node.js:** JavaScript runtime for server-side execution.
- **Express.js:** Backend API and routing framework.
- **MySQL:** Relational database for application data.
- **Prisma ORM:** Database queries, schema management, and migrations.
- **Firebase Admin SDK:** Server-side Firebase integration and push notification delivery.
- **ImageKit:** Image uploads, hosting, and image delivery.

### Frontend

- **React Native CLI:** Framework and tooling for Android mobile application development.
- **React Navigation:** Navigation between application screens.
- **Firebase Cloud Messaging:** Push notifications on supported devices.
- **React Native Firebase:** Firebase integration in the React Native application.

### Additional Technologies

- **JWT:** Token-based authentication and authorization, where implemented.
- **Socket.IO:** Real-time communication, if enabled in the current server configuration.

## 6. Important Project Files

```text
Ticket-System/
├── backend/
│   ├── .env
│   ├── package.json
│   └── prisma/
│       └── schema.prisma
│
└── frontend/
    ├── package.json
    └── android/
        └── app/
            └── google-services.json
```

The directory structure above is illustrative. Your actual project may contain additional files and folders.

- `backend/.env`: Backend environment variables and database configuration.
- `backend/prisma/schema.prisma`: Prisma database schema.
- `frontend/package.json`: Frontend dependencies and startup scripts.
- `frontend/android/app/google-services.json`: Firebase configuration for Android.
- Firebase service account JSON: Backend credentials for Firebase Admin SDK.

## 7. Security Guidelines

- Never commit `.env` files or private credentials to Git.
- Never expose the Firebase Admin service account JSON in the frontend.
- Keep the ImageKit private key on the backend.
- Add sensitive configuration files to `.gitignore`.
- Use environment variables or a secure secrets manager for production credentials.
- Use HTTPS and appropriate authentication when deploying the application.
- Restrict access to the database and Firebase service account according to the principle of least privilege.

## 8. Quick Start Commands

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

### Frontend

Open a separate terminal:

```bash
cd frontend
npm install
npm start
```

Open another terminal:

```bash
cd frontend
npm run android
```

**Important:** Configure the backend `.env`, MySQL database, Firebase credentials, and frontend `google-services.json` before running the application. Use the startup scripts defined in each directory's `package.json` if they differ from the commands above.
