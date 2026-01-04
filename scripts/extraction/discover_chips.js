const fs = require('node:fs')
const path = require('node:path')

function decodeEntities(encodedString) {
	if (!encodedString) return ''
	const translate_re = /&#(\d+);|&#x([0-9a-fA-F]+);/g
	return encodedString
		.replace(translate_re, (match, dec, hex) => {
			if (dec) return String.fromCharCode(Number(dec))
			if (hex) return String.fromCharCode(parseInt(hex, 16))
			return match
		})
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
}

function splitConversationsXml(xmlString) {
	const conversations = []
	const startTag = '<Conversation>'
	const endTag = '</Conversation>'
	let startIndex = 0
	while (true) {
		const start = xmlString.indexOf(startTag, startIndex)
		if (start === -1) break
		const end = xmlString.indexOf(endTag, start)
		if (end === -1) break
		conversations.push(xmlString.slice(start, end + endTag.length))
		startIndex = end + endTag.length
	}
	return conversations
}

function getTagContent(xml, tagName) {
	const startTag = `<${tagName}>`
	const endTag = `</${tagName}>`
	const start = xml.indexOf(startTag)
	if (start === -1) return null
	const end = xml.indexOf(endTag, start)
	if (end === -1) return null
	return decodeEntities(xml.slice(start + startTag.length, end).trim())
}

const FILE_PATH = path.join(process.cwd(), 'tests/fixtures/originals/full_dl.xml')
const OUTPUT_PATH = path.join(process.cwd(), 'scripts/extraction/targets.json')

console.log(`Reading ${FILE_PATH}...`)

try {
	const xmlContent = fs.readFileSync(FILE_PATH, 'utf-8')
	const conversationBlocks = splitConversationsXml(xmlContent)
	console.log(`Found ${conversationBlocks.length} conversations.`)

	const targets = []

	conversationBlocks.forEach((block) => {
		const id = getTagContent(block, 'ConversationId') || 'unknown'
		const topic = getTagContent(block, 'ConversationTopic') || 'Untitled'

		const decodedBlock = decodeEntities(block)
		const chips = []

		// Match placeholder URLs: http://googleusercontent.com/immersive_entry_chip/0
		const placeholderRegex = /http:\/\/googleusercontent\.com\/immersive_entry_chip\/(\d+)/g
		let match
		const seenIndices = new Set()

		while ((match = placeholderRegex.exec(decodedBlock)) !== null) {
			const index = match[1]
			// Only add unique indices per conversation? actually duplicate indices typically mean same chip cited multiple times?
			// Or distinct chips? The index '0', '1' implies distinct.

			// We store it as a target.
			const url = match[0]

			// Avoid adding same index multiple times if it appears multiple times (unlikely to matter but clean)
			if (!seenIndices.has(index)) {
				seenIndices.add(index)
				chips.push({
					type: 'immersive_entry_chip',
					placeholderUrl: url,
					index: index,
				})
			}
		}

		// Also check for deep_research_confirmation_content if it appears as placeholder?
		// Pattern seen in analysis?
		// If not seen, maybe we rely on immersive_entry_chip.
		// We'll stick to immersive_entry_chip for now.

		if (chips.length > 0) {
			targets.push({
				conversationId: id,
				title: topic,
				chipCount: chips.length,
				chips: chips,
			})
		}
	})

	console.log(`Identified ${targets.length} conversations with extraction targets.`)

	fs.writeFileSync(OUTPUT_PATH, JSON.stringify(targets, null, 2))
	console.log(`Targets written to ${OUTPUT_PATH}`)
} catch (e) {
	console.error('Error:', e.message)
}
