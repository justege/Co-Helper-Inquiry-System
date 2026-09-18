import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Button, Spinner, Stack, Text } from "@chakra-ui/react"
import { LuLayoutGrid, LuLink, LuUnlink, LuRefreshCw } from "react-icons/lu"
import { PageShell } from "@/components/ui/PageShell"
import { FormNativeSelect } from "@/components/ui/form-controls"
import {
  APP_ACCENT,
  APP_BG_SUBTLE,
  APP_BORDER,
  APP_BTN_GHOST,
  APP_BTN_PRIMARY,
  APP_CARD,
  APP_INK,
  APP_LABEL,
  APP_MUTED,
} from "@/components/ui/appUi"
import {
  connectTrello,
  disconnectTrello,
  getTrelloAuthorizeUrl,
  getTrelloStatus,
  importTrelloBoard,
  listTrelloBoards,
  listTrelloLists,
  type TrelloBoard,
  type TrelloImportSummary,
  type TrelloList,
  type TrelloStatus,
} from "@/api/trello"
import { getMyWorkspace, type FreelancerWorkspaceMe } from "@/api/workspace"

function hashToken(): string | null {
  if (typeof window === "undefined") return null
  const hash = window.location.hash.replace(/^#/, "")
  if (!hash) return null
  const params = new URLSearchParams(hash)
  return params.get("token")
}

function clientLabel(c: FreelancerWorkspaceMe["clients"][number]) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
}

