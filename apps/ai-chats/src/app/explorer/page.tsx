// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Bot } from 'lucide-react'
import * as React from 'react'
import ConversationList from '@/components/conversations/conversation-list'
import ConversationView from '@/components/conversations/conversation-view'
import { GroupedConversationList } from '@/components/conversations/grouped-conversation-list'
import AppHeader from '@/components/layout/header'
import { SidebarSettings } from '@/components/sidebar/sidebar-settings'
import { SidebarUpload } from '@/components/sidebar/sidebar-upload'
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/toaster'
import { useIsMobile } from '@/hooks/use-mobile'
import { useToast } from '@/hooks/use-toast'
import {
	addCategoryAction,
	enrichSingleConversationAction,
	getConversationByIdAction,
	getSummaryAction,
	groupConversationsAction,
	renameCategoryAction,
	updateConversationCategoryAction,
	wipeDataAction,
} from '@/lib/actions'
import { cn } from '@/lib/utils'
import type { AppCategory, Conversation, ConversationGroup } from '@/types'

type SortOption = 'createdAt' | 'title' | 'turnCount' | 'charCount'
type SortDirection = 'asc' | 'desc'
type GroupByOption = 'category' | 'none'

type CharacterCountBucket = 'sm' | 'md' | 'lg' | 'xl'
type TurnCountBucket = 'xs' | 'sm' | 'md' | 'lg'
type StatusFilterOption = 'active' | 'archived' | 'all'

type FilterOptions = {
	richContent: 'any' | 'yes' | 'no'
	characterCount: Set<CharacterCountBucket>
	turnCount: Set<TurnCountBucket>
	status: StatusFilterOption
	noCategoryOnly: boolean
	deepResearchOnly: boolean
}

const LONG_TITLE_THRESHOLD = 150

// Define buckets for filtering
const CHAR_COUNT_BUCKETS: Record<CharacterCountBucket, { min: number; max: number }> = {
	sm: { min: 0, max: 1000 },
	md: { min: 1001, max: 5000 },
	lg: { min: 5001, max: 20000 },
	xl: { min: 20001, max: Infinity },
}

const TURN_COUNT_BUCKETS: Record<TurnCountBucket, { min: number; max: number }> = {
	xs: { min: 1, max: 2 },
	sm: { min: 3, max: 5 },
	md: { min: 6, max: 15 },
	lg: { min: 16, max: Infinity },
}

function WelcomeView() {
	return (
		<div className="flex flex-col items-center justify-center h-full text-center p-4">
			<div className="p-4 bg-secondary rounded-full mb-4">
				<Bot className="h-12 w-12 text-muted-foreground" />
			</div>
			<h2 className="text-2xl font-bold mb-2 font-headline">Welcome to Gemini Oracle</h2>
			<p className="text-muted-foreground max-w-md">
				Select a conversation from the list on the left, or import a new file to get started.
			</p>
		</div>
	)
}

function groupConversationsByCat(conversations: Conversation[]): ConversationGroup[] {
	if (!conversations.length) return []

	const grouped = conversations.reduce(
		(acc, convo) => {
			const category = convo.category || 'Unprocessed'
			if (!acc[category]) {
				acc[category] = []
			}
			acc[category].push(convo)
			return acc
		},
		{} as Record<string, Conversation[]>,
	)

	return Object.entries(grouped)
		.map(([name, convos]) => ({
			name,
			conversations: convos,
			conversationIds: convos.map((c) => c.id),
		}))
		.sort((a, b) => a.name.localeCompare(b.name))
}

