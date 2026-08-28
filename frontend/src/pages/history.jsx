import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Button, Container, IconButton, Skeleton, Stack, Tooltip, Typography
} from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';

import withAuth from '../utils/withAuth';
import AppHeader from '../components/AppHeader';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import { tokens } from '../theme';

const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
    });
};

const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

function History() {
    const navigate = useNavigate();
    const toast = useToast();
    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            const history = await getHistoryOfUser();
            setMeetings(Array.isArray(history) ? history : []);
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setLoading(false);
        }
        // getHistoryOfUser is recreated on every provider render, so it is
        // deliberately not a dependency; this should run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const copyLink = async (code) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/${code}`);
            toast("Meeting link copied.", "success");
        } catch {
            toast("Could not copy the link.", "error");
        }
    };

    return (
        <Box sx={{ minHeight: "100%" }}>
            <AppHeader />

            <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
                <Stack spacing={1} sx={{ mb: 4 }}>
                    <Typography variant="h2">Meeting history</Typography>
                    <Typography variant="body1" sx={{ color: tokens.text.secondary }}>
                        Rooms you have joined, most recent first.
                    </Typography>
                </Stack>

                {loading && (
                    <Stack spacing={1.5}>
                        {[0, 1, 2].map((i) => (
                            <Skeleton
                                key={i}
                                variant="rounded"
                                height={76}
                                sx={{ bgcolor: tokens.surface.raised, borderRadius: `${tokens.radius.lg}px` }}
                            />
                        ))}
                    </Stack>
                )}

                {!loading && meetings.length === 0 && (
                    <Stack
                        alignItems="center"
                        spacing={2}
                        sx={{
                            py: 8, px: 3, textAlign: "center",
                            borderRadius: `${tokens.radius.xl}px`,
                            border: `1px dashed ${tokens.border.default}`
                        }}
                    >
                        <Box sx={{ color: tokens.text.tertiary }}>
                            <EventBusyRoundedIcon sx={{ fontSize: 40 }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ mb: 0.5 }}>No meetings yet</Typography>
                            <Typography variant="body2" sx={{ color: tokens.text.secondary }}>
                                Once you join a room it will show up here.
                            </Typography>
                        </Box>
                        <Button variant="contained" onClick={() => navigate("/home")}>
                            Start a meeting
                        </Button>
                    </Stack>
                )}

                <Stack spacing={1.5}>
                    {meetings.map((meeting) => (
                        <Stack
                            key={meeting._id}
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            sx={{
                                p: 2,
                                borderRadius: `${tokens.radius.lg}px`,
                                border: `1px solid ${tokens.border.subtle}`,
                                bgcolor: tokens.surface.raised,
                                transition: "border-color .2s ease",
                                "&:hover": { borderColor: tokens.border.strong }
                            }}
                        >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    variant="h5"
                                    sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                >
                                    {meeting.meetingCode}
                                </Typography>
                                <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                                    {formatDate(meeting.date)} · {formatTime(meeting.date)}
                                </Typography>
                            </Box>

                            <Tooltip title="Copy link">
                                <IconButton
                                    onClick={() => copyLink(meeting.meetingCode)}
                                    aria-label={`Copy link for ${meeting.meetingCode}`}
                                >
                                    <ContentCopyRoundedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>

                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<LoginRoundedIcon fontSize="small" />}
                                onClick={() => navigate(`/${meeting.meetingCode}`)}
                                sx={{ flexShrink: 0 }}
                            >
                                Rejoin
                            </Button>
                        </Stack>
                    ))}
                </Stack>
            </Container>
        </Box>
    );
}

export default withAuth(History);