export default function TrelloPage() {
  const [status, setStatus] = useState<TrelloStatus | null>(null)
  const [workspace, setWorkspace] = useState<FreelancerWorkspaceMe | null>(null)
  const [boards, setBoards] = useState<TrelloBoard[]>([])
  const [lists, setLists] = useState<TrelloList[]>([])
  const [boardId, setBoardId] = useState("")
  const [selectedLists, setSelectedLists] = useState<Record<string, boolean>>({})
  const [clientId, setClientId] = useState("")
  const [autoSync, setAutoSync] = useState(true)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<TrelloImportSummary | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const [st, me] = await Promise.all([
      getTrelloStatus(),
      getMyWorkspace().catch(() => null),
    ])
    setStatus(st)
    if (me?.role === "owner") setWorkspace(me)
    if (st.connected) {
      const nextBoards = await listTrelloBoards()
      setBoards(nextBoards)
      const initialBoard = st.boardId && nextBoards.some((b) => b.id === st.boardId)
        ? st.boardId
        : nextBoards[0]?.id ?? ""
      setBoardId(initialBoard)
    } else {
      setBoards([])
      setLists([])
      setBoardId("")
    }
  }, [])

  useEffect(() => {
    const token = hashToken()
    let cancelled = false
    ;(async () => {
      try {
        if (token) {
          setConnecting(true)
          await connectTrello(token)
          window.history.replaceState(null, "", window.location.pathname + window.location.search)
        }
        if (!cancelled) await load()
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not connect Trello")
      } finally {
        if (!cancelled) {
          setConnecting(false)
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [load])

  useEffect(() => {
    if (!boardId || !status?.connected) {
      setLists([])
      return
    }
    let cancelled = false
    listTrelloLists(boardId)
      .then((next) => {
        if (cancelled) return
        setLists(next)
        setSelectedLists(Object.fromEntries(next.map((l) => [l.id, true])))
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => { cancelled = true }
  }, [boardId, status?.connected])

  const selectedListIds = useMemo(
    () => Object.entries(selectedLists).filter(([, on]) => on).map(([id]) => id),
    [selectedLists]
  )

  async function handleConnect() {
    setError(null)
    try {
      const { url } = await getTrelloAuthorizeUrl()
      window.location.href = url
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Trello is not configured on the server")
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Trello from this workspace?")) return
    setError(null)
    try {
      await disconnectTrello()
      setSummary(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not disconnect")
    }
  }

  async function handleImport() {
    if (!boardId) return
    setImporting(true)
    setError(null)
    setSummary(null)
    try {
      const result = await importTrelloBoard({
        boardId,
        listIds: selectedListIds,
        clientId: clientId || undefined,
        autoSync,
      })
      setSummary(result)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const allSelected = lists.length > 0 && selectedListIds.length === lists.length

  return (
    <PageShell
      eyebrow="Integrations"
      title="Trello"
      subtitle="Import a board: each column becomes a project, each card a job, and checklists become to-dos."
      action={
        status?.connected ? (
          <Button {...APP_BTN_GHOST} size="sm" color={APP_MUTED} onClick={handleDisconnect}>
            <LuUnlink size={14} /> Disconnect
          </Button>
        ) : undefined
      }
    >
      {loading || connecting ? (
        <Box display="flex" alignItems="center" gap={2} py={8}>
          <Spinner size="sm" color="green.500" />
          <Text fontSize="sm" color={APP_MUTED}>
            {connecting ? "Saving your Trello connection…" : "Loading…"}
          </Text>
        </Box>
      ) : (
        <Stack gap={5}>
          {error && (
            <Box {...APP_CARD} p={4} borderColor="#FECACA" bg="#FEF2F2">
              <Text fontSize="0.875rem" color="#991B1B">{error}</Text>
            </Box>
          )}

          {!status?.configured && (
            <Box {...APP_CARD} p={5}>
              <Text fontSize="0.9375rem" fontWeight="600" color={APP_INK} mb={1}>
                Trello is not configured on the server
              </Text>
              <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.6">
                Add <code>TRELLO_API_KEY</code> from{" "}
                <a href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer">
                  trello.com/power-ups/admin
                </a>{" "}
                to the backend <code>.env</code>, then reload.
              </Text>
            </Box>
          )}

          {status?.configured && !status.connected && (
            <Box {...APP_CARD} overflow="hidden">
              <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}
                display="flex" alignItems="center" gap={2.5}>
                <Box color={APP_ACCENT}><LuLayoutGrid size={16} /></Box>
                <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Connect Trello</Text>
              </Box>
              <Box p={5}>
                <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.7" mb={4}>
                  Authorize read access so Co-Helper can see the boards you can already open in Trello.
                  After you pick a board, we import columns as projects and keep them in sync automatically
                  when cards move or change.
                </Text>
                <Button {...APP_BTN_PRIMARY} onClick={handleConnect}>
                  <LuLink size={14} /> Connect Trello
                </Button>
              </Box>
            </Box>
          )}

          {status?.connected && (
            <>
              <Box {...APP_CARD} p={5}>
                <Text fontSize="0.75rem" fontWeight="700" color={APP_LABEL} letterSpacing="0.08em" textTransform="uppercase" mb={3}>
                  Connection
                </Text>
                <Stack gap={1}>
                  <Text fontSize="0.875rem" color={APP_INK}>
                    Linked{status.boardName ? ` to “${status.boardName}”` : ""}.
                    {status.autoSync ? " Auto-sync is on." : " Auto-sync will start after the first import."}
                  </Text>
                  <Text fontSize="0.8125rem" color={APP_MUTED}>
                    Re-import any time — existing cards update in place instead of duplicating.
                  </Text>
                </Stack>
              </Box>

              <Box {...APP_CARD} overflow="hidden">
                <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
                  <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>1. Choose a board</Text>
                </Box>
                <Box p={5}>
                  {boards.length === 0 ? (
                    <Text fontSize="0.875rem" color={APP_MUTED}>No open boards were returned for this Trello account.</Text>
                  ) : (
                    <FormNativeSelect value={boardId} onChange={(e) => setBoardId(e.target.value)}>
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </FormNativeSelect>
                  )}
                </Box>
              </Box>

              <Box {...APP_CARD} overflow="hidden">
                <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}
                  display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                  <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>2. Columns become projects</Text>
                  {lists.length > 0 && (
                    <Box
                      as="button"
                      fontSize="0.75rem"
                      fontWeight="600"
                      color={APP_ACCENT}
                      cursor="pointer"
                      onClick={() =>
                        setSelectedLists(Object.fromEntries(lists.map((l) => [l.id, !allSelected])))
                      }
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </Box>
                  )}
                </Box>
                <Box p={5}>
                  {lists.length === 0 ? (
                    <Text fontSize="0.875rem" color={APP_MUTED}>Select a board to load its columns.</Text>
                  ) : (
                    <Stack gap={2}>
                      {lists.map((list) => (
                        <Box
                          key={list.id}
                          as="label"
                          display="flex"
                          alignItems="center"
                          gap={3}
                          px={4}
                          py={3}
                          border={`1px solid ${APP_BORDER}`}
                          borderRadius="10px"
                          bg={selectedLists[list.id] ? APP_BG_SUBTLE : "white"}
                          cursor="pointer"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(selectedLists[list.id])}
                            onChange={(e) =>
                              setSelectedLists((prev) => ({ ...prev, [list.id]: e.target.checked }))
                            }
                          />
                          <Box>
                            <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>{list.name}</Text>
                            <Text fontSize="0.75rem" color={APP_LABEL}>Imported as a project. Cards in this column become jobs.</Text>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>

              <Box {...APP_CARD} overflow="hidden">
                <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
                  <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>3. Assign &amp; sync</Text>
                </Box>
                <Box p={5}>
                  <Stack gap={4}>
                    <Box>
                      <Text fontSize="0.75rem" fontWeight="600" color={APP_LABEL} mb={1.5}>
                        Client for imported jobs
                      </Text>
                      <FormNativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)}>
                        <option value="">Keep them on my workspace (no client)</option>
                        {(workspace?.clients ?? []).map((c) => (
                          <option key={c.id} value={c.id}>{clientLabel(c)}</option>
                        ))}
                      </FormNativeSelect>
                      <Text fontSize="0.75rem" color={APP_LABEL} mt={1.5}>
                        Trello cards don&rsquo;t map to clients automatically. Invite a client first if they should see these jobs.
                      </Text>
                    </Box>
                    <Box as="label" display="flex" alignItems="flex-start" gap={3} cursor="pointer">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        style={{ marginTop: 3 }}
                      />
                      <Box>
                        <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>Keep in sync automatically</Text>
                        <Text fontSize="0.8125rem" color={APP_MUTED} lineHeight="1.5">
                          New and updated cards on this board import in the background. Your API must be publicly reachable
                          (<code>PUBLIC_API_URL</code>) for Trello webhooks.
                        </Text>
                      </Box>
                    </Box>
                    <Button
                      {...APP_BTN_PRIMARY}
                      onClick={handleImport}
                      loading={importing}
                      disabled={!boardId || selectedListIds.length === 0}
                      alignSelf="flex-start"
                    >
                      <LuRefreshCw size={14} />
                      {status.boardId === boardId ? "Import / refresh board" : "Import board"}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            </>
          )}

          {summary && (
            <Box {...APP_CARD} p={5} borderColor="#A7F3D0" bg="#F0FDF4">
              <Text fontSize="0.9375rem" fontWeight="700" color={APP_INK} mb={2}>
                Imported “{summary.board.name}”
              </Text>
              <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.7">
                {summary.lists} column{summary.lists === 1 ? "" : "s"} → projects.
                {" "}{summary.created} new job{summary.created === 1 ? "" : "s"}, {summary.updated} updated.
                {" "}{summary.todos} new to-do{summary.todos === 1 ? "" : "s"}.
                {summary.autoSync ? " Auto-sync is on." : ""}
              </Text>
              {summary.autoSyncError && (
                <Text fontSize="0.8125rem" color="#B45309" mt={2}>
                  Auto-sync webhook could not be registered: {summary.autoSyncError}
                </Text>
              )}
              <Link to="/app/inquiries" style={{ textDecoration: "none" }}>
                <Button {...APP_BTN_PRIMARY} size="sm" mt={4}>Open jobs</Button>
              </Link>
            </Box>
          )}
        </Stack>
      )}
    </PageShell>
  )
}
