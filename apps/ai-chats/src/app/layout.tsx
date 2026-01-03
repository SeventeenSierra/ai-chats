// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import type { Metadata } from 'next'
import { Fira_Code, Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-body',
})

const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	variable: '--font-headline',
})

const firaCode = Fira_Code({
	subsets: ['latin'],
	variable: '--font-code',
})

export const metadata: Metadata = {
	title: 'Gemini Oracle',
	description: 'Browse, summarize, and export your Gemini conversations.',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${inter.variable} ${spaceGrotesk.variable} ${firaCode.variable} font-body`}
				suppressHydrationWarning
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange
				>
					<SidebarProvider>{children}</SidebarProvider>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	)
}
