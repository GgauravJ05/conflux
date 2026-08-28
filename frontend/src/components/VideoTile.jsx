import React, { useEffect, useRef } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';

import { tokens } from '../theme';
import { initialsOf } from './AppHeader';
import { QualityDot } from './StatsPanel';

/**
 * One participant in the call grid. Falls back to an avatar when the camera is
 * off, and shows a ring while the person is speaking.
 */
export default function VideoTile({
    stream,
    username = "Guest",
    isLocal = false,
    videoEnabled = true,
    audioEnabled = true,
    isSpeaking = false,
    isScreenShare = false,
    handRaised = false,
    quality = null
}) {
    const videoRef = useRef(null);

    // Assigning srcObject in an effect (rather than a ref callback) keeps the
    // element from being re-attached on unrelated re-renders.
    useEffect(() => {
        const el = videoRef.current;
        if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
        }
    }, [stream]);

    return (
        <Box
            sx={{
                position: "relative",
                // Fill the grid cell's height and derive width from the ratio, so a
                // tile never grows taller than the stage no matter how few there are.
                height: "100%",
                width: "auto",
                maxWidth: "100%",
                aspectRatio: "16 / 9",
                minHeight: 0,
                borderRadius: `${tokens.radius.lg}px`,
                overflow: "hidden",
                bgcolor: tokens.surface.overlay,
                border: `1px solid ${isSpeaking ? tokens.accent.main : tokens.border.subtle}`,
                boxShadow: isSpeaking ? `0 0 0 2px ${tokens.accent.glow}` : "none",
                transition: "border-color .18s ease, box-shadow .18s ease"
            }}
        >
            <Box
                component="video"
                ref={videoRef}
                autoPlay
                playsInline
                // A participant must never hear their own microphone played back
                muted={isLocal}
                sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: isScreenShare ? "contain" : "cover",
                    // Mirroring makes a self-view feel natural, but would flip shared text
                    transform: isLocal && !isScreenShare ? "scaleX(-1)" : "none",
                    display: videoEnabled ? "block" : "none",
                    bgcolor: "#000"
                }}
            />

            {!videoEnabled && (
                <Stack alignItems="center" justifyContent="center" sx={{ position: "absolute", inset: 0 }}>
                    <Avatar
                        sx={{
                            width: 64, height: 64,
                            fontSize: "1.35rem", fontWeight: 600,
                            bgcolor: tokens.accent.dark, color: "#fff"
                        }}
                    >
                        {initialsOf(username)}
                    </Avatar>
                </Stack>
            )}

            {handRaised && (
                <Box
                    sx={{
                        position: "absolute", top: 10, left: 10,
                        px: 1, py: 0.4, borderRadius: `${tokens.radius.sm}px`,
                        bgcolor: "rgba(245,165,36,0.9)", fontSize: "0.95rem", lineHeight: 1
                    }}
                    title={`${username} raised their hand`}
                >
                    ✋
                </Box>
            )}

            {quality && !isLocal && (
                <Box
                    sx={{
                        position: "absolute", top: 12, right: 12,
                        p: 0.6, borderRadius: "50%",
                        bgcolor: "rgba(11,13,18,0.7)",
                        display: "grid", placeItems: "center"
                    }}
                >
                    <QualityDot quality={quality} size={7} />
                </Box>
            )}

            {/* Name plate */}
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{
                    position: "absolute", left: 10, bottom: 10,
                    maxWidth: "calc(100% - 20px)",
                    px: 1, py: 0.5,
                    borderRadius: `${tokens.radius.sm}px`,
                    bgcolor: "rgba(11,13,18,0.72)",
                    backdropFilter: "blur(6px)"
                }}
            >
                {!audioEnabled && (
                    <MicOffRoundedIcon sx={{ fontSize: 15, color: tokens.danger.main, flexShrink: 0 }} />
                )}
                {isScreenShare && (
                    <PushPinRoundedIcon sx={{ fontSize: 14, color: tokens.accent.light, flexShrink: 0 }} />
                )}
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 500, lineHeight: 1.4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}
                >
                    {isLocal ? `${username} (you)` : username}
                </Typography>
            </Stack>
        </Box>
    );
}
