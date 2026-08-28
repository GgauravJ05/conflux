import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Wraps a page so it redirects to /auth when there is no stored token
const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const router = useNavigate();
        const isAuthenticated = Boolean(localStorage.getItem("token"));

        useEffect(() => {
            if (!isAuthenticated) {
                router("/auth", { replace: true });
            }
        }, [isAuthenticated, router]);

        // Avoid flashing the protected page before the redirect happens
        if (!isAuthenticated) return null;

        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;
