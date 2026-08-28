import React, { useEffect, useRef } from 'react';
import {
    Avatar, Box, IconButton, Stack, Tab, Tabs, TextField, Typography
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';

import { tokens } from '../theme';
import { initialsOf } from './AppHeader';
import TranscriptPanel from './TranscriptPanel';
import StatsPanel from './StatsPanel';

const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

function ChatTab({ messages, message, setMessage, onSend, mySocketId }) {
    const endRef = useRef(null);

    // Keep the newest message in view as the conversation grows
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages.length]);

    return (
        <>
            <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
                {messages.length === 0 ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", textAlign: "center", px: 2 }}>
                        <Typography variant="body2" sx={{ color: tokens.text.tertiary }}>
                            No messages yet. Say hello.
                        </Typography>
                    </Stack>
                ) : (
                    <Stack spacing={2}>
                        {messages.map((item, index) => {
                            const mine = item.socketId === mySocketId;
                            // Group consecutive messages from the same person
                            const grouped = index > 0 && messages[index - 1].sender === item.sender;

                            return (
                                <Box key={index}>
                                    {!grouped && (
                                        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{ fontWeight: 600, color: mine ? tokens.accent.light : tokens.text.primary }}
                                            >
                                                {mine ? "You" : item.sender}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: tokens.text.tertiary, fontSize: "0.68rem" }}>
                                                {formatTime(item.at)}
                                            </Typography>
                                        </Stack>
                                    )}
                                    <Typography
                                        variant="body2"
                                        sx={{ color: tokens.text.secondary, wordBreak: "break-word" }}
                                    >
                                        {item.data}
                                    </Typography>
                                </Box>
                            );
                        })}
                        <div ref={endRef} />
                    </Stack>
                )}
            </Box>

            <Box
                component="form"
                onSubmit={(e) => { e.preventDefault(); onSend(); }}
                sx={{ p: 2, borderTop: `1px solid ${tokens.border.subtle}` }}
            >
                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Send a message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        inputProps={{ "aria-label": "Chat message", maxLength: 2000 }}
                    />
                    <IconButton
                        type="submit"
                        aria-label="Send message"
                        disabled={!message.trim()}
                        sx={{
                            bgcolor: tokens.accent.main, color: "#fff", borderRadius: `${tokens.radius.sm}px`,
                            "&:hover": { bgcolor: tokens.accent.light },
                            "&.Mui-disabled": { bgcolor: tokens.surface.hover, color: tokens.text.tertiary }
                        }}
                    >
                        <SendRoundedIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>
        </>
    );
}

function PeopleTab({ participants, mySocketId, mediaStates, localMedia }) {
    return (
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
            <Stack spacing={0.5}>
                {participants.map((p) => {
                    const mine = p.socketId === mySocketId;
                    const state = mine ? localMedia : mediaStates[p.socketId];
                    const audioOn = state ? state.audio : true;

                    return (
                        <Stack
                            key={p.socketId}
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                            sx={{ py: 1, px: 1, borderRadius: `${tokens.radius.sm}px` }}
                        >
                            <Avatar
                                sx={{
                                    width: 32, height: 32, fontSize: "0.75rem", fontWeight: 600,
                                    bgcolor: mine ? tokens.accent.dark : tokens.surface.hover,
                                    color: tokens.text.primary
                                }}
                            >
                                {initialsOf(p.username)}
                            </Avatar>

                            <Typography
                                variant="body2"
                                sx={{
                                    flex: 1, minWidth: 0, fontWeight: 500,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                }}
                            >
                                {p.username}{mine && " (you)"}
                            </Typography>

                            {p.handRaised && (
                                <Box component="span" sx={{ fontSize: "1rem" }} title="Hand raised">✋</Box>
                            )}
                            {!audioOn && (
                                <MicOffRoundedIcon sx={{ fontSize: 17, color: tokens.text.tertiary }} />
                            )}
                        </Stack>
                    );
                })}
            </Stack>
        </Box>
    );
}

export default function SidePanel({
    tab, setTab, onClose,
    messages, message, setMessage, onSend,
    participants, mySocketId, mediaStates, localMedia,
    transcriptProps, stats
}) {
    return (
        <Box
            component="aside"
            aria-label="Meeting side panel"
            sx={{
                display: "flex",
                flexDirection: "column",
                bgcolor: tokens.surface.raised,
                border: `1px solid ${tokens.border.subtle}`,
                borderRadius: `${tokens.radius.lg}px`,
                overflow: "hidden",
                height: "100%",
                minHeight: 0
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ pl: 1, pr: 1, borderBottom: `1px solid ${tokens.border.subtle}` }}
            >
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    variant="scrollable"
                    scrollButtons={false}
                    sx={{
                        minHeight: 48, flex: 1, minWidth: 0,
                        "& .MuiTab-root": {
                            minHeight: 48, minWidth: 0, px: 1.5,
                            textTransform: "none", fontWeight: 600, fontSize: "0.82rem"
                        }
                    }}
                >
                    <Tab label="Chat" value="chat" />
                    <Tab label={`People (${participants.length})`} value="people" />
                    <Tab label="Transcript" value="transcript" />
                    <Tab label="Stats" value="stats" />
                </Tabs>

                <IconButton onClick={onClose} size="small" aria-label="Close panel">
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>
            </Stack>

            {tab === "chat" && (
                <ChatTab
                    messages={messages}
                    message={message}
                    setMessage={setMessage}
                    onSend={onSend}
                    mySocketId={mySocketId}
                />
            )}

            {tab === "people" && (
                <PeopleTab
                    participants={participants}
                    mySocketId={mySocketId}
                    mediaStates={mediaStates}
                    localMedia={localMedia}
                />
            )}

            {tab === "transcript" && <TranscriptPanel {...transcriptProps} />}

            {tab === "stats" && (
                <StatsPanel stats={stats} participants={participants} mySocketId={mySocketId} />
            )}
        </Box>
    );
}
