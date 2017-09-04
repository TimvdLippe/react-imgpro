import 'node_modules/@polymer/iron-image/iron-image.js';

const Jimp = window.Jimp;

const processImage = require('../utils/options');

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
    this.src = '';
    this.err = '';
    this.height = null;
    this.width = null;

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(document.createElement('iron-image'));
    this.imageElement = this.shadowRoot.querySelector('iron-image');
  }

  async connectedCallback() {
    // check support for Storage and get a reference to it
    this._storage = this.checkStorageSupport(this.settings.storage);

    // Check the support for web worker and create a new worker if supported
    if (typeof window.Worker !== 'undefined' && !this.disableWebWorker) {
      // webworkify-webpack (same bundle on both browser and web worker environment)
      this.worker = new Worker('worker.js');
      // this.worker = new NewWorker();

      // Send image filter props to worker
      this.sendSettingsToWorker();
    }

    // Get original size of the image
    await this.setOriginalImageSize();

    // Process the image in main thread (if no web worker support) or in a web worker
    this.processInMainThreadOrInWebWorker(this.worker, this.settings);
  }

  attributeChangedCallback(attrName, _oldValue, newValue) {
    if (attrName === 'settings') {
      this.settings = Object.assign({}, defaultSettings, newValue);
    } else {
      this[attrName] = newValue;
    }
    this.render();
  }

  disconnectedCallback() {
    // Terminate worker (though worker is closed after the image processing is done)
    this.worker && this.worker.terminate();

    this.clearStorage();
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

  processInMainThreadOrInWebWorker(worker, settings) {
    if (typeof Worker !== 'undefined' && !settings.disableWebWorker) {
      return this.processInWebWorker(worker, settings);
    } else {
      if (Jimp !== undefined && settings.disableWebWorker) {
        console.info(webWorkerInfo);
        return this.processInMainThread(settings);
      } else {
        return console.error(noJimpInstance);
      }
    }
  }

  // Clear the cache
  clearStorage() {
    this._storage && this._storage.removeItem('placeholder');
  }

  /**
   * Get the orginal size of the image
   * @param { object } props image props
   */
  async getOriginalImageSize() {
    const {height, width} = await size(this.image);
    this.height = height;
    this.width = width;
  }

  // Process the image in main thread if no support for web worker
  async processInMainThread() {
    const image = await Jimp.read(this.image)
    processImage(image, props, Jimp).getBase64(Jimp.AUTO, (err, src) => {
      this.err = err;
      this.src = src;
      this.passPropsToParent(props, src, err);
    });
  };

  processInWebWorker(worker, settings) {
    // Get the data from worker
    if (worker !== null) {
      worker.onmessage = e => {
        // Set the processed image
        this.src = e.data.src;
        this.err = e.data.err;
        // Store the image in localStorage (cache is cleared when storage prop is set to false)
        this._storage && this._storage.setItem('placeholder', e.data.src);
        this.passPropsToParent(settings, e.data.src, e.data.err);
      };
    }
  };

  /**
   * Send the image filter settings and image to worker script
   */
  sendSettingsToWorker() {
    this.worker && this.worker.postMessage({ settings: this.settings, image: this.image });
  }
}
