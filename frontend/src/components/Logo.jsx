import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../theme';

/**
 * The Conflux wordmark: a diamond glyph (two streams meeting) plus the name.
 * `mark` renders the glyph alone, for tight spaces such as a mobile call header.
 */
export default function Logo({ size = 28, showText = true, sx = {} }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, ...sx }}>
            <Box
                component="svg"
                viewBox="0 0 32 32"
                aria-hidden="true"
                sx={{ width: size, height: size, flexShrink: 0 }}
            >
                <path d="M16 2 30 16 16 30 2 16 16 2Z" fill={tokens.accent.main} />
                <path d="M16 9.5 22.5 16 16 22.5 9.5 16 16 9.5Z" fill={tokens.surface.base} />
            </Box>

            {showText && (
                <Typography
                    component="span"
                    sx={{
                        fontSize: size * 0.66,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                        color: tokens.text.primary
                    }}
                >
                    Conflux
                </Typography>
            )}
        </Box>
    );
}
