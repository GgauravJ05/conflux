import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import io from "socket.io-client";
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';

import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import Lobby from '../components/Lobby';
import VideoTile from '../components/VideoTile';
import SidePanel from '../components/SidePanel';
import MeetingControls from '../components/MeetingControls';
import CaptionsOverlay from '../components/CaptionsOverlay';
import ReactionsLayer from '../components/ReactionsLayer';
import ShortcutsDialog from '../components/ShortcutsDialog';
import SummaryDialog from '../components/SummaryDialog';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useConnectionStats from '../hooks/useConnectionStats';
import useActiveSpeaker from '../hooks/useActiveSpeaker';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import useBackgroundBlur from '../hooks/useBackgroundBlur';
import useRecorder from '../hooks/useRecorder';
import { tokens } from '../theme';

// How long a floating reaction stays on screen
const REACTION_TTL_MS = 3000;
// A caption line disappears if the speaker goes quiet for this long
const CAPTION_TTL_MS = 6000;

// TURN credentials are optional: without them calls still work on most home
// networks via STUN, but fail behind symmetric NAT. See README > Deployment.
const buildIceServers = () => {
    const servers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ];

    const turnUrl = process.env.REACT_APP_TURN_URL;
    if (turnUrl) {
        servers.push({
            urls: turnUrl,
            username: process.env.REACT_APP_TURN_USERNAME,
            credential: process.env.REACT_APP_TURN_CREDENTIAL
        });
    }
    return servers;
};

const peerConfigConnections = { iceServers: buildIceServers() };

// Placeholder tracks so peers still receive a stream when there is no camera/mic
const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
};

const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    return Object.assign(canvas.captureStream().getVideoTracks()[0], { enabled: false });
};

const blackSilence = () => new MediaStream([black(), silence()]);

/** Column count that keeps tiles as close to square-ish as possible. */
const columnsFor = (count) => {
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    return 4;
};

