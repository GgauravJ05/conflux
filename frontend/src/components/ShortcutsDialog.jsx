import React from 'react';
import {
    Box, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { tokens } from '../theme';

const SHORTCUTS = [
    { keys: ["M"], label: "Mute / unmute microphone" },
    { keys: ["V"], label: "Turn camera on / off" },
    { keys: ["C"], label: "Toggle chat panel" },
    { keys: ["H"], label: "Raise / lower hand" },
    { keys: ["Space"], label: "Hold to talk while muted" },
    { keys: ["?"], label: "Show this dialog" }
];

function Key({ children }) {
    return (
        <Box
            component="kbd"
            sx={{
                px: 1, py: 0.35, minWidth: 28, textAlign: "center",
                borderRadius: `${tokens.radius.sm - 2}px`,
                border: `1px solid ${tokens.border.strong}`,
                borderBottomWidth: 2,
                bgcolor: tokens.surface.overlay,
                fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 600
            }}
        >
            {children}
        </Box>
    );
}

export default function ShortcutsDialog({ open, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                Keyboard shortcuts
                <IconButton onClick={onClose} size="small" aria-label="Close">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={1.5} sx={{ pb: 1 }}>
                    {SHORTCUTS.map((s) => (
                        <Stack key={s.label} direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                            <Typography variant="body2" sx={{ color: tokens.text.secondary }}>
                                {s.label}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                                {s.keys.map((k) => <Key key={k}>{k}</Key>)}
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
                <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                    Shortcuts are ignored while you are typing in a text field.
                </Typography>
            </DialogContent>
        </Dialog>
    );
}
