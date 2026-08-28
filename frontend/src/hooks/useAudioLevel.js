import { useEffect, useRef, useState } from "react";

/**
 * Returns a 0..1 loudness value for the given stream's audio track, sampled on
 * animation frames. Used to drive the lobby mic meter and the speaking ring.
 * Returns 0 when there is no audio track or the track is muted.
 */
export default function useAudioLevel(stream, enabled = true) {
    const [level, setLevel] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const track = stream?.getAudioTracks?.()[0];

        if (!stream || !track || !enabled) {
            setLevel(0);
            return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        let ctx;
        let source;
        let cancelled = false;

        try {
            ctx = new AudioCtx();
            source = ctx.createMediaStreamSource(stream);
        } catch (e) {
            console.error("Audio analysis unavailable:", e);
            return;
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
            if (cancelled) return;

            analyser.getByteFrequencyData(buffer);

            // Root-mean-square tracks perceived loudness better than a plain average
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
            const rms = Math.sqrt(sum / buffer.length) / 255;

            setLevel(track.enabled ? Math.min(1, rms * 2.2) : 0);
            rafRef.current = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            try { source.disconnect(); } catch { /* already torn down */ }
            // close() returns a promise that can reject if the context is already closed
            ctx.close().catch(() => { });
        };
    }, [stream, enabled]);

    return level;
}
