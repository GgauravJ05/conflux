import React, { useState } from 'react';
import {
    Badge, Box, Divider, IconButton, Menu, MenuItem, Popover, Stack, Tooltip, Typography
} from '@mui/material';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';
import ScreenShareRoundedIcon from '@mui/icons-material/ScreenShareRounded';
import StopScreenShareRoundedIcon from '@mui/icons-material/StopScreenShareRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import AddReactionRoundedIcon from '@mui/icons-material/AddReactionRounded';
import PanToolRoundedIcon from '@mui/icons-material/PanToolRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ClosedCaptionRoundedIcon from '@mui/icons-material/ClosedCaptionRounded';
import BlurOnRoundedIcon from '@mui/icons-material/BlurOnRounded';
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';

import { tokens } from '../theme';
import { REACTIONS } from './ReactionsLayer';

/** A circular control. `danger` renders the leave button, `active` the "on" state. */
function ControlButton({ label, onClick, disabled, active, danger, highlight, children }) {
    const background = danger
        ? tokens.danger.main
        : highlight ? tokens.accent.main
            : active ? tokens.surface.hover : "rgba(240,69,95,0.16)";

    const color = danger || highlight
        ? "#fff"
        : active ? tokens.text.primary : tokens.danger.main;

    return (
        <Tooltip title={label}>
            {/* span keeps the tooltip working while the button is disabled */}
            <span>
                <IconButton
                    onClick={onClick}
                    disabled={disabled}
                    aria-label={label}
                    sx={{
                        width: 48, height: 48,
                        bgcolor: background,
                        color,
                        border: `1px solid ${danger || highlight ? "transparent" : tokens.border.subtle}`,
                        "&:hover": {
                            bgcolor: danger ? tokens.danger.dark
                                : highlight ? tokens.accent.light
                                    : active ? tokens.border.strong : "rgba(240,69,95,0.26)"
                        },
                        "&.Mui-disabled": {
                            bgcolor: tokens.surface.raised,
                            color: tokens.text.tertiary,
                            border: `1px solid ${tokens.border.subtle}`
                        }
                    }}
                >
                    {children}
                </IconButton>
            </span>
        </Tooltip>
    );
}

