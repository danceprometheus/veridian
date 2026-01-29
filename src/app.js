import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getCurrentUser } from './auth.js';
import { supabase } from './supabase.js';
import { WalletManager } from './wallet.js';
import './styles.css';

console.log('🎮 Veridian with full features loading...');

let assetManager = null;

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
  camera.position.set(0, 1.6, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xd4e8ed, 1);
  renderer.xr.enabled = true;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // === AUDIO ===
  const listener = new THREE.AudioListener();
  camera.add(listener);

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
  terrain.userData.isGround = true;
  scene.add(terrain);

  // === VR CONTROLLERS ===
  const controllerModelFactory = new XRControllerModelFactory();
  
  const controller0 = renderer.xr.getController(0);
  controller0.userData.handedness = 'left';
  scene.add(controller0);
  
  const controllerGrip0 = renderer.xr.getControllerGrip(0);
  controllerGrip0.add(controllerModelFactory.createControllerModel(controllerGrip0));
  scene.add(controllerGrip0);
  
  const controller1 = renderer.xr.getController(1);
  controller1.userData.handedness = 'right';
  scene.add(controller1);
  
  const controllerGrip1 = renderer.xr.getControllerGrip(1);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);
  
  // Laser pointers
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -5)
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  
  controller0.add(new THREE.Line(lineGeometry, lineMaterial));
  controller1.add(new THREE.Line(lineGeometry, lineMaterial));

  // VR movement
  const vrMovement = {
    speed: 0.05,
    teleportMode: false,
    teleportMarker: null,
    turnCooldown: false
  };

  const markerGeometry = new THREE.RingGeometry(0.25, 0.35, 32);
  const markerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  vrMovement.teleportMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  vrMovement.teleportMarker.rotation.x = -Math.PI / 2;
  vrMovement.teleportMarker.visible = false;
  scene.add(vrMovement.teleportMarker);

  // VR Controller events
  controller0.addEventListener('selectstart', () => {
    controller0.userData.selectPressed = true;
  });
  controller0.addEventListener('selectend', () => {
    controller0.userData.selectPressed = false;
  });

  controller1.addEventListener('selectstart', () => {
    controller1.userData.selectPressed = true;
    vrMovement.teleportMode = true;
    vrMovement.teleportMarker.visible = true;
  });

  controller1.addEventListener('selectend', () => {
    if (vrMovement.teleportMode && vrMovement.teleportMarker.visible) {
      camera.position.x = vrMovement.teleportMarker.position.x;
      camera.position.z = vrMovement.teleportMarker.position.z;
    }
    controller1.userData.selectPressed = false;
    vrMovement.teleportMode = false;
    vrMovement.teleportMarker.visible = false;
  });

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
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
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

  // === DESKTOP CONTROLS ===
  const keys = {};
  const velocity = { x: 0, y: 0, z: 0 };
  const cameraRotation = { x: 0, y: 0 };
  const moveSpeed = 0.3;
  const minHeight = 1.6;

  document.addEventListener('keydown', (e) => {
    if (e.key) keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key) keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
      cameraRotation.y -= (e.movementX || 0) * 0.002;
      cameraRotation.x -= (e.movementY || 0) * 0.002;
      cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation.x));
    }
  });

  // Only lock pointer when clicking on canvas
  renderer.domElement.addEventListener('click', () => {
    if (!renderer.xr.isPresenting && document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
  });

  // === ASSET MANAGER ===
  setTimeout(() => {
    assetManager = new AssetManager(scene, camera, listener);
    window.assetManager = assetManager;
    console.log('✓ Asset Manager initialized');
  }, 1000);

  // === ANIMATION LOOP ===
  const raycaster = new THREE.Raycaster();
  
  function animate() {
    const inVR = renderer.xr.isPresenting;

    // Desktop movement
    if (!inVR) {
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

      camera.rotation.y = cameraRotation.y;
      camera.rotation.x = cameraRotation.x;
    }

    // VR movement
    if (inVR) {
      const session = renderer.xr.getSession();
      
      if (session) {
        for (const source of session.inputSources) {
          if (source.gamepad && source.gamepad.axes.length >= 4) {
            // Left thumbstick: locomotion
            if (source.handedness === 'left') {
              const x = source.gamepad.axes[2];
              const y = source.gamepad.axes[3];
              
              if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
                const moveVector = new THREE.Vector3(x, 0, y);
                moveVector.applyQuaternion(camera.quaternion);
                moveVector.y = 0;
                moveVector.normalize().multiplyScalar(vrMovement.speed);
                camera.position.add(moveVector);
              }
            }
            
            // Right thumbstick: snap turn
            if (source.handedness === 'right') {
              const x = source.gamepad.axes[2];
              if (Math.abs(x) > 0.8 && !vrMovement.turnCooldown) {
                camera.rotation.y += (x > 0 ? -1 : 1) * Math.PI / 4;
                vrMovement.turnCooldown = true;
                setTimeout(() => vrMovement.turnCooldown = false, 300);
              }
            }
          }
        }
        
        // Update teleport marker
        if (vrMovement.teleportMode && controller1.userData.selectPressed) {
          raycaster.setFromXRController(controller1);
          const intersects = raycaster.intersectObject(terrain);
          
          if (intersects.length > 0) {
            vrMovement.teleportMarker.position.copy(intersects[0].point);
            vrMovement.teleportMarker.visible = true;
          } else {
            vrMovement.teleportMarker.visible = false;
          }
        }
      }
    }

    // Update asset manager
    if (assetManager) {
      assetManager.update();
    }

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

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  console.log('✓ World initialized');
  showMessage('Welcome to Veridian, ' + (user.user_metadata?.display_name || 'traveler'));
}

