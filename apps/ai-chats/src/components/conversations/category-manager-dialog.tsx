// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

'use client'

import { Pencil, PlusCircle, Save, X } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AppCategory } from '@/types'

type CategoryManagerDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	categories: AppCategory[]
	onAddCategory: (categoryName: string) => Promise<boolean>
	onRenameCategory: (oldName: string, newName: string) => Promise<boolean>
}

export function CategoryManagerDialog({
	open,
	onOpenChange,
	categories,
	onAddCategory,
	onRenameCategory,
}: CategoryManagerDialogProps) {
	const [newCategoryName, setNewCategoryName] = React.useState('')
	const [editingCategory, setEditingCategory] = React.useState<string | null>(null)
	const [editingValue, setEditingValue] = React.useState('')

	const handleAddCategory = async () => {
		if (!newCategoryName.trim()) return
		const success = await onAddCategory(newCategoryName.trim())
		if (success) {
			setNewCategoryName('')
		}
	}

	const handleStartEdit = (category: AppCategory) => {
		setEditingCategory(category.name)
		setEditingValue(category.name)
	}

	const handleCancelEdit = () => {
		setEditingCategory(null)
		setEditingValue('')
	}

	const handleSaveEdit = async () => {
		if (!editingCategory || !editingValue.trim() || editingCategory === editingValue.trim()) {
			handleCancelEdit()
			return
		}
		const success = await onRenameCategory(editingCategory, editingValue.trim())
		if (success) {
			handleCancelEdit()
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Manage Categories</DialogTitle>
					<DialogDescription>Add or rename conversation categories.</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4">
					<div className="flex gap-2">
						<Input
							placeholder="New category name..."
							value={newCategoryName}
							onChange={(e) => setNewCategoryName(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
						/>
						<Button onClick={handleAddCategory}>
							<PlusCircle className="mr-2 h-4 w-4" /> Add
						</Button>
					</div>

					<ScrollArea className="h-64 border rounded-md p-2">
						<div className="space-y-2">
							{categories.map((cat) => (
								<div
									key={cat.name}
									className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
								>
									{editingCategory === cat.name ? (
										<Input
											value={editingValue}
											onChange={(e) => setEditingValue(e.target.value)}
											onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
											className="h-8"
										/>
									) : (
										<span className="text-sm font-medium">{cat.name}</span>
									)}
									<div className="flex items-center gap-1">
										{editingCategory === cat.name ? (
											<>
												<Button
													size="icon"
													variant="ghost"
													className="h-7 w-7"
													onClick={handleSaveEdit}
												>
													<Save className="h-4 w-4 text-green-600" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													className="h-7 w-7"
													onClick={handleCancelEdit}
												>
													<X className="h-4 w-4" />
												</Button>
											</>
										) : (
											<Button
												size="icon"
												variant="ghost"
												className="h-7 w-7"
												onClick={() => handleStartEdit(cat)}
											>
												<Pencil className="h-4 w-4" />
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					</ScrollArea>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
