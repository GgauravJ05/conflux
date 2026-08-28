import httpStatus from "http-status";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { User } from "../models/user.model.js";

// Optional feature: the whole app works without a key, the endpoint just reports
// itself as unavailable so the UI can hide the button.
const isEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client = null;
const getClient = () => {
    if (!client) client = new Anthropic();
    return client;
};

const MAX_TRANSCRIPT_CHARS = 60000;

const SummarySchema = z.object({
    title: z.string().describe("A short, specific title for this meeting"),
    summary: z.string().describe("A 2-4 sentence overview of what was discussed"),
    key_points: z.array(z.string()).describe("The main points raised, most important first"),
    decisions: z.array(z.string()).describe("Decisions that were actually made. Empty if none."),
    action_items: z.array(
        z.object({
            task: z.string(),
            owner: z.string().describe("Who owns it, or 'Unassigned' if never stated")
        })
    ).describe("Concrete follow-ups. Empty if none.")
});

const SYSTEM_PROMPT = `You summarise meeting transcripts.

The transcript comes from live browser speech recognition, so expect missing punctuation, mis-heard words, and dropped sentences. Read through those errors rather than quoting them.

Rules:
- Only state what the transcript supports. Never invent decisions, owners, or numbers.
- If nothing was decided, return an empty decisions list. The same goes for action items.
- Attribute action items to a speaker only when the transcript makes the owner clear; otherwise use "Unassigned".
- Write plainly, in the past tense, for someone who missed the call.`;

const summariseMeeting = async (req, res) => {
    if (!isEnabled()) {
        return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
            message: "AI summaries are not configured on this server."
        });
    }

    const { token, transcript, meetingCode } = req.body;

    if (!token) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Token is required" });
    }

    if (!Array.isArray(transcript) || transcript.length === 0) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "A non-empty transcript is required"
        });
    }

    try {
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
        }

        // Flatten to "Speaker: text" lines, which the model handles better than JSON
        const lines = transcript
            .filter((entry) => entry && typeof entry.text === "string" && entry.text.trim())
            .map((entry) => `${entry.speaker || "Unknown"}: ${entry.text.trim()}`)
            .join("\n");

        if (!lines) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Transcript has no usable text" });
        }

        // Guard the context window. Keeping the tail preserves decisions and
        // action items, which almost always land at the end of a meeting.
        const trimmed = lines.length > MAX_TRANSCRIPT_CHARS
            ? lines.slice(-MAX_TRANSCRIPT_CHARS)
            : lines;
        const wasTrimmed = trimmed.length < lines.length;

        const response = await getClient().messages.parse({
            model: "claude-opus-5",
            max_tokens: 8000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            output_config: {
                effort: "medium",
                format: zodOutputFormat(SummarySchema, "meeting_summary")
            },
            messages: [
                {
                    role: "user",
                    content: [
                        `Summarise this meeting${meetingCode ? ` (room "${meetingCode}")` : ""}.`,
                        wasTrimmed ? "\nNote: only the latter part of the transcript is included." : "",
                        "\n\n<transcript>\n",
                        trimmed,
                        "\n</transcript>"
                    ].join("")
                }
            ]
        });

        // Safety classifiers can decline with HTTP 200 - check before reading content
        if (response.stop_reason === "refusal") {
            return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({
                message: "The model declined to summarise this transcript."
            });
        }

        if (!response.parsed_output) {
            return res.status(httpStatus.BAD_GATEWAY).json({
                message: "The summary came back in an unexpected format."
            });
        }

        return res.status(httpStatus.OK).json({
            ...response.parsed_output,
            truncated: wasTrimmed
        });
    } catch (e) {
        console.error("Summary failed:", e);

        if (e instanceof Anthropic.AuthenticationError) {
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                message: "The server's Anthropic API key is invalid."
            });
        }
        if (e instanceof Anthropic.RateLimitError) {
            return res.status(httpStatus.TOO_MANY_REQUESTS).json({
                message: "Rate limited by the model API. Try again shortly."
            });
        }
        if (e instanceof Anthropic.APIError) {
            return res.status(httpStatus.BAD_GATEWAY).json({
                message: `Model API error (${e.status}).`
            });
        }
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Could not generate a summary."
        });
    }
};

// Lets the frontend hide the button instead of offering something that will fail
const aiStatus = (req, res) => res.status(httpStatus.OK).json({ enabled: isEnabled() });

export { summariseMeeting, aiStatus };
