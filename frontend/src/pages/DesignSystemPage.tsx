import { Box, Grid, Stack, Text } from "@chakra-ui/react"
import { Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { getMe, type User } from "@/api/users"
import { PageShell } from "@/components/ui/PageShell"
import { AppButton } from "@/components/ui/AppButton"
import { AppInput } from "@/components/ui/AppInput"
import { AppTextarea } from "@/components/ui/AppTextarea"
import { AppSelect } from "@/components/ui/AppSelect"
import { AppFormField, AppForm, AppFormFooter, AppValue } from "@/components/ui/AppFormField"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"

export default function DesignSystemPage() {
  const [me, setMe] = useState<User | null>(null)
  useEffect(() => { getMe().then(setMe).catch(() => null) }, [])
  if (me && me.role !== "superadmin" && me.role !== "admin") return <Navigate to="/app" replace />

  return (
    <PageShell title="Brand DNA" subtitle="Buttons, inputs, and form values with Co-Helper padding and focus.">
      <Stack gap={10} maxW="720px">
        <Box>
          <Text fontWeight="700" color={APP_INK} mb={3}>Buttons</Text>
          <Grid templateColumns="repeat(3, max-content)" gap={3} mb={3}>
            <AppButton size="sm">Small</AppButton>
            <AppButton>Default</AppButton>
            <AppButton size="lg">Large</AppButton>
          </Grid>
          <Box display="flex" gap={2} flexWrap="wrap">
            <AppButton variant="primary">Primary</AppButton>
            <AppButton variant="secondary">Secondary</AppButton>
            <AppButton variant="ghost">Ghost</AppButton>
            <AppButton variant="accent">Accent</AppButton>
            <AppButton variant="danger">Danger</AppButton>
            <AppButton variant="icon" aria-label="Icon">+</AppButton>
            <AppButton loading>Loading</AppButton>
          </Box>
        </Box>

        <Box>
          <Text fontWeight="700" color={APP_INK} mb={3}>Inputs</Text>
          <AppForm>
            <AppFormField label="Default (md)" helper="44px height, 12px 16px padding">
              <AppInput placeholder="Client email" />
            </AppFormField>
            <AppFormField label="Compact (sm)">
              <AppInput controlSize="sm" placeholder="Filter" />
            </AppFormField>
            <AppFormField label="Auth (lg)">
              <AppInput controlSize="lg" placeholder="you@company.com" />
            </AppFormField>
            <AppFormField label="Invalid" error="Enter a valid email">
              <AppInput invalid placeholder="broken@" />
            </AppFormField>
            <AppFormField label="Notes">
              <AppTextarea placeholder="Describe the job…" />
            </AppFormField>
            <AppFormField label="Currency">
              <AppSelect defaultValue="EUR">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </AppSelect>
            </AppFormField>
            <AppFormField label="Read-only value">
              <AppValue>€1,240.00 outstanding</AppValue>
            </AppFormField>
            <AppFormFooter>
              <AppButton variant="ghost">Cancel</AppButton>
              <AppButton>Save</AppButton>
            </AppFormFooter>
          </AppForm>
        </Box>

        <Box p={8} bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px">
          <Text fontSize="0.75rem" color={APP_MUTED} mb={2}>Trust Green · Signal Blue · Action Lime · Paper</Text>
          <Box display="flex" gap={2}>
            {["#0F6E56", "#185FA5", "#D8FF86", "#F4F1EA", "#0E1B17"].map((c) => (
              <Box key={c} w="44px" h="44px" borderRadius="10px" bg={c} border={`1px solid ${APP_BORDER}`} />
            ))}
          </Box>
        </Box>
      </Stack>
    </PageShell>
  )
}
