# Engineering decisions

Notes on the non-obvious choices in Conflux, and what I would do differently at
a larger scale. Written for anyone reading the code and wondering "why like
that?"

---

## 1. Mesh topology instead of an SFU

**Decision.** Every participant opens a direct `RTCPeerConnection` to every
other participant. With *n* people there are *n(n−1)/2* connections, and each
client uploads its stream *n−1* times.

**Why.** There is no media server to run, deploy, or pay for, and latency is as
low as it can be because media never takes a detour. For the target of 2–6
people on a call, upload bandwidth is not the binding constraint.

**Cost.** It does not scale. At 10 participants each client uploads nine copies
of its video, which saturates a typical home connection. The fix is an SFU
(LiveKit, mediasoup, Janus) where each client uploads once and the server fans
out — but that is a server to operate, and it changes the project from
"peer-to-peer video" into "video infrastructure."

**Where the line is.** Roughly six participants. Past that the honest move is an
SFU, not a cleverer mesh.

---

## 2. Muting toggles `track.enabled`, not `getUserMedia`

**Decision.** Mute and camera-off flip `track.enabled` on the existing track.

**Why.** The obvious implementation — stop the tracks and call `getUserMedia`
again when unmuting — forces a full renegotiation for every peer on every mute.
On a four-person call, one person tapping mute triggers three SDP exchanges.
That is visible as a stutter in everyone's video, and it makes mute feel slow.

Flipping `enabled` keeps the transceiver in place. The track keeps flowing, just
with silence or black frames, and no signalling occurs at all.

**Consequence.** A muted track still consumes a little bandwidth, and the camera
light stays on when video is "off". Both are the standard trade-off — Meet and
Zoom behave the same way — and both are far better than renegotiation storms.

---

## 3. Mute state is relayed explicitly over Socket.IO

**Decision.** A `media-state` event broadcasts `{ video, audio }` whenever
someone toggles either.

**Why.** Because of decision #2, a muted peer still sends frames. There is no
reliable, fast way to tell "this person muted" from "this person is in a dark
room" by looking at the media. Trying to infer it means analysing frame content
or watching `getStats` bitrate — both slow and both wrong sometimes.

One socket event makes the remote tile grey out in the same frame the person
clicks mute. The signalling channel already exists; using it for presence
metadata costs nothing.

---

## 4. `addTrack`/`ontrack`, not `addStream`/`onaddstream`

**Decision.** Modern transceiver-based API throughout.

**Why.** `addStream` and `onaddstream` are from the pre-standard WebRTC API.
They still work in Chrome, which is why so many tutorials still use them, but
`onaddstream` **never fires in Safari** — a call built on it is silently broken
for every iPhone and Mac user on Safari.

`addTrack` also returns an `RTCRtpSender`, which is what makes `replaceTrack`
possible — and that underpins both screen sharing and background blur below.

---

## 5. Screen share and blur use `replaceTrack`

**Decision.** Starting a screen share or enabling blur swaps the outgoing video
track on every existing sender instead of rebuilding connections.

**Why.** `sender.replaceTrack(newTrack)` changes what is being sent **without
renegotiation** as long as the new track is the same kind. Screen sharing
becomes instant and does not interrupt anyone's audio or the other video
streams. The naive version — tear down and re-offer — drops the call for a
second every time someone presents.

The camera track is stashed in a ref so it can be restored when sharing stops,
including when the user stops from Chrome's own "Stop sharing" bar (handled via
`track.onended`).

---

## 6. Automatic ICE restart on connection failure

**Decision.** `oniceconnectionstatechange` watches for `failed` and calls
`restartIce()` plus a fresh offer with `iceRestart: true`.

**Why.** Networks change — Wi-Fi to cellular, a VPN connecting, a laptop
sleeping. Without this the connection stays dead until someone reloads the page.
Restarting ICE re-gathers candidates and re-establishes the path on the existing
peer connection, so the recovery is invisible to the other participants.

This is the single biggest difference between a demo and something usable, and
it is the part almost no tutorial reaches.

---

## 7. Captions run in the browser, not on a server

**Decision.** Live captions use the Web Speech API (`SpeechRecognition`).

**Why.** It is free, needs no API key, adds nothing to the bundle, and sends no
audio to a server I operate. A server-side option (Whisper, Deepgram, AssemblyAI)
would be more accurate and work in every browser, but it means streaming
everyone's audio somewhere, paying per minute, and running the infrastructure.

**Cost.** Chrome and Edge only — Firefox and Safari do not implement it. The
feature detects support and degrades: unsupported browsers can still *read*
captions other people produce, they just cannot generate their own. Chrome also
ends recognition sessions periodically, so `onend` restarts it to keep captions
continuous.

**Privacy note worth knowing.** Chrome's implementation sends audio to Google's
servers for recognition. It is not local processing, despite running in the
browser.

---

## 8. The AI summary is optional and fails closed

**Decision.** `/api/v1/ai/status` reports whether the server has an
`ANTHROPIC_API_KEY`. The UI hides the summarise button when it does not.

