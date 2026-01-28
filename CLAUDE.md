# CLAUDE.md - Veridian Codebase Guide

## Project Overview

**Veridian** (officially "HVN: VERIDIAN - Hall of Clarity") is an immersive 3D metaverse web application. It's a single-file, browser-based virtual reality environment for exploration, artistic expression, and multi-sensory content creation.

### Quick Facts
- **Architecture**: Single-file HTML application (`veridian.html`)
- **Size**: ~2,500 lines, ~95KB
- **Rendering**: Three.js (r128) with WebGL
- **VR Support**: WebXR API for immersive VR mode
- **Build System**: None required - direct browser deployment
- **Dependencies**: CDN-loaded only (Three.js, GLTFLoader, Google Fonts)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Three.js r128 | 3D rendering engine |
| WebGL 2.0 | GPU-accelerated graphics |
| WebXR | Virtual reality support |
| Web Audio API | Spatial/positional audio |
| GLTFLoader | 3D model loading |
| Canvas 2D | Minimap rendering |
| CSS3 | UI styling with glassmorphism effects |

### External CDN Dependencies
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js">
```

### Fonts
- **Cinzel**: Serif font for UI headings and branding
- **Cormorant Garamond**: Serif font for body text

## File Structure

```
/veridian/
├── veridian.html    # Complete application (HTML + CSS + JS)
├── README.md        # Brief project description
└── CLAUDE.md        # This file
```

## Code Architecture

The application is organized into logical sections within `veridian.html`:

### Document Structure
1. **`<head>`**: Meta tags, CDN scripts, embedded CSS
2. **`<style>`**: Complete CSS (~740 lines)
3. **`<body>`**: HTML structure for UI overlays
4. **`<script>`**: JavaScript application logic (~1,700 lines)

### JavaScript Section Markers
Look for these comment markers to navigate the code:
- `=== CORE SETUP ===` - Scene, camera, renderer initialization
- `=== LIGHTING (VERIDIAN: CLARITY) ===` - Light system
- `=== GROUND ===` - Terrain generation
- `=== STRUCTURES (HARMONIC ARCHITECTURE) ===` - Building generation
- `=== ARCHANGELS (FLOATING ENTITIES) ===` - Entity system
- `=== NFT GALLERY SYSTEM ===` - Artwork management
- `=== WEB AUDIO API SETUP ===` - Audio initialization

## Core Systems

### 1. Rendering System
- **Scene**: `THREE.Scene` with fog (0xe8f4f8)
- **Camera**: `THREE.PerspectiveCamera` (75 FOV)
- **Renderer**: `THREE.WebGLRenderer` with shadows enabled
- **Shadows**: 2048x2048 shadow maps

### 2. Lighting System
```javascript
// Ambient (0.6 intensity)
// Directional sun (0.8 intensity, casts shadows)
// Two point accent lights (veridian palette: #d4e8ed, #a8c5d1)
```

### 3. Navigation/Physics
- **Controls**: WASD movement, mouse look
- **Gravity**: 0.015 acceleration
- **Velocity-based**: Momentum with damping
- **Teleportation**: Random translocation (T key)
- **Vertical**: Space (ascend), Shift (descend)

### 4. Gallery System
Supports multiple media types:
- **Images**: PNG, JPG, WEBP (max 10MB)
- **Animations**: GIF, APNG (max 20MB)
- **Videos**: MP4, WEBM (max 100MB)
- **3D Models**: GLB, GLTF (max 30MB)

Key functions:
- `createArtworkFrame(mediaData, title, artist)` - Places artwork in world
- `placeArtwork()` - UI handler for artwork placement
- `selectMediaType(type)` - Switches media type in upload panel

### 5. Spatial Audio System
- Uses `THREE.PositionalAudio` and `THREE.AudioListener`
- Distance-based attenuation
- Visual representation: Pulsing ring resonators

Key functions:
- `placeMusicSource()` - Creates 3D audio source
- `openMusicPanel()` / `closeMusicPanel()` - UI handlers

### 6. Entity System (Angels)
- Procedurally generated floating entities
- Composed of: body (cone), head (sphere), halo (torus), wings (curved planes)
- Particle effects orbiting each entity

Key functions:
- `createAngelGeometry()` - Returns angel THREE.Group
- `spawnEntity()` - Places new angel in world

### 7. Structure Generation
- Four types: tower, pyramid, sphere, octahedron
- Positioned using golden ratio spiral pattern
- Materials: veridianGlass (transmissive), veridianCrystal (emissive)

### 8. VR System
```javascript
// WebXR session request with optional features
navigator.xr.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor', 'bounded-floor']
});
```

## Color Palette

```css
/* Primary Veridian Colors */
--primary: #d4e8ed;       /* Light cyan-blue */
--secondary: #a8c5d1;     /* Muted teal */
--background: #0f1e28;    /* Near-black blue */
--text: #e8f4f8;          /* Off-white */
--ground: #f5f9fa;        /* Light gray */
```

## UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Top HUD | Fixed top | Logo, stats display |
| Controls Panel | Fixed bottom center | Keyboard shortcuts |
| Minimap | Fixed bottom right | 2D overhead view |
| Gallery Info | Fixed right | Artwork count |
| Music Info | Fixed right | Music source count |
| NFT Upload Panel | Modal | Artwork upload |
| Music Upload Panel | Modal | Audio upload |

## Keyboard Controls

| Key | Action |
|-----|--------|
| W/S | Forward/Backward |
| A/D | Strafe left/right |
| Space | Ascend |
| Shift | Descend |
| T | Teleport randomly |
| E | Spawn entity |
| N | Open artwork panel |
| M | Open music panel |
| 1/2/3 | Time of day (Dawn/Midday/Dusk) |

## Development Guidelines

### Code Style
- **Functions**: camelCase, descriptive names
- **Variables**: camelCase
- **Comments**: Section headers with `===` markers
- **DOM queries**: Direct `document.getElementById()` calls
- **Three.js**: Standard scene graph patterns

### Making Changes

1. **Adding a new structure type**:
   - Add geometry case in `createStructure(x, z, type)`
   - Add to `types` array for procedural placement

2. **Adding new UI panel**:
   - Add HTML structure in `<body>`
   - Add CSS styles (follow glassmorphism pattern)
   - Add open/close functions
   - Add keyboard shortcut in event listener

3. **Modifying physics**:
   - Adjust constants in animation loop
   - `gravity = 0.015`, `damping = 0.92`

4. **Adding new media type**:
   - Update `selectMediaType()` function
   - Add file handling in `handleFile()`
   - Add rendering logic in `createArtworkFrame()`

### Performance Considerations
- Shadow map size: 2048x2048 (reduce for mobile)
- Entity count: 12 initial (adjust `spawnEntity` loop)
- Structure count: 40 (adjust golden ratio loop)
- Fog helps with depth culling

### Browser Compatibility
- Requires WebGL 2.0
- WebXR for VR (optional)
- Web Audio API for spatial sound
- HTML5 video codecs (H.264 recommended)

## Testing

No formal test suite. Manual testing approach:

1. **Visual**: Open in browser, check rendering
2. **Navigation**: Test WASD + mouse look
3. **Gallery**: Upload each media type
4. **Audio**: Place music source, verify spatial attenuation
5. **VR**: Test on WebXR-capable device/browser

### Browser Console
Key debug logs are output to console:
- `'VR button clicked!'`
- `'Creating artwork frame:'`
- `'Auto-detected:'` media type
- File size warnings

## Deployment

1. Host `veridian.html` on any web server
2. Ensure HTTPS for WebXR (required by browsers)
3. No build step required
4. CDN dependencies load automatically

## Common Tasks

### Add a new keyboard shortcut
```javascript
// In the keydown event listener
} else if (e.key.toLowerCase() === 'x') {
    myNewFunction();
}
```

### Add a new material
```javascript
const myMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.9,  // For glass effect
    transparent: true,
    opacity: 0.3
});
```

### Create a new 3D object
```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = veridianGlass;  // Use existing material
const mesh = new THREE.Mesh(geometry, material);
mesh.position.set(x, y, z);
mesh.castShadow = true;
scene.add(mesh);
```

### Show a user message
```javascript
showMessage('Your message here');
```

## Architecture Decisions

1. **Single-file design**: Maximizes portability, eliminates build complexity
2. **CDN dependencies**: Avoids bundling, ensures latest security patches
3. **No framework**: Pure Three.js for minimal overhead
4. **Inline everything**: Simplifies deployment to any static host
5. **Golden ratio placement**: Creates aesthetically pleasing procedural layouts
6. **Glassmorphism UI**: Modern, ethereal aesthetic matching the Veridian theme

## Known Limitations

- Large file uploads may strain memory (client-side processing)
- No persistence (artworks/music lost on refresh)
- VR requires WebXR-compatible browser
- Mobile performance varies (reduce entity/structure count if needed)
- Video codec support browser-dependent

## Useful References

- [Three.js Documentation](https://threejs.org/docs/)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
