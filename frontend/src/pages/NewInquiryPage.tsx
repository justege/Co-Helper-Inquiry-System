import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import {
  Box,
  Button,
  Fieldset,
  Grid,
  RadioGroup,
  Stack,
  Text,
} from "@chakra-ui/react"
import { Field } from "@/components/ui/field"
import {
  FormInput,
  FormNativeSelect,
  FormTextarea,
  formInvalidBorder,
} from "@/components/ui/form-controls"
import { PageShell } from "@/components/ui/PageShell"
import { auth } from "../lib/firebase"
import { api } from "../lib/api"
import type { CreateInquiryInput, Inquiry, BusinessType, Urgency } from "../api/inquiries"
import { getCategories, type Category } from "../api/categories"

const URGENCY_OPTIONS: { value: Urgency; label: string; accent: string }[] = [
  { value: "low",      label: "Low",      accent: "#64748B" },
  { value: "medium",   label: "Medium",   accent: "#92400E" },
  { value: "high",     label: "High",     accent: "#B91C1C" },
  { value: "critical", label: "Critical", accent: "#7F1D1D" },
]

export default function NewInquiryPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateInquiryInput>({
    mode: "onBlur",
    defaultValues: { type: "service", urgency: "medium" },
  })

  const businessType = watch("type") as BusinessType
  const targetStart  = watch("targetStartDate")

  useEffect(() => {
    setCatLoading(true)
    getCategories({ type: businessType })
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [businessType])

  async function onSubmit(values: CreateInquiryInput) {
    if (!auth?.currentUser) {
      setError("root", { message: "Not signed in" })
      return
    }
    const payload = {
      ...values,
      estimatedQuantity:
        values.type === "tool_sourcing" && values.estimatedQuantity
          ? Number(values.estimatedQuantity)
          : null,
      targetStartDate: values.targetStartDate || null,
      targetEndDate:   values.targetEndDate || null,
    }
    try {
      const created = await api.post<Inquiry>("/api/inquiries", payload)
      navigate(`/app/inquiries/${created.id}`)
    } catch (err) {
      setError("root", { message: err instanceof Error ? err.message : "Request failed" })
    }
  }

  return (
    <PageShell
      eyebrow="Marketplace"
      title="Post a new inquiry"
      subtitle="Describe your needs — a project manager will match specialists and deliver on time."
      backHref="/app/inquiries"
      backLabel="My inquiries"
    >
      {errors.root && (
        <Box bg="#FEF2F2" border="1px solid #FECACA" borderRadius="10px" px={4} py={3} mb={4}>
          <Text fontSize="sm" color="#991B1B">{errors.root.message}</Text>
        </Box>
      )}

      <Box
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        bg="white"
        border="1px solid #D8DCE8"
        borderRadius="16px"
        p={{ base: 5, md: 7 }}
      >
        <Box pb={4} mb={6} borderBottom="1px solid #EFF1F6">
          <Text fontSize="0.6875rem" fontWeight="700" color="#8A96A8" letterSpacing="0.09em" textTransform="uppercase">
            Inquiry Details
          </Text>
        </Box>

        <Fieldset.Root>
          <Fieldset.Content>
            {/* Type + Category */}
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={5} mb={5}>
              <Field label="Inquiry type" invalid={!!errors.type} errorText={errors.type?.message} required>
                <FormNativeSelect {...register("type", { required: "Type is required" })}>
                  <option value="service">Ongoing Service</option>
                  <option value="tool_sourcing">Fixed Project</option>
                </FormNativeSelect>
              </Field>

              <Field label="Category" invalid={!!errors.categoryId} errorText={errors.categoryId?.message} required>
                <FormNativeSelect
                  {...register("categoryId", { required: "Category is required" })}
                  rootProps={{
                    opacity: catLoading || categories.length === 0 ? 0.5 : 1,
                    pointerEvents: catLoading || categories.length === 0 ? "none" : undefined,
                  }}
                >
                  {catLoading ? (
                    <option value="">Loading…</option>
                  ) : categories.length === 0 ? (
                    <option value="">No categories for this type</option>
                  ) : (
                    <>
                      <option value="">Select a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </>
                  )}
                </FormNativeSelect>
              </Field>
            </Grid>

            {/* Title */}
            <Box mb={5}>
              <Field label="Title" invalid={!!errors.title} errorText={errors.title?.message} required>
                <FormInput
                  placeholder="e.g., 500 custom steel molds for automotive parts"
                  {...formInvalidBorder(!!errors.title)}
                  {...register("title", {
                    required: "Title is required",
                    minLength: { value: 3, message: "At least 3 characters" },
                    maxLength: { value: 255, message: "255 characters max" },
                  })}
                />
              </Field>
            </Box>

            {/* Description */}
            <Box mb={5}>
              <Field label="Description" invalid={!!errors.description} errorText={errors.description?.message} required>
                <FormTextarea
                  placeholder="Describe your requirements, specs, materials, quality standards…"
                  rows={5}
                  {...formInvalidBorder(!!errors.description)}
                  {...register("description", {
                    required: "Description is required",
                    minLength: { value: 10, message: "At least 10 characters" },
                  })}
                />
              </Field>
            </Box>

            {/* Urgency + Dates */}
            <Stack direction={{ base: "column", lg: "row" }} gap={6} mb={5} alignItems="flex-start">
              <Field label="Urgency" invalid={!!errors.urgency} errorText={errors.urgency?.message} required flex={1}>
                <Controller
                  name="urgency"
                  control={control}
                  rules={{ required: "Urgency is required" }}
                  render={({ field }) => (
                    <RadioGroup.Root value={field.value} onValueChange={({ value }) => field.onChange(value as Urgency)}>
                      <Box display="flex" gap={2} flexWrap="wrap">
                        {URGENCY_OPTIONS.map((opt) => (
                          <RadioGroup.Item key={opt.value} value={opt.value}>
                            <RadioGroup.ItemHiddenInput />
                            <Box
                              display="flex" alignItems="center" gap={2}
                              px={3} py={2} borderRadius="8px"
                              border="1.5px solid"
                              borderColor={field.value === opt.value ? opt.accent : "#D8DCE8"}
                              bg={field.value === opt.value ? opt.accent + "12" : "white"}
                              cursor="pointer" transition="all 0.1s"
                            >
                              <RadioGroup.ItemIndicator />
                              <RadioGroup.ItemText
                                fontSize="0.85rem" fontWeight="600"
                                color={field.value === opt.value ? opt.accent : "#64748B"}
                              >
                                {opt.label}
                              </RadioGroup.ItemText>
                            </Box>
                          </RadioGroup.Item>
                        ))}
                      </Box>
                    </RadioGroup.Root>
                  )}
                />
              </Field>

              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4} flex={1}>
                <Field label="Target start date" invalid={!!errors.targetStartDate} errorText={errors.targetStartDate?.message}>
                  <FormInput type="date" {...register("targetStartDate")} />
                </Field>
                <Field label="Target end date" invalid={!!errors.targetEndDate} errorText={errors.targetEndDate?.message}>
                  <FormInput
                    type="date"
                    {...register("targetEndDate", {
                      validate: (val) => {
                        if (!val || !targetStart) return true
                        return val >= targetStart || "Must be on or after start date"
                      },
                    })}
                  />
                </Field>
              </Grid>
            </Stack>

            {/* Scope — fixed project only */}
            {businessType === "tool_sourcing" && (
              <Box mb={5}>
                <Field
                  label="Estimated scope"
                  helperText="Approximate hours, deliverables, or units for this project"
                  invalid={!!errors.estimatedQuantity}
                  errorText={errors.estimatedQuantity?.message}
                  required
                >
                  <FormInput
                    type="number"
                    min={1}
                    placeholder="e.g., 40"
                    {...register("estimatedQuantity", {
                      required: "Scope estimate is required for fixed projects",
                      min: { value: 1, message: "At least 1" },
                      valueAsNumber: true,
                    })}
                  />
                </Field>
              </Box>
            )}

            {/* Submit */}
            <Box pt={2} borderTop="1px solid #EFF1F6" display="flex" justifyContent="flex-end">
              <Button
                type="submit"
                bg="#0F6E56"
                color="white"
                fontWeight="700"
                size="lg"
                px={10}
                borderRadius="10px"
                loading={isSubmitting}
                loadingText="Submitting…"
                _hover={{ bg: "#0a5240" }}
              >
                Submit Inquiry
              </Button>
            </Box>
          </Fieldset.Content>
        </Fieldset.Root>
      </Box>
    </PageShell>
  )
}
