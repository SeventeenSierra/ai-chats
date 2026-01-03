// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Bot, MessageSquare, RefreshCw, Loader } from 'lucide-react'
import * as React from 'react'
import ConversationView from '@/components/conversations/conversation-view'
import { UploadZone } from '@/components/conversations/upload-zone'
import AppHeader from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar, SidebarContent, useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { wipeDataAction } from '@/lib/actions'
import { cn } from '@/lib/utils'
import type { AppCategory, Conversation } from '@/types'

function ConversationListItem({
	conversation,
	isSelected,
	onSelect,
	onFetch,
	isFetching,
}: {
	conversation: Conversation
	isSelected: boolean
	onSelect: (c: Conversation) => void
	onFetch: (id: string) => void
	isFetching: boolean
}) {
	return (
		<div className="group relative">
			<button
				type="button"
				onClick={() => onSelect(conversation)}
				className={cn(
					'w-full text-left p-3 rounded-lg transition-colors pr-10',
					isSelected
						? 'bg-primary/10 border border-primary/20'
						: 'hover:bg-muted',
				)}
			>
				<p className="text-sm font-medium truncate">{conversation.title}</p>
				<p className="text-xs text-muted-foreground mt-1">
					{new Date(conversation.createdAt).toLocaleDateString()} · {conversation.turnCount} turns
				</p>
			</button>
			{!conversation.hasTranscript && (
				<Button
					variant="ghost"
					size="icon"
					data-testid="fetch-transcript-btn"
					className={cn(
						"absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8",
						isFetching ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
					)}
					onClick={(e) => {
						e.stopPropagation()
						onFetch(conversation.id)
					}}
					disabled={isFetching}
				>
					{isFetching ? <Loader data-testid="fetch-loading" className="h-4 w-4 animate-spin text-primary" /> : <RefreshCw className="h-4 w-4 text-muted-foreground" />}
				</Button>
			)}
		</div>
	)
}

// --- Empty State ---
function WelcomeView({ onUploadComplete }: { onUploadComplete: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center h-full p-8">
			<div className="p-4 bg-secondary rounded-full mb-6">
				<Bot className="h-12 w-12 text-muted-foreground" />
			</div>
			<h2 className="text-2xl font-bold mb-2 font-headline">Welcome to The Vault</h2>
			<p className="text-muted-foreground max-w-md text-center mb-8">
				Import your Gemini conversation exports to get started.
			</p>
			<UploadZone onUploadComplete={onUploadComplete} className="max-w-md w-full" />
		</div>
	)
}

