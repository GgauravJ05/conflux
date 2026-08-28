import { useEffect, useMemo, useRef, useState } from "react";

const SAMPLE_MS = 150;
// Below this RMS a stream counts as silence rather than speech
const SPEAKING_THRESHOLD = 0.045;
// A challenger must be this much louder than the current speaker to take over,
// which stops the highlight flickering between two people talking at once.
const TAKEOVER_MARGIN = 0.015;
// ...and must stay louder for this many consecutive samples (~450ms).
const TAKEOVER_SAMPLES = 3;
// The current speaker keeps the highlight through short pauses between words.
const RELEASE_SAMPLES = 8;

/**
 * Returns the key of whoever is currently speaking loudest, or null when the
 * room is quiet.
 *
 * @param {Array<{ key: string, stream: MediaStream }>} sources
 * @param {boolean} enabled
 */
export default function useActiveSpeaker(sources, enabled = true) {
    const [activeKey, setActiveKey] = useState(null);

    const ctxRef = useRef(null);
    const nodesRef = useRef({});      // key -> { source, analyser, buffer }
    const activeRef = useRef(null);
    const challengerRef = useRef({ key: null, count: 0 });
    const silenceRef = useRef(0);

    // Only rebuild the analyser graph when the actual set of streams changes,
    // not on every parent re-render.
    const signature = useMemo(
        () => (sources || [])
            .filter((s) => s.stream)
            .map((s) => `${s.key}:${s.stream.id}`)
            .join("|"),
        [sources]
    );

    useEffect(() => {
        if (!enabled || !signature) {
            setActiveKey(null);
            activeRef.current = null;
            return undefined;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return undefined;

        let ctx;
        try {
            ctx = new AudioCtx();
        } catch (e) {
            console.error("Active speaker detection unavailable:", e);
            return undefined;
        }
        ctxRef.current = ctx;

        const nodes = {};
        (sources || []).forEach(({ key, stream }) => {
            if (!stream || stream.getAudioTracks().length === 0) return;

            try {
                const source = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.6;
                // Deliberately not connected to ctx.destination - the <video>
                // elements already play this audio, and connecting here would
                // double it up.
                source.connect(analyser);

                nodes[key] = {
                    source,
                    analyser,
                    buffer: new Uint8Array(analyser.frequencyBinCount)
                };
            } catch (e) {
                console.error(`Could not analyse audio for ${key}:`, e);
            }
        });
        nodesRef.current = nodes;

        const levelOf = ({ analyser, buffer }) => {
            analyser.getByteFrequencyData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
            return Math.sqrt(sum / buffer.length) / 255;
        };

        const tick = () => {
            let loudestKey = null;
            let loudest = 0;

            Object.entries(nodesRef.current).forEach(([key, node]) => {
                const level = levelOf(node);
                if (level > loudest) {
                    loudest = level;
                    loudestKey = key;
                }
            });

            const current = activeRef.current;

            // Nobody is speaking loudly enough
            if (!loudestKey || loudest < SPEAKING_THRESHOLD) {
                challengerRef.current = { key: null, count: 0 };
                silenceRef.current += 1;

                if (current && silenceRef.current >= RELEASE_SAMPLES) {
                    activeRef.current = null;
                    setActiveKey(null);
                }
                return;
            }

            silenceRef.current = 0;

            if (loudestKey === current) {
                challengerRef.current = { key: null, count: 0 };
                return;
            }

            // Nobody holds the highlight - take it immediately
            if (!current) {
                activeRef.current = loudestKey;
                setActiveKey(loudestKey);
                return;
            }

            // Somebody else holds it - the challenger has to earn it
            const currentNode = nodesRef.current[current];
            const currentLevel = currentNode ? levelOf(currentNode) : 0;

            if (loudest < currentLevel + TAKEOVER_MARGIN) {
                challengerRef.current = { key: null, count: 0 };
                return;
            }

            const challenger = challengerRef.current;
            const count = challenger.key === loudestKey ? challenger.count + 1 : 1;
            challengerRef.current = { key: loudestKey, count };

            if (count >= TAKEOVER_SAMPLES) {
                activeRef.current = loudestKey;
                setActiveKey(loudestKey);
                challengerRef.current = { key: null, count: 0 };
            }
        };

        const timer = setInterval(tick, SAMPLE_MS);

        return () => {
            clearInterval(timer);
            Object.values(nodes).forEach(({ source }) => {
                try { source.disconnect(); } catch { /* already torn down */ }
            });
            nodesRef.current = {};
            ctx.close().catch(() => { });
            ctxRef.current = null;
        };
        // `sources` is intentionally excluded: `signature` already captures every
        // change that should rebuild the graph.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature, enabled]);

    return activeKey;
}
