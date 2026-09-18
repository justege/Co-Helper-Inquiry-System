import { useState } from "react"
import { Box, Button, Spinner, Text } from "@chakra-ui/react"
import { LuSparkles } from "react-icons/lu"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog"
import { rewriteText, type RewriteTarget } from "@/api/ai"
import { APP_BORDER, APP_BG_SUBTLE, APP_INK, APP_LABEL, APP_MUTED } from "@/components/ui/appUi"

const AI_BLUE = "#185FA5"

interface EditWithAIProps {
  inquiryId: string
  target: RewriteTarget
  getText: () => string
  onApply: (text: string) => void
  label?: string
}

export default function EditWithAI({ inquiryId, target, getText, onApply, label = "Edit with AI" }: EditWithAIProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [original, setOriginal] = useState("")
  const [rewritten, setRewritten] = useState("")
  const [summary, setSummary] = useState<string | null>(null)
  const [instruction, setInstruction] = useState("")

  async function run(withInstruction?: string) {
    const text = getText().trim()
    if (!text) {
      setError("Write something first, then ask AI to clarify it.")
      return
    }
    setOriginal(text)
    setLoading(true)
    setError(null)
    try {
      const res = await rewriteText(inquiryId, target, text, withInstruction)
      setRewritten(res.rewritten)
      setSummary(res.summary)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "AI rewrite failed")
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    setRewritten("")
    setSummary(null)
    setInstruction("")
    setError(null)
    run()
  }

  function handleAccept() {
    onApply(rewritten)
    setOpen(false)
  }

  return (
    <>
      <Box
        as="button"
        type="button"
        onClick={handleOpen}
        display="inline-flex" alignItems="center" gap={1.5}
        px={2.5} py={1.5} borderRadius="7px"
        bg={`${AI_BLUE}12`} color={AI_BLUE}
        fontSize="0.75rem" fontWeight="700"
        cursor="pointer" transition="all 0.12s"
        _hover={{ bg: `${AI_BLUE}1F` }}
      >
        <LuSparkles size={13} />
        {label}
      </Box>

      <DialogRoot open={open} onOpenChange={({ open: o }) => setOpen(o)} size="md">
        <DialogContent style={{ borderRadius: "16px", border: `1px solid ${APP_BORDER}`, overflow: "hidden", boxShadow: "0 20px 60px rgba(11,21,40,0.18)" }}>
          <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2.5}>
              <LuSparkles size={15} color="#6ABFA2" />
              <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
                Edit with AI
              </DialogTitle>
            </Box>
            <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
          </Box>

          <DialogHeader display="none" />

          <DialogBody px={6} py={5}>
            {loading ? (
              <Box display="flex" alignItems="center" gap={2} py={6} justifyContent="center">
                <Spinner size="sm" color="green.500" />
                <Text fontSize="0.875rem" color={APP_MUTED}>Clarifying with context from this job…</Text>
              </Box>
            ) : error ? (
              <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3}>
                <Text fontSize="0.875rem" color="#991B1B">{error}</Text>
              </Box>
            ) : (
              <>
                <Box mb={4}>
                  <Text fontSize="0.6875rem" fontWeight="700" color={APP_LABEL} letterSpacing="0.09em" textTransform="uppercase" mb={1.5}>
                    Original
                  </Text>
                  <Box bg={APP_BG_SUBTLE} border={`1px solid ${APP_BORDER}`} borderRadius="10px" px={3.5} py={3}>
                    <Text fontSize="0.875rem" color={APP_MUTED} whiteSpace="pre-wrap" lineHeight="1.6">{original}</Text>
                  </Box>
                </Box>

                <Box mb={4}>
                  <Text fontSize="0.6875rem" fontWeight="700" color={AI_BLUE} letterSpacing="0.09em" textTransform="uppercase" mb={1.5}>
                    AI suggestion
                  </Text>
                  <Box bg={`${AI_BLUE}0A`} border={`1px solid ${AI_BLUE}33`} borderRadius="10px" px={3.5} py={3}>
                    <Text fontSize="0.875rem" color={APP_INK} whiteSpace="pre-wrap" lineHeight="1.6">{rewritten}</Text>
                  </Box>
                  {summary && (
                    <Text fontSize="0.75rem" color={APP_LABEL} mt={2}>{summary}</Text>
                  )}
                </Box>

                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={APP_LABEL} mb={1.5}>
                    Want something different? (optional)
                  </Text>
                  <Box display="flex" gap={2}>
                    <input
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="e.g. make it shorter, more formal…"
                      style={{
                        flex: 1, padding: "8px 10px", fontSize: "0.8125rem",
                        border: `1px solid ${APP_BORDER}`, borderRadius: "8px",
                        outline: "none", fontFamily: "inherit",
                      }}
                    />
                    <Button
                      size="sm" h="34px" px={3} borderRadius="8px" fontWeight="600" fontSize="0.75rem"
                      variant="outline" borderColor={APP_BORDER} color={APP_MUTED}
                      onClick={() => run(instruction.trim() || undefined)}
                    >
                      Regenerate
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </DialogBody>

          <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
            <Button
              flex={1} h="40px" borderRadius="8px" fontWeight="700"
              bg="#0F6E56" color="white" _hover={{ bg: "#0a5240" }}
              onClick={handleAccept}
              disabled={loading || !!error || !rewritten}
            >
              Use this version
            </Button>
            <Button
              h="40px" borderRadius="8px" fontWeight="500"
              variant="outline" borderColor={APP_BORDER} color={APP_MUTED}
              onClick={() => setOpen(false)}
            >
              Keep original
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}
