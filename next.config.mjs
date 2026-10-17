/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: `${isProd ? "upgrade-insecure-requests; " : ""}default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: http: ws: wss:; frame-ancestors 'self';`,
  },
];

const nextConfig = {
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 25,
  },
  serverExternalPackages: [
    "@prisma/client",
    "pdfkit",
    "pdf-lib",
    "twilio",
    "bcryptjs",
  ],
  experimental: {
    optimizePackageImports: ["qrcode", "html5-qrcode", "zod", "jose"],
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    serverComponentsHmrCache: true,
  },
  allowedDevOrigins: ["common-bees-sink.loca.lt", "192.168.1.40", "192.168.29.246", "wicked-frogs-kneel.loca.lt", "localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "http://localhost:8081" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Cookie" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/loging",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/portal/loging",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/potal",
        destination: "/portal",
        permanent: false,
      },
      {
        source: "/potal/:path*",
        destination: "/portal/:path*",
        permanent: false,
      },
      {
        source: "/portal/signin",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/portal/sign-in",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/admin/login",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/worker/login",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/staff",
        destination: "/portal/login",
        permanent: false,
      },
      {
        source: "/staff/login",
        destination: "/portal/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
