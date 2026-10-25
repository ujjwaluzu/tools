import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Link", value: '</llms.txt>; rel="service-doc"' },
        ],
      },
    ];
  },
};

export default nextConfig;
