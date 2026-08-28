import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Avatar, Box, Container, Divider, IconButton,
    ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography
} from '@mui/material';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

import { AuthContext } from '../contexts/AuthContext';
import Logo from './Logo';
import { tokens } from '../theme';

const initialsOf = (value = "") =>
    value.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export default function AppHeader() {
    const navigate = useNavigate();
    const { userData, handleLogout } = useContext(AuthContext);
    const [anchorEl, setAnchorEl] = useState(null);

    return (
        <Box
            component="header"
            sx={{
                borderBottom: `1px solid ${tokens.border.subtle}`,
                bgcolor: "rgba(11,13,18,0.8)",
                backdropFilter: "blur(12px)",
                position: "sticky",
                top: 0,
                zIndex: 10
            }}
        >
            <Container maxWidth="lg">
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 2 }}>
                    <Box
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate("/home")}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate("/home"); }}
                        sx={{ cursor: "pointer", borderRadius: 1 }}
                    >
                        <Logo size={26} />
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Meeting history">
                            <IconButton onClick={() => navigate("/history")} aria-label="Meeting history">
                                <RestoreRoundedIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Account">
                            <IconButton
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                aria-label="Account menu"
                                aria-haspopup="true"
                                sx={{ p: 0.5 }}
                            >
                                <Avatar
                                    sx={{
                                        width: 32, height: 32, fontSize: "0.8rem", fontWeight: 600,
                                        bgcolor: tokens.accent.dark, color: "#fff"
                                    }}
                                >
                                    {initialsOf(userData?.name || userData?.username)}
                                </Avatar>
                            </IconButton>
                        </Tooltip>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                            slotProps={{ paper: { sx: { minWidth: 210, mt: 1 } } }}
                        >
                            <Box sx={{ px: 2, py: 1.25 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {userData?.name || "Signed in"}
                                </Typography>
                                <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                                    @{userData?.username}
                                </Typography>
                            </Box>
                            <Divider />
                            <MenuItem onClick={() => { setAnchorEl(null); navigate("/history"); }}>
                                <ListItemIcon><RestoreRoundedIcon fontSize="small" /></ListItemIcon>
                                Meeting history
                            </MenuItem>
                            <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }}>
                                <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
                                Sign out
                            </MenuItem>
                        </Menu>
                    </Stack>
                </Stack>
            </Container>
        </Box>
    );
}

export { initialsOf };
