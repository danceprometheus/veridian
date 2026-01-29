# MetaHVN - Veridian Hall

WebXR/Three.js metaverse deployed on Cloudflare Pages with custom domain.

## 🏗️ Project Structure

```
metahvn-project/
├── public/
│   └── _redirects          # Cloudflare Pages SPA routing
├── src/
│   ├── main.js             # Entry point with env config
│   ├── app.js              # Core Three.js application
│   └── styles.css          # Global styles
├── index.html              # HTML entry point
├── vite.config.js          # Vite build configuration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variable template
└── .env                    # Actual environment variables (gitignored)
```

## 🚀 Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# ... etc
```

### 3. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 4. Build for Production

```bash
npm run build
```

Output: `dist/` directory

### 5. Preview Production Build

```bash
npm run preview
```

## ☁️ Cloudflare Pages Deployment

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit: Veridian metaverse"
git remote add origin https://github.com/YOUR_USERNAME/metahvn.git
git push -u origin main
```

2. **Connect to Cloudflare Pages**

- Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
- Navigate to **Workers & Pages** → **Create application** → **Pages**
- Click **Connect to Git**
- Select your repository: `metahvn`
- Configure build settings:

### Build Configuration

```yaml
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: /
```

### Environment Variables in Cloudflare

Add these in **Settings** → **Environment variables**:

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

3. **Deploy**

Click **Save and Deploy**

Your site will be available at:
- `https://metahvn.pages.dev` (Cloudflare subdomain)
- `https://metahvn.com` (after custom domain setup)

### Custom Domain Setup

1. In Cloudflare Pages, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `metahvn.com`
4. Cloudflare will create the DNS records automatically
5. Wait 1-2 minutes for propagation

Your site will now be live at: **https://metahvn.com**

## 🔥 Firebase Configuration

### Update Authorized Domains

In Firebase Console:
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add:
   - `metahvn.com`
   - `metahvn.pages.dev`
   - `localhost` (for development)

### Firestore Security Rules

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

## 📝 Git Workflow

### Initial Setup

```bash
git init
git add .
git commit -m "feat: initial Veridian metaverse setup with Vite and Firebase"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/metahvn.git
git push -u origin main
```

### Ongoing Development

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push

# Cloudflare Pages auto-deploys on push to main
```

## 🎯 Features

- ✅ WebXR VR support (Oculus Quest compatible)
- ✅ Real-time multiplayer via Firebase
- ✅ Art gallery with image/video/3D model support
- ✅ Spatial audio music system
- ✅ Floating ethereal angels
- ✅ Crystal architecture
- ✅ SPA routing with deep link support
- ✅ Environment variable configuration
- ✅ Production-optimized build

## 🔧 Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build (port 4173)

## 📦 Dependencies

- **three** - 3D graphics library
- **firebase** - Backend/database
- **vite** - Build tool

## 🌐 URLs

- **Development:** http://localhost:3000
- **Production:** https://metahvn.com
- **Cloudflare:** https://metahvn.pages.dev

## 🐛 Troubleshooting

### Build fails on Cloudflare

Check that `npm run build` works locally first.

### Environment variables not working

- Ensure they're prefixed with `VITE_`
- Check they're set in Cloudflare Pages settings
- Redeploy after adding new variables

### VR button doesn't appear

- Check that `metahvn.com` is in Firebase authorized domains
- Verify HTTPS is working (required for WebXR)

### Firebase connection fails

- Verify all `VITE_FIREBASE_*` variables are set
- Check Firebase security rules are published
- Ensure Firestore is enabled

## 📄 License

Proprietary - MetaHVN
