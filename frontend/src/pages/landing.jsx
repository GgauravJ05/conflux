import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import ScreenShareRoundedIcon from '@mui/icons-material/ScreenShareRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import Logo from '../components/Logo';
import { tokens } from '../theme';

const features = [
    {
        icon: VideocamRoundedIcon,
        title: "Peer-to-peer video",
        body: "Media flows directly between participants over WebRTC, so quality stays high and nothing is stored on a server."
    },
    {
        icon: ScreenShareRoundedIcon,
        title: "Share your screen",
        body: "Present a tab, a window, or your whole desktop. Switching sources never drops the call."
    },
    {
        icon: ChatRoundedIcon,
        title: "Chat that keeps up",
        body: "Messages sync instantly, and anyone joining late receives the full conversation history."
    },
    {
        icon: LockRoundedIcon,
        title: "Private by default",
        body: "Rooms are reachable only by their code. Passwords are hashed and sessions are revoked on sign out."
    }
];

// Soft radial washes behind the hero. Pure decoration, so hidden from assistive tech.
function Backdrop() {
    return (
        <Box
            aria-hidden="true"
            sx={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                pointerEvents: "none",
                "&::before, &::after": {
                    content: '""',
                    position: "absolute",
                    borderRadius: "50%",
                    filter: "blur(90px)"
                },
                "&::before": {
                    width: 560, height: 560, top: -220, left: "48%",
                    background: "radial-gradient(circle, rgba(99,102,241,0.30), transparent 70%)"
                },
                "&::after": {
                    width: 460, height: 460, top: 120, left: "-12%",
                    background: "radial-gradient(circle, rgba(56,189,248,0.14), transparent 70%)"
                }
            }}
        />
    );
}

export default function LandingPage() {
    const navigate = useNavigate();

    // Guests get a fresh random room rather than everyone landing in the same one
    const joinAsGuest = () => navigate(`/${Math.random().toString(36).substring(2, 10)}`);

    return (
        <Box sx={{ position: "relative", minHeight: "100%", overflowX: "hidden" }}>
            <Backdrop />

            <Box sx={{ position: "relative" }}>
                {/* ---------------------------------------------------------- nav */}
                <Container maxWidth="lg">
                    <Stack
                        component="nav"
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ py: 3 }}
                    >
                        <Logo />

                        <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
                            <Button onClick={joinAsGuest} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                                Join as guest
                            </Button>
                            <Button onClick={() => navigate("/auth")}>Sign in</Button>
                            <Button variant="contained" onClick={() => navigate("/auth?mode=register")}>
                                Get started
                            </Button>
                        </Stack>
                    </Stack>
                </Container>

                {/* --------------------------------------------------------- hero */}
                <Container maxWidth="md" sx={{ textAlign: "center", pt: { xs: 7, md: 12 }, pb: { xs: 8, md: 12 } }}>
                    <Stack spacing={3} alignItems="center" sx={{ animation: "conflux-fade-up .6s ease both" }}>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{
                                px: 1.75, py: 0.75, borderRadius: 999,
                                border: `1px solid ${tokens.border.default}`,
                                bgcolor: "rgba(255,255,255,0.03)"
                            }}
                        >
                            <Box sx={{
                                width: 7, height: 7, borderRadius: "50%",
                                bgcolor: tokens.success.main,
                                animation: "conflux-pulse 2s ease-in-out infinite"
                            }} />
                            <Typography variant="caption" sx={{ color: tokens.text.secondary, fontWeight: 500 }}>
                                No downloads. No plugins. Just a link.
                            </Typography>
                        </Stack>

                        <Typography variant="h1">
                            Every conversation,<br />
                            in{" "}
                            <Box
                                component="span"
                                sx={{
                                    background: `linear-gradient(100deg, ${tokens.accent.light}, #38BDF8)`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text"
                                }}
                            >
                                one stream
                            </Box>
                            .
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{ color: tokens.text.secondary, maxWidth: 560, fontSize: "1.075rem" }}
                        >
                            Conflux is a secure, instant video meeting room for teams. Start a call in
                            one click and share the link — everything runs in the browser.
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}>
                            <Button
                                size="large"
                                variant="contained"
                                endIcon={<ArrowForwardRoundedIcon />}
                                onClick={() => navigate("/auth?mode=register")}
                            >
                                Start a meeting
                            </Button>
                            <Button size="large" variant="outlined" onClick={joinAsGuest}>
                                Join as guest
                            </Button>
                        </Stack>
                    </Stack>
                </Container>

                {/* ------------------------------------------------------ features */}
                <Container maxWidth="lg" sx={{ pb: { xs: 8, md: 14 } }}>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }
                        }}
                    >
                        {features.map(({ icon: Icon, title, body }) => (
                            <Box
                                key={title}
                                sx={{
                                    p: 3,
                                    borderRadius: `${tokens.radius.lg}px`,
                                    border: `1px solid ${tokens.border.subtle}`,
                                    bgcolor: tokens.surface.raised,
                                    transition: "border-color .2s ease, transform .2s ease",
                                    "&:hover": { borderColor: tokens.border.strong, transform: "translateY(-2px)" }
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 38, height: 38, mb: 2,
                                        display: "grid", placeItems: "center",
                                        borderRadius: `${tokens.radius.sm}px`,
                                        bgcolor: "rgba(99,102,241,0.12)",
                                        color: tokens.accent.light
                                    }}
                                >
                                    <Icon fontSize="small" />
                                </Box>
                                <Typography variant="h5" sx={{ mb: 0.75 }}>{title}</Typography>
                                <Typography variant="body2" sx={{ color: tokens.text.secondary }}>{body}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Container>

                {/* -------------------------------------------------------- footer */}
                <Box sx={{ borderTop: `1px solid ${tokens.border.subtle}` }}>
                    <Container maxWidth="lg">
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ py: 3 }}
                        >
                            <Logo size={22} />
                            <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                                Built with React, WebRTC and Socket.IO.
                            </Typography>
                        </Stack>
                    </Container>
                </Box>
            </Box>
        </Box>
    );
}
