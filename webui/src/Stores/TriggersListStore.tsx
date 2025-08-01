import { action, observable } from 'mobx'
import { assertNever } from '~/Resources/util.js'
import type {
	ClientTriggerData,
	TriggerCollection,
	TriggerCollectionData,
	TriggersUpdate,
} from '@companion-app/shared/Model/TriggerModel.js'
import type { GenericCollectionsStore } from './GenericCollectionsStore'
import { applyJsonPatchInPlace, updateObjectInPlace } from './ApplyDiffToMap'

export class TriggersListStore implements GenericCollectionsStore<TriggerCollectionData> {
	readonly triggers = observable.map<string, ClientTriggerData>()
	readonly collections = observable.map<string, TriggerCollection>()

	public updateTriggers = action((change: TriggersUpdate | null) => {
		if (!change) {
			this.triggers.clear()
			return
		}

		const changeType = change.type
		switch (change.type) {
			case 'init':
				this.triggers.clear()

				for (const [triggerId, triggerInfo] of Object.entries(change.triggers)) {
					if (!triggerInfo) continue

					this.triggers.set(triggerId, triggerInfo)
				}
				break
			case 'add':
				this.triggers.set(change.controlId, change.info)
				break
			case 'remove':
				this.triggers.delete(change.controlId)
				break
			case 'update': {
				const oldObj = this.triggers.get(change.controlId)
				if (!oldObj) throw new Error(`Got update for unknown trigger: ${change.controlId}`)
				applyJsonPatchInPlace(oldObj, change.patch)
				break
			}
			default:
				console.error(`Unknown trigger change change: ${changeType}`)
				assertNever(change)
				break
		}
	})

	public get allCollectionIds(): string[] {
		const collectionIds: string[] = []

		const collectCollectionIds = (collections: Iterable<TriggerCollection>): void => {
			for (const collection of collections || []) {
				collectionIds.push(collection.id)
				collectCollectionIds(collection.children)
			}
		}

		collectCollectionIds(this.collections.values())

		return collectionIds
	}

	public rootCollections(): TriggerCollection[] {
		return Array.from(this.collections.values()).sort((a, b) => a.sortOrder - b.sortOrder)
	}

	public resetCollections = action((newData: TriggerCollection[] | null) => {
		this.collections.clear()

		if (newData) {
			for (const collection of newData) {
				if (!collection) continue

				const existing = this.collections.get(collection.id)
				if (existing) {
					updateObjectInPlace(existing, collection)
				} else {
					this.collections.set(collection.id, collection)
				}
			}
		}
	})
}
