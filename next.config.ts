import type { NextConfig } from "next";

/* Uploaded photos live on Supabase Storage, so their URLs point at a different
   host. next/image refuses any remote host that is not listed here, and the
   About page renders team photos through next/image — so without this, the
   first member given an uploaded photo would break that page.

   The host is read from the Supabase URL rather than hard-coded, so moving to
   a different project needs no change here. */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