**Why.** An unconfigured optional feature should be invisible, not a button that
errors. Anyone cloning this repo gets a fully working app without an API key —
they just do not get summaries.

**Implementation notes.** The endpoint uses structured outputs
(`messages.parse` with a Zod schema) rather than asking for JSON in the prompt
and parsing the reply, so the response shape is guaranteed rather than hoped
for. The transcript is trimmed from the **tail** when it exceeds the context
budget, because decisions and action items cluster at the end of a meeting. The
system prompt explicitly tells the model to expect garbled speech-recognition
output and never to invent decisions or owners — the failure mode that matters
for a summarisation feature is confident fabrication, not a missed point.

---

## 8b. Active speaker uses hysteresis, not raw loudness

**Decision.** An `AudioContext` analyser samples every stream's RMS level 6-7
times a second. The highlight only changes hands when a challenger is louder by
a margin **and** stays louder for three consecutive samples, and it is released
only after eight quiet samples.

**Why.** Naive "highlight whoever is loudest right now" flickers constantly:
two people on a call cross each other's level several times a second, and every
natural pause between words drops the current speaker below the threshold. The
margin stops ties from oscillating, the sustain requirement stops brief noises
(a cough, a door) from stealing the highlight, and the release delay keeps the
ring stable through the gaps in normal speech.

**Note.** The analysers are deliberately **not** connected to
`ctx.destination` — the `<video>` elements already play that audio, and
connecting would play every remote stream twice.

---

## 9. Recording composites on a canvas, client-side

**Decision.** `MediaRecorder` records a canvas that all participant videos are
drawn onto, with audio mixed through a single `AudioContext`.

**Why.** `MediaRecorder` can only record one stream. Recording a multi-party
call therefore requires compositing. Doing it on the client keeps the recording
private — it never leaves the machine of whoever pressed record — and needs no
storage infrastructure.

**Cost.** It is CPU-heavy, the recording only contains what that participant
received, and quality depends on their connection. Server-side recording would
be better on all three counts and much worse on privacy and cost.

---

## 10. MediaPipe loads from a CDN at runtime

**Decision.** Background blur imports MediaPipe via a `webpackIgnore` dynamic
import from jsDelivr rather than bundling the npm package.

**Why.** Two reasons. The package contains dynamic `require` calls that webpack
cannot statically analyse, producing a "Critical dependency" warning that fails
the build under `CI=true`. More importantly, the segmentation model and WASM
runtime are several megabytes — bundling them would penalise every user for a
feature most never enable. Loading on first use means blur costs nothing until
someone turns it on.

**Cost.** Blur needs network access to the CDN and will not work offline.

---

## 11. Tokens in MongoDB, not JWTs

**Decision.** Login generates a random token stored on the user document.
Logout deletes it.

**Why.** The property that matters here is **revocation**. A JWT is valid until
it expires; you cannot invalidate one without keeping a server-side denylist, at
which point you have a database lookup anyway. A stored token means signing out
genuinely ends the session — verified by checking that the token no longer
authenticates after logout.

**Cost.** A database read per authenticated request, and no stateless horizontal
scaling. At this scale that read is indexed and irrelevant. At a larger scale
the answer is short-lived JWTs plus refresh tokens, not this.

---

## 12. Room state lives in server memory

**Decision.** `connections`, `messages`, and `participants` are plain objects in
the Node process.

**Why.** It is the simplest thing that works, and rooms are inherently ephemeral
— when everyone leaves, the state should disappear. The chat backlog is capped
at 200 messages per room so a long-lived room cannot grow without bound, and
rooms are deleted when the last participant leaves.

**Cost, and this is the real limitation.** A server restart drops every active
room, and the app **cannot run more than one backend instance** — two instances
would each hold half the participants and neither would know about the other.
Fixing it means moving room state into Redis and using the Socket.IO Redis
adapter. That is the first thing I would change if this needed to scale.

---

## 13. Design tokens in the MUI theme

**Decision.** One `tokens` object plus a `createTheme` config; components read
from the theme rather than hard-coding values.

**Why.** MUI gives accessible primitives for free — focus management in dialogs,
ARIA wiring on tabs and menus, keyboard navigation in the roster. Rebuilding
those in Tailwind or plain CSS is a lot of work to get wrong. Overriding the
theme gets a custom look while keeping that behaviour.

**Cost.** MUI is a large dependency and `sx` styling has a runtime cost. For an
app of this size neither matters.

---

## What I would do next, in order

1. **Redis-backed room state** — removes the single-instance ceiling (#12).
2. **A TURN server** — without it, calls fail on symmetric NAT, which is common
   on corporate and mobile networks. Currently configurable but not provisioned.
3. **An SFU** if participant counts ever exceed ~6 (#1).
4. **Integration tests** with two headless browsers actually completing a call.
   The current tests cover components; the WebRTC path is verified manually.
5. **Rate limiting** on the auth and AI endpoints.
