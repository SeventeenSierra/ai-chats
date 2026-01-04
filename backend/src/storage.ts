import { existsSync, mkdirSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

const STORAGE_DIR = process.env.GEMINI_DATA_DIR
	? path.join(path.resolve(process.env.GEMINI_DATA_DIR), 'storage')
	: path.resolve(process.cwd(), 'data/storage')

// Ensure storage directory exists
if (!existsSync(STORAGE_DIR)) {
	mkdirSync(STORAGE_DIR, { recursive: true })
}

export async function uploadFile(
	key: string,
	buffer: Buffer,
	_contentType: string,
): Promise<string> {
	const filePath = path.resolve(STORAGE_DIR, key)
	if (!filePath.startsWith(STORAGE_DIR)) {
		throw new Error('Access denied: Path traversal attempted')
	}
	const dir = path.dirname(filePath)

	await fs.mkdir(dir, { recursive: true })
	await fs.writeFile(filePath, buffer)
	return key
}

export async function downloadFile(key: string): Promise<Buffer> {
	const filePath = path.resolve(STORAGE_DIR, key)
	if (!filePath.startsWith(STORAGE_DIR)) {
		throw new Error('Access denied: Path traversal attempted')
	}
	try {
		return await fs.readFile(filePath)
	} catch (error: any) {
		if (error.code === 'ENOENT') {
			throw new Error(`File not found: ${key}`)
		}
		throw error
	}
}

export async function deleteFile(key: string): Promise<void> {
	const filePath = path.resolve(STORAGE_DIR, key)
	if (!filePath.startsWith(STORAGE_DIR)) {
		throw new Error('Access denied: Path traversal attempted')
	}
	try {
		await fs.unlink(filePath)
	} catch (error: any) {
		if (error.code !== 'ENOENT') {
			throw error
		}
	}
}

// Mock signed URL by returning a local API path
export async function getSignedUrl(key: string): Promise<string> {
	return `/api/storage/${key}`
}

export async function listFiles(prefix?: string): Promise<string[]> {
	try {
		// If prefix implies a directory (ends with /), list that directory
		if (prefix?.endsWith('/')) {
			const targetDir = path.join(STORAGE_DIR, prefix)
			// PATH TRAVERSAL FIX: Ensure targetDir is still within STORAGE_DIR
			if (!path.resolve(targetDir).startsWith(STORAGE_DIR)) {
				return [] // Fail silently or throw, silent is safer for listing
			}
			if (!existsSync(targetDir)) return []
			const files = await fs.readdir(targetDir)
			// Return paths relative to STORAGE_DIR, e.g. "staging/file.xml"
			return files.map((f) => path.join(prefix, f))
		}

		const files = await fs.readdir(STORAGE_DIR)
		return prefix ? files.filter((f) => f.startsWith(prefix)) : files
	} catch (_error) {
		return []
	}
}

// Aliases for compatibility
export const downloadFromStorage = downloadFile
export const listFromStorage = listFiles
export const deleteFromStorage = deleteFile
export const uploadToStorage = uploadFile
