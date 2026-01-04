// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import {
	Archive,
	ArchiveRestore,
	Bot,
	BrainCircuit,
	Database,
	Download,
	FileText,
	Folder,
	MessageSquareQuote,
	MoreVertical,
	Pencil,
	User,
} from 'lucide-react'
import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { archiveConversationAction, exportToMarkdownAction, getSummaryAction } from '@/lib/actions'
import { cn } from '@/lib/utils'
import type { AppCategory, Conversation, ConversationTurn } from '@/types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { CategoryManagerDialog } from './category-manager-dialog'

type ConversationViewProps = {
	conversation: Conversation
	categories: AppCategory[]
	onUpdateCategory: (conversationId: string, newCategory: string) => void
	onAddCategory: (categoryName: string) => Promise<boolean>
	onRenameCategory: (oldName: string, newName: string) => Promise<boolean>
	onDataChange: () => void // Callback to tell the parent page to re-fetch all data
}

const TRUNCATION_LENGTH = 500 // 500 characters

function TurnView({ turn }: { turn: ConversationTurn }) {
	const isUser = turn.author === 'user'
	const AuthorIcon = isUser ? User : Bot

	const [isExpanded, setIsExpanded] = React.useState(false)

	const fullContent = React.useMemo(
		() => turn.parts.map((p) => p.content).join('\n\n'),
		[turn.parts],
	)

	const isTruncated = fullContent.length > TRUNCATION_LENGTH

	const contentToShow =
		isExpanded || !isTruncated ? fullContent : `${fullContent.substring(0, TRUNCATION_LENGTH)}...`

	const hiddenCharCount = fullContent.length - TRUNCATION_LENGTH

	return (
		<div className={cn('flex items-end gap-3 my-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
			<div
				className={cn(
					'shrink-0 flex items-center justify-center w-8 h-8 rounded-full border shadow-sm',
					isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
				)}
			>
				<AuthorIcon className="h-5 w-5" />
			</div>

			<div
				className={cn(
					'relative max-w-[85%] px-4 py-3 shadow-sm',
					isUser
						? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
						: 'bg-muted/50 text-foreground border rounded-2xl rounded-tl-sm',
				)}
			>
				<p className="text-[0.65rem] font-medium opacity-70 mb-1 mb-1.5 uppercase tracking-wider">
					{isUser ? 'User' : 'Model'}
				</p>
				<div
					className={cn(
						'prose prose-sm max-w-none break-words leading-relaxed',
						isUser ? 'prose-invert' : 'dark:prose-invert',
					)}
				>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToShow}</ReactMarkdown>
				</div>
				{isTruncated && (
					<Button
						variant="link"
						size="sm"
						className={cn('px-0 h-auto py-1 text-xs mt-2', isUser ? 'text-white/80' : '')}
						onClick={() => setIsExpanded(!isExpanded)}
					>
						{isExpanded
							? 'Show less'
							: `Show more (${hiddenCharCount.toLocaleString()} characters)`}
					</Button>
				)}
			</div>
		</div>
	)
}

function StagedConversationPreview({ conversation }: { conversation: Conversation }) {
	// This component now simply displays the pre-processed firstPrompt and firstResponse.
	return (
		<div className="p-4 space-y-4">
			<Card className="bg-muted/30">
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<User className="h-4 w-4" />
						First User Prompt
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-sm whitespace-pre-wrap font-sans">
						{conversation.firstPrompt || 'No prompt found.'}
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Bot className="h-4 w-4" />
						First Model Response
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-sm whitespace-pre-wrap font-sans">
						{conversation.firstResponse || 'No response found.'}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function _ConversationViewSkeleton() {
	return (
		<div className="p-4 space-y-6">
			<div className="flex items-start gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-12 w-full max-w-lg" />
				</div>
			</div>
			<div className="flex items-start gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-8 w-full max-w-md" />
				</div>
			</div>
			<div className="flex items-start gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-24 w-full max-w-2xl" />
					<Skeleton className="h-8 w-full max-w-lg" />
				</div>
			</div>
		</div>
	)
}

function SummarySection({
	conversation,
	onDataChange,
}: {
	conversation: Conversation
	onDataChange: () => void
}) {
	const [isSummarizing, setIsSummarizing] = React.useState(false)
	const { toast } = useToast()
	const transcript = conversation.transcript
	const summary = conversation.summary

	const handleSummarize = async () => {
		if (!transcript || transcript.length === 0) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Cannot summarize without a full transcript.',
			})
			return
		}

		setIsSummarizing(true)
		toast({ title: 'Generating Summary', description: 'AI is summarizing the conversation...' })

		const transcriptString = transcript
			.map((turn) => `${turn.author}:\n${turn.parts.map((p) => p.content).join('\n')}`)
			.join('\n\n')

		const result = await getSummaryAction(conversation.id, transcriptString)
		if (result.summary) {
			toast({
				title: 'Summary Complete',
				description: 'The conversation has been summarized and saved.',
			})
			onDataChange()
		} else {
			toast({ variant: 'destructive', title: 'Error', description: result.error })
		}
		setIsSummarizing(false)
	}

	return (
		<div className="p-4 border-t">
			<h3 className="font-semibold mb-2">AI Summary</h3>
			{isSummarizing ? (
				<Skeleton className="h-16 w-full" />
			) : summary ? (
				<p className="text-sm text-muted-foreground prose prose-sm max-w-none">{summary}</p>
			) : transcript && transcript.length > 0 ? (
				<div className="text-center py-4 space-y-2">
					<p className="text-sm text-muted-foreground">
						No summary available for this conversation.
					</p>
					<Button onClick={handleSummarize} disabled={isSummarizing} size="sm">
						<BrainCircuit className="mr-2 h-4 w-4" />
						Generate Summary
					</Button>
				</div>
			) : (
				<div className="p-4 text-center text-sm text-muted-foreground">
					This conversation has not been enriched with its full transcript.
				</div>
			)}
		</div>
	)
}

