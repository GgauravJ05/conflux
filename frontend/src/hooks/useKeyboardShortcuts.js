import { useEffect, useRef } from "react";

const isTypingTarget = (el) =>
    el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

/**
 * Global in-call shortcuts. Ignores keystrokes while the user is typing in a
 * field so chat never triggers a mute.
 *
 * Holding Space is push-to-talk: it unmutes on keydown and re-mutes on keyup,
 * but only when the mic was muted to begin with.
 */
export default function useKeyboardShortcuts({
    enabled,
    onToggleAudio,
    onToggleVideo,
    onToggleChat,
    onToggleHand,
    onShowShortcuts,
    onPushToTalkStart,
    onPushToTalkEnd
}) {
    const pushingRef = useRef(false);
    const handlersRef = useRef({});

    handlersRef.current = {
        onToggleAudio, onToggleVideo, onToggleChat,
        onToggleHand, onShowShortcuts, onPushToTalkStart, onPushToTalkEnd
    };

    useEffect(() => {
        if (!enabled) return undefined;

        const onKeyDown = (e) => {
            if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            const h = handlersRef.current;

            if (e.code === "Space") {
                e.preventDefault();
                if (!pushingRef.current) {
                    pushingRef.current = true;
                    h.onPushToTalkStart?.();
                }
                return;
            }

            switch (e.key.toLowerCase()) {
                case "m": e.preventDefault(); h.onToggleAudio?.(); break;
                case "v": e.preventDefault(); h.onToggleVideo?.(); break;
                case "c": e.preventDefault(); h.onToggleChat?.(); break;
                case "h": e.preventDefault(); h.onToggleHand?.(); break;
                case "?": e.preventDefault(); h.onShowShortcuts?.(); break;
                default: break;
            }
        };

        const onKeyUp = (e) => {
            if (e.code !== "Space") return;
            if (pushingRef.current) {
                pushingRef.current = false;
                handlersRef.current.onPushToTalkEnd?.();
            }
        };

        // Releasing the key outside the tab would otherwise leave the mic open
        const onBlur = () => {
            if (pushingRef.current) {
                pushingRef.current = false;
                handlersRef.current.onPushToTalkEnd?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onBlur);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
        };
    }, [enabled]);
}
