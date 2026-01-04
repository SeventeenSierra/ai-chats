// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import { uploadFile } from '@ai-chat/backend'
import { type NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('file') as File

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		const content = await file.text()
		const filename = `${Date.now()}-${path.basename(file.name)}`

		// Upload to S3 in uploads/ prefix
		await uploadFile(`uploads/${filename}`, Buffer.from(content), 'text/xml')

		return NextResponse.json({
			success: true,
			filename,
		})
	} catch (error) {
		console.error('Upload error:', error)
		return NextResponse.json({ error: 'Failed to upload' }, { status: 500 })
	}
}