export default function ExplorerPage() {
	const [allConversations, setAllConversations] = React.useState<Conversation[]>([])
	const [groupedConversations, setGroupedConversations] = React.useState<ConversationGroup[]>([])
	const [categories, setCategories] = React.useState<AppCategory[]>([])
	const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null)
	const [isFetchingConversations, setIsFetchingConversations] = React.useState(true)
	const [isWiping, setIsWiping] = React.useState(false)
	const [isGrouping, setIsGrouping] = React.useState(false)
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
	const [isPipelineOpen, setIsPipelineOpen] = React.useState(false)

	// Search, Filter, Sort State
	const [searchTerm, setSearchTerm] = React.useState('')
	const [sortOption, setSortOption] = React.useState<SortOption>('createdAt')
	const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
	const [groupBy, setGroupBy] = React.useState<GroupByOption>('category')
	const [filters, setFilters] = React.useState<FilterOptions>({
		richContent: 'any',
		characterCount: new Set(),
		turnCount: new Set(),
		status: 'active',
		noCategoryOnly: false,
		deepResearchOnly: false,
	})

	// Per-conversation action loading states
	const [_actionLoadingIds, setActionLoadingIds] = React.useState({
		enriching: new Set<string>(),
		summarizing: new Set<string>(),
		categorizing: new Set<string>(),
	})

	const { toast } = useToast()
	const isMobile = useIsMobile()
	const { isOpen: isSidebarOpen, toggleSidebar } = useSidebar()

	const fetchAndSetConversations = React.useCallback(
		async (_initialLoad = false) => {
			setIsFetchingConversations(true)
			try {
				const res = await fetch('/api/explorer')
				if (!res.ok) throw new Error('Failed to fetch conversations')
				const data = await res.json()
				setAllConversations(data.conversations)
				setCategories(data.categories)

				// If a conversation was selected, find its updated version and set it
				setAllConversations(data.conversations)
				setCategories(data.categories)

				// Selected conversation update is handled by a separate effect
			} catch (error) {
				console.error('Failed to fetch conversations:', error)
				toast({
					variant: 'destructive',
					title: 'Error',
					description: 'Could not fetch conversations.',
				})
				setAllConversations([])
				setCategories([])
			} finally {
				setIsFetchingConversations(false)
			}
		},
		[toast], // Removed selectedConversation dependency
	)

	// Separate effect to sync selected conversation when list updates
	// Also re-fetches full details to get transcript after data changes
	React.useEffect(() => {
		if (selectedConversation && allConversations.length > 0) {
			const updated = allConversations.find((c) => c.id === selectedConversation.id)
			if (updated) {
				// Always re-fetch full details to get transcript (list doesn't include it)
				getConversationByIdAction(updated.id).then((result) => {
					if (result.conversation) {
						setSelectedConversation(result.conversation)
					}
				})
			}
		}
	}, [allConversations, selectedConversation]) // Only run when list changes, removed selectedConversation to avoid loop

	React.useEffect(() => {
		fetchAndSetConversations(true)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchAndSetConversations])

	const filteredAndSortedConversations = React.useMemo(() => {
		let convos = [...allConversations]

		// Filter by excessively long titles
		convos = convos.filter((c) => c.title.length <= LONG_TITLE_THRESHOLD)

		// Filter by search term (now supports multiple terms, including DB ID)
		if (searchTerm) {
			const searchTerms = searchTerm
				.toLowerCase()
				.split(' ')
				.filter((term) => term.trim() !== '')
			if (searchTerms.length > 0) {
				convos = convos.filter((c) => {
					const searchableContent = [
						c.id, // Direct ID match
						c.title.toLowerCase(),
						c.firstPrompt?.toLowerCase() || '',
						c.firstResponse?.toLowerCase() || '',
					].join(' ')

					return searchTerms.every((term) => searchableContent.includes(term))
				})
			}
		}

		// Advanced Filters
		// Status
		if (filters.status !== 'all') {
			convos = convos.filter((c) =>
				filters.status === 'archived' ? c.status === 'archived' : c.status !== 'archived',
			)
		}

		// No Category Only
		if (filters.noCategoryOnly) {
			convos = convos.filter((c) => !c.category || c.category === 'Unprocessed')
		}

		// Rich Content
		if (filters.richContent !== 'any') {
			convos = convos.filter((c) => c.hasRichContent === (filters.richContent === 'yes'))
		}

		// Character Count
		if (filters.characterCount.size > 0) {
			convos = convos.filter((c) => {
				return Array.from(filters.characterCount).some((bucket) => {
					const { min, max } = CHAR_COUNT_BUCKETS[bucket]
					return c.charCount >= min && c.charCount <= max
				})
			})
		}

		// Turn Count
		if (filters.turnCount.size > 0) {
			convos = convos.filter((c) => {
				return Array.from(filters.turnCount).some((bucket) => {
					const { min, max } = TURN_COUNT_BUCKETS[bucket]
					return c.turnCount >= min && c.turnCount <= max
				})
			})
		}

		// Deep Research Only
		if (filters.deepResearchOnly) {
			convos = convos.filter((c) => c.isDeepResearch === true)
		}

		// Sort
		convos.sort((a, b) => {
			const dir = sortDirection === 'asc' ? 1 : -1
			switch (sortOption) {
				case 'title':
					return a.title.localeCompare(b.title) * dir
				case 'turnCount':
					return (a.turnCount - b.turnCount) * dir
				case 'charCount':
					return (a.charCount - b.charCount) * dir
				default:
					return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
			}
		})

		return convos
	}, [allConversations, searchTerm, sortOption, sortDirection, filters])

	React.useEffect(() => {
		if (groupBy === 'category') {
			const newGroups = groupConversationsByCat(filteredAndSortedConversations)
			setGroupedConversations(newGroups)
		} else {
			setGroupedConversations([]) // Not needed for flat view
		}
	}, [filteredAndSortedConversations, groupBy])

	const handleWipe = async () => {
		setIsWiping(true)
		try {
			const result = await wipeDataAction()
			if (result.success) {
				toast({ title: 'Success', description: 'All data has been wiped.' })
				setAllConversations([])
				setGroupedConversations([])
				setSelectedConversation(null)
			} else {
				throw new Error(result.message)
			}
		} catch (_error) {
			toast({ variant: 'destructive', title: 'Error', description: 'Failed to wipe data.' })
		} finally {
			setIsWiping(false)
		}
	}

	const handleSelectConversation = async (conversation: Conversation) => {
		setSelectedConversation(conversation)
		if (isMobile && isSidebarOpen) {
			toggleSidebar()
		}

		// Fetch full details (including transcript) if missing
		if (!conversation.transcript) {
			const result = await getConversationByIdAction(conversation.id)
			if (result.conversation) {
				setSelectedConversation(result.conversation)
			}
		}
	}

	const handleToggleSelection = (id: string) => {
		setSelectedIds((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(id)) {
				newSet.delete(id)
			} else {
				newSet.add(id)
			}
			return newSet
		})
	}

	const handleToggleSelectAll = (select: boolean) => {
		if (select) {
			const allVisibleIds = filteredAndSortedConversations.map((c) => c.id)
			setSelectedIds(new Set(allVisibleIds))
		} else {
			setSelectedIds(new Set())
		}
	}

	const processConversations = async (convosToProcess: Conversation[]) => {
		if (convosToProcess.length === 0) {
			toast({
				title: 'Nothing to Process',
				description: 'All available conversations have already been categorized or filtered out.',
			})
			return
		}

		setIsGrouping(true)
		toast({
			title: 'Analyzing Conversations',
			description: `AI is categorizing ${convosToProcess.length} conversation(s) one by one...`,
		})

		try {
			const result = await groupConversationsAction(convosToProcess)

			if (result.error) throw new Error(result.error)

			toast({
				title: 'Analysis Complete',
				description: 'Selected conversations have been categorized.',
			})

			// Full refresh to get all the latest data and categories
			await fetchAndSetConversations()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
			toast({
				variant: 'destructive',
				title: 'Grouping Failed',
				description: `Could not group conversations: ${errorMessage}`,
			})
		} finally {
			setIsGrouping(false)
			setSelectedIds(new Set())
		}
	}

	const handleProcessSelected = async () => {
		const conversationsToProcess = allConversations.filter((c) => selectedIds.has(c.id))
		await processConversations(conversationsToProcess)
	}

	const handleProcessAll = async () => {
		// Exclude conversations that are archived or already have a category
		const conversationsToProcess = allConversations.filter(
			(c) => c.status !== 'archived' && !c.category,
		)
		await processConversations(conversationsToProcess)
	}

	const handleFilterChange = <K extends keyof FilterOptions>(
		filterName: K,
		value: FilterOptions[K],
	) => {
		setFilters((prev) => ({ ...prev, [filterName]: value }))
	}

	const handleUpdateCategory = async (conversationId: string, newCategory: string) => {
		const originalConversation = allConversations.find((c) => c.id === conversationId)
		if (!originalConversation || originalConversation.category === newCategory) return

		// Optimistic UI update
		const updatedConversations = allConversations.map((c) =>
			c.id === conversationId ? { ...c, category: newCategory } : c,
		)
		setAllConversations(updatedConversations)

		const result = await updateConversationCategoryAction(conversationId, newCategory)

		if (result.success) {
			toast({
				title: 'Category Updated',
				description: `Moved conversation to "${newCategory}".`,
			})
			// Re-fetch everything to ensure categories list is also updated if a new one was created.
			await fetchAndSetConversations()
		} else {
			toast({
				variant: 'destructive',
				title: 'Update Failed',
				description: "Could not update the conversation's category.",
			})
			// Revert optimistic update on failure
			setAllConversations(allConversations)
		}
	}

	// Per-conversation action handlers
	const _handleEnrichConversation = async (conversation: Conversation) => {
		if (!conversation.storageFilename) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'No storage file for this conversation.',
			})
			return
		}

		setActionLoadingIds((prev) => ({
			...prev,
			enriching: new Set(prev.enriching).add(conversation.id),
		}))

		try {
			const result = await enrichSingleConversationAction(
				conversation.id,
				conversation.storageFilename,
			)
			if (result.success) {
				toast({
					title: 'Transcript Fetched',
					description: 'Conversation enriched with full transcript.',
				})
				await fetchAndSetConversations()
			} else {
				toast({ variant: 'destructive', title: 'Enrich Failed', description: result.error })
			}
		} catch (_error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Failed to enrich conversation.',
			})
		} finally {
			setActionLoadingIds((prev) => {
				const newSet = new Set(prev.enriching)
				newSet.delete(conversation.id)
				return { ...prev, enriching: newSet }
			})
		}
	}

	const _handleSummarizeConversation = async (conversation: Conversation) => {
		if (!conversation.transcript || conversation.transcript.length === 0) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Conversation needs transcript first.',
			})
			return
		}

		setActionLoadingIds((prev) => ({
			...prev,
			summarizing: new Set(prev.summarizing).add(conversation.id),
		}))

		try {
			const transcriptString = conversation.transcript
				.map((turn) => `${turn.author}:\n${turn.parts.map((p) => p.content).join('\n')}`)
				.join('\n\n')

			const result = await getSummaryAction(conversation.id, transcriptString)
			if (result.summary) {
				toast({ title: 'Summary Generated', description: 'AI summary has been saved.' })
				await fetchAndSetConversations()
			} else {
				toast({ variant: 'destructive', title: 'Summarize Failed', description: result.error })
			}
		} catch (_error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Failed to summarize conversation.',
			})
		} finally {
			setActionLoadingIds((prev) => {
				const newSet = new Set(prev.summarizing)
				newSet.delete(conversation.id)
				return { ...prev, summarizing: newSet }
			})
		}
	}

	const _handleCategorizeConversation = async (conversation: Conversation) => {
		if (!conversation.transcript || conversation.transcript.length === 0) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Conversation needs transcript first.',
			})
			return
		}

		setActionLoadingIds((prev) => ({
			...prev,
			categorizing: new Set(prev.categorizing).add(conversation.id),
		}))

		try {
			const result = await groupConversationsAction([conversation])
			if (result.success) {
				toast({ title: 'Categorized', description: 'AI has assigned a category.' })
				await fetchAndSetConversations()
			} else {
				toast({ variant: 'destructive', title: 'Categorize Failed', description: result.error })
			}
		} catch (_error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Failed to categorize conversation.',
			})
		} finally {
			setActionLoadingIds((prev) => {
				const newSet = new Set(prev.categorizing)
				newSet.delete(conversation.id)
				return { ...prev, categorizing: newSet }
			})
		}
	}

	const handleAddCategory = async (categoryName: string) => {
		const result = await addCategoryAction(categoryName)
		if (result.success) {
			toast({ title: 'Category Added', description: `Successfully added "${categoryName}".` })
			await fetchAndSetConversations() // Refresh categories
		} else {
			toast({ variant: 'destructive', title: 'Add Failed', description: result.error })
		}
		return result.success
	}

	const handleRenameCategory = async (oldName: string, newName: string) => {
		const result = await renameCategoryAction(oldName, newName)
		if (result.success) {
			toast({ title: 'Category Renamed', description: `Renamed "${oldName}" to "${newName}".` })
			// Full refresh to update all conversations and category lists
			await fetchAndSetConversations()
		} else {
			toast({ variant: 'destructive', title: 'Rename Failed', description: result.error })
		}
		return result.success
	}

	return (
		<div className="h-screen w-screen flex flex-col bg-muted/40 overflow-hidden">
			<AppHeader
				onWipe={handleWipe}
				_isWiping={isWiping}
				_isJobRunning={isGrouping}
				isPipelineOpen={isPipelineOpen}
				setPipelineOpen={setIsPipelineOpen}
			/>
			<div className="flex flex-grow overflow-hidden">
				<Sidebar>
					<SidebarUpload onFileUploaded={fetchAndSetConversations} />
					<SidebarContent>
						{groupBy === 'category' ? (
							<GroupedConversationList
								groupedConversations={groupedConversations}
								selectedConversation={selectedConversation}
								onSelectConversation={handleSelectConversation}
								isGrouping={isGrouping}
								isLoading={isFetchingConversations}
								selectedIds={selectedIds}
								onToggleSelection={handleToggleSelection}
								onToggleSelectAll={handleToggleSelectAll}
								onProcessSelected={handleProcessSelected}
								onProcessAll={handleProcessAll}
								onUpdateCategory={handleUpdateCategory}
								// Search, Filter, Sort props
								searchTerm={searchTerm}
								onSearchTermChange={setSearchTerm}
								sortOption={sortOption}
								onSortOptionChange={setSortOption}
								sortDirection={sortDirection}
								onSortDirectionChange={setSortDirection}
								groupBy={groupBy}
								onGroupByChange={setGroupBy}
								filters={filters}
								onFilterChange={handleFilterChange}
							/>
						) : (
							<ConversationList
								conversations={filteredAndSortedConversations}
								selectedConversation={selectedConversation}
								onSelectConversation={handleSelectConversation}
								loading={isFetchingConversations}
								selectedIds={selectedIds}
								onToggleSelection={handleToggleSelection}
								onToggleSelectAll={handleToggleSelectAll}
								onProcessSelected={handleProcessSelected}
								onProcessAll={handleProcessAll}
								isGrouping={isGrouping}
								// Search, Filter, Sort props
								searchTerm={searchTerm}
								onSearchTermChange={setSearchTerm}
								sortOption={sortOption}
								onSortOptionChange={setSortOption}
								sortDirection={sortDirection}
								onSortDirectionChange={setSortDirection}
								groupBy={groupBy}
								onGroupByChange={setGroupBy}
								filters={filters}
								onFilterChange={handleFilterChange}
							/>
						)}
					</SidebarContent>
					<SidebarFooter className="border-t p-0">
						<SidebarSettings onWipe={handleWipe} isWiping={isWiping} />
					</SidebarFooter>
				</Sidebar>

				<main
					className={cn(
						'flex-grow h-full overflow-y-auto p-4 transition-all duration-300 ease-in-out',
						isSidebarOpen ? 'lg:ml-80' : 'ml-0',
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
								onDataChange={fetchAndSetConversations}
							/>
						) : isFetchingConversations ? (
							<div className="flex items-center justify-center h-full">
								<Bot className="h-12 w-12 text-muted-foreground animate-pulse" />
							</div>
						) : (
							<WelcomeView />
						)}
					</div>
				</main>
			</div>
			<Toaster />
		</div>
	)
}
