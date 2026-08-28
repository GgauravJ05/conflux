import { useEffect, useRef, useState } from "react";

const POLL_MS = 2000;

/** Round-trip time and loss thresholds that map to a three-level quality rating. */
const rate = ({ rtt, packetLoss }) => {
    if (rtt == null && packetLoss == null) return "unknown";
    if ((rtt ?? 0) > 350 || (packetLoss ?? 0) > 5) return "poor";
    if ((rtt ?? 0) > 180 || (packetLoss ?? 0) > 2) return "fair";
    return "good";
};

/**
 * Polls RTCPeerConnection.getStats() for every peer and derives per-connection
 * bitrate, packet loss, round-trip time, jitter, resolution and codec.
 *
 * Bitrate and loss are rates, not totals, so each sample is differenced against
 * the previous one rather than reported cumulatively.
 */
export default function useConnectionStats(connectionsRef, active) {
    const [stats, setStats] = useState({});
    const previousRef = useRef({});

    useEffect(() => {
        if (!active) {
            setStats({});
            previousRef.current = {};
            return undefined;
        }

        let cancelled = false;

        const sample = async () => {
            const connections = connectionsRef.current || {};
            const next = {};

            await Promise.all(
                Object.entries(connections).map(async ([peerId, pc]) => {
                    if (!pc || pc.connectionState === "closed") return;

                    let report;
                    try {
                        report = await pc.getStats();
                    } catch {
                        return;
                    }

                    const entry = {
                        connectionState: pc.connectionState,
                        iceState: pc.iceConnectionState,
                        bitrateKbps: null,
                        packetLoss: null,
                        rtt: null,
                        jitter: null,
                        resolution: null,
                        frameRate: null,
                        codec: null,
                        candidateType: null
                    };

                    const codecs = new Map();
                    let inboundVideo = null;
                    let selectedPair = null;
                    const remoteCandidates = new Map();

                    report.forEach((s) => {
                        if (s.type === "codec") codecs.set(s.id, s);
                        if (s.type === "remote-candidate") remoteCandidates.set(s.id, s);
                        if (s.type === "inbound-rtp" && s.kind === "video") inboundVideo = s;
                        if (s.type === "candidate-pair" && s.state === "succeeded" && s.nominated) {
                            selectedPair = s;
                        }
                    });

                    if (selectedPair) {
                        // currentRoundTripTime is reported in seconds
                        if (selectedPair.currentRoundTripTime != null) {
                            entry.rtt = Math.round(selectedPair.currentRoundTripTime * 1000);
                        }
                        const remote = remoteCandidates.get(selectedPair.remoteCandidateId);
                        // "relay" means the media is going through TURN rather than direct
                        if (remote?.candidateType) entry.candidateType = remote.candidateType;
                    }

                    if (inboundVideo) {
                        const prev = previousRef.current[peerId]?.inboundVideo;

                        if (prev && inboundVideo.timestamp > prev.timestamp) {
                            const seconds = (inboundVideo.timestamp - prev.timestamp) / 1000;
                            const bytes = (inboundVideo.bytesReceived ?? 0) - (prev.bytesReceived ?? 0);
                            entry.bitrateKbps = Math.max(0, Math.round((bytes * 8) / seconds / 1000));

                            const lost = (inboundVideo.packetsLost ?? 0) - (prev.packetsLost ?? 0);
                            const received = (inboundVideo.packetsReceived ?? 0) - (prev.packetsReceived ?? 0);
                            const total = lost + received;
                            entry.packetLoss = total > 0
                                ? Math.max(0, Number(((lost / total) * 100).toFixed(1)))
                                : 0;
                        }

                        if (inboundVideo.jitter != null) {
                            entry.jitter = Math.round(inboundVideo.jitter * 1000);
                        }
                        if (inboundVideo.frameWidth && inboundVideo.frameHeight) {
                            entry.resolution = `${inboundVideo.frameWidth}×${inboundVideo.frameHeight}`;
                        }
                        if (inboundVideo.framesPerSecond != null) {
                            entry.frameRate = Math.round(inboundVideo.framesPerSecond);
                        }
                        const codec = codecs.get(inboundVideo.codecId);
                        if (codec?.mimeType) entry.codec = codec.mimeType.replace("video/", "");
                    }

                    entry.quality = rate(entry);
                    next[peerId] = entry;

                    previousRef.current[peerId] = { inboundVideo };
                })
            );

            if (!cancelled) setStats(next);
        };

        sample();
        const timer = setInterval(sample, POLL_MS);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [connectionsRef, active]);

    return stats;
}
