import { useEffect, useRef, useState, type ReactNode } from "react"
import { Box, Spinner, Text } from "@chakra-ui/react"
import { LuCheck, LuClock, LuPaperclip, LuPlus, LuTag, LuTrash2, LuX } from "react-icons/lu"
import { AppButton } from "@/components/ui/AppButton"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DIALOG_PANEL_STYLE,
} from "@/components/ui/dialog"
import { FormInput, FormNativeSelect, FormTextarea } from "@/components/ui/form-controls"
import { APP_ACCENT, APP_BG_SUBTLE, APP_BORDER, APP_INK, APP_MUTED } from "@/components/ui/appUi"
import { displayName, peopleOnTodo } from "@/lib/people"
import { formatHours, formatWhen, TODO_STATUS_LABEL } from "@/lib/hours"
import { SUGGESTED_TAGS, TODO_COLORS } from "@/lib/todoStyle"
import {
  acceptTodo,
  addTodoComment,
  addTodoItem,
  deleteTodoAttachment,
  deleteTodoComment,
  deleteTodoItem,
  getTodoCard,
  logTime,
  readyTodo,
  startTodo,
  updateTodo,
  updateTodoItem,
  uploadTodoAttachment,
  type PersonBrief,
  type TodoCard,
  type TodoStatus,
} from "@/api/work"
import { AvatarStack, DueChip, StatusBadge, SubtaskProgress } from "./todoUi"
import type { TodoTab } from "./TodoCardContext"

const STATUSES: TodoStatus[] = ["backlog", "in_progress", "waiting_on_client", "done"]

