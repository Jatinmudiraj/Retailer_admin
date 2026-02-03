import React from "react";

interface LoaderProps {
    fullscreen?: boolean;
    text?: string;
}

import { Sparkles } from "lucide-react";

export default function Loader({ fullscreen = false, text = "Loading..." }: LoaderProps) {
    return (
        <div className={`loader-container ${fullscreen ? "fullscreen" : ""}`} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            background: fullscreen ? "#fdfbf7" : "transparent"
        }}>
            <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{
                    position: "absolute",
                    inset: 0,
                    border: "2px solid rgba(212, 175, 55, 0.1)",
                    borderRadius: "50%"
                }}></div>
                <div className="premium-loader-ring"></div>
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#D4AF37"
                }}>
                    <Sparkles size={32} className="premium-loader-icon" />
                </div>
            </div>
            {text && <div className="loader-text" style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{text}</div>}
        </div>
    );
}
