// =========================================================
// Ember & Tide - Input Management & Touch Controls
// Supports 2-player keyboard, single-player switch, and touch
// =========================================================

export class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};

    // Configurable bindings
    this.bindings = {
      // Ember (Player 1)
      emberLeft: ['KeyA', 'Keya'],
      emberRight: ['KeyD', 'Keyd'],
      emberJump: ['KeyW', 'Keyw', 'Space'],
      emberInteract: ['KeyS', 'Keys'],

      // Tide (Player 2)
      tideLeft: ['ArrowLeft'],
      tideRight: ['ArrowRight'],
      tideJump: ['ArrowUp'],
      tideInteract: ['ArrowDown'],

      // System
      pause: ['Escape', 'KeyP', 'Keyp'],
      restart: ['KeyR', 'Keyr']
    };

    // Touch Virtual State
    this.touchState = {
      emberLeft: false,
      emberRight: false,
      emberJump: false,
      tideLeft: false,
      tideRight: false,
      tideJump: false
    };

    this.activeCharacterMobile = 'both'; // 'both', 'ember', 'tide'
    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser default scroll for game keys
      const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
      if (gameKeys.includes(e.code) || gameKeys.includes(e.key)) {
        e.preventDefault();
      }

      this.keys[e.code] = true;
      this.keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.prevKeys = {};
    });
  }

  update() {
    // Copy current keys to prevKeys at the end of each frame
    this.prevKeys = { ...this.keys };
  }

  isDown(action) {
    // Check touch virtual keys first
    if (this.touchState[action]) return true;

    const boundKeys = this.bindings[action] || [];
    return boundKeys.some(key => !!this.keys[key]);
  }

  isJustPressed(action) {
    const boundKeys = this.bindings[action] || [];
    return boundKeys.some(key => !!this.keys[key] && !this.prevKeys[key]);
  }

  // Helper getters for entities
  getEmberInput() {
    return {
      left: this.isDown('emberLeft'),
      right: this.isDown('emberRight'),
      jump: this.isDown('emberJump'),
      interact: this.isDown('emberInteract')
    };
  }

  getTideInput() {
    return {
      left: this.isDown('tideLeft'),
      right: this.isDown('tideRight'),
      jump: this.isDown('tideJump'),
      interact: this.isDown('tideInteract')
    };
  }

  // Touch handlers
  setTouchInput(action, isPressed) {
    if (action in this.touchState) {
      this.touchState[action] = isPressed;
    }
  }

  resetTouch() {
    for (let k in this.touchState) {
      this.touchState[k] = false;
    }
  }
}