export function TodoCardDialog({
  todoId,
  tab,
  onTabChange,
  onClose,
}: {
  todoId: string | null
  tab: TodoTab
  onTabChange: (tab: TodoTab) => void
  onClose: () => void
}) {
  const [card, setCard] = useState<TodoCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [comment, setComment] = useState("")
  const [itemTitle, setItemTitle] = useState("")
  const [criterionTitle, setCriterionTitle] = useState("")
  const [hours, setHours] = useState("1")
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [panel, setPanel] = useState<"files" | "hours" | "tags" | null>(null)
  const [tagDraft, setTagDraft] = useState("")
  const [confirm, setConfirm] = useState<{ kind: "comment" | "item" | "file"; id: string; label: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    if (!todoId) return
    getTodoCard(todoId)
      .then((next) => {
        setCard(next)
        setTitle(next.todo.title)
        setDescription(next.todo.body ?? "")
        setError(null)
      })
      .catch((e: Error) => {
        setCard(null)
        setError(e.message)
      })
  }

  useEffect(() => {
    setCard(null)
    setError(null)
    setComment("")
    setItemTitle("")
    setCriterionTitle("")
    setPickerOpen(false)
    setStatusOpen(false)
    setPanel(tab === "files" ? "files" : tab === "hours" ? "hours" : null)
    if (todoId) load()
  }, [todoId, tab])

  const todo = card?.todo
  const locked = Boolean(card?.locked)
  const canWork = Boolean(card?.canWork)
  const canSetNow = Boolean(card?.canSetNow)
  const canEditMeta = Boolean(card?.canEditMeta)
  const canTest = Boolean(card?.canTest)
  const canAccept = Boolean(card?.canAccept)
  const criteria = card?.criteria ?? []
  const testedCount = criteria.filter((item) => item.testedAt).length
  const allTested = criteria.length > 0 && testedCount === criteria.length
  const accepted = Boolean(todo?.acceptedAt)
  const itemDone = card?.items.filter((item) => item.done).length ?? 0
  const assigned = (todo ? peopleOnTodo(todo) : []) as PersonBrief[]
  const tags = todo?.tags ?? []

  async function patch(data: Parameters<typeof updateTodo>[1]) {
    if (!todoId || locked) return
    setBusy(true)
    setError(null)
    try {
      await updateTodo(todoId, data)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update this to-do")
    } finally {
      setBusy(false)
    }
  }

  async function runAction(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update this to-do")
    } finally {
      setBusy(false)
    }
  }

  async function runConfirm() {
    if (!todoId || !confirm) return
    setBusy(true)
    try {
      if (confirm.kind === "comment") await deleteTodoComment(todoId, confirm.id)
      if (confirm.kind === "item") await deleteTodoItem(todoId, confirm.id)
      if (confirm.kind === "file") await deleteTodoAttachment(todoId, confirm.id)
      setConfirm(null)
      load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DialogRoot
        open={Boolean(todoId)}
        onOpenChange={({ open }) => { if (!open) onClose() }}
        size="md"
        placement="center"
        scrollBehavior="inside"
        lazyMount
        unmountOnExit
      >
        <DialogContent
          style={{ ...DIALOG_PANEL_STYLE, borderRadius: "18px" }}
          maxW="560px"
          w="calc(100vw - 24px)"
          maxH="92vh"
          display="flex"
          flexDir="column"
        >
          <Box px={5} pt={4} pb={2} display="flex" alignItems="center" justifyContent="space-between" gap={3}>
            <Box position="relative">
              <StatusBadge status={todo?.status} onClick={canEditMeta && !locked ? () => setStatusOpen((v) => !v) : undefined} />
              {statusOpen && canEditMeta && !locked && (
                <Box position="absolute" top="34px" left={0} zIndex={2} bg="white" border={`1px solid ${APP_BORDER}`} borderRadius="12px" overflow="hidden" minW="180px" boxShadow="0 12px 32px rgba(14,27,23,0.12)">
                  {STATUSES.map((status) => (
                    <Box
                      key={status}
                      as="button"
                      w="100%"
                      textAlign="left"
                      px={3}
                      py={2}
                      fontSize="0.8125rem"
                      fontWeight="600"
                      color={APP_INK}
                      onClick={() => {
                        setStatusOpen(false)
                        if (status === "in_progress") void runAction(() => startTodo(todoId!))
                        else void patch({ status })
                      }}
                    >
                      {TODO_STATUS_LABEL[status]}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <IconBtn active={panel === "hours"} onClick={() => { onTabChange("hours"); setPanel(panel === "hours" ? null : "hours") }} label="Hours">
                <LuClock size={16} />
              </IconBtn>
              <IconBtn active={panel === "files"} onClick={() => { onTabChange("files"); setPanel(panel === "files" ? null : "files") }} label="Files">
                <LuPaperclip size={16} />
              </IconBtn>
              <IconBtn active={panel === "tags"} onClick={() => setPanel(panel === "tags" ? null : "tags")} label="Tags">
                <LuTag size={16} />
              </IconBtn>
              <DialogCloseTrigger style={{ color: APP_MUTED, position: "static" }} />
            </Box>
          </Box>
          <DialogHeader display="none" />
          <DialogTitle display="none" />
          <DialogBody px={5} py={3} overflowY="auto" flex="1">
            {error && <Text color="#B91C1C" mb={3} fontSize="0.8125rem">{error}</Text>}
            {!card && !error && <Spinner size="sm" />}
            {card && todoId && todo && (
              <Box>
                {canEditMeta && !locked ? (
                  <FormInput
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => {
                      const next = title.trim()
                      if (next && next !== todo.title) void patch({ title: next })
                    }}
                    fontWeight="800"
                    fontSize="1.25rem"
                    border="none"
                    px={0}
                    h="auto"
                    mb={2}
                  />
                ) : (
                  <Text fontWeight="800" fontSize="1.25rem" color={APP_INK} mb={2}>{todo.title}</Text>
                )}
                {locked ? (
                  <Text fontSize="0.875rem" color={todo.body ? APP_INK : APP_MUTED} whiteSpace="pre-wrap" mb={4}>
                    {todo.body || "No description yet."}
                  </Text>
                ) : (
                  <FormTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => {
                      const next = description.trim() || null
                      if (next !== (todo.body || null)) void patch({ body: next })
                    }}
                    placeholder="Add a description…"
                    minH="72px"
                    mb={4}
                    border="none"
                    px={0}
                  />
                )}

                <MetaRow label="Due">
                  {canEditMeta && !locked ? (
                    <FormInput
                      type="date"
                      value={todo.dueAt || ""}
                      onChange={(e) => void patch({ dueAt: e.target.value || null })}
                      h="36px"
                      maxW="180px"
                    />
                  ) : (
                    <DueChip dueAt={todo.dueAt} status={todo.status} />
                  )}
                </MetaRow>
                <MetaRow label="Start">
                  {canEditMeta && !locked ? (
                    <FormInput
                      type="date"
                      value={todo.startAt || ""}
                      onChange={(e) => void patch({ startAt: e.target.value || null })}
                      h="36px"
                      maxW="180px"
                    />
                  ) : (
                    <Text fontSize="0.875rem" color={APP_INK}>{todo.startAt || "—"}</Text>
                  )}
                </MetaRow>
                <MetaRow label="Assigned">
                  <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <AvatarStack people={assigned} size={28} max={5} />
                    {assigned.map((person) => (
                      <Box
                        key={person.id}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        h="28px"
                        px={2}
                        borderRadius="999px"
                        bg={APP_BG_SUBTLE}
                        fontSize="0.75rem"
                        fontWeight="600"
                      >
                        {displayName(person)}
                        {canEditMeta && !locked && (
                          <Box as="button" onClick={() => void patch({ assigneeIds: assigned.filter((item) => item.id !== person.id).map((item) => item.id) })}>
                            <LuX size={12} />
                          </Box>
                        )}
                      </Box>
                    ))}
                    {canEditMeta && !locked && (
                      <Box as="button" w="28px" h="28px" borderRadius="999px" border={`1px dashed ${APP_BORDER}`} display="flex" alignItems="center" justifyContent="center" onClick={() => setPickerOpen((v) => !v)}>
                        <LuPlus size={14} />
                      </Box>
                    )}
                  </Box>
                </MetaRow>
                {pickerOpen && (
                  <Box mb={3} border={`1px solid ${APP_BORDER}`} borderRadius="12px" overflow="hidden">
                    {(card.people ?? []).filter((person) => !assigned.some((item) => item.id === person.id)).map((person) => (
                      <Box
                        key={person.id}
                        as="button"
                        w="100%"
                        textAlign="left"
                        px={3}
                        py={2}
                        borderTop={`1px solid ${APP_BORDER}`}
                        onClick={() => {
                          void patch({ assigneeIds: [...assigned.map((item) => item.id), person.id] })
                          setPickerOpen(false)
                        }}
                      >
                        <Text fontSize="0.8125rem" fontWeight="600">{displayName(person)}</Text>
                        <Text fontSize="0.7rem" color={APP_MUTED}>{person.role || person.email}</Text>
                      </Box>
                    ))}
                  </Box>
                )}

                {tags.length > 0 && (
                  <Box display="flex" gap={1.5} flexWrap="wrap" mb={3}>
                    {tags.map((tag) => (
                      <Box key={tag} h="22px" px={2} borderRadius="6px" bg="#EEF2FF" color="#3730A3" fontSize="0.7rem" fontWeight="700" display="inline-flex" alignItems="center" gap={1}>
                        {tag}
                        {canEditMeta && !locked && (
                          <Box as="button" onClick={() => void patch({ tags: tags.filter((item) => item !== tag) })}><LuX size={10} /></Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}

                {canEditMeta && !locked && (
                  <Box display="flex" gap={1} mb={4}>
                    {TODO_COLORS.map((swatch) => (
                      <Box
                        key={swatch.id}
                        as="button"
                        w="16px"
                        h="16px"
                        borderRadius="999px"
                        bg={swatch.hex}
                        outline={todo.color === swatch.id ? "2px solid #0E1B17" : "2px solid transparent"}
                        outlineOffset="1px"
                        onClick={() => void patch({ color: swatch.id })}
                        title={swatch.label}
                      />
                    ))}
                  </Box>
                )}

                {panel === "tags" && canEditMeta && !locked && (
                  <Box mb={4} p={3} border={`1px solid ${APP_BORDER}`} borderRadius="12px">
                    <Box display="flex" gap={1.5} flexWrap="wrap" mb={2}>
                      {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
                        <Box key={tag} as="button" h="24px" px={2} borderRadius="6px" border={`1px solid ${APP_BORDER}`} fontSize="0.7rem" fontWeight="700" onClick={() => void patch({ tags: [...tags, tag] })}>
                          {tag}
                        </Box>
                      ))}
                    </Box>
                    <Box display="flex" gap={2}>
                      <FormInput value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Custom tag" h="36px" />
                      <AppButton size="sm" onClick={() => {
                        const next = tagDraft.trim()
                        if (!next) return
                        void patch({ tags: [...tags, next] })
                        setTagDraft("")
                      }}>Add</AppButton>
                    </Box>
                  </Box>
                )}

                {panel === "hours" && (
                  <Box mb={4} p={3} border={`1px solid ${APP_BORDER}`} borderRadius="12px">
                    <Text fontWeight="700" mb={2}>{formatHours(todo.loggedHours)}{todo.estimatedHours != null ? ` / ${formatHours(todo.estimatedHours)}` : ""}</Text>
                    {canEditMeta && !locked && (
                      <FormInput
                        type="number"
                        step="0.5"
                        min="0.25"
                        placeholder="Estimate hours"
                        defaultValue={todo.estimatedHours ?? ""}
                        h="36px"
                        mb={2}
                        onBlur={(e) => {
                          const n = Number(e.target.value)
                          void patch({ estimatedHours: Number.isFinite(n) && n > 0 ? n : null })
                        }}
                      />
                    )}
                    {canWork && !locked && (
                      <Box display="flex" gap={2}>
                        <FormInput type="number" step="0.5" min="0.25" max="24" value={hours} onChange={(e) => setHours(e.target.value)} w="88px" h="36px" />
                        <AppButton size="sm" onClick={() => {
                          const n = Number(hours)
                          if (!Number.isFinite(n) || n <= 0) return
                          logTime(todoId, { hours: n }).then(load)
                        }}>Log hours</AppButton>
                      </Box>
                    )}
                  </Box>
                )}

                {panel === "files" && (
                  <Box mb={4}>
                    {card.attachments.length === 0 && <Text fontSize="0.8125rem" color={APP_MUTED} mb={2}>No files yet.</Text>}
                    {card.attachments.map((file) => (
                      <Box key={file.id} display="flex" justifyContent="space-between" py={2} borderTop={`1px solid ${APP_BORDER}`}>
                        <a href={file.downloadUrl ?? undefined} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                          <Text fontSize="0.8125rem" fontWeight="600" color={APP_ACCENT}>{file.fileName}</Text>
                        </a>
                        {!locked && (
                          <Box as="button" onClick={() => setConfirm({ kind: "file", id: file.id, label: file.fileName })}><LuTrash2 size={14} /></Box>
                        )}
                      </Box>
                    ))}
                    {!locked && (
                      <Box mt={2}>
                        <input ref={fileRef} type="file" hidden onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ""
                          if (!file) return
                          setBusy(true)
                          uploadTodoAttachment(todoId, file).then(load).catch((err: Error) => setError(err.message)).finally(() => setBusy(false))
                        }} />
                        <AppButton size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><LuPaperclip size={14} /> Attach</AppButton>
                      </Box>
                    )}
                  </Box>
                )}

                <Box mb={5}>
                  <SubtaskProgress done={itemDone} total={card.items.length} />
                  {card.items.map((item) => (
                    <CheckRow
                      key={item.id}
                      title={item.title}
                      done={item.done}
                      onToggle={() => { if (!locked && canWork) updateTodoItem(todoId, item.id, { done: !item.done }).then(load) }}
                      onRemove={canEditMeta && !locked ? () => setConfirm({ kind: "item", id: item.id, label: item.title }) : undefined}
                    />
                  ))}
                  {canEditMeta && !locked && (
                    <Box display="flex" gap={2} mt={2}>
                      <FormInput
                        placeholder="Add a subtask"
                        value={itemTitle}
                        h="36px"
                        onChange={(e) => setItemTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return
                          e.preventDefault()
                          const next = itemTitle.trim()
                          if (!next) return
                          addTodoItem(todoId, next, "work").then(() => { setItemTitle(""); load() })
                        }}
                      />
                      <AppButton size="sm" variant="secondary" onClick={() => {
                        const next = itemTitle.trim()
                        if (!next) return
                        addTodoItem(todoId, next, "work").then(() => { setItemTitle(""); load() })
                      }}>Add</AppButton>
                    </Box>
                  )}
                </Box>

                <Box mb={5} p={3} borderRadius="14px" bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Text fontWeight="700" fontSize="0.875rem">Acceptance criteria</Text>
                    <Text fontSize="0.75rem" fontWeight="700" color={criteria.length ? APP_ACCENT : "#B45309"}>
                      {criteria.length ? `${testedCount}/${criteria.length} tested` : "Required"}
                    </Text>
                  </Box>
                  <Text fontSize="0.75rem" color={APP_MUTED} mb={2}>The client tests these before the to-do is accepted.</Text>
                  {criteria.map((item) => (
                    <CheckRow
                      key={item.id}
                      title={item.title}
                      done={Boolean(item.testedAt)}
                      hint={item.testedAt ? "Client tested" : "Waiting for test"}
                      onToggle={() => { if (canTest && !locked) updateTodoItem(todoId, item.id, { tested: !item.testedAt }).then(load).catch((e: Error) => setError(e.message)) }}
                      onRemove={canEditMeta && !locked ? () => setConfirm({ kind: "item", id: item.id, label: item.title }) : undefined}
                    />
                  ))}
                  {canEditMeta && !locked && (
                    <Box display="flex" gap={2} mt={2}>
                      <FormInput
                        placeholder="What should the client check?"
                        value={criterionTitle}
                        h="36px"
                        onChange={(e) => setCriterionTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return
                          e.preventDefault()
                          const next = criterionTitle.trim()
                          if (!next) return
                          addTodoItem(todoId, next, "acceptance").then(() => { setCriterionTitle(""); load() })
                        }}
                      />
                      <AppButton size="sm" onClick={() => {
                        const next = criterionTitle.trim()
                        if (!next) return
                        addTodoItem(todoId, next, "acceptance").then(() => { setCriterionTitle(""); load() })
                      }}>Add</AppButton>
                    </Box>
                  )}
                </Box>

                {canEditMeta && !locked && (
                  <Box mb={4}>
                    <Text fontSize="0.75rem" fontWeight="700" color={APP_MUTED} mb={1}>Blocked by</Text>
                    {(todo.dependsOnIds || []).map((id) => {
                      const sibling = (card.siblings ?? []).find((item) => item.id === id)
                      return (
                        <Box key={id} display="flex" justifyContent="space-between" py={1} gap={2}>
                          <Text fontSize="0.8125rem" color={APP_INK}>{sibling?.title || "Linked to-do"}</Text>
                          <Box as="button" onClick={() => void patch({ dependsOnIds: (todo.dependsOnIds || []).filter((item) => item !== id) })}>
                            <LuX size={12} />
                          </Box>
                        </Box>
                      )
                    })}
                    <FormNativeSelect
                      value=""
                      onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        void patch({ dependsOnIds: [...(todo.dependsOnIds || []), id] })
                      }}
                    >
                      <option value="">Add a dependency</option>
                      {(card.siblings ?? [])
                        .filter((item) => !(todo.dependsOnIds || []).includes(item.id))
                        .map((item) => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                    </FormNativeSelect>
                  </Box>
                )}

                {card.milestones && card.milestones.length > 0 && canEditMeta && !locked && (
                  <Box mb={4}>
                    <Text fontSize="0.75rem" fontWeight="700" color={APP_MUTED} mb={1}>Milestone</Text>
                    <FormNativeSelect value={todo.milestoneId ?? ""} onChange={(e) => void patch({ milestoneId: e.target.value || null })}>
                      <option value="">No milestone</option>
                      {card.milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                      ))}
                    </FormNativeSelect>
                  </Box>
                )}

                {!locked && (
                  <Box display="flex" gap={2} flexWrap="wrap" mb={5}>
                    {canSetNow && todo.status !== "in_progress" && todo.status !== "done" && (
                      <AppButton size="sm" loading={busy} onClick={() => void runAction(() => startTodo(todoId))}>Start</AppButton>
                    )}
                    {canWork && todo.status !== "waiting_on_client" && todo.status !== "done" && (
                      <AppButton size="sm" variant="secondary" loading={busy} onClick={() => void runAction(() => readyTodo(todoId))}>Ready for client</AppButton>
                    )}
                    {canAccept && !accepted && (
                      <AppButton size="sm" loading={busy} disabled={!allTested} onClick={() => void runAction(() => acceptTodo(todoId))}>
                        {card.role === "client" ? "Accept" : "Accept for client"}
                      </AppButton>
                    )}
                  </Box>
                )}
                {accepted && <Text fontSize="0.8125rem" color={APP_ACCENT} fontWeight="700" mb={4}>Accepted</Text>}

                <Box borderTop={`1px solid ${APP_BORDER}`} pt={3}>
                  {card.comments.map((entry) => (
                    <Box key={entry.id} py={2}>
                      <Box display="flex" justifyContent="space-between" gap={2}>
                        <Text fontSize="0.75rem" fontWeight="700">{entry.author?.id === card.meId ? "You" : displayName(entry.author)}</Text>
                        <Box display="flex" gap={2}>
                          <Text fontSize="0.7rem" color={APP_MUTED}>{formatWhen(entry.createdAt)}</Text>
                          {(entry.author?.id === card.meId || canEditMeta) && (
                            <Box as="button" onClick={() => setConfirm({ kind: "comment", id: entry.id, label: "this comment" })}><LuTrash2 size={12} /></Box>
                          )}
                        </Box>
                      </Box>
                      <Text fontSize="0.875rem" whiteSpace="pre-wrap">{entry.body}</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogBody>
          {card && todoId && (
            <Box px={5} py={3} borderTop={`1px solid ${APP_BORDER}`} display="flex" gap={2} alignItems="center">
              <AvatarStack people={[{ firstName: "You", email: "" }]} size={28} />
              <FormInput
                placeholder="Write a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return
                  e.preventDefault()
                  const body = comment.trim()
                  if (!body) return
                  addTodoComment(todoId, body).then(() => { setComment(""); load() })
                }}
              />
              <AppButton size="sm" onClick={() => {
                const body = comment.trim()
                if (!body) return
                addTodoComment(todoId, body).then(() => { setComment(""); load() })
              }}>Post</AppButton>
            </Box>
          )}
        </DialogContent>
      </DialogRoot>
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove from this to-do"
        body={confirm ? `Remove ${confirm.label}?` : ""}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={() => void runConfirm()}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}

function IconBtn({ children, onClick, active, label }: { children: ReactNode; onClick: () => void; active?: boolean; label: string }) {
  return (
    <Box
      as="button"
      aria-label={label}
      w="32px"
      h="32px"
      borderRadius="8px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={active ? APP_ACCENT : APP_MUTED}
      bg={active ? "rgba(15,110,86,0.08)" : "transparent"}
      onClick={onClick}
    >
      {children}
    </Box>
  )
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box display="grid" gridTemplateColumns="88px minmax(0,1fr)" gap={3} alignItems="center" mb={3}>
      <Text fontSize="0.75rem" color={APP_MUTED} fontWeight="600">{label}</Text>
      <Box>{children}</Box>
    </Box>
  )
}

function CheckRow({
  title,
  done,
  hint,
  onToggle,
  onRemove,
}: {
  title: string
  done: boolean
  hint?: string
  onToggle: () => void
  onRemove?: () => void
}) {
  return (
    <Box display="flex" alignItems="flex-start" gap={2} py={2} borderTop={`1px solid ${APP_BORDER}`}>
      <Box
        as="button"
        w="18px"
        h="18px"
        mt="2px"
        borderRadius="999px"
        border={`1.5px solid ${done ? "#4F7CFF" : APP_BORDER}`}
        bg={done ? "#4F7CFF" : "white"}
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        onClick={onToggle}
      >
        {done ? <LuCheck size={11} /> : null}
      </Box>
      <Box flex="1" minW={0}>
        <Text fontSize="0.875rem" color={done ? APP_MUTED : APP_INK} textDecoration={done ? "line-through" : "none"}>{title}</Text>
        {hint && <Text fontSize="0.7rem" color={APP_MUTED}>{hint}</Text>}
      </Box>
      {onRemove && (
        <Box as="button" color={APP_MUTED} onClick={onRemove}><LuTrash2 size={13} /></Box>
      )}
    </Box>
  )
}