export default function VideoMeetComponent() {
    const navigate = useNavigate();
    const { url: meetingCode } = useParams();
    const { addToUserHistory, userData, getAiStatus, summariseMeeting } = useContext(AuthContext);
    const toast = useToast();

    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const localStreamRef = useRef(null);
    const cameraTrackRef = useRef(null);
    // socketId -> RTCPeerConnection. A ref, not a module global, so a remount starts clean.
    const connectionsRef = useRef({});

    const [localStream, setLocalStream] = useState(null);
    const [devices, setDevices] = useState({ cameras: [], mics: [] });
    const [selectedCamera, setSelectedCamera] = useState("");
    const [selectedMic, setSelectedMic] = useState("");

    const [videoAvailable, setVideoAvailable] = useState(false);
    const [audioAvailable, setAudioAvailable] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);

    const [joined, setJoined] = useState(false);
    const [joining, setJoining] = useState(false);
    const [username, setUsername] = useState(userData?.name || "");
    const [permissionError, setPermissionError] = useState("");

    const [remotes, setRemotes] = useState([]);          // [{ socketId, stream }]
    const [participants, setParticipants] = useState([]); // [{ socketId, username }]
    const [mediaStates, setMediaStates] = useState({});   // socketId -> { video, audio }

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [unread, setUnread] = useState(0);
    const [panel, setPanel] = useState(null);   // null | chat | people | transcript | stats
    // Mirrors `panel` so socket callbacks can read it without re-subscribing
    const panelRef = useRef(null);
    useEffect(() => { panelRef.current = panel; }, [panel]);

    const [handRaised, setHandRaised] = useState(false);
    const [reactions, setReactions] = useState([]);
    const [captions, setCaptions] = useState([]);      // live, one line per speaker
    const [transcript, setTranscript] = useState([]);  // finalised lines only
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summarising, setSummarising] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);

    // Camera track set aside while background blur replaces the outgoing video
    const preBlurTrackRef = useRef(null);

    const attachLocalStream = useCallback((stream) => {
        localStreamRef.current = stream;
        setLocalStream(stream);
    }, []);

    // ---------------------------------------------------------------- devices
    const listDevices = useCallback(async () => {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices({
                cameras: all.filter((d) => d.kind === "videoinput"),
                mics: all.filter((d) => d.kind === "audioinput")
            });
        } catch (e) {
            console.error("Could not list devices:", e);
        }
    }, []);

    /** Acquire (or re-acquire) the camera/mic, optionally for specific devices. */
    const acquireStream = useCallback(async (cameraId, micId, hasVideo, hasAudio) => {
        const constraints = {
            video: hasVideo ? (cameraId ? { deviceId: { exact: cameraId } } : true) : false,
            audio: hasAudio ? (micId ? { deviceId: { exact: micId } } : true) : false
        };

        if (!constraints.video && !constraints.audio) return blackSilence();

        return navigator.mediaDevices.getUserMedia(constraints);
    }, []);

    // Ask for camera/mic once on mount. The original ran this on every render
    // (no dependency array), which re-prompted and re-acquired devices endlessly.
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            let hasVideo = false;
            let hasAudio = false;

            try {
                const probe = await navigator.mediaDevices.getUserMedia({ video: true });
                probe.getTracks().forEach((t) => t.stop());
                hasVideo = true;
            } catch (e) {
                console.log("Camera unavailable:", e.name);
            }

            try {
                const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
                probe.getTracks().forEach((t) => t.stop());
                hasAudio = true;
            } catch (e) {
                console.log("Microphone unavailable:", e.name);
            }

            if (cancelled) return;

            setVideoAvailable(hasVideo);
            setAudioAvailable(hasAudio);
            setVideo(hasVideo);
            setAudio(hasAudio);
            setScreenAvailable(Boolean(navigator.mediaDevices?.getDisplayMedia));

            if (!hasVideo && !hasAudio) {
                setPermissionError(
                    "We could not access a camera or microphone. Check your browser permissions — you can still join to watch and chat."
                );
            }

            // Labels are only populated after permission is granted
            await listDevices();

            try {
                const stream = await acquireStream(null, null, hasVideo, hasAudio);
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                cameraTrackRef.current = stream.getVideoTracks()[0] || null;
                setSelectedCamera(stream.getVideoTracks()[0]?.getSettings().deviceId || "");
                setSelectedMic(stream.getAudioTracks()[0]?.getSettings().deviceId || "");
                attachLocalStream(stream);
            } catch (e) {
                console.error(e);
                setPermissionError("Could not start your camera or microphone.");
            }
        };

        init();
        return () => { cancelled = true; };
    }, [acquireStream, attachLocalStream, listDevices]);

    /** Swap the outgoing track of one kind on every peer connection. */
    const replaceOutgoingTrack = useCallback((kind, track) => {
        Object.values(connectionsRef.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === kind);
            if (sender) sender.replaceTrack(track).catch((e) => console.error(e));
        });
    }, []);

    /** Called when the user picks a different camera or microphone. */
    const switchDevice = useCallback(async (cameraId, micId) => {
        try {
            const next = await acquireStream(cameraId, micId, videoAvailable, audioAvailable);

            // Preserve the user's current mute state on the newly acquired tracks
            next.getVideoTracks().forEach((t) => { t.enabled = video; });
            next.getAudioTracks().forEach((t) => { t.enabled = audio; });

            localStreamRef.current?.getTracks().forEach((t) => t.stop());

            cameraTrackRef.current = next.getVideoTracks()[0] || null;
            attachLocalStream(next);

            if (!screen) replaceOutgoingTrack("video", next.getVideoTracks()[0] || null);
            replaceOutgoingTrack("audio", next.getAudioTracks()[0] || null);
        } catch (e) {
            console.error(e);
            toast("Could not switch device.", "error");
        }
    }, [acquireStream, attachLocalStream, audio, audioAvailable, replaceOutgoingTrack, screen, toast, video, videoAvailable]);

    const handleSelectCamera = (id) => { setSelectedCamera(id); switchDevice(id, selectedMic); };
    const handleSelectMic = (id) => { setSelectedMic(id); switchDevice(selectedCamera, id); };

    // ----------------------------------------------------------------- socket
    const addMessage = useCallback((data, sender, socketIdSender, at) => {
        setMessages((prev) => [...prev, { sender, data, socketId: socketIdSender, at }]);

        // Only count as unread when the chat tab is not already open
        if (socketIdSender !== socketIdRef.current && panelRef.current !== "chat") {
            setUnread((n) => n + 1);
        }
    }, []);

    // Keeps one live caption per speaker, expiring it once they stop talking
    const captionTimersRef = useRef({});
    const pushCaption = useCallback(({ socketId, speaker, text, isFinal, at }) => {
        setCaptions((prev) => {
            const others = prev.filter((c) => c.socketId !== socketId);
            return [...others, { socketId, speaker, text, isFinal }];
        });

        if (isFinal) {
            setTranscript((prev) => [...prev, { speaker, text, at: at || new Date().toISOString() }]);
        }

        clearTimeout(captionTimersRef.current[socketId]);
        captionTimersRef.current[socketId] = setTimeout(() => {
            setCaptions((prev) => prev.filter((c) => c.socketId !== socketId));
        }, CAPTION_TTL_MS);
    }, []);

    const showReaction = useCallback(({ socketId, username: who, emoji }) => {
        const id = `${socketId}-${Date.now()}-${Math.random()}`;
        // Random horizontal offset so simultaneous reactions do not overlap
        const offset = 20 + Math.random() * 60;

        setReactions((prev) => [...prev, { id, emoji, username: who, offset }]);
        setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== id));
        }, REACTION_TTL_MS);
    }, []);

    const createPeerConnection = useCallback((peerId) => {
        const pc = new RTCPeerConnection(peerConfigConnections);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit('signal', peerId, JSON.stringify({ ice: event.candidate }));
            }
        };

        // A dropped or changed network shows up as a failed ICE connection.
        // Restarting ICE re-gathers candidates and recovers without rebuilding
        // the peer connection or interrupting the other participants.
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState !== "failed") return;

            console.warn(`ICE failed for ${peerId} - restarting`);
            try {
                pc.restartIce();
                pc.createOffer({ iceRestart: true })
                    .then((offer) => pc.setLocalDescription(offer))
                    .then(() => {
                        socketRef.current?.emit('signal', peerId, JSON.stringify({ sdp: pc.localDescription }));
                    })
                    .catch((e) => console.error("ICE restart failed:", e));
            } catch (e) {
                console.error("ICE restart unsupported:", e);
            }
        };

        // ontrack is the current API; the original used the removed onaddstream,
        // which never fires in Safari and is deprecated in Chrome.
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;

            setRemotes((prev) => {
                const existing = prev.find((r) => r.socketId === peerId);
                if (existing) {
                    return prev.map((r) => (r.socketId === peerId ? { ...r, stream } : r));
                }
                return [...prev, { socketId: peerId, stream }];
            });
        };

        const stream = localStreamRef.current;
        if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        return pc;
    }, []);

    const connectToSocketServer = useCallback((name) => {
        const socket = io(server);
        socketRef.current = socket;

        socket.on('connect_error', () => toast("Cannot reach the meeting server.", "error"));

        socket.on('connect', () => {
            socketIdRef.current = socket.id;
            socket.emit('join-call', window.location.href, name);
            // Tell peers our starting mute state so their tiles render correctly
            socket.emit('media-state', { video, audio });
        });

        socket.on('signal', async (fromId, rawMessage) => {
            if (fromId === socketIdRef.current) return;

            const pc = connectionsRef.current[fromId];
            if (!pc) return;

            const signal = JSON.parse(rawMessage);
            try {
                if (signal.sdp) {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    if (signal.sdp.type === 'offer') {
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription }));
                    }
                }
                if (signal.ice) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
                }
            } catch (e) {
                console.error("Signalling error:", e);
            }
        });

        socket.on('participants', (roster) => setParticipants(roster));

        socket.on('media-state', (socketId, state) => {
            setMediaStates((prev) => ({ ...prev, [socketId]: state }));
        });

        socket.on('chat-message', addMessage);

        socket.on('reaction', showReaction);

        socket.on('caption', pushCaption);

        socket.on('user-left', (id) => {
            connectionsRef.current[id]?.close();
            delete connectionsRef.current[id];
            setRemotes((prev) => prev.filter((r) => r.socketId !== id));
            setMediaStates((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        });

        socket.on('user-joined', (id, clients) => {
            clients.forEach((peerId) => {
                if (peerId === socketIdRef.current) return;
                // Only build a connection we do not already have. The original rebuilt
                // every peer connection on each join, tearing down live calls.
                if (connectionsRef.current[peerId]) return;

                connectionsRef.current[peerId] = createPeerConnection(peerId);
            });

            // The peer that just joined waits; existing peers send it an offer.
            if (id !== socketIdRef.current) {
                const pc = connectionsRef.current[id];
                if (!pc) return;

                pc.createOffer()
                    .then((description) => pc.setLocalDescription(description))
                    .then(() => socket.emit('signal', id, JSON.stringify({ sdp: pc.localDescription })))
                    .catch((e) => console.error(e));

                // Re-announce our mute state so the newcomer's tiles are accurate
                socket.emit('media-state', { video, audio });
            }
        });
    }, [addMessage, audio, createPeerConnection, pushCaption, showReaction, toast, video]);

    // Tear everything down on unmount: without this the camera light stays on
    // and the socket keeps the user listed in the room after they navigate away.
    useEffect(() => {
        return () => {
            localStreamRef.current?.getTracks().forEach((track) => track.stop());
            Object.values(connectionsRef.current).forEach((pc) => pc.close());
            connectionsRef.current = {};
            socketRef.current?.disconnect();
        };
    }, []);

    const handleJoin = () => {
        const name = username.trim();
        if (!name) {
            toast("Please enter your name to join.", "warning");
            return;
        }

        setJoining(true);
        setJoined(true);
        connectToSocketServer(name);

        // Record the meeting for signed-in users; guests simply skip this
        if (localStorage.getItem("token") && meetingCode) {
            addToUserHistory(meetingCode).catch((e) => console.error(e));
        }
        setJoining(false);
    };

    // Muting by toggling track.enabled keeps the peer connection stable.
    // Re-running getUserMedia (the original approach) forced a renegotiation each time.
    const handleToggleVideo = () => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setVideo(track.enabled);
        socketRef.current?.emit('media-state', { video: track.enabled, audio });
    };

    const handleToggleAudio = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setAudio(track.enabled);
        socketRef.current?.emit('media-state', { video, audio: track.enabled });
    };

    const stopScreenShare = useCallback(() => {
        const cameraTrack = cameraTrackRef.current;
        if (cameraTrack) {
            replaceOutgoingTrack("video", cameraTrack);
            attachLocalStream(new MediaStream([
                cameraTrack,
                ...(localStreamRef.current?.getAudioTracks() || [])
            ]));
        }
        setScreen(false);
    }, [attachLocalStream, replaceOutgoingTrack]);

    const handleToggleScreen = async () => {
        if (screen) {
            stopScreenShare();
            return;
        }

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = displayStream.getVideoTracks()[0];

            replaceOutgoingTrack("video", screenTrack);
            attachLocalStream(new MediaStream([
                screenTrack,
                ...(localStreamRef.current?.getAudioTracks() || [])
            ]));
            setScreen(true);

            // Fires when the user stops sharing from the browser's own control
            screenTrack.onended = () => stopScreenShare();
        } catch (e) {
            // The user cancelling the picker is normal, not an error worth surfacing
            if (e.name !== "NotAllowedError") {
                console.error(e);
                toast("Screen sharing failed.", "error");
            }
        }
    };

    const handleLeave = () => {
        stopCaptions();
        if (recorder.recording) recorder.stop();
        blur.stop();
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        Object.values(connectionsRef.current).forEach((pc) => pc.close());
        connectionsRef.current = {};
        socketRef.current?.disconnect();
        navigate("/");
    };

    // ------------------------------------------------------- captions & AI
    const handleCaptionResult = useCallback(({ text, isFinal }) => {
        const me = socketIdRef.current;
        if (!me) return;

        pushCaption({ socketId: me, speaker: username || "You", text, isFinal, at: new Date().toISOString() });
        socketRef.current?.emit('caption', { text, isFinal });
    }, [pushCaption, username]);

    const {
        listening: captionsOn,
        error: captionsError,
        toggle: toggleCaptions,
        stop: stopCaptions,
        supported: captionsSupported
    } = useSpeechRecognition({ onResult: handleCaptionResult });

    // Ask the server once whether it has an Anthropic key configured
    useEffect(() => {
        let cancelled = false;
        getAiStatus().then((enabled) => { if (!cancelled) setAiEnabled(enabled); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = useConnectionStats(connectionsRef, joined);

    const buildTranscriptText = useCallback(() => (
        transcript
            .map((l) => `[${new Date(l.at).toLocaleTimeString()}] ${l.speaker}: ${l.text}`)
            .join("\n")
    ), [transcript]);

    const downloadFile = (filename, content, type = "text/plain") => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadTranscript = () => {
        downloadFile(
            `conflux-${meetingCode}-transcript.txt`,
            `Conflux meeting transcript\nRoom: ${meetingCode}\nDate: ${new Date().toLocaleString()}\n\n${buildTranscriptText()}`
        );
    };

    const handleSummarise = async () => {
        setSummarising(true);
        try {
            const result = await summariseMeeting(transcript, meetingCode);
            setSummary(result);
        } catch (err) {
            toast(err.message, "error");
        } finally {
            setSummarising(false);
        }
    };

    const downloadSummary = () => {
        if (!summary) return;

        const md = [
            `# ${summary.title}`,
            ``,
            `_Room ${meetingCode} · ${new Date().toLocaleString()}_`,
            ``,
            `## Summary`,
            summary.summary,
            ``,
            ...(summary.key_points?.length
                ? [`## Key points`, ...summary.key_points.map((p) => `- ${p}`), ``] : []),
            ...(summary.decisions?.length
                ? [`## Decisions`, ...summary.decisions.map((d) => `- ${d}`), ``] : []),
            ...(summary.action_items?.length
                ? [`## Action items`, ...summary.action_items.map((a) => `- ${a.task} — **${a.owner}**`), ``] : []),
            `---`,
            `Generated by Claude from an automated transcript. Verify anything important.`
        ].join("\n");

        downloadFile(`conflux-${meetingCode}-summary.md`, md, "text/markdown");
    };

    // ------------------------------------------------- blur, record, extras
    const blur = useBackgroundBlur();
    const recorder = useRecorder();

    const handleToggleBlur = async () => {
        if (blur.enabled) {
            blur.stop();
            const cameraTrack = preBlurTrackRef.current || cameraTrackRef.current;
            if (cameraTrack) {
                replaceOutgoingTrack("video", cameraTrack);
                attachLocalStream(new MediaStream([
                    cameraTrack,
                    ...(localStreamRef.current?.getAudioTracks() || [])
                ]));
            }
            preBlurTrackRef.current = null;
            return;
        }

        try {
            preBlurTrackRef.current = localStreamRef.current?.getVideoTracks()[0] || null;
            const blurredTrack = await blur.start(localStreamRef.current);
            if (!blurredTrack) return;

            replaceOutgoingTrack("video", blurredTrack);
            attachLocalStream(new MediaStream([
                blurredTrack,
                ...(localStreamRef.current?.getAudioTracks() || [])
            ]));
            toast("Background blur on.", "success");
        } catch {
            toast("Could not start background blur on this device.", "error");
        }
    };

    const handleToggleRecording = () => {
        if (recorder.recording) {
            recorder.stop();
            toast("Recording saved to your downloads.", "success");
            return;
        }

        const sources = [
            { stream: localStreamRef.current, username: username || "You" },
            ...remotes.map((r) => ({ stream: r.stream, username: nameFor(r.socketId) }))
        ];
        recorder.start(sources, meetingCode);
        toast("Recording started. It stays on your device.", "info");
    };

    const handleReact = (emoji) => {
        socketRef.current?.emit('reaction', emoji);
        showReaction({ socketId: socketIdRef.current, username: username || "You", emoji });
    };

    const handleToggleHand = () => {
        const next = !handRaised;
        setHandRaised(next);
        socketRef.current?.emit('raise-hand', next);
    };

    // Push-to-talk: only unmute if the mic was muted, and restore it on release
    const pushToTalkRef = useRef(false);
    const handlePushToTalkStart = () => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track || track.enabled) return;
        pushToTalkRef.current = true;
        track.enabled = true;
        setAudio(true);
        socketRef.current?.emit('media-state', { video, audio: true });
    };

    const handlePushToTalkEnd = () => {
        if (!pushToTalkRef.current) return;
        pushToTalkRef.current = false;
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = false;
        setAudio(false);
        socketRef.current?.emit('media-state', { video, audio: false });
    };

    const sendMessage = () => {
        if (!message.trim() || !socketRef.current) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast("Invite link copied to clipboard.", "success");
        } catch {
            toast("Could not copy the link.", "error");
        }
    };

    const openPanel = (which) => {
        const next = panel === which ? null : which;
        setPanel(next);
        if (next === "chat") setUnread(0);
    };

    useKeyboardShortcuts({
        enabled: joined,
        onToggleAudio: handleToggleAudio,
        onToggleVideo: handleToggleVideo,
        onToggleChat: () => openPanel("chat"),
        onToggleHand: handleToggleHand,
        onShowShortcuts: () => setShowShortcuts(true),
        onPushToTalkStart: handlePushToTalkStart,
        onPushToTalkEnd: handlePushToTalkEnd
    });

    // Local audio plus every remote stream, for loudest-speaker detection
    const audioSources = useMemo(() => ([
        ...(localStream ? [{ key: "local", stream: localStream }] : []),
        ...remotes.map((r) => ({ key: r.socketId, stream: r.stream }))
    ]), [localStream, remotes]);

    const activeSpeakerKey = useActiveSpeaker(audioSources, joined);

    // Local tile first, then remote peers in roster order
    const nameFor = useCallback(
        (socketId) => participants.find((p) => p.socketId === socketId)?.username || "Guest",
        [participants]
    );

    const tiles = useMemo(() => ([
        {
            key: "local",
            stream: localStream,
            username: username || "You",
            isLocal: true,
            videoEnabled: screen || video,
            audioEnabled: audio,
            isScreenShare: screen,
            handRaised,
            isSpeaking: activeSpeakerKey === "local"
        },
        ...remotes.map((r) => ({
            key: r.socketId,
            stream: r.stream,
            username: nameFor(r.socketId),
            isLocal: false,
            videoEnabled: mediaStates[r.socketId]?.video ?? true,
            audioEnabled: mediaStates[r.socketId]?.audio ?? true,
            isScreenShare: false,
            handRaised: participants.find((p) => p.socketId === r.socketId)?.handRaised,
            quality: stats[r.socketId]?.quality,
            isSpeaking: activeSpeakerKey === r.socketId
        }))
    ]), [activeSpeakerKey, audio, handRaised, localStream, mediaStates, nameFor, participants, remotes, screen, stats, username, video]);

    // Promote whoever is speaking to the front of the grid so they stay visible
    // as participant counts grow.
    const orderedTiles = useMemo(() => {
        if (!activeSpeakerKey || tiles.length < 3) return tiles;

        const speaking = tiles.find((t) => t.isSpeaking);
        if (!speaking) return tiles;

        return [speaking, ...tiles.filter((t) => t.key !== speaking.key)];
    }, [tiles, activeSpeakerKey]);

    if (!joined) {
        return (
            <Lobby
                username={username}
                setUsername={setUsername}
                stream={localStream}
                devices={devices}
                selectedCamera={selectedCamera}
                selectedMic={selectedMic}
                onSelectCamera={handleSelectCamera}
                onSelectMic={handleSelectMic}
                video={video}
                audio={audio}
                videoAvailable={videoAvailable}
                audioAvailable={audioAvailable}
                onToggleVideo={handleToggleVideo}
                onToggleAudio={handleToggleAudio}
                onJoin={handleJoin}
                joining={joining}
                meetingCode={meetingCode}
                permissionError={permissionError}
            />
        );
    }

    const columns = columnsFor(tiles.length);

    return (
        <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* --------------------------------------------------------- header */}
            <Stack
                component="header"
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: { xs: 2, sm: 3 }, py: 1.5, flexShrink: 0 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ lineHeight: 1.2 }} noWrap>
                        {meetingCode}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" sx={{ color: tokens.text.tertiary }}>
                            {participants.length} {participants.length === 1 ? "participant" : "participants"}
                        </Typography>
                        {recorder.recording && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Box sx={{
                                    width: 7, height: 7, borderRadius: "50%",
                                    bgcolor: tokens.danger.main,
                                    animation: "conflux-pulse 1.6s ease-in-out infinite"
                                }} />
                                <Typography variant="caption" sx={{ color: tokens.danger.main, fontWeight: 600 }}>
                                    REC
                                </Typography>
                            </Stack>
                        )}
                        {captionsOn && (
                            <Typography variant="caption" sx={{ color: tokens.accent.light, fontWeight: 600 }}>
                                CC
                            </Typography>
                        )}
                    </Stack>
                </Box>
            </Stack>

            {/* ----------------------------------------------- stage + side panel */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    gap: 2,
                    px: { xs: 1.5, sm: 3 },
                    position: "relative"
                }}
            >
                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        gap: { xs: 1, sm: 2 },
                        gridTemplateColumns: {
                            xs: tiles.length > 1 ? "repeat(2, 1fr)" : "1fr",
                            sm: `repeat(${columns}, 1fr)`
                        },
                        // Equal-height rows give each tile a definite box to fit inside
                        gridAutoRows: "1fr",
                        // Containing block for the caption and reaction overlays
                        position: "relative"
                    }}
                >
                    <CaptionsOverlay captions={captions} />
                    <ReactionsLayer reactions={reactions} />

                    {orderedTiles.map((tile) => (
                        <Box
                            key={tile.key}
                            sx={{
                                display: "contents",
                                // In a crowded call the speaker takes a 2x2 cell.
                                // Spanning rows as well as columns matters: tiles are
                                // height-constrained, so widening alone changes nothing.
                                // Below 5 tiles every tile is already large enough.
                                ...(tile.isSpeaking && orderedTiles.length >= 5
                                    ? { "& > *": { gridColumn: { sm: "span 2" }, gridRow: { sm: "span 2" } } }
                                    : {})
                            }}
                        >
                        <VideoTile
                            stream={tile.stream}
                            username={tile.username}
                            isLocal={tile.isLocal}
                            videoEnabled={tile.videoEnabled}
                            audioEnabled={tile.audioEnabled}
                            isScreenShare={tile.isScreenShare}
                            handRaised={tile.handRaised}
                            quality={tile.quality}
                            isSpeaking={tile.isSpeaking}
                        />
                        </Box>
                    ))}
                </Box>

                {panel && (
                    <Box
                        sx={{
                            // Docked column on desktop, full-screen overlay on phones
                            width: { xs: "100%", md: 340 },
                            flexShrink: 0,
                            position: { xs: "absolute", md: "static" },
                            inset: { xs: 0, md: "auto" },
                            zIndex: { xs: 20, md: "auto" },
                            px: { xs: 1.5, md: 0 },
                            bgcolor: { xs: tokens.surface.base, md: "transparent" }
                        }}
                    >
                        <SidePanel
                            tab={panel}
                            setTab={setPanel}
                            onClose={() => setPanel(null)}
                            messages={messages}
                            message={message}
                            setMessage={setMessage}
                            onSend={sendMessage}
                            participants={participants}
                            mySocketId={socketIdRef.current}
                            mediaStates={mediaStates}
                            localMedia={{ video, audio }}
                            stats={stats}
                            transcriptProps={{
                                transcript,
                                listening: captionsOn,
                                supported: captionsSupported,
                                captionsError,
                                onToggleCaptions: toggleCaptions,
                                onDownload: downloadTranscript,
                                onSummarise: handleSummarise,
                                summarising,
                                aiEnabled
                            }}
                        />
                    </Box>
                )}
            </Box>

            {/* ------------------------------------------------------- controls */}
            <MeetingControls
                video={video}
                audio={audio}
                screen={screen}
                handRaised={handRaised}
                videoAvailable={videoAvailable}
                audioAvailable={audioAvailable}
                screenAvailable={screenAvailable}
                captionsOn={captionsOn}
                captionsSupported={captionsSupported}
                blurOn={blur.enabled}
                blurLoading={blur.loading}
                recording={recorder.recording}
                unreadCount={unread}
                participantCount={participants.length}
                onToggleVideo={handleToggleVideo}
                onToggleAudio={handleToggleAudio}
                onToggleScreen={handleToggleScreen}
                onToggleChat={() => openPanel("chat")}
                onTogglePeople={() => openPanel("people")}
                onCopyLink={copyInviteLink}
                onLeave={handleLeave}
                onReact={handleReact}
                onToggleHand={handleToggleHand}
                onToggleCaptions={toggleCaptions}
                onToggleBlur={handleToggleBlur}
                onToggleRecording={handleToggleRecording}
                onShowShortcuts={() => setShowShortcuts(true)}
            />

            <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />

            <SummaryDialog
                open={Boolean(summary)}
                summary={summary}
                onClose={() => setSummary(null)}
                onDownload={downloadSummary}
            />
        </Box>
    );
}
