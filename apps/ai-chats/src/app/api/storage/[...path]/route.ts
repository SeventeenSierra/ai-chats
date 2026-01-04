import fs from 'node:fs'
import path from 'node:path'
import mime from 'mime'
import { type NextRequest, NextResponse } from 'next/server'

// This should match the logic in backend/src/storage.ts
// Ideally we import the path from there or config
const DATA_DIR = process.env.GEMINI_DATA_DIR
	? path.resolve(process.env.GEMINI_DATA_DIR)
	: path.resolve(process.cwd(), 'data')
const STORAGE_DIR = path.join(DATA_DIR, 'storage')

export async function GET(_request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
	const params = await props.params
	const filePathParams = params.path
	if (!filePathParams || filePathParams.length === 0) {
		return new NextResponse('File not provided', { status: 400 })
	}

	// Sanitize path: Ensure no '..' traversal
	const relPath = filePathParams.join('/')
	if (relPath.includes('..')) {
		return new NextResponse('Invalid path', { status: 400 })
	}

	const fullPath = path.join(STORAGE_DIR, relPath)

	// Security check: ensure fullPath starts with STORAGE_DIR
	if (!fullPath.startsWith(STORAGE_DIR)) {
		return new NextResponse('Access denied', { status: 403 })
	}

	if (!fs.existsSync(fullPath)) {
		console.warn(`File not found: ${fullPath}`, { STORAGE_DIR, relPath })
		return new NextResponse('File not found', { status: 404 })
	}

	try {
		const fileBuffer = fs.readFileSync(fullPath)
		const mimeType = mime.getType(fullPath) || 'application/octet-stream'

		return new NextResponse(fileBuffer, {
			headers: {
				'Content-Type': mimeType,
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		})
	} catch (error) {
		console.error('Error serving file:', error)
		return new NextResponse('Internal Server Error', { status: 500 })
	}
}
