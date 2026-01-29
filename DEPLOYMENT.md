# Cloudflare Pages Deployment Checklist

## ✅ Pre-Deployment

- [ ] Install dependencies: `npm install`
- [ ] Configure `.env` file with Firebase credentials
- [ ] Test locally: `npm run dev`
- [ ] Build locally: `npm run build`
- [ ] Preview build: `npm run preview`
- [ ] Verify VR works in preview
- [ ] Test Firebase connection

## ✅ Git Setup

```bash
# Initialize repository
git init
git add .
git commit -m "feat: migrate Veridian to Vite with Cloudflare Pages support

- Set up Vite build system with Three.js and Firebase
- Add environment variable configuration (VITE_*)
- Configure SPA routing with _redirects
- Prepare for metahvn.com custom domain deployment
- Support WebXR VR mode with proper HTTPS
"

# Create GitHub repository
# Go to https://github.com/new
# Name: metahvn
# Description: WebXR metaverse - Veridian Hall
# Public or Private: Your choice

# Push to GitHub
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/metahvn.git
git push -u origin main
```

## ✅ Cloudflare Pages Setup

### 1. Create Project

1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages**
3. Click: **Create application** → **Pages** → **Connect to Git**
4. Select repository: **metahvn**
5. Click: **Begin setup**

### 2. Build Settings

```
Project name: metahvn
Production branch: main
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Node version: 18
```

### 3. Environment Variables

Click **Add environment variables** and add:

**Production + Preview:**

```
VITE_FIREBASE_API_KEY=AIzaSyAZ39pUgEW6bjKbjAPuIjbUaapeqm6RYkw
VITE_FIREBASE_AUTH_DOMAIN=hvn-veridian.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hvn-veridian
VITE_FIREBASE_STORAGE_BUCKET=hvn-veridian.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=56117357959
VITE_FIREBASE_APP_ID=1:56117357959:web:cc8599bbbb12bd46b17722
VITE_FIREBASE_MEASUREMENT_ID=G-24FC22F0MG
VITE_API_URL=https://api.metahvn.com
VITE_ASSETS_URL=https://metahvn.com
```

### 4. Deploy

Click: **Save and Deploy**

Wait 2-3 minutes for build to complete.

### 5. Test Deployment

Visit: `https://metahvn.pages.dev`

Test:
- [ ] Page loads
- [ ] 3D world renders
- [ ] VR button appears
- [ ] Firebase connects (check console)
- [ ] Can upload art/music

## ✅ Custom Domain Setup

### 1. Add Custom Domain

In Cloudflare Pages:
1. Go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `metahvn.com`
4. Click **Continue**

### 2. DNS Configuration (Automatic)

Cloudflare automatically adds:
```
CNAME @ metahvn.pages.dev
```

Wait 1-2 minutes for propagation.

### 3. SSL/TLS

- **Encryption mode:** Full (strict)
- **Always Use HTTPS:** On
- **Auto HTTPS Rewrites:** On

### 4. Verify

Visit: `https://metahvn.com`

Should show:
- ✅ HTTPS (padlock icon)
- ✅ Valid SSL certificate
- ✅ VR button visible
- ✅ Firebase connected

## ✅ Firebase Configuration

### Update Authorized Domains

1. Firebase Console: https://console.firebase.google.com
2. Select project: **hvn-veridian**
3. Go to: **Authentication** → **Settings** → **Authorized domains**
4. Add:
   - `metahvn.com`
   - `www.metahvn.com`
   - `metahvn.pages.dev`
   - `localhost` (keep for dev)

### Verify Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artworks/{document=**} {
      allow read, write: if true;
    }
    match /music/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Click **Publish**

## ✅ Post-Deployment Verification

### Functionality Tests

- [ ] Navigate to `https://metahvn.com`
- [ ] Page loads without errors
- [ ] Check console: "✓ Firebase initialized"
- [ ] 3D world renders properly
- [ ] Angels are floating
- [ ] Structures visible
- [ ] Can move with WASD
- [ ] Mouse look works
- [ ] VR button appears
- [ ] Click VR button (if Quest available)
- [ ] Enter VR mode successfully
- [ ] Upload artwork works
- [ ] Upload music works
- [ ] Content persists on refresh
- [ ] Multiplayer sync works (test with 2 browsers)

### Deep Link Test

Test SPA routing:
- [ ] Direct URL load: `https://metahvn.com/` works
- [ ] Any path: `https://metahvn.com/anything` → redirects to index.html

### Performance Check

- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s
- [ ] FPS > 60 on desktop
- [ ] FPS > 72 on Quest

## 🚨 Rollback Plan

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push

# Cloudflare auto-deploys the revert
```

Or in Cloudflare:
1. Go to **Deployments**
2. Find previous working deployment
3. Click **···** → **Rollback to this deployment**

## 📊 Monitoring

### Cloudflare Analytics

- **Pages Analytics:** Real-time visitors
- **Web Analytics:** Page views, geography
- **Errors:** 4xx/5xx status codes

### Firebase Usage

- **Firestore:** Document reads/writes
- **Storage:** Bandwidth usage
- **Authentication:** Active users

## 🎉 Success Criteria

Deployment is successful when:

✅ `https://metahvn.com` loads
✅ VR mode works on Quest
✅ Firebase real-time sync active
✅ Multiple users can join
✅ Content persists
✅ No console errors
✅ SSL certificate valid
✅ Lighthouse score > 85

---

## 📞 Support

Issues? Check:
1. Cloudflare Pages deployment logs
2. Browser console (F12)
3. Firebase Console quota/errors
4. GitHub Actions (if configured)

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Build Time:** _________________
**Status:** ☐ Success  ☐ Failed  ☐ Partial
