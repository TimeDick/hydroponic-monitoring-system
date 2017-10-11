const express = require('express')
const PNGCaptureRoutine = require('../image/PNGCaptureRoutine');
const RGBImage = require('../image/RaspiRGBImage');
const app = express();
const fs = require('fs');
const serveIndex = require('serve-index');
const schedule = require('node-schedule');
var imageWidth = 1280;
var imageHeight = 720;
var minimumSaveBrightness = 25;
var captureResult = null;
var lastCaptureTime = -1;

// Take an initial picture so we don't have to wait to see the results.
capturePicture();

// Schedule to take a picture every 5 minutes.
schedule.scheduleJob('*/5 * * * *', function(){
  capturePicture();
});

// Schedule to save an image every 30 minutes. This is offset by some time to
// allow the image to be taken.
schedule.scheduleJob('59 */5 * * * *', function(){
  // Write the file to the system.
  fs.writeFile(`./bin/${lastCaptureTime}.png`, captureResult.pngBuffer, (err) => {
    console.log(`Saving capture from time ${lastCaptureTime}.`);

    if(!err) {
      console.log("Problem saving image to the filesystem.")
      lastSave = currentTime;
    }
  });
});

/**
 * Captures a picture and updates all related variables.
 */
function capturePicture() {
  PNGCaptureRoutine.getPNGCapturePromise(imageWidth, imageHeight).then(pngCaptureCallback);
}

/**
 * PNG Capture callback to handle what needs to happen when a PNG image is ready.
 */
function pngCaptureCallback(result) {
  captureResult = result;
  lastCaptureTime = new Date().getTime();
  console.log(`Capture | Brightness: ${result.brightness} | Time: ${lastCaptureTime}`);
}

/**
 * /history
 * Serves up a directory of past images
 */
app.use('/history', serveIndex('bin'));
app.use('/history', express.static('bin'));

/**
 * /brightness
 * Captures a picture and returns the average brightness of the image.
 */
app.get('/brightness', (req, res) => {
  if(captureResult) {
    res.end('' + captureResult.brightness);
  } else {
    res.end('Image not ready yet.');
  }
});

/**
 * /refresh
 * Updates the PNG image and writes the output as an image.
 */
app.get('/refresh', (req, res) => {
  PNGCaptureRoutine.getPNGCapturePromise(imageWidth, imageHeight).then((result) => {
    pngCaptureCallback(result);

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': captureResult.pngBuffer.length
    });

    res.end(captureResult.pngBuffer);
  });
});

/**
 * /
 * Returns the last image taken by the camera.
 */
app.get('/', (req, res) => {
  if(captureResult) {
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': captureResult.pngBuffer.length
    });

    res.end(captureResult.pngBuffer);
  } else {
    res.end('Image not ready yet.');
  }
});

app.listen(8080, () => {})
