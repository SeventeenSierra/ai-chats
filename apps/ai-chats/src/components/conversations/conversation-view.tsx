// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import {
	Bot,
	Download,
	ExternalLink,
	FileText,
	MessageSquareQuote,
	MoreVertical,
	User,
} from 'lucide-react'
import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { Virtuoso } from 'react-virtuoso'
import remarkGfm from 'remark-gfm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { exportToMarkdownAction } from '@/lib/actions'
import { cn } from '@/lib/utils'
import type { AppCategory, Conversation, ConversationTurn } from '@/types'

type ConversationViewProps = {
	conversation: Conversation
	categories: AppCategory[]
	onUpdateCategory: (conversationId: string, newCategory: string) => void
	onAddCategory: (categoryName: string) => Promise<boolean>
	onRenameCategory: (oldName: string, newName: string) => Promise<boolean>
	onDataChange: () => void
}

const TRUNCATION_LENGTH = 500

function TurnView({ turn }: { turn: ConversationTurn }) {
	const isUser = turn.author === 'user'
	const AuthorIcon = isUser ? User : Bot
	const [isExpanded, setIsExpanded] = React.useState(false)

	const fullContent = React.useMemo(
		() => (turn.parts || []).map((p) => p.content).join('\n\n'),
		[turn.parts],
	)

	const isTruncated = fullContent.length > TRUNCATION_LENGTH
	const _contentToShow =
		isExpanded || !isTruncated ? fullContent : `${fullContent.substring(0, TRUNCATION_LENGTH)}...`

	return (
		<div className="flex items-start gap-4 my-4">
			<div
				className={cn(
					'p-2 rounded-full shrink-0',
					isUser ? 'bg-primary/10 text-primary' : 'bg-secondary',
				)}
			>
				<AuthorIcon className="h-5 w-5" />
			</div>
			<div className="flex-1 min-w-0">
				<p
					className={cn(
						'text-[10px] font-black uppercase tracking-[0.15em] mb-3 opacity-40',
						isUser ? 'text-primary' : 'text-slate-500',
					)}
				>
					{isUser ? 'User' : 'Model'}
				</p>
				<div className="prose max-w-none">
					{turn.parts.map((part, i) => {
						// Create a stable key from part content
						const partKey = `${part.type}-${i}-${part.content.slice(0, 20)}`
						if (part.type === 'text') {
							// Check if it's a special chip URL
							const isChip =
								part.content.includes('googleusercontent.com') ||
								part.content.includes('deep_research_confirmation_content') ||
								part.content.includes('immersive_entry_chip')

							if (isChip && part.content.length < 200) {
								return (
									<div key={partKey} className="my-4">
										<a
											href={part.content}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/20 text-primary font-semibold text-sm no-underline hover:bg-primary/10 transition-all shadow-sm"
										>
											<ExternalLink className="h-4 w-4" />
											{part.content.includes('immersive')
												? 'Immersive Content'
												: part.content.includes('research')
													? 'Research Plan'
													: 'View Content'}
										</a>
									</div>
								)
							}
							return (
								<ReactMarkdown key={partKey} remarkPlugins={[remarkGfm]}>
									{part.content}
								</ReactMarkdown>
							)
						}
						if (part.type === 'code') {
							return (
								<pre key={partKey}>
									<code>{part.content}</code>
								</pre>
							)
						}
						return null
					})}
				</div>
				{isTruncated && (
					<Button
						variant="link"
						size="sm"
						className="px-0 h-auto py-1 text-sm"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						{isExpanded ? 'Show less' : `Show more`}
					</Button>
				)}
			</div>
		</div>
	)
}

function StagedConversationPreview({ conversation }: { conversation: Conversation }) {
	return (
		<div className="p-4 space-y-4">
			<div className="p-4 border rounded-lg bg-muted/30">
				<p className="text-sm font-semibold mb-2 flex items-center gap-2">
					<User className="h-4 w-4" /> First Prompt
				</p>
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{conversation.firstPrompt || 'No prompt found.'}
					</ReactMarkdown>
				</div>
			</div>
			<div className="p-4 border rounded-lg">
				<p className="text-sm font-semibold mb-2 flex items-center gap-2">
					<Bot className="h-4 w-4" /> First Response
				</p>
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{conversation.firstResponse || 'No response found.'}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	)
}

export default function ConversationView({ conversation }: ConversationViewProps) {
	const handleExport = async () => {
		const result = await exportToMarkdownAction(conversation)
		if (result.error || !result.markdownContent) {
			return
		}
		const blob = new Blob([result.markdownContent], { type: 'text/markdown;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		window.open(url, '_blank')
		URL.revokeObjectURL(url)
	}

	const hasTranscript = conversation.transcript && conversation.transcript.length > 0

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="px-6 py-8 border-b shrink-0 flex items-center justify-between gap-6 flex-wrap bg-primary/5">
				<div className="min-w-0 flex-1">
					<h2 className="text-2xl font-bold font-headline tracking-tight leading-tight text-foreground mb-1">
						{conversation.title}
					</h2>
					<p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
						<span className="opacity-60">
							{new Date(conversation.createdAt).toLocaleDateString()}
						</span>
						<span className="opacity-30">•</span>
						<span className="opacity-60">
							{new Date(conversation.createdAt).toLocaleTimeString()}
						</span>
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap">
					<Badge
						variant="secondary"
						className="px-3 py-1 text-xs font-semibold rounded-full bg-background border-primary/20 text-primary flex items-center gap-1.5 shadow-sm"
					>
						<MessageSquareQuote className="h-3.5 w-3.5" />
						{conversation.turnCount} turn(s)
					</Badge>
					<Badge
						variant="secondary"
						className="px-3 py-1 text-xs font-semibold rounded-full bg-background border-primary/20 text-primary flex items-center gap-1.5 shadow-sm"
					>
						<FileText className="h-3.5 w-3.5" />
						{(conversation.charCount / 1000).toFixed(1)}k chars
					</Badge>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9 bg-background border-primary/20 text-primary hover:bg-primary/5 rounded-full shadow-sm"
							>
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">More actions</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleExport} disabled={!hasTranscript}>
								<Download className="mr-2 h-4 w-4" />
								<span>Export to Markdown</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Transcript */}
			{hasTranscript ? (
				<div className="flex-grow">
					<Virtuoso
						data={conversation.transcript || []}
						itemContent={(index, turn) => (
							<div className="px-8 py-6 border-b border-border/40 last:border-0 hover:bg-muted/5 transition-colors">
								<TurnView key={index} turn={turn} />
							</div>
						)}
					/>
				</div>
			) : (
				<ScrollArea className="flex-grow">
					<StagedConversationPreview conversation={conversation} />
					<div className="p-4 text-center border-t text-sm text-muted-foreground">
						<p>This conversation has not been fully enriched.</p>
					</div>
				</ScrollArea>
			)}
		</div>
	)
}
