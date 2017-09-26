import './node_modules/@polymer/iron-image/iron-image.js';
import './workers/options.js';

const Jimp = window.Jimp;
const processImage = window.processImage;

const defaultSettings = {
  storage: true,
  greyscale: false,
  normalize: false,
  invert: false,
  opaque: false,
  sepia: false,
  dither565: false,
  disableWebWorker: false
};

const ironImageProperties = ['placeholder', 'preload', 'sizing', 'fade'];

export default class ProcessImage extends HTMLElement {

  static get observedAttributes() {
    return ironImageProperties.concat('src');
  }

  constructor() {
    super();
    this.settings = {};

    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
      </style>
    `
    this.imageElement = document.createElement('iron-image');
    this.shadowRoot.appendChild(this.imageElement);

    this._storage = this.checkStorageSupport(this.settings.storage);
    
    if (typeof window.Worker !== 'undefined' && !this.disableWebWorker) {
      this.worker = new Worker('./workers/worker.js');
      
      this.worker.onmessage = e => this.updateImage(e.data.src);
      this.processor = this.processInWebWorker.bind(this);
    } else {
      this.processor = this.processInMainThread.bind(this);
    }

    this.settings = JSON.parse(this.getAttribute('settings'));

    for (const field of ironImageProperties) {
      this.propagateToIronImage(field);
    }
  }

  connectedCallback() {
    if (this.settings.resize) {
      this.imageElement.width = this.settings.resize.width;
      this.imageElement.height = this.settings.resize.height;
    }
  }

  attributeChangedCallback(attrName, _oldValue, newValue) {
    if (attrName === 'settings') {
      this.settings = JSON.parse(newValue);
    } else {
      this[attrName] = newValue;
    }
  }

  disconnectedCallback() {
    this.worker && this.worker.terminate();

    this.clearStorage();
  }

  get height() {
    return this._height || 0;
  }

  get width() {
    return this._width || 0;
  }

  get src() {
    return this._src;
  }

  set src(src) {
    this._src = src;
    let image;
    if (this._storage && (image = this._storage.getItem(`placeholder-${src}`))) {
      this.fade = false;
      this.updateImage(image);
    } else {
      this.fade = true;
      this.processor(src);
    }
  }

  propagateToIronImage(field, initialValue) {
    (() => {
      let oldValue;
      Object.defineProperty(this, field, {
        get: () => {
          return oldValue;
        },
        set: (newValue) => {
          oldValue = newValue;
          this.imageElement[field] = newValue;
        }
      });
    })();
  }

  get settings() {
    return this._settings;
  }

  set settings(newSettings) {
    this._settings = Object.assign({}, defaultSettings, newSettings);
  }

  // Check the support for Storage
  checkStorageSupport(storage) {
    if (typeof Storage !== 'undefined' && storage) {
      return window.localStorage;
    } else if (!storage && typeof Storage !== 'undefined') {
      // Clear the cache before updating the storage prop
      this.clearStorage();
    }
    return null;
  }

  // Clear the cache
  clearStorage() {
    this._storage && this._storage.removeItem('placeholder');
  }

  // Process the image in main thread if no support for web worker
  async processInMainThread(src) {
    const image = await Jimp.read(src)
    processImage(image, props, Jimp).getBase64(Jimp.AUTO, (err, src) => {
      this.updateImage(src);
    });
  }

  updateImage(src) {
    this.imageElement.src = src;
    setTimeout(() => {
      const rect = this.getBoundingClientRect();
      this._height = rect.height;
      this._width = rect.width;
      this._storage && this._storage.setItem(`placeholder-${this.src}`, src);
      this.dispatchEvent(new CustomEvent('image-updated'));
    });
  }

  processInWebWorker(src) {
    this.worker.postMessage({ settings: this.settings, src });
  }
}

customElements.define('process-image', ProcessImage);