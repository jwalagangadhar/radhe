import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
const playfair = Playfair_Display({
    variable: "--font-playfair",
    subsets: ["latin"],
    weight: ["600", "700"],
    display: "swap",
});
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});
export const metadata = {
    title: "Rajyalakshmi Radhe — Daily Essentials",
    description: "Fresh dals, pulses, atta, and grains from Vijayawada. Order online from Rajyalakshmi Radhe.",
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
        apple: "/logo.png",
    },
};
export default function RootLayout({ children, }) {
    return (<html lang="en" className={`${playfair.variable} ${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>);
}