function CategorySelector({
	conversation,
	categories,
	onUpdateCategory,
	onAddCategory,
	onRenameCategory,
}: {
	conversation: Conversation
	categories: AppCategory[]
	onUpdateCategory: (conversationId: string, newCategory: string) => void
	onAddCategory: (categoryName: string) => Promise<boolean>
	onRenameCategory: (oldName: string, newName: string) => Promise<boolean>
}) {
	// The "Unprocessed" category is a virtual one, so we don't show it as a selectable option.
	const displayCategories = categories.filter((c) => c.name !== 'Unprocessed')
	const [isManagerOpen, setIsManagerOpen] = React.useState(false)

	return (
		<>
			<div className="flex items-center gap-1">
				<Select
					value={conversation.category || ''}
					onValueChange={(newCategory) => {
						if (newCategory && newCategory !== conversation.category) {
							onUpdateCategory(conversation.id, newCategory)
						}
					}}
				>
					<SelectTrigger className="w-auto gap-2 text-xs h-7 px-2">
						<Folder className="h-3 w-3" />
						<SelectValue placeholder="Categorize..." />
					</SelectTrigger>
					<SelectContent>
						{displayCategories.map((cat) => (
							<SelectItem key={cat.name} value={cat.name}>
								{cat.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => setIsManagerOpen(true)}
				>
					<Pencil className="h-3.5 w-3.5" />
					<span className="sr-only">Manage Categories</span>
				</Button>
			</div>
			<CategoryManagerDialog
				open={isManagerOpen}
				onOpenChange={setIsManagerOpen}
				categories={displayCategories}
				onAddCategory={onAddCategory}
				onRenameCategory={onRenameCategory}
			/>
		</>
	)
}

export default function ConversationView({
	conversation,
	categories,
	onUpdateCategory,
	onAddCategory,
	onRenameCategory,
	onDataChange,
}: ConversationViewProps) {
	const { toast } = useToast()

	const handleCopyToClipboard = (text: string | undefined, label: string) => {
		if (!text) return
		navigator.clipboard
			.writeText(text)
			.then(() => {
				toast({
					title: 'Copied to Clipboard',
					description: `${label} has been copied.`,
				})
			})
			.catch((err) => {
				console.error('Failed to copy text: ', err)
				toast({
					variant: 'destructive',
					title: 'Copy Failed',
					description: 'Could not copy to clipboard.',
				})
			})
	}

	const handleExport = async () => {
		toast({ title: 'Exporting...', description: 'Generating Markdown file.' })
		const result = await exportToMarkdownAction(conversation)
		if (result.error || !result.markdownContent) {
			toast({ variant: 'destructive', title: 'Export Failed', description: result.error })
			return
		}

		const blob = new Blob([result.markdownContent], { type: 'text/markdown;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		window.open(url, '_blank')
		URL.revokeObjectURL(url) // Revoke the URL after opening the new tab
		toast({ title: 'Export Complete', description: `Content opened in a new tab.` })
	}

	const handleArchive = async (archive: boolean) => {
		const _action = archive ? 'Archiving' : 'Unarchiving'
		const result = await archiveConversationAction(conversation.id, archive)
		if (result.success) {
			toast({
				title: 'Success',
				description: `Conversation has been ${archive ? 'archived' : 'restored'}.`,
			})
			onDataChange()
		} else {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: `Could not ${archive ? 'archive' : 'restore'} conversation.`,
			})
		}
	}

	const hasTranscript = conversation.transcript && conversation.transcript.length > 0
	const isArchived = conversation.status === 'archived'

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b shrink-0 flex items-center justify-between gap-4 flex-wrap">
				<div className="min-w-0 flex-1">
					<h2 className="text-lg font-semibold truncate">{conversation.title}</h2>
					<p className="text-sm text-muted-foreground">
						{new Date(conversation.createdAt).toLocaleString()}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<CategorySelector
						conversation={conversation}
						categories={categories}
						onUpdateCategory={onUpdateCategory}
						onAddCategory={onAddCategory}
						onRenameCategory={onRenameCategory}
					/>
					<Badge variant="outline" className="flex items-center gap-1.5">
						<MessageSquareQuote className="h-3 w-3" />
						{conversation.turnCount} turn(s)
					</Badge>
					<Badge variant="outline" className="flex items-center gap-1.5">
						<FileText className="h-3 w-3" />
						{(conversation.charCount / 1000).toFixed(1)}k chars
					</Badge>
					{conversation.hasRichContent && <Badge variant="secondary">Rich Content</Badge>}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">More actions</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{isArchived ? (
								<DropdownMenuItem onClick={() => handleArchive(false)}>
									<ArchiveRestore className="mr-2 h-4 w-4" />
									<span>Restore from Archive</span>
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem onClick={() => handleArchive(true)}>
									<Archive className="mr-2 h-4 w-4" />
									<span>Archive Conversation</span>
								</DropdownMenuItem>
							)}
							<DropdownMenuItem onClick={handleExport} disabled={!hasTranscript}>
								<Download className="mr-2 h-4 w-4" />
								<span>Export to Markdown</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => handleCopyToClipboard(conversation.id, 'Database ID')}
							>
								<Database className="mr-2 h-4 w-4" />
								<span className="truncate">DB ID: {conversation.id}</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									handleCopyToClipboard(conversation.storageFilename, 'Storage Filename')
								}
								disabled={!conversation.storageFilename}
							>
								<FileText className="mr-2 h-4 w-4" />
								<span className="truncate">Storage: {conversation.storageFilename || 'N/A'}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<ScrollArea className="flex-grow">
				{hasTranscript ? (
					<div className="p-4">
						{conversation.transcript?.map((turn, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: turn extends existing type without unique id
							<TurnView key={index} turn={turn} />
						))}
					</div>
				) : (
					<>
						<StagedConversationPreview conversation={conversation} />
						<div className="p-4 text-center border-t text-sm text-muted-foreground">
							<p>This conversation has not been fully enriched.</p>
							<p>
								Run the "Enrich Transcripts" step in the pipeline to load the full conversation.
							</p>
						</div>
					</>
				)}
			</ScrollArea>
			<SummarySection conversation={conversation} onDataChange={onDataChange} />
		</div>
	)
}
