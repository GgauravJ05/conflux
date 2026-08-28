import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../theme';

export const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "😮"];

/**
 * Emoji that float up and fade out. Each reaction is removed by the parent on a
 * timer, so this component stays purely presentational.
 */
export default function ReactionsLayer({ reactions }) {
    return (
        <Box
            aria-hidden="true"
            sx={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 6 }}
        >
            {reactions.map((r) => (
                <Box
                    key={r.id}
                    sx={{
                        position: "absolute",
                        bottom: 96,
                        left: `${r.offset}%`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        animation: "conflux-float-up 3s ease-out forwards",
                        "@keyframes conflux-float-up": {
                            "0%": { opacity: 0, transform: "translateY(0) scale(0.6)" },
                            "15%": { opacity: 1, transform: "translateY(-20px) scale(1.15)" },
                            "100%": { opacity: 0, transform: "translateY(-220px) scale(1)" }
                        }
                    }}
                >
                    <Typography sx={{ fontSize: "2.1rem", lineHeight: 1 }}>{r.emoji}</Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            mt: 0.5, px: 0.75, borderRadius: 1,
                            bgcolor: "rgba(11,13,18,0.8)",
                            color: tokens.text.secondary
                        }}
                    >
                        {r.username}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}
