import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'placehold.co',
				port: '',
				pathname: '/**',
			},
		],
	},
	// Ignore watching the staging and transcripts directories during development
	// to prevent server restarts during file processing.

	serverExternalPackages: ['genkit', 'pg', '@aws-sdk/client-s3'],

	async redirects() {
		return []
	},
}

export default nextConfig
