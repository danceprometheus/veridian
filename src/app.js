import * as THREE from 'three';
import { getCurrentUser } from './auth.js';
import './styles.css';

console.log('🎮 App.js loaded');

// Wait for authentication
window.addEventListener('userAuthenticated', (event) => {
  const user = event.detail;
  console.log('✓ User authenticated, initializing world for:', user.email);
  initializeWorld(user);
});

function initializeWorld(user) {
  console.log('🌍 Initializing Veridian metaverse...');
  
  // === THREE.JS SETUP ===
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd4e8ed, 50, 200);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 5, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xd4e8ed, 1);
  renderer.xr.enabled = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // === LIGHTING ===
  const ambientLight = new THREE.AmbientLight(0xe8f4f8, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // === TERRAIN ===
  const terrainGeometry = new THREE.PlaneGeometry(400, 400, 50, 50);
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f9fa,
    metalness: 0.2,
    roughness: 0.8
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Add some terrain variation
  const positions = terrainGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setZ(i, Math.sin(positions.getX(i) * 0.1) * 0.5);
  }
  positions.needsUpdate = true;

  // === SIMPLE TEST CUBE ===
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xd4e8ed,
    metalness: 0.3,
    roughness: 0.7
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, 6, -5);
  cube.castShadow = true;
  scene.add(cube);

  // === VR BUTTON ===
  const vrButton = document.createElement('button');
  vrButton.id = 'vr-button';
  vrButton.textContent = 'ENTER VR';
  document.body.appendChild(vrButton);

  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if (supported) {
        vrButton.style.display = 'block';
      }
    });
  }

  vrButton.onclick = async function() {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor']
      });
      await renderer.xr.setSession(session);
      vrButton.style.display = 'none';
      
      session.addEventListener('end', () => {
        vrButton.style.display = 'block';
      });
    } catch(e) {
      console.error('VR error:', e);
      showMessage('Could not enter VR mode');
    }
  };

  // === CONTROLS ===
  const keys = {};
  const velocity = { x: 0, y: 0, z: 0 };
  const cameraRotation = { x: 0, y: 0 };
  const moveSpeed = 0.3;
  const minHeight = 5;
  let mouseX = 0, mouseY = 0;

  document.addEventListener('keydown', (e) => {
    if (e.key) keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key) keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('mousemove', (e) => {
    mouseX = e.movementX || 0;
    mouseY = e.movementY || 0;
    
    cameraRotation.y -= mouseX * 0.002;
    cameraRotation.x -= mouseY * 0.002;
    cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation.x));
  });

  // Pointer lock
  document.addEventListener('click', () => {
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
  });

  // === ANIMATION LOOP ===
  function animate() {
    // Movement
    const forward = new THREE.Vector3(Math.sin(cameraRotation.y), 0, Math.cos(cameraRotation.y));
    const right = new THREE.Vector3(Math.cos(cameraRotation.y), 0, -Math.sin(cameraRotation.y));

    if (keys['w']) velocity.z = -moveSpeed;
    else if (keys['s']) velocity.z = moveSpeed;
    else velocity.z *= 0.9;

    if (keys['a']) velocity.x = -moveSpeed;
    else if (keys['d']) velocity.x = moveSpeed;
    else velocity.x *= 0.9;

    camera.position.add(forward.multiplyScalar(velocity.z));
    camera.position.add(right.multiplyScalar(velocity.x));

    if (camera.position.y < minHeight) {
      camera.position.y = minHeight;
    }

    // Only apply rotation if not in VR
    if (!renderer.xr.isPresenting) {
      camera.rotation.y = cameraRotation.y;
      camera.rotation.x = cameraRotation.x;
    }

    // Rotate cube
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // Update HUD
    updateCoords();
    
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  // === UTILITY FUNCTIONS ===
  function updateCoords() {
    const coords = document.getElementById('coords');
    if (coords) {
      coords.textContent = `${Math.round(camera.position.x)}, ${Math.round(camera.position.y)}, ${Math.round(camera.position.z)}`;
    }
  }

  function showMessage(msg) {
    const msgEl = document.getElementById('message-display');
    if (msgEl) {
      msgEl.textContent = msg;
      msgEl.classList.add('show');
      setTimeout(() => msgEl.classList.remove('show'), 3000);
    }
  }

  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  console.log('✓ World initialized');
  showMessage('Welcome to Veridian, ' + (user.user_metadata?.display_name || 'traveler'));
}
```

---

## **FILE 9: `public/_redirects`**
```
/* /index.html 200
```

---

## **FILE 10: `.gitignore`**
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.vscode/
.idea/
package-lock.json
```

---

## **📋 HOW TO USE THESE FILES**

### **Option 1: Replace Files One by One in GitHub**

1. Go to https://github.com/danceprometheus/veridian
2. For each file above, click on the file, click **Edit** (pencil icon)
3. Delete all content, paste the new content
4. Commit changes

### **Option 2: Delete Everything and Re-upload**

1. Delete all files from your repo (except `.git`)
2. Create each file using **Add file** → **Create new file**
3. Paste the content from above
4. Commit

---

## **⚙️ CLOUDFLARE ENVIRONMENT VARIABLES**

**CRITICAL:** Add these to Cloudflare Pages:

Go to: Cloudflare Dashboard → Workers & Pages → veridian → Settings → Environment variables

**Add these 2 variables:**
```
VITE_SUPABASE_URL = https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
