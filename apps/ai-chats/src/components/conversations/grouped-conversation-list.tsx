// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { BrainCircuit, Loader, Sparkles } from 'lucide-react'
import * as React from 'react'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationGroup } from '@/types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Skeleton } from '../ui/skeleton'
import { ConversationFilters } from './conversation-filters'
import { ConversationListItem } from './conversation-list-item'

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

type GroupedConversationListProps = {
	groupedConversations: ConversationGroup[]
	selectedConversation: Conversation | null
	onSelectConversation: (conversation: Conversation) => void
	isGrouping: boolean
	isLoading: boolean
	selectedIds: Set<string>
	onToggleSelection: (id: string) => void
	onToggleSelectAll: (select: boolean) => void
	onProcessSelected: () => void
	onProcessAll: () => void
	onUpdateCategory: (conversationId: string, newCategory: string) => void
	// Search, Filter, Sort props
	searchTerm: string
	onSearchTermChange: (term: string) => void
	sortOption: SortOption
	onSortOptionChange: (option: SortOption) => void
	sortDirection: SortDirection
	onSortDirectionChange: (direction: SortDirection) => void
	groupBy: GroupByOption
	onGroupByChange: (option: GroupByOption) => void
	filters: FilterOptions
	onFilterChange: <K extends keyof FilterOptions>(filterName: K, value: FilterOptions[K]) => void
}

function LoadingSkeleton() {
	return (
		<div className="p-4 space-y-4">
			<Skeleton className="h-10 w-full" />
			<div className="p-2 space-y-2">
				{[...Array(10)].map((_, i) => (
					<div key={i} className="flex items-center gap-3 p-2">
						<Skeleton className="h-5 w-5 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-3 w-1/2" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="p-8 text-center text-muted-foreground border-2 border-dashed border-muted-foreground/30 rounded-lg m-4 h-full flex flex-col justify-center items-center">
			<h3 className="text-lg font-semibold text-foreground mb-2">No Conversations Found</h3>
			<p>Your search or filter returned no results, or you need to import data.</p>
		</div>
	)
}

export function GroupedConversationList({
	groupedConversations,
	selectedConversation,
	onSelectConversation,
	isGrouping,
	isLoading,
	selectedIds,
	onToggleSelection,
	onToggleSelectAll,
	onProcessSelected,
	onProcessAll,
	onUpdateCategory,
	...filterProps
}: GroupedConversationListProps) {
	const allConversations = groupedConversations.flatMap((g) => g.conversations)
	const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(null)

	const defaultOpenValue = selectedConversation
		? `group-${groupedConversations.findIndex((g) => g.conversationIds.includes(selectedConversation.id))}`
		: `group-0`

	const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
		e.stopPropagation() // Prevent the conversation from being selected
		onToggleSelection(id)
	}

	const isAnythingSelected = selectedIds.size > 0
	const isEverythingSelected =
		allConversations.length > 0 && selectedIds.size === allConversations.length
	const unprocessedGroup = groupedConversations.find((g) => g.name === 'Unprocessed')
	const hasUnprocessed = (unprocessedGroup?.conversations.length || 0) > 0

	if (isLoading && allConversations.length === 0) {
		return <LoadingSkeleton />
	}

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>, categoryName: string) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setDragOverCategory(categoryName)
	}

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault()
		setDragOverCategory(null)
	}

	const handleDrop = (e: React.DragEvent<HTMLDivElement>, newCategory: string) => {
		e.preventDefault()
		setDragOverCategory(null)
		try {
			const { conversationId, originalCategory } = JSON.parse(
				e.dataTransfer.getData('application/json'),
			)
			if (conversationId && originalCategory !== newCategory) {
				onUpdateCategory(conversationId, newCategory)
			}
		} catch (error) {
			console.error('Failed to parse dropped data', error)
		}
	}

	return (
		<div className="flex flex-col h-full bg-background">
			<div className="p-4 border-b space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold tracking-tight">Explorer</h2>
						<p className="text-sm text-muted-foreground">Review, filter, and process.</p>
					</div>
					<div className="flex items-center gap-2">
						{isAnythingSelected ? (
							<Button onClick={onProcessSelected} size="sm" disabled={isGrouping}>
								{isGrouping ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<BrainCircuit className="mr-2 h-4 w-4" />
								)}
								Process ({selectedIds.size})
							</Button>
						) : hasUnprocessed ? (
							<Button onClick={onProcessAll} size="sm" disabled={isGrouping}>
								{isGrouping ? (
									<Loader className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Sparkles className="mr-2 h-4 w-4" />
								)}
								Process All
							</Button>
						) : null}
					</div>
				</div>
				<ConversationFilters {...filterProps} />
				{allConversations.length > 0 && (
					<div className="flex items-center gap-2">
						<Checkbox
							id="select-all"
							checked={isEverythingSelected}
							onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
						/>
						<label htmlFor="select-all" className="text-sm font-medium">
							Select all ({allConversations.length})
						</label>
					</div>
				)}
			</div>
			<ScrollArea className="flex-grow">
				{allConversations.length === 0 && !isLoading ? (
					<EmptyState />
				) : (
					<Accordion type="multiple" className="w-full p-2" defaultValue={[defaultOpenValue]}>
						{groupedConversations.map((group, index) => {
							// If a group has no conversations left after filtering on the page level, don't render it.
							if (group.conversations.length === 0) {
								return null
							}

							return (
								<AccordionItem
									value={`group-${index}`}
									key={index}
									className={cn(
										'border-b rounded-lg transition-colors',
										dragOverCategory === group.name && 'bg-accent/50 ring-2 ring-accent',
									)}
									onDragOver={(e) => handleDragOver(e, group.name)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, group.name)}
								>
									<AccordionTrigger className="font-semibold text-sm hover:no-underline px-2 gap-2">
										<div className="flex-1 flex items-start gap-2 text-left">
											<BrainCircuit className="h-4 w-4 shrink-0 text-primary mt-0.5" />
											<span className="flex-1">{group.name}</span>
											<Badge variant="secondary">{group.conversations.length}</Badge>
										</div>
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-1">
											{group.conversations.map((convo) => (
												<ConversationListItem
													key={convo.id}
													conversation={convo}
													isSelected={selectedConversation?.id === convo.id}
													onSelect={onSelectConversation}
												>
													<Checkbox
														id={`select-${convo.id}`}
														checked={selectedIds.has(convo.id)}
														onClick={(e) => handleCheckboxClick(e, convo.id)}
														aria-label={`Select ${convo.title}`}
														className="mt-1"
													/>
												</ConversationListItem>
											))}
										</div>
									</AccordionContent>
								</AccordionItem>
							)
						})}
					</Accordion>
				)}
			</ScrollArea>
		</div>
	)
}
