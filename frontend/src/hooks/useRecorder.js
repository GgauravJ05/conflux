import { useCallback, useRef, useState } from "react";

const FPS = 30;

const pickMimeType = () => {
    const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

/** Grid geometry that keeps every tile visible without cropping. */
const layoutFor = (count) => {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    return { cols: 3, rows: 3 };
};

/**
 * Records the whole meeting locally: every participant's video composited onto a
 * canvas, with all audio tracks mixed through a single AudioContext.
 *
 * Everything happens in the browser — nothing is uploaded — so the recording is
 * private to whoever pressed record.
 */
export default function useRecorder() {
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState("");

    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const videosRef = useRef([]);
    const audioCtxRef = useRef(null);
    const canvasStreamRef = useRef(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        videosRef.current.forEach((v) => { v.srcObject = null; });
        videosRef.current = [];

        canvasStreamRef.current?.getTracks().forEach((t) => t.stop());
        canvasStreamRef.current = null;

        audioCtxRef.current?.close().catch(() => { });
        audioCtxRef.current = null;
    }, []);

    /**
     * @param {Array<{ stream: MediaStream, username: string }>} sources
     * @param {string} meetingCode used for the download filename
     */
    const start = useCallback(async (sources, meetingCode = "meeting") => {
        setError("");

        const usable = (sources || []).filter((s) => s.stream);
        if (usable.length === 0) {
            setError("Nothing to record yet.");
            return;
        }

        try {
            const width = 1280;
            const height = 720;

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            // Off-screen <video> per participant, used as a canvas draw source
            const videos = usable.map(({ stream }) => {
                const el = document.createElement("video");
                el.autoplay = true;
                el.playsInline = true;
                el.muted = true;          // mixing happens through AudioContext
                el.srcObject = stream;
                el.play().catch(() => { });
                return el;
            });
            videosRef.current = videos;

            const { cols, rows } = layoutFor(usable.length);
            const cellW = width / cols;
            const cellH = height / rows;

            const draw = () => {
                ctx.fillStyle = "#0B0D12";
                ctx.fillRect(0, 0, width, height);

                videos.forEach((video, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const x = col * cellW;
                    const y = row * cellH;

                    if (video.readyState >= 2 && video.videoWidth) {
                        // Preserve aspect ratio, letterboxing inside the cell
                        const scale = Math.min(cellW / video.videoWidth, cellH / video.videoHeight);
                        const w = video.videoWidth * scale;
                        const h = video.videoHeight * scale;
                        ctx.drawImage(video, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h);
                    }

                    ctx.fillStyle = "rgba(11,13,18,0.72)";
                    ctx.font = "500 15px Inter, sans-serif";
                    const label = usable[i].username || "Guest";
                    const textW = ctx.measureText(label).width;
                    ctx.fillRect(x + 12, y + cellH - 36, textW + 16, 24);
                    ctx.fillStyle = "#F2F4F8";
                    ctx.fillText(label, x + 20, y + cellH - 19);
                });
            };

            timerRef.current = setInterval(draw, 1000 / FPS);

            const canvasStream = canvas.captureStream(FPS);
            canvasStreamRef.current = canvasStream;

            // Mix every audio track down to one output track
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioCtxRef.current = audioCtx;
            const destination = audioCtx.createMediaStreamDestination();

            let hasAudio = false;
            usable.forEach(({ stream }) => {
                if (stream.getAudioTracks().length === 0) return;
                try {
                    audioCtx.createMediaStreamSource(stream).connect(destination);
                    hasAudio = true;
                } catch (e) {
                    console.error("Could not mix a track:", e);
                }
            });

            const combined = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...(hasAudio ? destination.stream.getAudioTracks() : [])
            ]);

            const mimeType = pickMimeType();
            const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
                const url = URL.createObjectURL(blob);

                const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
                const a = document.createElement("a");
                a.href = url;
                a.download = `conflux-${meetingCode}-${stamp}.webm`;
                a.click();

                // Give the browser a moment to start the download before revoking
                setTimeout(() => URL.revokeObjectURL(url), 1000);

                chunksRef.current = [];
                cleanup();
                setRecording(false);
            };

            recorder.start(1000);
            recorderRef.current = recorder;
            setRecording(true);
        } catch (e) {
            console.error("Recording failed:", e);
            setError("Could not start recording.");
            cleanup();
        }
    }, [cleanup]);

    const stop = useCallback(() => {
        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();   // onstop triggers the download
        } else {
            cleanup();
            setRecording(false);
        }
    }, [cleanup]);

    return { recording, error, start, stop };
}
