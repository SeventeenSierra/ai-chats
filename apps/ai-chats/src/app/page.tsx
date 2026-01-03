// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
	const router = useRouter()

	useEffect(() => {
		router.replace('/vault')
	}, [router])

	return (
		<div className="flex items-center justify-center h-screen w-screen bg-background">
			<div className="text-center">
				<p className="text-lg font-semibold">Gemini Oracle</p>
				<p className="text-muted-foreground">Redirecting to dashboard...</p>
			</div>
		</div>
	)
}
