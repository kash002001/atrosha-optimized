import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Atrosha — Autonomous Agent Security";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// twitter cards reuse the same OG image
export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 32,
                    }}
                >
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 28,
                            fontWeight: 800,
                            color: "#fff",
                        }}
                    >
                        A
                    </div>
                    <span
                        style={{
                            fontSize: 48,
                            fontWeight: 700,
                            color: "#f1f5f9",
                            letterSpacing: "-1px",
                        }}
                    >
                        Atrosha
                    </span>
                </div>

                <div
                    style={{
                        fontSize: 28,
                        color: "#94a3b8",
                        maxWidth: 700,
                        textAlign: "center",
                        lineHeight: 1.4,
                    }}
                >
                    Code hallucinates. Capital shouldn&apos;t.
                </div>

                <div
                    style={{
                        marginTop: 24,
                        fontSize: 16,
                        color: "#64748b",
                        display: "flex",
                        gap: 24,
                    }}
                >
                    <span>◆ Real-time Agent Security</span>
                    <span>◆ PII Redaction</span>
                    <span>◆ Spend Limits</span>
                </div>
            </div>
        ),
        { ...size }
    );
}
