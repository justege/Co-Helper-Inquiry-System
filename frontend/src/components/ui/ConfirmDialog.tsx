import { Box, Text } from "@chakra-ui/react"
import { AppButton } from "./AppButton"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DIALOG_PANEL_STYLE,
} from "./dialog"
import { APP_MUTED } from "./appUi"

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <DialogRoot open={open} onOpenChange={({ open: next }) => { if (!next) onClose() }} size="sm" placement="center">
      <DialogContent style={DIALOG_PANEL_STYLE}>
        <Box bg="#0B1A15" px={6} py={4} display="flex" alignItems="center" justifyContent="space-between">
          <DialogTitle style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem", margin: 0 }}>
            {title}
          </DialogTitle>
          <DialogCloseTrigger style={{ color: "rgba(255,255,255,0.5)" }} />
        </Box>
        <DialogHeader display="none" />
        <DialogBody px={6} py={5}>
          <Text fontSize="0.875rem" color={APP_MUTED} lineHeight="1.6">{body}</Text>
        </DialogBody>
        <DialogFooter px={6} pb={5} pt={0} display="flex" gap={2}>
          <AppButton
            variant={danger ? "danger" : "primary"}
            loading={busy}
            onClick={onConfirm}
            flex={1}
          >
            {confirmLabel}
          </AppButton>
          <AppButton variant="ghost" onClick={onClose}>Cancel</AppButton>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