// --- Main Page ---
export default function VaultPage() {
	const [allConversations, setAllConversations] = React.useState<Conversation[]>([])
	const [categories, setCategories] = React.useState<AppCategory[]>([])
	const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null)
	const [isLoading, setIsLoading] = React.useState(true)
	const [isImporting, setIsImporting] = React.useState(false)
	const [isWiping, setIsWiping] = React.useState(false)
	const [isFetchingAll, setIsFetchingAll] = React.useState(false)
	const [fetchingIds, setFetchingIds] = React.useState<Set<string>>(new Set())

	const isMobile = useIsMobile()
	const { isOpen: isSidebarOpen, toggleSidebar } = useSidebar()

	const fetchConversations = React.useCallback(async () => {
		setIsLoading(true)
		try {
			const res = await fetch('/api/vault')
			if (!res.ok) throw new Error('Failed to fetch')
			const data = await res.json()
			setAllConversations(data.conversations || [])
			setCategories(data.categories || [])
		} catch (error) {
			console.error('Failed to fetch conversations:', error)
			setAllConversations([])
		} finally {
			setIsLoading(false)
		}
	}, [])

	React.useEffect(() => {
		fetchConversations()
	}, [fetchConversations])

	// Poll for updates when importing or fetching all
	React.useEffect(() => {
		if (!isImporting) return

		const interval = setInterval(() => {
			fetchConversations()
		}, 3000)

		// Stop importing state after 45 seconds (safety timeout)
		const timeout = setTimeout(() => {
			setIsImporting(false)
			clearInterval(interval)
		}, 45000)

		return () => {
			clearInterval(interval)
			clearTimeout(timeout)
		}
	}, [isImporting, fetchConversations])

	const handleSelectConversation = async (conversation: Conversation) => {
		console.log('Selecting conversation:', conversation.id, conversation.title)
		setSelectedConversation(conversation)
		if (isMobile && isSidebarOpen) {
			toggleSidebar()
		}
		// Fetch full details
		try {
			const url = `/api/conversations/${conversation.id}`
			console.log('Fetching full details from:', url)
			const res = await fetch(url)
			if (res.ok) {
				const fullConversation = await res.json()
				console.log('Successfully fetched conversation details')
				setSelectedConversation(fullConversation)
			} else {
				const errorText = await res.text()
				console.error(`Failed to fetch: ${res.status} ${res.statusText}`, errorText)
			}
		} catch (error) {
			console.error('Failed to fetch full conversation (network error):', error)
		}
	}

	const handleFetchAllTranscripts = async () => {
		setIsFetchingAll(true)
		try {
			const res = await fetch('/api/fetch-transcripts', { method: 'POST' })
			if (!res.ok) throw new Error('Failed to start fetch')
			// Poll for job status or just refresh after delay
			setIsImporting(true)
			setTimeout(() => {
				setIsFetchingAll(false)
			}, 2000)
		} catch (error) {
			console.error('Fetch all error:', error)
			setIsFetchingAll(false)
		}
	}

	const handleFetchIndividual = async (id: string) => {
		setFetchingIds(prev => new Set(prev).add(id))
		try {
			const res = await fetch('/api/fetch-transcripts', {
				method: 'POST',
				body: JSON.stringify({ conversationId: id }),
				headers: { 'Content-Type': 'application/json' }
			})
			if (!res.ok) throw new Error('Failed to start fetch')

			// Refresh after a shorter delay for individual fetch
			setTimeout(async () => {
				// We refresh the whole list to catch status updates
				await fetchConversations()
				setFetchingIds(prev => {
					const next = new Set(prev)
					next.delete(id)
					return next
				})
			}, 3000)
		} catch (error) {
			console.error('Fetch individual error:', error)
			setFetchingIds(prev => {
				const next = new Set(prev)
				next.delete(id)
				return next
			})
		}
	}

	const handleWipe = async () => {
		setIsWiping(true)
		try {
			const result = await wipeDataAction()
			if (result.success) {
				setAllConversations([])
				setSelectedConversation(null)
			}
		} catch (error) {
			console.error('Wipe failed:', error)
		} finally {
			setIsWiping(false)
		}
	}

	const handleUploadComplete = () => {
		setIsImporting(true)
		fetchConversations()
	}

	const handleAddCategory = async (name: string) => {
		// Placeholder for category management
		return true
	}

	const handleRenameCategory = async (oldName: string, newName: string) => {
		// Placeholder for category management
		return true
	}

	const handleUpdateCategory = async (conversationId: string, newCategory: string) => {
		// Placeholder for category management
	}

	return (
		<div className="h-screen w-screen flex flex-col bg-muted/40 overflow-hidden">
			<AppHeader onWipe={handleWipe} isWiping={isWiping} isJobRunning={false} />

			<div className="flex flex-grow overflow-hidden">
				{/* Sidebar */}
				<Sidebar>
					<SidebarContent>
						<div className="p-4 border-b space-y-4">
							<div className="flex flex-col gap-2">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
									Bulk Actions
								</h3>
								<Button
									variant="outline"
									size="sm"
									className="w-full justify-start h-9"
									onClick={handleFetchAllTranscripts}
									disabled={isFetchingAll || isLoading}
								>
									{isFetchingAll ? (
										<Loader className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="mr-2 h-4 w-4" />
									)}
									Fetch All Transcripts
								</Button>
							</div>
						</div>

						{/* Conversation List */}
						<div className="p-2">
							<h3 className="px-2 mt-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Conversations ({allConversations.length})
							</h3>
							{isLoading ? (
								<div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
							) : allConversations.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground text-sm">
									No conversations yet.
								</div>
							) : (
								<ScrollArea className="h-[calc(100vh-320px)]">
									<div className="space-y-1 pr-2">
										{allConversations.map((convo) => (
											<ConversationListItem
												key={convo.id}
												conversation={convo}
												isSelected={selectedConversation?.id === convo.id}
												onSelect={handleSelectConversation}
												onFetch={handleFetchIndividual}
												isFetching={fetchingIds.has(convo.id)}
											/>
										))}
									</div>
								</ScrollArea>
							)}
						</div>
					</SidebarContent>
				</Sidebar>

				{/* Main Content */}
				<main
					className={cn(
						'flex-grow h-full overflow-y-auto p-4 transition-all duration-300 ease-in-out',
						isSidebarOpen ? 'lg:ml-72' : 'ml-0',
					)}
				>
					<div className="h-full w-full bg-background rounded-lg border">
						{selectedConversation ? (
							<ConversationView
								key={selectedConversation.id}
								conversation={selectedConversation}
								categories={categories}
								onUpdateCategory={handleUpdateCategory}
								onAddCategory={handleAddCategory}
								onRenameCategory={handleRenameCategory}
								onDataChange={fetchConversations}
							/>
						) : isLoading ? (
							<div className="flex items-center justify-center h-full">
								<Bot className="h-12 w-12 text-muted-foreground animate-pulse" />
							</div>
						) : (
							<WelcomeView onUploadComplete={handleUploadComplete} />
						)}
					</div>
				</main>
			</div>
		</div>
	)
}
