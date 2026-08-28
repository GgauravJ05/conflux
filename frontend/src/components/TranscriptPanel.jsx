import React, { useEffect, useRef } from 'react';
import { Box, Button, Stack, Typography, CircularProgress } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { tokens } from '../theme';

const formatTime = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default function TranscriptPanel({
    transcript, listening, supported, captionsError,
    onToggleCaptions, onDownload, onSummarise, summarising, aiEnabled
}) {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [transcript.length]);

    return (
        <>
            <Box sx={{ px: 2, pt: 2 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Button
                        fullWidth
                        size="small"
                        variant={listening ? "outlined" : "contained"}
                        disabled={!supported}
                        onClick={onToggleCaptions}
                    >
                        {listening ? "Stop captions" : "Start captions"}
                    </Button>
                </Stack>

                {!supported && (
                    <Typography variant="caption" sx={{ color: tokens.warning.main, display: "block", mb: 1 }}>
                        Live captions need the Web Speech API — available in Chrome and Edge.
                        You can still read captions other people send.
                    </Typography>
                )}

                {captionsError && (
                    <Typography variant="caption" sx={{ color: tokens.danger.main, display: "block", mb: 1 }}>
                        {captionsError}
                    </Typography>
                )}
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", px: 2, pb: 1 }}>
                {transcript.length === 0 ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", textAlign: "center", px: 2 }}>
                        <Typography variant="body2" sx={{ color: tokens.text.tertiary }}>
                            {listening
                                ? "Listening… start speaking and the transcript will fill in."
                                : "Turn on captions to build a transcript of this meeting."}
                        </Typography>
                    </Stack>
                ) : (
                    <Stack spacing={1.75}>
                        {transcript.map((line, i) => {
                            const grouped = i > 0 && transcript[i - 1].speaker === line.speaker;
                            return (
                                <Box key={`${line.at}-${i}`}>
                                    {!grouped && (
                                        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.25 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                {line.speaker}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: tokens.text.tertiary, fontSize: "0.68rem" }}>
                                                {formatTime(line.at)}
                                            </Typography>
                                        </Stack>
                                    )}
                                    <Typography variant="body2" sx={{ color: tokens.text.secondary }}>
                                        {line.text}
                                    </Typography>
                                </Box>
                            );
                        })}
                        <div ref={endRef} />
                    </Stack>
                )}
            </Box>

            <Stack spacing={1} sx={{ p: 2, borderTop: `1px solid ${tokens.border.subtle}` }}>
                {aiEnabled && (
                    <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        disabled={transcript.length === 0 || summarising}
                        onClick={onSummarise}
                        startIcon={summarising
                            ? <CircularProgress size={15} color="inherit" />
                            : <AutoAwesomeRoundedIcon fontSize="small" />}
                    >
                        {summarising ? "Summarising…" : "Summarise with AI"}
                    </Button>
                )}
                <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    disabled={transcript.length === 0}
                    onClick={onDownload}
                    startIcon={<DownloadRoundedIcon fontSize="small" />}
                >
                    Download transcript
                </Button>
            </Stack>
        </>
    );
}