// === ASSET MANAGER CLASS ===
class AssetManager {
  constructor(scene, camera, listener) {
    this.scene = scene;
    this.camera = camera;
    this.listener = listener;
    this.assets = [];
    this.uploadedAssets = [];
    this.gltfLoader = new GLTFLoader();
    this.walletManager = null;
    
    this.createUI();
    this.loadUserAssets();
    this.loadPlacedAssets();
  }

  createUI() {
    // Upload Panel
    const uploadPanel = document.createElement('div');
    uploadPanel.id = 'upload-panel';
    uploadPanel.className = 'panel hidden';
    uploadPanel.innerHTML = `
      <div class="panel-header">
        <h2>Upload Assets</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="upload-tabs">
          <button class="tab-btn active" data-type="image">Images</button>
          <button class="tab-btn" data-type="video">Videos</button>
          <button class="tab-btn" data-type="audio">Music</button>
          <button class="tab-btn" data-type="model">3D Models</button>
        </div>
        
        <input type="file" id="file-input" accept="image/*" multiple hidden>
        <div class="upload-dropzone" id="dropzone">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <p>Drag files here or click to browse</p>
          <p class="file-types">Supported: JPG, PNG, GIF, WebP (max 10MB)</p>
        </div>
        <button class="btn-primary" id="browse-btn">Browse Files</button>
        
        <div class="upload-progress hidden" id="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <p id="progress-text">Uploading...</p>
        </div>
      </div>
    `;
    document.body.appendChild(uploadPanel);

    // Library Panel
    const libraryPanel = document.createElement('div');
    libraryPanel.id = 'library-panel';
    libraryPanel.className = 'panel hidden';
    libraryPanel.innerHTML = `
      <div class="panel-header">
        <h2>My Assets</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div class="library-filters">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="image">Images</button>
          <button class="filter-btn" data-filter="video">Videos</button>
          <button class="filter-btn" data-filter="audio">Music</button>
          <button class="filter-btn" data-filter="model">3D</button>
        </div>
        <div class="asset-grid" id="asset-grid">
          <p class="empty-state">No assets yet. Upload some!</p>
        </div>
      </div>
    `;
    document.body.appendChild(libraryPanel);

    // NFT Panel
    const nftPanel = document.createElement('div');
    nftPanel.id = 'nft-panel';
    nftPanel.className = 'panel hidden';
    nftPanel.innerHTML = `
      <div class="panel-header">
        <h2>My NFTs</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="panel-content">
        <div id="wallet-status" class="wallet-status">
          <button class="btn-primary" id="connect-wallet-btn">Connect MetaMask</button>
          <p class="wallet-address hidden" id="wallet-address"></p>
        </div>
        <div class="asset-grid" id="nft-grid">
          <p class="empty-state">Connect your wallet to see your NFTs</p>
        </div>
      </div>
    `;
    document.body.appendChild(nftPanel);

    // Action Buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    actionButtons.innerHTML = `
      <button class="action-btn" id="upload-btn" title="Upload">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        Upload
      </button>
      <button class="action-btn" id="library-btn" title="Library">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        Library
      </button>
      <button class="action-btn" id="wallet-btn" title="NFTs">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        NFTs
      </button>
    `;
    document.body.appendChild(actionButtons);
    
    setTimeout(() => {
      this.attachEventListeners();
      console.log('✓ Event listeners attached');
    }, 100);
  }

  attachEventListeners() {
    // Upload button
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        document.getElementById('upload-panel').classList.remove('hidden');
      });
    }

    // Library button
    const libraryBtn = document.getElementById('library-btn');
    if (libraryBtn) {
      libraryBtn.addEventListener('click', () => {
        document.getElementById('library-panel').classList.remove('hidden');
        this.loadUserAssets();
      });
    }

    // Wallet button
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) {
      walletBtn.addEventListener('click', () => {
        document.getElementById('nft-panel').classList.remove('hidden');
      });
    }

    // Browse button
    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => {
        document.getElementById('file-input').click();
      });
    }

    // File input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFiles(e.target.files);
      });
    }

    // Dropzone
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        this.handleFiles(e.dataTransfer.files);
      });
      dropzone.addEventListener('click', () => {
