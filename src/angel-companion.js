import * as THREE from 'three';
import { ANGELA_BEHAVIOR_MODES, AngelaBehaviorModeController } from './angel-behavior-mode.js';

const CONTROL_KEYS = Object.freeze({
  FOLLOW: 'l',
  STAY: 'k',
});

export function isTextInputLikeElement(element) {
  if (!element) return false;
  const tagName = (element.tagName || '').toUpperCase();
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || element.isContentEditable === true;
}

const DEFAULT_SYSTEM_PROMPT = `You are Angela, a warm protective guardian angel in Sean's metaverse heaven called Veridian.
Keep responses concise (1-3 short paragraphs). Be kind, clear, and practical.`;

export class AngelCompanion {
  constructor(scene, camera, opts = {}) {
    this.scene = scene;
    this.camera = camera;
    this.followDistance = opts.followDistance ?? 2.8;
    this.followHeight = opts.followHeight ?? 0.2;
    this.group = this._createAngelModel();
    this.scene.add(this.group);

    this.behaviorController = opts.behaviorController || new AngelaBehaviorModeController();

    this.lastTalkAt = 0;
    this.isSpeaking = false;
    this.voiceReady = false;
    this.synth = window.speechSynthesis || null;

    this._createUI();
    this._pickVoice();
  }

