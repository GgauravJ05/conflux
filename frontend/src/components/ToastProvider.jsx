import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const ToastContext = createContext(() => { });

/** `const toast = useToast(); toast("Saved", "success")` from anywhere in the tree. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const show = useCallback((message, severity = "info") => {
        if (!message) return;
        setToast({ message, severity, key: Date.now() });
    }, []);

    // Memoised so consumers do not re-render on every provider render
    const value = useMemo(() => show, [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Snackbar
                key={toast?.key}
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                // Sits above the in-call control bar rather than covering it
                sx={{ bottom: { xs: 96, sm: 104 } }}
            >
                <Alert
                    onClose={() => setToast(null)}
                    severity={toast?.severity || "info"}
                    variant="outlined"
                    sx={{
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        alignItems: "center",
                        boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)"
                    }}
                >
                    {toast?.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
}
