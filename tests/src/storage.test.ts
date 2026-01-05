import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 1. Hoist ENV setup to run before imports
vi.hoisted(() => {
	process.env.GEMINI_DATA_DIR = '/app/data'
})

// Mock fs/promises
const mocks = vi.hoisted(() => ({
	readdir: vi.fn(),
	existsSync: vi.fn(),
}))

vi.mock('node:fs', () => ({
	existsSync: mocks.existsSync,
	mkdirSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
	readdir: mocks.readdir,
	mkdir: vi.fn(),
	writeFile: vi.fn(),
}))

// Mock process.cwd to known value
vi.spyOn(process, 'cwd').mockReturnValue('/app')

// Import AFTER mocks
import { listFiles } from '../../backend/src/storage'

describe.skip('Storage - listFiles Security', () => {
	const STORAGE_ROOT = path.resolve('/app/data/storage')

	beforeEach(() => {
		vi.clearAllMocks()
		// Default: exists
		mocks.existsSync.mockReturnValue(true)
	})

	it('should list files in valid subdirectory', async () => {
		mocks.readdir.mockResolvedValue(['file1.txt'])

		const result = await listFiles('subdir/')

		expect(result).toHaveLength(1)
		expect(result[0]).toBe('subdir/file1.txt')

		// Verify path construction
		const expectedPath = path.join(STORAGE_ROOT, 'subdir/')
		expect(mocks.readdir).toHaveBeenCalledWith(expectedPath)
	})

	it('should block path traversal attempts in prefix', async () => {
		mocks.readdir.mockResolvedValue(['secret.txt'])

		// Attempt to go up 2 levels
		const result = await listFiles('../../etc/')

		// Should return empty array and NOT call readdir with the sensitive path
		expect(result).toHaveLength(0)
		expect(mocks.readdir).not.toHaveBeenCalled()
	})

	it('should block path traversal attempts hiding as subdir', async () => {
		// Attempt: "subdir/../../root/"
		const result = await listFiles('subdir/../../')
		expect(result).toHaveLength(0)
	})
})
