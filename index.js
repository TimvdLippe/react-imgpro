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

export default class ProcessImage extends HTMLElement {

  constructor() {
    super();
    this.settings = {};

    this.attachShadow({mode: 'open'});
    this.imageElement = document.createElement('iron-image');
    this.shadowRoot.appendChild(this.imageElement);
  }

  async connectedCallback() {
    this._storage = this.checkStorageSupport(this._settings.storage);
    
    if (typeof window.Worker !== 'undefined' && !this.disableWebWorker) {
      this.worker = new Worker('./workers/worker.js');
      
      this.worker.onmessage = e => this.storeImage(e.data.src);
      this.processor = this.processInWebWorker.bind(this);
    } else {
      this.processor = this.processInMainThread.bind(this);
    }
    
    this.settings = JSON.parse(this.getAttribute('settings'));
    const src = this.getAttribute('src');
    if (src) {
      this.src = src;
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

  set src(v) {
    this.processor(v);
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
      this.storeImage(src);
    });
  }

  storeImage(src) {
    this.imageElement.src = src;
    const rect = this.getBoundingClientRect();
    this._height = rect.height;
    this._width = rect.width;
    this._storage && this._storage.setItem('placeholder', src);
  }

  processInWebWorker(src) {
    this.worker.postMessage({ settings: this._settings, src });
  }
}

customElements.define('process-image', ProcessImage);