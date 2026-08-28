import { createTheme } from "@mui/material/styles";

// ---------------------------------------------------------------------------
// Conflux design tokens
// Single source of truth for colour, radius and elevation. Components should
// read from the theme rather than hard-coding hex values.
// ---------------------------------------------------------------------------
export const tokens = {
    // Layered surfaces: the further "forward" an element is, the lighter it gets
    surface: {
        base: "#0B0D12",   // page background
        raised: "#12151E",   // cards, panels
        overlay: "#181C27",   // menus, popovers, video tiles
        hover: "#1F2431"
    },
    border: {
        subtle: "rgba(255,255,255,0.07)",
        default: "rgba(255,255,255,0.11)",
        strong: "rgba(255,255,255,0.18)"
    },
    text: {
        primary: "#F2F4F8",
        secondary: "#9BA3B4",
        tertiary: "#646C7E"
    },
    accent: {
        main: "#6366F1",
        light: "#818CF8",
        dark: "#4F46E5",
        glow: "rgba(99,102,241,0.35)"
    },
    danger: { main: "#F0455F", dark: "#D2304A" },
    success: { main: "#2FBF71" },
    warning: { main: "#F5A524" },
    radius: { sm: 8, md: 12, lg: 16, xl: 22 }
};

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: tokens.accent.main,
            light: tokens.accent.light,
            dark: tokens.accent.dark,
            contrastText: "#FFFFFF"
        },
        error: { main: tokens.danger.main },
        success: { main: tokens.success.main },
        warning: { main: tokens.warning.main },
        background: {
            default: tokens.surface.base,
            paper: tokens.surface.raised
        },
        text: {
            primary: tokens.text.primary,
            secondary: tokens.text.secondary,
            disabled: tokens.text.tertiary
        },
        divider: tokens.border.default
    },

    shape: { borderRadius: tokens.radius.md },

    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        // Display sizes use tighter tracking; large text needs less letter-spacing
        h1: { fontSize: "clamp(2.5rem, 6vw, 4.25rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.05 },
        h2: { fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15 },
        h3: { fontSize: "1.5rem", fontWeight: 650, letterSpacing: "-0.02em" },
        h4: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.015em" },
        h5: { fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.01em" },
        h6: { fontSize: "0.9375rem", fontWeight: 600 },
        body1: { fontSize: "1rem", lineHeight: 1.65 },
        body2: { fontSize: "0.875rem", lineHeight: 1.6 },
        button: { fontWeight: 600, letterSpacing: 0 },
        caption: { fontSize: "0.75rem", letterSpacing: "0.01em" }
    },

    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: tokens.surface.base,
                    color: tokens.text.primary
                },
                // Consistent, visible focus ring for keyboard users across the app
                "*:focus-visible": {
                    outline: `2px solid ${tokens.accent.light}`,
                    outlineOffset: "2px",
                    borderRadius: "4px"
                },
                "::selection": {
                    background: tokens.accent.glow
                },
                "::-webkit-scrollbar": { width: 10, height: 10 },
                "::-webkit-scrollbar-track": { background: "transparent" },
                "::-webkit-scrollbar-thumb": {
                    background: tokens.border.strong,
                    borderRadius: 8,
                    border: "3px solid transparent",
                    backgroundClip: "content-box"
                }
            }
        },

        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: {
                    textTransform: "none",
                    borderRadius: tokens.radius.sm + 2,
                    padding: "9px 18px",
                    transition: "background-color .16s ease, border-color .16s ease, transform .16s ease",
                    "&:active": { transform: "translateY(1px)" }
                },
                sizeLarge: { padding: "13px 26px", fontSize: "1rem" },
                containedPrimary: {
                    boxShadow: `0 1px 0 rgba(255,255,255,0.09) inset, 0 6px 18px -8px ${tokens.accent.glow}`,
                    "&:hover": { backgroundColor: tokens.accent.light }
                },
                outlined: {
                    borderColor: tokens.border.default,
                    color: tokens.text.primary,
                    "&:hover": {
                        borderColor: tokens.border.strong,
                        backgroundColor: "rgba(255,255,255,0.04)"
                    }
                },
                text: {
                    color: tokens.text.secondary,
                    "&:hover": { color: tokens.text.primary, backgroundColor: "rgba(255,255,255,0.05)" }
                }
            }
        },

        MuiIconButton: {
            styleOverrides: {
                root: { transition: "background-color .16s ease, color .16s ease" }
            }
        },

        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: "none" },
                outlined: { borderColor: tokens.border.subtle }
            }
        },

        MuiTextField: { defaultProps: { variant: "outlined", size: "medium" } },

        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.surface.overlay,
                    borderRadius: tokens.radius.sm + 2,
                    "& fieldset": { borderColor: tokens.border.default },
                    "&:hover fieldset": { borderColor: tokens.border.strong },
                    "&.Mui-focused fieldset": { borderWidth: 2, borderColor: tokens.accent.main }
                },
                input: { "&::placeholder": { color: tokens.text.tertiary, opacity: 1 } }
            }
        },

        MuiInputLabel: { styleOverrides: { root: { color: tokens.text.secondary } } },

        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: tokens.surface.overlay,
                    border: `1px solid ${tokens.border.default}`,
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    padding: "6px 10px",
                    borderRadius: tokens.radius.sm
                }
            }
        },

        MuiDivider: { styleOverrides: { root: { borderColor: tokens.border.subtle } } },

        MuiSnackbarContent: {
            styleOverrides: {
                root: {
                    backgroundColor: tokens.surface.overlay,
                    color: tokens.text.primary,
                    border: `1px solid ${tokens.border.default}`,
                    borderRadius: tokens.radius.md,
                    fontSize: "0.875rem"
                }
            }
        },

        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: tokens.surface.overlay,
                    border: `1px solid ${tokens.border.default}`,
                    borderRadius: tokens.radius.md
                }
            }
        },

        MuiSelect: { styleOverrides: { root: { backgroundColor: tokens.surface.overlay } } }
    }
});

export default theme;
