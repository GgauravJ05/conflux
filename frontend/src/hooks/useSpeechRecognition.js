import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognition =
    typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

export const isSpeechRecognitionSupported = Boolean(SpeechRecognition);

/**
 * Wraps the Web Speech API for live captioning.
 *
 * Chrome and Edge only — `isSpeechRecognitionSupported` lets callers hide the
 * feature elsewhere rather than offering something that silently does nothing.
 *
 * `onResult({ text, isFinal })` fires for both interim and finalised phrases so
 * the caller can render a live caption and keep only the final lines.
 */
export default function useSpeechRecognition({ onResult, lang = "en-US" } = {}) {
    const [listening, setListening] = useState(false);
    const [error, setError] = useState("");

    const recognitionRef = useRef(null);
    const shouldListenRef = useRef(false);
    const onResultRef = useRef(onResult);

    // Keep the latest callback without re-creating the recognition instance
    useEffect(() => { onResultRef.current = onResult; }, [onResult]);

    useEffect(() => {
        if (!SpeechRecognition) return undefined;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0]?.transcript?.trim();
                if (!text) continue;

                onResultRef.current?.({ text, isFinal: result.isFinal });
            }
        };

        recognition.onerror = (event) => {
            // "no-speech" and "aborted" are routine during a quiet call
            if (event.error === "no-speech" || event.error === "aborted") return;

            if (event.error === "not-allowed") {
                setError("Microphone access is blocked, so captions cannot run.");
                shouldListenRef.current = false;
                setListening(false);
                return;
            }
            setError(`Captions stopped: ${event.error}`);
        };

        // Chrome ends the session periodically; restart to keep captions continuous
        recognition.onend = () => {
            if (!shouldListenRef.current) {
                setListening(false);
                return;
            }
            try {
                recognition.start();
            } catch {
                // start() throws if it is already running; safe to ignore
            }
        };

        recognitionRef.current = recognition;

        return () => {
            shouldListenRef.current = false;
            recognition.onend = null;
            recognition.onresult = null;
            recognition.onerror = null;
            try { recognition.stop(); } catch { /* already stopped */ }
            recognitionRef.current = null;
        };
    }, [lang]);

    const start = useCallback(() => {
        if (!recognitionRef.current) return;
        setError("");
        shouldListenRef.current = true;
        try {
            recognitionRef.current.start();
            setListening(true);
        } catch {
            // Already started
            setListening(true);
        }
    }, []);

    const stop = useCallback(() => {
        shouldListenRef.current = false;
        try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
        setListening(false);
    }, []);

    const toggle = useCallback(() => {
        if (listening) stop(); else start();
    }, [listening, start, stop]);

    return { listening, error, start, stop, toggle, supported: isSpeechRecognitionSupported };
}
