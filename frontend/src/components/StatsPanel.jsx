import React from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { tokens } from '../theme';

const QUALITY_COLOUR = {
    good: tokens.success.main,
    fair: tokens.warning.main,
    poor: tokens.danger.main,
    unknown: tokens.text.tertiary
};

export function QualityDot({ quality = "unknown", size = 8 }) {
    return (
        <Box
            component="span"
            aria-label={`Connection quality: ${quality}`}
            sx={{
                width: size, height: size, borderRadius: "50%", flexShrink: 0,
                bgcolor: QUALITY_COLOUR[quality] || QUALITY_COLOUR.unknown
            }}
        />
    );
}

function Row({ label, value }) {
    return (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>{label}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {value ?? "—"}
            </Typography>
        </Stack>
    );
}

/** Live WebRTC diagnostics, one block per peer connection. */
export default function StatsPanel({ stats, participants, mySocketId }) {
    const entries = Object.entries(stats);

    const nameFor = (socketId) =>
        participants.find((p) => p.socketId === socketId)?.username || "Peer";

    return (
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
            {entries.length === 0 ? (
                <Typography variant="body2" sx={{ color: tokens.text.tertiary }}>
                    No peer connections yet. Stats appear once someone else joins.
                </Typography>
            ) : (
                <Stack spacing={2.5}>
                    {entries.map(([peerId, s]) => (
                        <Box key={peerId}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <QualityDot quality={s.quality} />
                                <Typography variant="h6" sx={{ flex: 1 }} noWrap>
                                    {nameFor(peerId)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: tokens.text.tertiary, textTransform: "capitalize" }}>
                                    {s.quality}
                                </Typography>
                            </Stack>

                            <Stack spacing={0.75}>
                                <Row label="Bitrate" value={s.bitrateKbps != null ? `${s.bitrateKbps} kbps` : null} />
                                <Row label="Packet loss" value={s.packetLoss != null ? `${s.packetLoss}%` : null} />
                                <Row label="Round trip" value={s.rtt != null ? `${s.rtt} ms` : null} />
                                <Row label="Jitter" value={s.jitter != null ? `${s.jitter} ms` : null} />
                                <Row label="Resolution" value={s.resolution} />
                                <Row label="Frame rate" value={s.frameRate != null ? `${s.frameRate} fps` : null} />
                                <Row label="Codec" value={s.codec} />
                                <Row
                                    label="Path"
                                    value={s.candidateType === "relay" ? "TURN relay" : s.candidateType}
                                />
                                <Row label="ICE state" value={s.iceState} />
                            </Stack>

                            <Divider sx={{ mt: 2 }} />
                        </Box>
                    ))}
                </Stack>
            )}

            <Typography variant="caption" sx={{ display: "block", mt: 2, color: tokens.text.tertiary }}>
                Sampled from RTCPeerConnection.getStats() every 2 seconds.
            </Typography>
        </Box>
    );
}
