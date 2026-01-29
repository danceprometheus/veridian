import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import config from './main.js';
import './styles.css';

// === FIREBASE SETUP ===
console.log('Initializing Firebase...');
let db, storage, firebaseReady = false;

try {
  const app = initializeApp(config.firebase);
  db = getFirestore(app);
  storage = getStorage(app);
  firebaseReady = true;
  console.log('✓ Firebase initialized');
} catch (error) {
  console.error('❌ Firebase failed:', error);
  firebaseReady = false;
}

const loadedArtworks = new Set();
const loadedMusicSources = new Set();

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

// Audio
const listener = new THREE.AudioListener();
camera.add(listener);
const audioContext = listener.context;

// === LIGHTING ===
const ambientLight = new THREE.AmbientLight(0xe8f4f8, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.far = 200;
scene.add(directionalLight);

const accentLight1 = new THREE.PointLight(0xa8c5d1, 0.5, 100);
accentLight1.position.set(30, 20, 30);
scene.add(accentLight1);

const accentLight2 = new THREE.PointLight(0xa8c5d1, 0.5, 100);
accentLight2.position.set(-30, 20, -30);
scene.add(accentLight2);

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

// Terrain variation
const positions = terrainGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  positions.setZ(i, Math.sin(positions.getX(i) * 0.1) * 0.5 + Math.cos(positions.getY(i) * 0.1) * 0.5);
}
positions.needsUpdate = true;
terrainGeometry.computeVertexNormals();

// === STRUCTURES ===
const structures = [];
const veridianGlass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.9,
  transparent: true,
  opacity: 0.3
});

function createStructure(type, position) {
  let geometry;
  switch(type) {
    case 'tower':
      geometry = new THREE.CylinderGeometry(1, 1.5, 15, 6);
      break;
    case 'pyramid':
      geometry = new THREE.ConeGeometry(3, 12, 4);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(2.5, 16, 16);
      break;
    case 'octahedron':
      geometry = new THREE.OctahedronGeometry(3, 0);
      break;
  }
  
  const structure = new THREE.Mesh(geometry, veridianGlass);
  structure.position.copy(position);
  structure.castShadow = true;
  structure.receiveShadow = true;
  scene.add(structure);
  structures.push(structure);
}

// Golden ratio spiral placement
const phi = 0.618;
for (let i = 0; i < 40; i++) {
  const angle = i * phi * Math.PI * 2;
  const radius = 20 + i * 3;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = 3 + Math.random() * 10;
  
  const types = ['tower', 'pyramid', 'sphere', 'octahedron'];
  const type = types[i % types.length];
  
  createStructure(type, new THREE.Vector3(x, y, z));
}

// === GLOBAL STATE ===
const artworks = [];
const musicSources = [];
const entities = [];
let currentImageData = null;
let currentMediaType = 'image';
let currentAudioData = null;
let previewAudio = null;

// Movement
const velocity = { x: 0, y: 0, z: 0 };
const cameraRotation = { x: 0, y: 0 };
const keys = {};
const moveSpeed = 0.3;
const ascendSpeed = 0.5;
const gravity = 0.02;
const minHeight = 5;
let isAscending = false;

// Export for use in other modules
window.veridianState = {
  scene,
  camera,
  renderer,
  artworks,
  musicSources,
  entities,
  config,
  firebaseReady,
  db,
  storage
};

console.log('✓ Core setup complete');
