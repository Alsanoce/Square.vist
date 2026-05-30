# Firebase Storage CORS setup

Create `cors.json`:

```json
[
  {
    "origin": [
      "http://localhost:5173",
      "https://YOUR-NETLIFY-DOMAIN.netlify.app",
      "https://YOUR-DOMAIN.com"
    ],
    "method": ["GET", "POST", "PUT"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:

```bash
gcloud storage buckets update gs://whater-f15d4.appspot.com --cors-file=cors.json
```

If the Firebase Console shows the bucket as `whater-f15d4.firebasestorage.app`, use:

```bash
gcloud storage buckets update gs://whater-f15d4.firebasestorage.app --cors-file=cors.json
```

## Recommended Firebase Storage Rules

```js
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /bank-receipts/{fileName} {
      allow read: if false;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```
