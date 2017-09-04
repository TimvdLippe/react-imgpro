const processImage = require('./utils/options');
importScripts('node_modules/jimp/browser/jimp.min.js');

// Code below is executed in web worker (above code is not intensive and is processed in main thread and not in web worker)
module.exports = function worker(self) {
  self.onmessage = function(e) {
    Jimp.read(e.data.image).then(function(image) {
      processImage(image, e.data.settings, Jimp).getBase64(Jimp.AUTO, function(err, src) {
        self.postMessage({ src, err });
        self.close();
      });
    });
  };
};
