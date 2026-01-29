import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getCurrentUser } from './auth.js';
import { supabase } from './supabase.js';
import { WalletManager } from './wallet.js';
import './styles.css';

console.log('🎮 Veridian with full features loading...');

let assetManager = null;

window.addEventListener('userAuthenticated', (event) => {
  const user = event.detail;
  console.log('✓ User authenticated, initializing world for:', user.email);
  initializeWorld(user);
});

function initializeWorld(user) {
  console.log('🌍 Initializing Veridian metaverse...');
  
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

  const listener = new THREE.AudioListener();
  camera.add(listener);

  const ambientLight = new THREE.AmbientLight(0xe8f4f8, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

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
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -5)
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  
  controller0.add(new THREE.Line(lineGeometry, lineMaterial));
  controller1.add(new THREE.Line(lineGeometry, lineMaterial));

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

  renderer.domElement.addEventListener('click', () => {
    if (!renderer.xr.isPresenting && document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
  });

  setTimeout(() => {
    try {
      assetManager = new AssetManager(scene, camera, listener);
      window.assetManager = assetManager;
      console.log('✓ Asset Manager initialized');
      console.log('✓ Upload button:', document.getElementById('upload-btn'));
      console.log('✓ Library button:', document.getElementById('library-btn'));
      console.log('✓ Wallet button:', document.getElementById('wallet-btn'));
    } catch (error) {
      console.error('❌ Failed to initialize AssetManager:', error);
    }
  }, 2000);

  const raycaster = new THREE.Raycaster();
  
  function animate() {
    const inVR = renderer.xr.isPresenting;

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

    if (inVR) {
      const session = renderer.xr.getSession();
      
      if (session) {
        for (const source of session.inputSources) {
          if (source.gamepad && source.gamepad.axes.length >= 4) {
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

    if (assetManager) {
      assetManager.update();
    }

    updateCoords();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

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
    console.log('🔌 Attaching event listeners...');
    
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      console.log('✓ Found upload button');
      uploadBtn.addEventListener('click', (e) => {
        console.log('Upload button clicked!');
        e.stopPropagation();
        const panel = document.getElementById('upload-panel');
        if (panel) {
          panel.classList.remove('hidden');
          console.log('✓ Upload panel opened');
        }
      });
    }

    const libraryBtn = document.getElementById('library-btn');
    if (libraryBtn) {
      console.log('✓ Found library button');
      libraryBtn.addEventListener('click', (e) => {
        console.log('Library button clicked!');
        e.stopPropagation();
        const panel = document.getElementById('library-panel');
        if (panel) {
          panel.classList.remove('hidden');
          console.log('✓ Library panel opened');
          this.loadUserAssets();
        }
      });
    }

    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) {
      console.log('✓ Found wallet button');
      walletBtn.addEventListener('click', (e) => {
        console.log('Wallet button clicked!');
        e.stopPropagation();
        const panel = document.getElementById('nft-panel');
        if (panel) {
          panel.classList.remove('hidden');
          console.log('✓ NFT panel opened');
        }
      });
    }

    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn) {
      console.log('✓ Found browse button');
      browseBtn.addEventListener('click', (e) => {
        console.log('Browse button clicked!');
        e.stopPropagation();
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.click();
          console.log('✓ File input triggered');
        }
      });
    }

    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      console.log('✓ Found file input');
      fileInput.addEventListener('change', (e) => {
        console.log('Files selected:', e.target.files.length);
        this.handleFiles(e.target.files);
      });
    }

    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
      console.log('✓ Found dropzone');
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
        console.log('Files dropped:', e.dataTransfer.files.length);
        this.handleFiles(e.dataTransfer.files);
      });
      dropzone.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Dropzone clicked');
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.click();
        }
      });
    }

    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = e.target.closest('.panel');
        if (panel) {
          panel.classList.add('hidden');
        }
      });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.updateFileAccept(e.target.dataset.type);
      });
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filterAssets(e.target.dataset.filter);
      });
    });

    const connectWalletBtn = document.getElementById('connect-wallet-btn');
    if (connectWalletBtn) {
      console.log('✓ Found connect wallet button');
      connectWalletBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        console.log('Connect wallet clicked!');
        const btn = connectWalletBtn;
        btn.disabled = true;
        btn.textContent = 'Connecting...';
        
        if (!this.walletManager) {
          this.walletManager = new WalletManager();
        }
        
        const address = await this.walletManager.connectMetaMask();
        
        if (address) {
          document.getElementById('wallet-address').textContent = 
            `Connected: ${this.walletManager.getShortAddress(address)}`;
          document.getElementById('wallet-address').classList.remove('hidden');
          btn.style.display = 'none';
          await this.loadNFTs();
        } else {
          btn.disabled = false;
          btn.textContent = 'Connect MetaMask';
        }
      });
    }
    
    console.log('✓ All event listeners attached');
  }

  updateFileAccept(type) {
    const fileInput = document.getElementById('file-input');
    const fileTypes = document.querySelector('.file-types');
    
    if (!fileInput || !fileTypes) return;
    
    const config = {
      image: { accept: 'image/*', text: 'JPG, PNG, GIF, WebP (max 10MB)' },
      video: { accept: 'video/mp4,video/webm', text: 'MP4, WebM (max 100MB)' },
      audio: { accept: 'audio/*', text: 'MP3, WAV, OGG (max 100MB)' },
      model: { accept: '.glb,.gltf', text: 'GLB, GLTF (max 30MB)' }
    };

    fileInput.accept = config[type].accept;
    fileTypes.textContent = `Supported: ${config[type].text}`;
  }

  async handleFiles(files) {
    if (!files || files.length === 0) return;

    const progressDiv = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (!progressDiv || !progressFill || !progressText) return;
    
    progressDiv.classList.remove('hidden');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = ((i + 1) / files.length) * 100;
      
      progressFill.style.width = progress + '%';
      progressText.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`;

      try {
        await this.uploadFile(file);
      } catch (error) {
        console.error('Upload failed:', file.name, error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    progressDiv.classList.add('hidden');
    progressFill.style.width = '0%';
    alert('Upload complete!');
    this.loadUserAssets();
  }

  async uploadFile(file) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const limits = {
      image: 10 * 1024 * 1024,
      video: 100 * 1024 * 1024,
      audio: 100 * 1024 * 1024,
      model: 30 * 1024 * 1024
    };
    
    const type = this.getAssetType(file.type, file.name);
    if (file.size > limits[type]) {
      throw new Error(`File too large. Max size: ${limits[type] / 1024 / 1024}MB`);
    }

    const base64 = await this.fileToBase64(file);
    
    const { data, error } = await supabase
      .from('assets')
      .insert({
        owner_id: user.id,
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        r2_key: `${user.id}/${type}/${Date.now()}_${file.name}`,
        cdn_url: base64,
        asset_type: type,
        scan_status: 'clean',
        metadata: { uploaded_from: 'web', original_name: file.name }
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getAssetType(mimeType, filename) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (filename.endsWith('.glb') || filename.endsWith('.gltf')) return 'model';
    return 'unknown';
  }

  async loadUserAssets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_id', user.id)
      .eq('scan_status', 'clean')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load assets:', error);
      return;
    }

    this.uploadedAssets = assets;
    this.renderAssetGrid(assets);
  }

  renderAssetGrid(assets) {
    const grid = document.getElementById('asset-grid');
    if (!grid) return;
    
    if (assets.length === 0) {
      grid.innerHTML = '<p class="empty-state">No assets yet. Upload some!</p>';
      return;
    }

    grid.innerHTML = assets.map(asset => `
      <div class="asset-card" data-id="${asset.id}" data-type="${asset.asset_type}">
        <div class="asset-preview">
          ${this.getAssetPreview(asset)}
        </div>
        <div class="asset-info">
          <p class="asset-name">${asset.filename}</p>
          <p class="asset-meta">${this.formatFileSize(asset.file_size)}</p>
        </div>
        <button class="btn-place" onclick="window.assetManager.placeAsset('${asset.id}')">Place in World</button>
      </div>
    `).join('');
  }

  getAssetPreview(asset) {
    switch (asset.asset_type) {
      case 'image':
        return `<img src="${asset.cdn_url}" alt="${asset.filename}">`;
      case 'video':
        return `<video src="${asset.cdn_url}" muted></video>`;
      case 'audio':
        return '<div class="icon-preview">🎵</div>';
      case 'model':
        return '<div class="icon-preview">📦</div>';
      default:
        return '<div class="icon-preview">📄</div>';
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  filterAssets(filter) {
    const cards = document.querySelectorAll('.asset-card');
    cards.forEach(card => {
      if (filter === 'all' || card.dataset.type === filter) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  async placeAsset(assetId) {
    const asset = this.uploadedAssets.find(a => a.id === assetId);
    if (!asset) return;

    const position = new THREE.Vector3();
    this.camera.getWorldDirection(position);
    position.multiplyScalar(5);
    position.add(this.camera.position);
    position.y = 1.5;

    let object;
    
    switch (asset.asset_type) {
      case 'image':
        object = await this.createImageFrame(asset, position);
        break;
      case 'video':
        object = await this.createVideoFrame(asset, position);
        break;
      case 'audio':
        object = await this.createMusicSource(asset, position);
        break;
      case 'model':
        object = await this.load3DModel(asset, position);
        break;
    }

    if (object) {
      this.scene.add(object);
      this.assets.push({ asset, object });
      await this.savePlacement(asset.id, position);
      document.getElementById('library-panel').classList.add('hidden');
    }
  }

  async createImageFrame(asset, position) {
    return new Promise((resolve) => {
      const texture = new THREE.TextureLoader().load(asset.cdn_url);
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData.assetId = asset.id;
      mesh.castShadow = true;
      resolve(mesh);
    });
  }

  async createVideoFrame(asset, position) {
    const video = document.createElement('video');
    video.src = asset.cdn_url;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.play();

    const texture = new THREE.VideoTexture(video);
    const geometry = new THREE.PlaneGeometry(3, 2);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.assetId = asset.id;
    mesh.userData.video = video;
    mesh.castShadow = true;
    
    return mesh;
  }

  async createMusicSource(asset, position) {
    const geometry = new THREE.SphereGeometry(0.3, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.assetId = asset.id;
    mesh.castShadow = true;
    
    const audio = new THREE.PositionalAudio(this.listener);
    const audioLoader = new THREE.AudioLoader();
    
    audioLoader.load(asset.cdn_url, (buffer) => {
      audio.setBuffer(buffer);
      audio.setRefDistance(5);
      audio.setVolume(0.5);
      audio.setLoop(true);
      audio.play();
    });
    
    mesh.add(audio);
    mesh.userData.audio = audio;
    
    return mesh;
  }

  async load3DModel(asset, position) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        asset.cdn_url,
        (gltf) => {
          const model = gltf.scene;
          model.position.copy(position);
          model.userData.assetId = asset.id;
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(model);
        },
        undefined,
        reject
      );
    });
  }

  async savePlacement(assetId, position) {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('room_artworks').insert({
      room_id: 'hall-of-clarity',
      asset_id: assetId,
      placed_by_id: user.id,
      position_x: position.x,
      position_y: position.y,
      position_z: position.z,
      scale: 1.0
    });
  }

  async loadPlacedAssets() {
    const { data, error } = await supabase
      .from('room_artworks')
      .select(`
        *,
        assets (*)
      `)
      .eq('room_id', 'hall-of-clarity');

    if (error) {
      console.error('Failed to load placed assets:', error);
      return;
    }

    for (const placement of data) {
      if (!placement.assets) continue;
      
      const position = new THREE.Vector3(
        placement.position_x,
        placement.position_y,
        placement.position_z
      );

      let object;
      const asset = placement.assets;
      
      switch (asset.asset_type) {
        case 'image':
          object = await this.createImageFrame(asset, position);
          break;
        case 'video':
          object = await this.createVideoFrame(asset, position);
          break;
        case 'audio':
          object = await this.createMusicSource(asset, position);
          break;
        case 'model':
          object = await this.load3DModel(asset, position);
          break;
      }

      if (object) {
        this.scene.add(object);
        this.assets.push({ asset, object });
      }
    }
  }

  async loadNFTs() {
    if (!this.walletManager) return;
    
    const nfts = await this.walletManager.fetchNFTs();
    const grid = document.getElementById('nft-grid');
    
    if (!grid) return;
    
    if (nfts.length === 0) {
      grid.innerHTML = '<p class="empty-state">No NFTs found in this wallet</p>';
      return;
    }
    
    grid.innerHTML = nfts.map((nft, index) => {
      const imageUrl = this.walletManager.getNFTImageUrl(nft);
      const name = this.walletManager.getNFTName(nft);
      const collection = this.walletManager.getNFTCollection(nft);
      
      return `
        <div class="asset-card" data-nft-index="${index}">
          <div class="asset-preview">
            ${imageUrl ? `<img src="${imageUrl}" alt="${name}" onerror="this.parentElement.innerHTML='<div class=icon-preview>🖼️</div>'">` : '<div class="icon-preview">🖼️</div>'}
          </div>
          <div class="asset-info">
            <p class="asset-name">${name}</p>
            <p class="asset-meta">${collection}</p>
          </div>
          <button class="btn-place" onclick="window.assetManager.placeNFT(${index})">Place in World</button>
        </div>
      `;
    }).join('');
  }

  async placeNFT(nftIndex) {
    if (!this.walletManager) return;
    
    const nft = this.walletManager.nfts[nftIndex];
    if (!nft) return;
    
    const position = new THREE.Vector3();
    this.camera.getWorldDirection(position);
    position.multiplyScalar(5);
    position.add(this.camera.position);
    position.y = 1.5;
    
    const imageUrl = this.walletManager.getNFTImageUrl(nft);
    if (!imageUrl) {
      alert('Could not load NFT image');
      return;
    }
    
    const texture = new THREE.TextureLoader().load(imageUrl);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshStandardMaterial({ 
      map: texture, 
      side: THREE.DoubleSide 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.nft = nft;
    mesh.castShadow = true;
    
    this.scene.add(mesh);
    this.assets.push({ nft, object: mesh });
    
    document.getElementById('nft-panel').classList.add('hidden');
  }

  update() {
    this.assets.forEach(({ object }) => {
      if (object.userData.audio) {
        object.rotation.y += 0.01;
      }
    });
  }
}
