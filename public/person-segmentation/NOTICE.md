# On-device person segmentation assets

- Runtime: `@mediapipe/tasks-vision` **1.2.2**, from the official npm package, Apache-2.0.
- Runtime files: `wasm/vision_wasm_internal.js` and `wasm/vision_wasm_internal.wasm` copied unchanged from that package.
- Model: Google MediaPipe SelfieSegmenter, float16, version **1**.
- Model source: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite
- Documentation/model card: https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter
- Upstream project/license: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

These files are loaded lazily from mellō's own origin when the user takes/selects a person photo. User images are processed in the browser and are not uploaded for segmentation.
