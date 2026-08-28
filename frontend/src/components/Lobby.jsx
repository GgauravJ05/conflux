import React, { useEffect, useRef } from 'react';
import {
    Avatar, Box, Button, Container, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography
} from '@mui/material';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';

import Logo from './Logo';
import useAudioLevel from '../hooks/useAudioLevel';
import { tokens } from '../theme';
import { initialsOf } from './AppHeader';

/** Twelve segments that light up in proportion to current mic loudness. */
function MicMeter({ level, active }) {
    const segments = 12;
    const lit = active ? Math.round(level * segments) : 0;

    return (
        <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            role="meter"
            aria-label="Microphone level"
            aria-valuenow={Math.round(level * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            {Array.from({ length: segments }).map((_, i) => (
                <Box
                    key={i}
                    sx={{
                        width: 4, height: 14, borderRadius: 1,
                        bgcolor: i < lit ? tokens.success.main : tokens.border.default,
                        transition: "background-color .08s linear"
                    }}
                />
            ))}
        </Stack>
    );
}

export default function Lobby({
    username, setUsername,
    stream,
    devices, selectedCamera, selectedMic, onSelectCamera, onSelectMic,
    video, audio, videoAvailable, audioAvailable,
    onToggleVideo, onToggleAudio,
    onJoin, joining, meetingCode, permissionError
}) {
    const videoRef = useRef(null);
    const level = useAudioLevel(stream, audio);

    useEffect(() => {
        const el = videoRef.current;
        if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
        }
    }, [stream]);

    return (
        <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
            <Container maxWidth="lg" sx={{ py: 3 }}>
                <Logo size={26} />
            </Container>

            <Container maxWidth="lg" sx={{ flex: 1, display: "flex", alignItems: "center", pb: 6 }}>
                <Box
                    sx={{
                        display: "grid",
                        gap: { xs: 3, md: 6 },
                        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.35fr) minmax(300px, 1fr)" },
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    {/* ------------------------------------------------- preview */}
                    <Box>
                        <Box
                            sx={{
                                position: "relative",
                                aspectRatio: "16 / 9",
                                borderRadius: `${tokens.radius.xl}px`,
                                overflow: "hidden",
                                bgcolor: "#000",
                                border: `1px solid ${tokens.border.default}`
                            }}
                        >
                            <Box
                                component="video"
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                sx={{
                                    width: "100%", height: "100%", objectFit: "cover",
                                    transform: "scaleX(-1)",
                                    display: video ? "block" : "none"
                                }}
                            />

                            {!video && (
                                <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ position: "absolute", inset: 0 }}>
                                    <Avatar sx={{
                                        width: 76, height: 76, fontSize: "1.6rem", fontWeight: 600,
                                        bgcolor: tokens.accent.dark, color: "#fff"
                                    }}>
                                        {initialsOf(username || "Guest")}
                                    </Avatar>
                                    <Typography variant="body2" sx={{ color: tokens.text.tertiary }}>
                                        Camera is off
                                    </Typography>
                                </Stack>
                            )}

                            {/* Floating preview controls */}
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)" }}
                            >
                                <Tooltip title={audio ? "Mute microphone" : "Unmute microphone"}>
                                    <span>
                                        <IconButton
                                            onClick={onToggleAudio}
                                            disabled={!audioAvailable}
                                            aria-label={audio ? "Mute microphone" : "Unmute microphone"}
                                            sx={{
                                                width: 44, height: 44,
                                                bgcolor: audio ? "rgba(24,28,39,0.9)" : tokens.danger.main,
                                                color: "#fff",
                                                "&:hover": { bgcolor: audio ? tokens.surface.hover : tokens.danger.dark }
                                            }}
                                        >
                                            {audio ? <MicRoundedIcon /> : <MicOffRoundedIcon />}
                                        </IconButton>
                                    </span>
                                </Tooltip>

                                <Tooltip title={video ? "Turn camera off" : "Turn camera on"}>
                                    <span>
                                        <IconButton
                                            onClick={onToggleVideo}
                                            disabled={!videoAvailable}
                                            aria-label={video ? "Turn camera off" : "Turn camera on"}
                                            sx={{
                                                width: 44, height: 44,
                                                bgcolor: video ? "rgba(24,28,39,0.9)" : tokens.danger.main,
                                                color: "#fff",
                                                "&:hover": { bgcolor: video ? tokens.surface.hover : tokens.danger.dark }
                                            }}
                                        >
                                            {video ? <VideocamRoundedIcon /> : <VideocamOffRoundedIcon />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Stack>
                        </Box>

                        {/* Device pickers */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                            <FormControl fullWidth size="small" disabled={!videoAvailable}>
                                <InputLabel id="camera-label">Camera</InputLabel>
                                <Select
                                    labelId="camera-label"
                                    label="Camera"
                                    value={selectedCamera || ""}
                                    onChange={(e) => onSelectCamera(e.target.value)}
                                >
                                    {devices.cameras.map((d, i) => (
                                        <MenuItem key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Camera ${i + 1}`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small" disabled={!audioAvailable}>
                                <InputLabel id="mic-label">Microphone</InputLabel>
                                <Select
                                    labelId="mic-label"
                                    label="Microphone"
                                    value={selectedMic || ""}
                                    onChange={(e) => onSelectMic(e.target.value)}
                                >
                                    {devices.mics.map((d, i) => (
                                        <MenuItem key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Microphone ${i + 1}`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
                            <MicMeter level={level} active={audio && audioAvailable} />
                            <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                                {audioAvailable
                                    ? (audio ? "Speak to test your microphone" : "Microphone is muted")
                                    : "No microphone detected"}
                            </Typography>
                        </Stack>
                    </Box>

                    {/* ---------------------------------------------- join panel */}
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography variant="h2" sx={{ mb: 1 }}>Ready to join?</Typography>
                            <Typography variant="body1" sx={{ color: tokens.text.secondary }}>
                                Room{" "}
                                <Box component="span" sx={{ color: tokens.text.primary, fontWeight: 600 }}>
                                    {meetingCode}
                                </Box>
                            </Typography>
                        </Box>

                        {permissionError && (
                            <Box
                                role="alert"
                                sx={{
                                    p: 2, borderRadius: `${tokens.radius.md}px`,
                                    border: `1px solid rgba(240,69,95,0.35)`,
                                    bgcolor: "rgba(240,69,95,0.08)"
                                }}
                            >
                                <Typography variant="body2" sx={{ color: tokens.danger.main }}>
                                    {permissionError}
                                </Typography>
                            </Box>
                        )}

                        <Box component="form" onSubmit={(e) => { e.preventDefault(); onJoin(); }}>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Your name"
                                    placeholder="How should we announce you?"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    inputProps={{ maxLength: 32 }}
                                    autoFocus
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    disabled={joining}
                                >
                                    {joining ? "Joining..." : "Join now"}
                                </Button>
                            </Stack>
                        </Box>

                        <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                            Your camera and microphone stay off until you join.
                        </Typography>
                    </Stack>
                </Box>
            </Container>
        </Box>
    );
}
