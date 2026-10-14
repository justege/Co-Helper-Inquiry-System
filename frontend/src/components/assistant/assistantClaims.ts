import { useEffect, useRef, useSyncExternalStore } from "react"
import type { AssistantDraft } from "@/api/assistant"

export type AssistantClaim = {
  id: string
  priority: number
  accept: (draft: AssistantDraft) => boolean
  apply: (draft: AssistantDraft) => void | Promise<void | string>
}

const claims = new Map<string, AssistantClaim>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function assistantClaimsVersion() {
  return version
}

export function useAssistantClaimsVersion() {
  return useSyncExternalStore(subscribe, assistantClaimsVersion)
}

export function registerAssistantClaim(claim: AssistantClaim) {
  claims.set(claim.id, claim)
  emit()
  return () => {
    if (claims.get(claim.id) === claim) claims.delete(claim.id)
    emit()
  }
}

export function findAssistantClaim(draft: AssistantDraft): AssistantClaim | null {
  let best: AssistantClaim | null = null
  for (const claim of claims.values()) {
    let accepted = false
    try {
      accepted = claim.accept(draft)
    } catch {
      accepted = false
    }
    if (!accepted) continue
    if (!best || claim.priority >= best.priority) best = claim
  }
  return best
}

export function useAssistantClaim(claim: AssistantClaim | null) {
  const ref = useRef<AssistantClaim | null>(claim)
  ref.current = claim
  const id = claim?.id ?? null
  useEffect(() => {
    if (!id) return
    const stable = {
      id,
      priority: 0,
      accept: (draft: AssistantDraft) => Boolean(ref.current?.accept(draft)),
      apply: (draft: AssistantDraft) => ref.current?.apply(draft),
    }
    Object.defineProperty(stable, "priority", {
      get() {
        return ref.current?.priority ?? 0
      },
    })
    return registerAssistantClaim(stable)
  }, [id])
}
