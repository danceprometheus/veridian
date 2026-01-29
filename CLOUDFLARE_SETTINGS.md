# Cloudflare Pages Settings - Quick Reference

## 📋 Exact Build Configuration

Copy these **EXACT** values into Cloudflare Pages:

### General Settings

| Setting | Value |
|---------|-------|
| **Project name** | `metahvn` |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |

### Build Settings

| Setting | Value |
|---------|-------|
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (leave blank or `/`) |
| **Install command** | `npm install` (auto) |

### Build System

| Setting | Value |
|---------|-------|
| **Node version** | `18` or `20` |
| **Package manager** | `npm` |

---

## 🔑 Environment Variables

Add these in **Settings → Environment variables**

Apply to: **Both Production and Preview**

```bash
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

---

## 🌐 Custom Domain Settings

### Primary Domain

| Setting | Value |
|---------|-------|
| **Domain** | `metahvn.com` |
| **DNS record type** | `CNAME` |
| **DNS target** | `metahvn.pages.dev` |

### SSL/TLS Settings

| Setting | Value |
|---------|-------|
| **SSL/TLS encryption** | `Full (strict)` |
| **Always Use HTTPS** | `On` |
| **Auto HTTPS Rewrites** | `On` |
| **Minimum TLS Version** | `1.2` |

---

## 📁 File Structure Verification

Ensure these files exist in your repo:

```
✅ package.json
✅ vite.config.js
✅ index.html
✅ src/main.js
✅ src/app.js
✅ src/styles.css
✅ public/_redirects
✅ .gitignore
✅ README.md
```

---

## 🚀 Deploy Command Sequence

```bash
# 1. Verify build works locally
npm install
npm run build
npm run preview

# 2. Commit and push
git add .
git commit -m "feat: production-ready Vite build for Cloudflare Pages"
git push origin main

# 3. Cloudflare auto-deploys
# Watch: https://dash.cloudflare.com → Workers & Pages → metahvn → Deployments
```

---

## ✅ Validation Checklist

After deployment, verify:

- [ ] Build succeeds (green checkmark in Cloudflare)
- [ ] `https://metahvn.pages.dev` loads
- [ ] `https://metahvn.com` loads (after DNS propagation)
- [ ] Console shows: "✓ Firebase initialized"
- [ ] VR button appears
- [ ] Can enter VR mode
- [ ] Firebase sync works
- [ ] No 404 errors on refresh

---

## 🔧 Build Command Details

What Cloudflare runs:

```bash
npm install              # Install dependencies
npm run build           # Runs: vite build
# Output: dist/ directory
# Serves: dist/index.html for all routes (via _redirects)
```

---

## 📊 Expected Build Output

```
dist/
├── index.html
├── assets/
│   ├── main-[hash].js      # Bundled app
│   ├── vendor-[hash].js    # Three.js, Firebase
│   └── style-[hash].css    # Styles
└── _redirects              # SPA routing
```

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Check locally first
npm run build

# Common fixes:
npm ci                    # Clean install
rm -rf node_modules       # Remove modules
npm install               # Reinstall
```

### Environment Variables Not Working

- Variables must start with `VITE_`
- Redeploy after adding variables
- Check **both** Production and Preview

### 404 on Refresh

- Verify `public/_redirects` exists
- Content: `/* /index.html 200`
- Check it's in the `dist/` folder after build

### Firebase Connection Fails

- Add domain to Firebase authorized domains
- Check all `VITE_FIREBASE_*` variables are set
- Verify Firestore is enabled

---

## 📞 Support Resources

- **Cloudflare Docs:** https://developers.cloudflare.com/pages
- **Vite Docs:** https://vitejs.dev/guide
- **Firebase Console:** https://console.firebase.google.com
- **Build Logs:** Cloudflare Dashboard → Deployments → View logs

---

**Last Updated:** 2026-01-28
**Version:** 1.0.0
**Status:** Production Ready ✅
