importScripts('./options.js');
importScripts('./node_modules/jimp/browser/lib/jimp.min.js');

// Code below is executed in web worker (above code is not intensive and is processed in main thread and not in web worker)
self.onmessage = function(e) {
  Jimp.read(e.data.src).then(function(image) {
    processImage(image, e.data.settings, Jimp).getBase64(Jimp.AUTO, function(err, src) {
      self.postMessage({ src, err });
      self.close();
    });
  });
};
