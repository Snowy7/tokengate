/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tokengate/crypto", "@tokengate/env-format", "@tokengate/sdk"]
};

export default nextConfig;