export default function MeetingControls({
    video, audio, screen, handRaised,
    videoAvailable, audioAvailable, screenAvailable,
    captionsOn, captionsSupported,
    blurOn, blurLoading,
    recording,
    unreadCount, participantCount,
    onToggleVideo, onToggleAudio, onToggleScreen,
    onToggleChat, onTogglePeople, onCopyLink, onLeave,
    onReact, onToggleHand, onToggleCaptions, onToggleBlur,
    onToggleRecording, onShowShortcuts
}) {
    const [reactionAnchor, setReactionAnchor] = useState(null);
    const [moreAnchor, setMoreAnchor] = useState(null);

    const sendReaction = (emoji) => {
        onReact(emoji);
        setReactionAnchor(null);
    };

    const runAndClose = (fn) => () => { setMoreAnchor(null); fn?.(); };

    return (
        <Box
            component="footer"
            sx={{
                display: "flex",
                justifyContent: "center",
                px: 2,
                py: { xs: 1.5, sm: 2 },
                // Clears the iOS home indicator when installed to the home screen
                pb: { xs: "calc(12px + env(safe-area-inset-bottom))", sm: 2 },
                zIndex: 7
            }}
        >
            <Stack
                direction="row"
                spacing={{ xs: 0.75, sm: 1.25 }}
                alignItems="center"
                sx={{
                    p: 1,
                    borderRadius: 999,
                    bgcolor: "rgba(18,21,30,0.92)",
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${tokens.border.subtle}`,
                    maxWidth: "100%",
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" }
                }}
            >
                <ControlButton
                    label={audio ? "Mute microphone (M)" : "Unmute microphone (M)"}
                    onClick={onToggleAudio}
                    disabled={!audioAvailable}
                    active={audio}
                >
                    {audio ? <MicRoundedIcon /> : <MicOffRoundedIcon />}
                </ControlButton>

                <ControlButton
                    label={video ? "Turn camera off (V)" : "Turn camera on (V)"}
                    onClick={onToggleVideo}
                    disabled={!videoAvailable}
                    active={video}
                >
                    {video ? <VideocamRoundedIcon /> : <VideocamOffRoundedIcon />}
                </ControlButton>

                {screenAvailable && (
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>
                        <ControlButton
                            label={screen ? "Stop sharing" : "Share screen"}
                            onClick={onToggleScreen}
                            active={!screen}
                            highlight={screen}
                        >
                            {screen ? <StopScreenShareRoundedIcon /> : <ScreenShareRoundedIcon />}
                        </ControlButton>
                    </Box>
                )}

                <ControlButton label="Send a reaction" onClick={(e) => setReactionAnchor(e.currentTarget)} active>
                    <AddReactionRoundedIcon />
                </ControlButton>

                <ControlButton
                    label={handRaised ? "Lower hand (H)" : "Raise hand (H)"}
                    onClick={onToggleHand}
                    active={!handRaised}
                    highlight={handRaised}
                >
                    <PanToolRoundedIcon />
                </ControlButton>

                <ControlButton label="Chat (C)" onClick={onToggleChat} active>
                    <Badge badgeContent={unreadCount} max={99} color="primary">
                        <ChatRoundedIcon />
                    </Badge>
                </ControlButton>

                <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    <ControlButton label="Participants" onClick={onTogglePeople} active>
                        <Badge badgeContent={participantCount} max={99} color="default">
                            <PeopleAltRoundedIcon />
                        </Badge>
                    </ControlButton>
                </Box>

                <ControlButton label="More options" onClick={(e) => setMoreAnchor(e.currentTarget)} active>
                    <MoreHorizRoundedIcon />
                </ControlButton>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1 }} />

                <ControlButton label="Leave meeting" onClick={onLeave} danger>
                    <CallEndRoundedIcon />
                </ControlButton>
            </Stack>

            {/* ----------------------------------------------- reaction picker */}
            <Popover
                open={Boolean(reactionAnchor)}
                anchorEl={reactionAnchor}
                onClose={() => setReactionAnchor(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                transformOrigin={{ vertical: "bottom", horizontal: "center" }}
                slotProps={{ paper: { sx: { mb: 1.5, borderRadius: 999, bgcolor: tokens.surface.overlay } } }}
            >
                <Stack direction="row" spacing={0.5} sx={{ p: 1 }}>
                    {REACTIONS.map((emoji) => (
                        <IconButton
                            key={emoji}
                            onClick={() => sendReaction(emoji)}
                            aria-label={`React with ${emoji}`}
                            sx={{ fontSize: "1.4rem", width: 42, height: 42, "&:hover": { transform: "scale(1.15)" } }}
                        >
                            {emoji}
                        </IconButton>
                    ))}
                </Stack>
            </Popover>

            {/* --------------------------------------------------- more menu */}
            <Menu
                anchorEl={moreAnchor}
                open={Boolean(moreAnchor)}
                onClose={() => setMoreAnchor(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                transformOrigin={{ vertical: "bottom", horizontal: "center" }}
                slotProps={{ paper: { sx: { minWidth: 248, mb: 1.5 } } }}
            >
                <MenuItem onClick={runAndClose(onToggleCaptions)} disabled={!captionsSupported}>
                    <ClosedCaptionRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {captionsOn ? "Turn off captions" : "Turn on captions"}
                    {!captionsSupported && (
                        <Typography variant="caption" sx={{ ml: "auto", color: tokens.text.tertiary }}>
                            Chrome only
                        </Typography>
                    )}
                </MenuItem>

                <MenuItem onClick={runAndClose(onToggleBlur)} disabled={blurLoading || !videoAvailable}>
                    <BlurOnRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {blurLoading ? "Loading model…" : blurOn ? "Turn off background blur" : "Blur my background"}
                </MenuItem>

                <MenuItem onClick={runAndClose(onToggleRecording)}>
                    {recording
                        ? <StopCircleRoundedIcon fontSize="small" sx={{ mr: 1.5, color: tokens.danger.main }} />
                        : <FiberManualRecordRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />}
                    {recording ? "Stop recording" : "Record meeting"}
                </MenuItem>

                <Divider />

                <MenuItem onClick={runAndClose(onTogglePeople)} sx={{ display: { sm: "none" } }}>
                    <PeopleAltRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Participants
                </MenuItem>

                <MenuItem onClick={runAndClose(onCopyLink)}>
                    <ContentCopyRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Copy invite link
                </MenuItem>

                <MenuItem onClick={runAndClose(onShowShortcuts)}>
                    <KeyboardRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Keyboard shortcuts
                </MenuItem>
            </Menu>
        </Box>
    );
}
