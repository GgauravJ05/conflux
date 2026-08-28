import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Button, Container, InputAdornment, IconButton,
    Stack, TextField, Typography, CircularProgress
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import Logo from '../components/Logo';
import { tokens } from '../theme';

export default function Authentication() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Landing page links straight to the register tab via ?mode=register
    const [isRegister, setIsRegister] = React.useState(searchParams.get("mode") === "register");

    // Every field starts as "" so MUI inputs stay controlled from the first render
    const [name, setName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [error, setError] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    const switchMode = (register) => {
        setIsRegister(register);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password || (isRegister && !name.trim())) {
            setError("Please fill in all the fields.");
            return;
        }

        setLoading(true);
        try {
            if (isRegister) {
                const result = await handleRegister(name.trim(), username.trim(), password);
                toast(result || "Account created — you can sign in now.", "success");
                setName("");
                setPassword("");
                setIsRegister(false);
            } else {
                await handleLogin(username.trim(), password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100%" }}>
            {/* ------------------------------------------------ brand panel (md+) */}
            <Box
                sx={{
                    display: { xs: "none", md: "flex" },
                    flexDirection: "column",
                    justifyContent: "space-between",
                    width: "46%",
                    p: 6,
                    position: "relative",
                    overflow: "hidden",
                    borderRight: `1px solid ${tokens.border.subtle}`,
                    bgcolor: tokens.surface.raised
                }}
            >
                <Box
                    aria-hidden="true"
                    sx={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        "&::before": {
                            content: '""', position: "absolute",
                            width: 520, height: 520, top: "18%", left: "-25%",
                            borderRadius: "50%", filter: "blur(90px)",
                            background: "radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%)"
                        }
                    }}
                />

                <Box sx={{ position: "relative" }}>
                    <Logo size={30} />
                </Box>

                <Stack spacing={2.5} sx={{ position: "relative", maxWidth: 420 }}>
                    <Typography variant="h2">
                        Meetings without the setup.
                    </Typography>
                    <Typography variant="body1" sx={{ color: tokens.text.secondary }}>
                        Create a room, share the link, and start talking. Conflux runs entirely
                        in the browser — no installs, no meeting IDs to memorise.
                    </Typography>
                </Stack>

                <Typography variant="caption" sx={{ position: "relative", color: tokens.text.tertiary }}>
                    Built with React, WebRTC and Socket.IO.
                </Typography>
            </Box>

            {/* ------------------------------------------------------------ form */}
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 6 }}>
                <Container maxWidth="xs" disableGutters>
                    <Button
                        onClick={() => navigate("/")}
                        startIcon={<ArrowBackRoundedIcon />}
                        sx={{ mb: 3, ml: -1 }}
                    >
                        Back
                    </Button>

                    <Box sx={{ display: { xs: "block", md: "none" }, mb: 3 }}>
                        <Logo />
                    </Box>

                    <Typography variant="h3" sx={{ mb: 0.75 }}>
                        {isRegister ? "Create your account" : "Welcome back"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.text.secondary, mb: 3.5 }}>
                        {isRegister
                            ? "Takes less than a minute."
                            : "Sign in to start or join a meeting."}
                    </Typography>

                    {/* Segmented sign in / sign up switch */}
                    <Stack
                        direction="row"
                        sx={{
                            p: 0.5, mb: 3, gap: 0.5,
                            borderRadius: `${tokens.radius.sm + 2}px`,
                            bgcolor: tokens.surface.overlay,
                            border: `1px solid ${tokens.border.subtle}`
                        }}
                    >
                        {[
                            { label: "Sign in", value: false },
                            { label: "Sign up", value: true }
                        ].map((tab) => (
                            <Button
                                key={tab.label}
                                fullWidth
                                disableRipple
                                onClick={() => switchMode(tab.value)}
                                sx={{
                                    py: 1,
                                    color: isRegister === tab.value ? tokens.text.primary : tokens.text.secondary,
                                    bgcolor: isRegister === tab.value ? tokens.surface.hover : "transparent",
                                    "&:hover": {
                                        bgcolor: isRegister === tab.value ? tokens.surface.hover : "rgba(255,255,255,0.04)"
                                    }
                                }}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </Stack>

                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <Stack spacing={2}>
                            {isRegister && (
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Full name"
                                    autoComplete="name"
                                    value={name}
                                    autoFocus
                                    onChange={(e) => setName(e.target.value)}
                                />
                            )}

                            <TextField
                                fullWidth
                                id="username"
                                name="username"
                                label="Username"
                                autoComplete="username"
                                value={username}
                                autoFocus={!isRegister}
                                onChange={(e) => setUsername(e.target.value)}
                            />

                            <TextField
                                fullWidth
                                id="password"
                                name="password"
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                autoComplete={isRegister ? "new-password" : "current-password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                helperText={isRegister ? "At least 6 characters." : " "}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword((v) => !v)}
                                                edge="end"
                                                size="small"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword
                                                    ? <VisibilityOffRoundedIcon fontSize="small" />
                                                    : <VisibilityRoundedIcon fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            {error && (
                                <Typography role="alert" variant="body2" sx={{ color: "error.main" }}>
                                    {error}
                                </Typography>
                            )}

                            <Button
                                type="submit"
                                fullWidth
                                size="large"
                                variant="contained"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                            >
                                {loading
                                    ? (isRegister ? "Creating account..." : "Signing in...")
                                    : (isRegister ? "Create account" : "Sign in")}
                            </Button>
                        </Stack>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}
