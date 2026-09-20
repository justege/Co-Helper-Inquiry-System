import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, Navigate, useParams } from "react-router-dom"
import { Box, Grid, Spinner, Text } from "@chakra-ui/react"
import { getWorkspaceClient, inviteExistingClient, updateWorkspaceClient } from "@/api/workspace"
import { PageShell } from "@/components/ui/PageShell"
import { WelcomeBannerAction } from "@/components/ui/WelcomeBanner"
import { Field } from "@/components/ui/field"
import { FormInput, FormTextarea } from "@/components/ui/form-controls"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE, APP_BG_SUBTLE, APP_LABEL } from "@/components/ui/appUi"
import { displayName } from "@/lib/people"
import { AppButton } from "@/components/ui/AppButton"

type BillingFields = {
  email: string
  firstName: string
  lastName: string
  companyName: string
  tradeName: string
  legalName: string
  legalForm: string
  contactPerson: string
  phone: string
  street: string
  addressExtra: string
  postalCode: string
  city: string
  country: string
  vatId: string
  taxNumber: string
  commercialRegister: string
  registerCourt: string
  buyerReference: string
  notes: string
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Awaited<ReturnType<typeof getWorkspaceClient>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<BillingFields>()

  function load() {
    if (!id) return
    getWorkspaceClient(id)
      .then((next) => {
        setData(next)
        const c = next.client
        reset({
          email: c.email || "",
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          companyName: c.companyName || "",
          tradeName: c.tradeName || "",
          legalName: c.legalName || "",
          legalForm: c.legalForm || "",
          contactPerson: c.contactPerson || "",
          phone: c.phone || "",
          street: c.street || "",
          addressExtra: c.addressExtra || "",
          postalCode: c.postalCode || "",
          city: c.city || "",
          country: c.country || "DE",
          vatId: c.vatId || "",
          taxNumber: c.taxNumber || "",
          commercialRegister: c.commercialRegister || "",
          registerCourt: c.registerCourt || "",
          buyerReference: c.buyerReference || "",
          notes: c.notes || "",
        })
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => { load() }, [id])

  if (!id) return <Navigate to="/app/clients" replace />
  if (error) return <PageShell eyebrow="Workspace" title="Client" backHref="/app/clients"><Text color="#B91C1C">{error}</Text></PageShell>
  if (!data) return <PageShell eyebrow="Workspace" title="Client" backHref="/app/clients"><Spinner /></PageShell>

  const { client, projects } = data

  async function onSave(values: BillingFields) {
    try {
      const updated = await updateWorkspaceClient(client.id, {
        email: values.email.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        companyName: values.companyName.trim(),
        tradeName: values.tradeName.trim(),
        legalName: values.legalName.trim(),
        legalForm: values.legalForm.trim(),
        contactPerson: values.contactPerson.trim(),
        phone: values.phone.trim(),
        street: values.street.trim(),
        addressExtra: values.addressExtra.trim(),
        postalCode: values.postalCode.trim(),
        city: values.city.trim(),
        country: values.country.trim() || "DE",
        vatId: values.vatId.trim(),
        taxNumber: values.taxNumber.trim(),
        commercialRegister: values.commercialRegister.trim(),
        registerCourt: values.registerCourt.trim(),
        buyerReference: values.buyerReference.trim(),
        notes: values.notes.trim(),
      })
      setData((prev) => prev ? { ...prev, client: { ...prev.client, ...updated } } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setFormError("email", { message: e instanceof Error ? e.message : "Could not save" })
    }
  }

  const billingFields = [
    client.legalName || client.companyName,
    client.street,
    client.postalCode,
    client.city,
    client.vatId || client.taxNumber,
  ]
  const billingFilled = billingFields.filter((value) => String(value || "").trim()).length

  return (
    <PageShell
      eyebrow="Workspace"
      title={displayName(client)}
      backHref="/app/clients"
      stats={[
        { label: "Projects", value: String(projects.length) },
        { label: "Billing", value: `${billingFilled}/5` },
        { label: "Access", value: client.userId ? "Joined" : "Invited" },
        { label: "Country", value: client.country || "DE" },
      ]}
      action={
        !client.userId ? (
          <WelcomeBannerAction
            onClick={() => {
              inviteExistingClient(client.id)
                .then(() => setInviteMsg("Invite sent"))
                .catch((e: Error) => setInviteMsg(e.message))
            }}
          >
            Send invite
          </WelcomeBannerAction>
        ) : undefined
      }
      intro={projects.length === 0 ? {
        title: "This client only sees the projects you attach",
        bullets: [
          "Store the legal name, address, and VAT ID for German invoices",
          "Those details are frozen onto each ZUGFeRD invoice when you issue it",
          "Invite them once — they join at no extra fee",
        ],
        cta: (
          <Link to={`/app/projects?new=1&client=${client.id}`} style={{ textDecoration: "none" }}>
            <AppButton>Create a project</AppButton>
          </Link>
        ),
      } : undefined}
    >
      {inviteMsg && <Text fontSize="0.8125rem" color={APP_MUTED} mb={4}>{inviteMsg}</Text>}

      <Box as="form" onSubmit={handleSubmit(onSave)} bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden" mb={5}>
        <Box px={5} py={3.5} borderBottom={`1px solid ${APP_BORDER}`} bg={APP_BG_SUBTLE}>
          <Text fontSize="0.875rem" fontWeight="700" color={APP_INK}>Invoice details</Text>
          <Text fontSize="0.75rem" color={APP_LABEL}>Required for a German ZUGFeRD invoice: name, street, postcode, city, country.</Text>
        </Box>
        <Box p={5}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <Field label="Email" invalid={!!errors.email} errorText={errors.email?.message}>
              <FormInput type="email" {...register("email", { required: "Email is required" })} />
            </Field>
            <Field label="Phone">
              <FormInput {...register("phone")} />
            </Field>
            <Field label="First name">
              <FormInput {...register("firstName")} />
            </Field>
            <Field label="Last name">
              <FormInput {...register("lastName")} />
            </Field>
            <Field label="Company">
              <FormInput {...register("companyName")} />
            </Field>
            <Field label="Trade name (Handelsname)">
              <FormInput {...register("tradeName")} />
            </Field>
            <Field label="Legal name">
              <FormInput {...register("legalName")} />
            </Field>
            <Field label="Legal form">
              <FormInput placeholder="GmbH, UG, Einzelunternehmen…" {...register("legalForm")} />
            </Field>
            <Field label="Contact person">
              <FormInput {...register("contactPerson")} />
            </Field>
            <Field label="Buyer reference / Leitweg-ID">
              <FormInput {...register("buyerReference")} />
            </Field>
            <Field label="Street and number">
              <FormInput {...register("street")} />
            </Field>
            <Field label="Address extra">
              <FormInput {...register("addressExtra")} />
            </Field>
            <Field label="Postal code">
              <FormInput {...register("postalCode")} />
            </Field>
            <Field label="City">
              <FormInput {...register("city")} />
            </Field>
            <Field label="Country (ISO)">
              <FormInput maxLength={2} {...register("country")} />
            </Field>
            <Field label="VAT ID (USt-IdNr.)">
              <FormInput placeholder="DE123456789" {...register("vatId")} />
            </Field>
            <Field label="Tax number (Steuernummer)">
              <FormInput {...register("taxNumber")} />
            </Field>
            <Field label="Commercial register (HRB)">
              <FormInput {...register("commercialRegister")} />
            </Field>
            <Field label="Register court">
              <FormInput {...register("registerCourt")} />
            </Field>
          </Grid>
          <Field label="Notes" mt={4}>
            <FormTextarea rows={3} {...register("notes")} />
          </Field>
          <Box display="flex" alignItems="center" gap={3} mt={5}>
            <AppButton type="submit" size="sm" loading={isSubmitting}>Save client</AppButton>
            {saved && <Text fontSize="sm" color="#047857" fontWeight="600">Saved</Text>}
          </Box>
        </Box>
      </Box>

      <Box bg={APP_SURFACE} border={`1px solid ${APP_BORDER}`} borderRadius="14px" overflow="hidden">
        {projects.map((project) => (
          <Link key={project.id} to={`/app/projects/${project.id}`} style={{ textDecoration: "none" }}>
            <Box px={5} py={4} borderBottom={`1px solid ${APP_BORDER}`}>
              <Text fontWeight="600" color={APP_INK}>{project.name}</Text>
              <Text fontSize="0.75rem" color={APP_MUTED}>
                {project.collaboratorCount} collaborator{project.collaboratorCount === 1 ? "" : "s"}
              </Text>
            </Box>
          </Link>
        ))}
        {projects.length === 0 && <Text p={5} color={APP_MUTED}>No projects with this client yet.</Text>}
      </Box>
    </PageShell>
  )
}
