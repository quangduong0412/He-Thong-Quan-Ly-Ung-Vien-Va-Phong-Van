import { createContext, createElement, useContext, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { StoreApi } from 'zustand/vanilla'
import type { AssistantStore } from './store'
import type { ExtensionRegistry } from './extensions'

interface Ctx { store: StoreApi<AssistantStore>; registry: ExtensionRegistry }
const AssistantContext = createContext<Ctx | null>(null)

export function AssistantProvider(props: Ctx & { children: ReactNode }): ReactNode {
  return createElement(AssistantContext.Provider, { value: { store: props.store, registry: props.registry } }, props.children)
}

function ctx(): Ctx {
  const value = useContext(AssistantContext)
  if (!value) throw new Error('Thiếu <AssistantProvider>')
  return value
}

export function useAssistant<T>(selector: (state: AssistantStore) => T): T {
  return useStore(ctx().store, selector)
}

export function useAssistantStore(): StoreApi<AssistantStore> {
  return ctx().store
}

export function useRegistry(): ExtensionRegistry {
  return ctx().registry
}
