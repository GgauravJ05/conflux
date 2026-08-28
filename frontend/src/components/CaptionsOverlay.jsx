import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { tokens } from '../theme';

/**
 * Live captions pinned above the control bar. Shows the most recent line per
 * speaker so a busy room does not scroll the overlay off screen.
 */
export default function CaptionsOverlay({ captions }) {
    if (!captions.length) return null;

    return (
        <Box
            aria-live="polite"
            sx={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(760px, calc(100% - 32px))",
                zIndex: 5,
                pointerEvents: "none"
            }}
        >
            <Stack spacing={0.75}>
                {captions.map((caption) => (
                    <Box
                        key={caption.socketId}
                        sx={{
                            px: 2, py: 1,
                            borderRadius: `${tokens.radius.md}px`,
                            bgcolor: "rgba(11,13,18,0.86)",
                            backdropFilter: "blur(8px)",
                            border: `1px solid ${tokens.border.subtle}`,
                            opacity: caption.isFinal ? 1 : 0.75
                        }}
                    >
                        <Typography
                            component="span"
                            variant="caption"
                            sx={{ color: tokens.accent.light, fontWeight: 600, mr: 1 }}
                        >
                            {caption.speaker}
                        </Typography>
                        <Typography component="span" variant="body2" sx={{ color: tokens.text.primary }}>
                            {caption.text}
                        </Typography>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}