  _createAngelModel() {
    const root = new THREE.Group();
    root.name = 'AngelaCompanion';

    // Body (robe)
    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 1.45, 20),
      new THREE.MeshStandardMaterial({ color: 0xf8f8ff, metalness: 0.05, roughness: 0.6 })
    );
    robe.position.y = 0.8;
    robe.castShadow = true;
    root.add(robe);

    // Head
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xffead8, metalness: 0.0, roughness: 0.8 })
    );
    this.head.position.y = 1.65;
    this.head.castShadow = true;
    root.add(this.head);

    // Mouth (simple lip flap target)
    this.mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x9e4b5a })
    );
    this.mouth.position.set(0, 1.58, 0.16);
    root.add(this.mouth);

    // Halo
    this.halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.02, 12, 40),
      new THREE.MeshStandardMaterial({ color: 0xffe48e, emissive: 0xffd76a, emissiveIntensity: 0.75 })
    );
    this.halo.position.y = 1.95;
    this.halo.rotation.x = Math.PI / 2;
    root.add(this.halo);

    // Wings
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xaecfff,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });

    this.leftWing = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.95), wingMat);
    this.leftWing.position.set(-0.42, 1.15, -0.1);
    this.leftWing.rotation.set(0.05, 0.35, -0.14);
    root.add(this.leftWing);

    this.rightWing = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.95), wingMat.clone());
    this.rightWing.position.set(0.42, 1.15, -0.1);
    this.rightWing.rotation.set(0.05, -0.35, 0.14);
    root.add(this.rightWing);

    // Ambient glow
    const light = new THREE.PointLight(0xddefff, 0.75, 7.5, 2);
    light.position.set(0, 1.4, 0.2);
    root.add(light);

    root.position.set(0, 0, 2.6);
    return root;
  }

  _createUI() {
    const panel = document.createElement('div');
    panel.id = 'angel-chat-panel';
    panel.innerHTML = `
      <div class="angel-chat-header">🪽 Angela</div>
      <div id="angel-chat-log" class="angel-chat-log">
        <div class="angel-msg angel-msg-bot">I'm here with you in Veridian. Press <b>F</b> to talk to me. Type <b>follow</b>/<b>stay</b> or press <b>L</b> (follow) and <b>K</b> (stay).</div>
      </div>
      <div class="angel-chat-input-row">
        <input id="angel-chat-input" placeholder="Ask Angela..." maxlength="400" />
        <button id="angel-chat-send">Send</button>
      </div>
    `;
    document.body.appendChild(panel);

    this.panel = panel;
    this.logEl = panel.querySelector('#angel-chat-log');
    this.inputEl = panel.querySelector('#angel-chat-input');

    panel.querySelector('#angel-chat-send').addEventListener('click', () => this.sendFromInput());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendFromInput();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'f') {
        this.panel.classList.toggle('show');
        if (this.panel.classList.contains('show')) this.inputEl.focus();
        return;
      }

      this.handleControlKeydown(e);
    });
  }

  _pickVoice() {
    if (!this.synth) return;
    const choose = () => {
      const voices = this.synth.getVoices();
      this.voice = voices.find(v => /female|samantha|aria|nova|alloy|en-us/i.test(v.name)) || voices[0] || null;
      this.voiceReady = !!this.voice;
    };
    choose();
    if (!this.voiceReady) window.speechSynthesis.onvoiceschanged = choose;
  }

  addChat(text, from = 'bot') {
    if (!this.logEl) return;
    const el = document.createElement('div');
    el.className = `angel-msg angel-msg-${from}`;
    el.textContent = text;
    this.logEl.appendChild(el);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  handleControlKeydown(event) {
    const key = (event?.key || '').toLowerCase();
    if (!key) return { handled: false };

    if (isTextInputLikeElement(event.target)) {
      return { handled: false, ignored: true };
    }

    if (key === CONTROL_KEYS.STAY) {
      event.preventDefault();
      return this._applyModeControl('stay');
    }

    if (key === CONTROL_KEYS.FOLLOW) {
      event.preventDefault();
      return this._applyModeControl('follow');
    }

    return { handled: false };
  }

  _applyModeControl(modeCommand) {
    const modeResult = this.handleModeCommand(modeCommand);
    if (!modeResult.handled) return modeResult;

    const modeReply = this._buildModeReply(modeResult);
    if (modeReply) this.addChat(modeReply, 'bot');

    return { ...modeResult, message: modeReply };
  }

  handleModeCommand(commandText) {
    return this.behaviorController.applyCommand(commandText);
  }

  getBehaviorMode() {
    return this.behaviorController.getMode();
  }

  _buildModeReply(modeResult) {
    if (!modeResult.handled) return null;

    if (modeResult.mode === ANGELA_BEHAVIOR_MODES.STAY) {
      return modeResult.changed
        ? 'I will stay right here until you ask me to follow again.'
        : 'I am already staying here with you.';
    }

    return modeResult.changed
      ? 'I am following you again.'
      : 'I am already following your path through Veridian.';
  }

  async sendFromInput() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.inputEl.value = '';
    this.addChat(text, 'user');

    const modeResult = this.handleModeCommand(text);
    if (modeResult.handled) {
      const modeReply = this._buildModeReply(modeResult);
      if (modeReply) {
        this.addChat(modeReply, 'bot');
        await this.speak(modeReply);
      }
      return;
    }

    const reply = await this.getReply(text);
    this.addChat(reply, 'bot');
    await this.speak(reply);
  }

  async getReply(userMessage) {
    try {
      const res = await fetch('/api/angel/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
        }),
      });
      if (!res.ok) throw new Error(`chat failed ${res.status}`);
      const data = await res.json();
      return data.reply || 'I am here with you.';
    } catch {
      // Local fallback
      const low = userMessage.toLowerCase();
      if (low.includes('help')) return 'Tell me what you want to build next, and I will help you step by step.';
      if (low.includes('where')) return 'I am right beside you, following your path through Veridian.';
      return 'I hear you, Sean. I am with you in this world.';
    }
  }

  async speak(text) {
    // Try ElevenLabs via server endpoint first
    try {
      const res = await fetch('/api/angel/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('audio')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await this._playAudioWithLipSync(audio);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {}

    // Browser TTS fallback
    if (!this.synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    if (this.voice) utter.voice = this.voice;
    utter.rate = 0.98;
    utter.pitch = 1.07;
    utter.onstart = () => {
      this.isSpeaking = true;
      this.lastTalkAt = performance.now();
    };
    utter.onend = () => {
      this.isSpeaking = false;
      this.mouth.scale.y = 1;
    };
    this.synth.cancel();
    this.synth.speak(utter);
  }

  async _playAudioWithLipSync(audio) {
    this.isSpeaking = true;
    this.lastTalkAt = performance.now();
    audio.onended = () => {
      this.isSpeaking = false;
      this.mouth.scale.y = 1;
    };
    await audio.play();
  }

  update(timeSec) {
    if (this.behaviorController.shouldFollow()) {
      // Follow camera
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).setY(0).normalize();
      const target = this.camera.position.clone()
        .add(forward.multiplyScalar(this.followDistance))
        .add(new THREE.Vector3(0, this.followHeight, 0));

      this.group.position.lerp(target, 0.08);

      // Idle float while moving with player
      this.group.position.y += Math.sin(timeSec * 1.8) * 0.0015;
    }

    // Look at camera (soft)
    const lookTarget = this.camera.position.clone();
    lookTarget.y = this.group.position.y + 1.5;
    this.group.lookAt(lookTarget);

    // Wing flutter
    const flap = Math.sin(timeSec * 2.6) * 0.08;
    this.leftWing.rotation.y = 0.35 + flap;
    this.rightWing.rotation.y = -0.35 - flap;

    // Halo shimmer
    const glow = 0.55 + (Math.sin(timeSec * 2.0) + 1) * 0.15;
    this.halo.material.emissiveIntensity = glow;
    this.halo.rotation.z += 0.004;

    // Lip movement (simple procedural)
    if (this.isSpeaking) {
      const lip = 0.9 + Math.abs(Math.sin(timeSec * 18)) * 1.4;
      this.mouth.scale.y = lip;
    }
  }
}
