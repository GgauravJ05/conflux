import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Container, Divider, Stack, TextField, Typography
} from '@mui/material';
import VideoCallRoundedIcon from '@mui/icons-material/VideoCallRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';

import withAuth from '../utils/withAuth';
import AppHeader from '../components/AppHeader';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import { tokens } from '../theme';

// Meeting codes live in the URL, so keep them to URL-safe characters
const sanitiseCode = (code) =>
    code.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");

function HomeComponent() {
    const navigate = useNavigate();
    const toast = useToast();
    const { addToUserHistory, userData } = useContext(AuthContext);

    const [meetingCode, setMeetingCode] = useState("");

    const joinMeeting = async (rawCode) => {
        const code = sanitiseCode(rawCode);

        if (!code) {
            toast("Please enter a meeting code.", "warning");
            return;
        }

        // A history write must never stop the user from joining the call
        try {
            await addToUserHistory(code);
        } catch (e) {
            console.error(e);
        }
        navigate(`/${code}`);
    };

    const handleNewMeeting = () =>
        joinMeeting(Math.random().toString(36).substring(2, 10));

    const firstName = (userData?.name || "").split(" ")[0];

    return (
        <Box sx={{ minHeight: "100%" }}>
            <AppHeader />

            <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
                <Stack spacing={1} sx={{ mb: 5 }}>
                    <Typography variant="h2">
                        {firstName ? `Hey ${firstName}.` : "Hey there."}
                    </Typography>
                    <Typography variant="body1" sx={{ color: tokens.text.secondary }}>
                        Start a new meeting, or join one with a code.
                    </Typography>
                </Stack>

                <Box
                    sx={{
                        p: { xs: 2.5, sm: 4 },
                        borderRadius: `${tokens.radius.xl}px`,
                        border: `1px solid ${tokens.border.subtle}`,
                        bgcolor: tokens.surface.raised
                    }}
                >
                    <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        startIcon={<VideoCallRoundedIcon />}
                        onClick={handleNewMeeting}
                    >
                        New meeting
                    </Button>

                    <Divider sx={{ my: 3 }}>
                        <Typography variant="caption" sx={{ color: tokens.text.tertiary, px: 1 }}>
                            OR JOIN WITH A CODE
                        </Typography>
                    </Divider>

                    <Box
                        component="form"
                        onSubmit={(e) => { e.preventDefault(); joinMeeting(meetingCode); }}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <TextField
                                fullWidth
                                id="meeting-code"
                                label="Meeting code"
                                placeholder="e.g. team-standup"
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                            />
                            <Button
                                type="submit"
                                size="large"
                                variant="outlined"
                                startIcon={<LoginRoundedIcon />}
                                sx={{ flexShrink: 0, px: 3 }}
                            >
                                Join
                            </Button>
                        </Stack>
                    </Box>
                </Box>

                <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 3, color: tokens.text.tertiary, textAlign: "center" }}
                >
                    Anyone with the meeting link can join. Share it only with people you trust.
                </Typography>
            </Container>
        </Box>
    );
}

export default withAuth(HomeComponent);
