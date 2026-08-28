import { useCallback, useRef, useState } from "react";

// MediaPipe, its WASM runtime, and the segmentation model are all fetched from a
// CDN on first use, so background blur costs nothing in bundle size until someone
// actually turns it on. Loading the library from a URL (rather than as an npm
// dependency) also keeps its internal dynamic requires out of the webpack build.
const MEDIAPIPE_VERSION = "1.0.1";
const MEDIAPIPE_ESM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/vision_bundle.mjs`;
const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

const FPS = 24;

/**
 * Segments the person from the background with MediaPipe and composites a
 * blurred backdrop onto a canvas, exposing the result as a MediaStream track.
 *
 * The returned track can be swapped onto existing peer connections with
 * `RTCRtpSender.replaceTrack`, so enabling blur never renegotiates the call.
 */
export default function useBackgroundBlur() {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    const segmenterRef = useRef(null);
    const rafRef = useRef(null);
    const timerRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const outputStreamRef = useRef(null);
    const sourceStreamRef = useRef(null);

    const loadSegmenter = useCallback(async () => {
        if (segmenterRef.current) return segmenterRef.current;

        // webpackIgnore leaves this as a native dynamic import, so the browser
        // fetches the module at runtime instead of webpack bundling it.
        const { FilesetResolver, ImageSegmenter } = await import(
            /* webpackIgnore: true */ MEDIAPIPE_ESM
        );
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

        segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: false
        });

        return segmenterRef.current;
    }, []);

    const stop = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        rafRef.current = null;
        timerRef.current = null;

        outputStreamRef.current?.getTracks().forEach((t) => t.stop());
        outputStreamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current = null;
        }
        canvasRef.current = null;
        sourceStreamRef.current = null;
        setEnabled(false);
    }, []);

    /**
     * @param {MediaStream} sourceStream stream whose video track should be blurred
     * @returns {Promise<MediaStreamTrack|null>} the composited video track
     */
    const start = useCallback(async (sourceStream) => {
        const sourceTrack = sourceStream?.getVideoTracks()[0];
        if (!sourceTrack) return null;

        setLoading(true);
        try {
            const segmenter = await loadSegmenter();

            const settings = sourceTrack.getSettings();
            const width = settings.width || 640;
            const height = settings.height || 480;

            const video = document.createElement("video");
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            video.srcObject = new MediaStream([sourceTrack]);
            await video.play();

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d", { willReadFrequently: false });

            // Scratch canvas holding the blurred copy of the current frame
            const blurCanvas = document.createElement("canvas");
            blurCanvas.width = width;
            blurCanvas.height = height;
            const blurCtx = blurCanvas.getContext("2d");

            // Scratch canvas used to punch the person out of the sharp frame
            const personCanvas = document.createElement("canvas");
            personCanvas.width = width;
            personCanvas.height = height;
            const personCtx = personCanvas.getContext("2d");

            videoRef.current = video;
            canvasRef.current = canvas;
            sourceStreamRef.current = sourceStream;

            const render = () => {
                if (!videoRef.current || video.readyState < 2) return;

                const now = performance.now();
                segmenter.segmentForVideo(video, now, (result) => {
                    const mask = result.categoryMask;
                    if (!mask) return;

                    // 1. Blurred background
                    blurCtx.filter = "blur(12px)";
                    blurCtx.drawImage(video, 0, 0, width, height);
                    blurCtx.filter = "none";

                    // 2. Sharp frame, then keep only the person using the mask
                    personCtx.clearRect(0, 0, width, height);
                    personCtx.drawImage(video, 0, 0, width, height);

                    const frame = personCtx.getImageData(0, 0, width, height);
                    const maskData = mask.getAsUint8Array();
                    const pixels = frame.data;

                    // Category 0 is background in the selfie segmenter
                    for (let i = 0; i < maskData.length; i++) {
                        if (maskData[i] === 0) pixels[i * 4 + 3] = 0;
                    }
                    personCtx.putImageData(frame, 0, 0);

                    // 3. Composite person over blurred background
                    ctx.drawImage(blurCanvas, 0, 0, width, height);
                    ctx.drawImage(personCanvas, 0, 0, width, height);

                    mask.close();
                });
            };

            // A fixed interval caps CPU cost; requestAnimationFrame would run
            // segmentation at display refresh rate for no visible benefit.
            timerRef.current = setInterval(render, 1000 / FPS);

            const outputStream = canvas.captureStream(FPS);
            outputStreamRef.current = outputStream;
            setEnabled(true);

            return outputStream.getVideoTracks()[0];
        } catch (e) {
            console.error("Background blur failed:", e);
            stop();
            throw e;
        } finally {
            setLoading(false);
        }
    }, [loadSegmenter, stop]);

    return { enabled, loading, start, stop };
}
