# App push notification integration

All device endpoints require the normal user JWT:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Register or refresh a device

Call this after login and whenever Firebase refreshes the app's registration token.

```http
POST /push/devices

{
  "token": "<firebase-registration-token>",
  "platform": "android",
  "deviceId": "<stable-app-installation-id>",
  "deviceName": "Pixel 9",
  "appVersion": "1.0.0"
}
```

`platform` can be `android`, `ios`, `web`, or `unknown`. Registering a refreshed
token for the same `deviceId` automatically deactivates the older token.

## Remove a device

Call this before logout:

```http
DELETE /push/devices

{
  "token": "<firebase-registration-token>"
}
```

The app may send `deviceId` instead of `token`. To sign out every device:

```http
DELETE /push/devices/all
```

Registered device metadata is available from:

```http
GET /push/devices
```

The response contains only a token preview; the full registration token is
never returned by the API.

## VPS Firebase configuration

Configure these as production environment variables from a Firebase service
account, then restart the backend:

```dotenv
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Do not commit the service-account JSON or private key. Device registration
continues to work when credentials are absent, but FCM delivery stays disabled.
