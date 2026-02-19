import Script from "next/script";

// swap this ID with your real GA4 measurement ID
const GA_ID = "G-883Q18XE8W";

export default function Analytics() {
    if (process.env.NODE_ENV !== "production") return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { page_path: window.location.pathname });
        `}
            </Script>
        </>
    );
}
