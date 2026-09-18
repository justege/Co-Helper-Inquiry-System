"use client"

import type { InputProps, NativeSelectFieldProps, NativeSelectRootProps, TextareaProps } from "@chakra-ui/react"
import * as React from "react"
import { AppInput } from "./AppInput"
import { AppTextarea } from "./AppTextarea"
import { AppSelect } from "./AppSelect"
import { APP_INPUT_STYLE } from "./appUi"

export { AppButton } from "./AppButton"
export { AppInput } from "./AppInput"
export { AppTextarea } from "./AppTextarea"
export { AppSelect } from "./AppSelect"
export { AppFormField, AppForm, AppFormFooter, AppValue, AppFormSection } from "./AppFormField"

const FOCUS_RING = {
  borderColor: "#0F6E56",
  boxShadow: "0 0 0 3px rgba(15,110,86,0.14)",
}

/** @deprecated Use AppInput. Kept for existing pages during Brand DNA migration. */
export const FORM_INPUT_PROPS = {
  ...APP_INPUT_STYLE,
}

export const FORM_INPUT_PROPS_SM = {
  ...FORM_INPUT_PROPS,
  size: "sm" as const,
  fontSize: "0.8125rem",
  h: "36px",
  px: "12px",
  py: "8px",
}

export const FORM_INPUT_PROPS_LG = {
  ...FORM_INPUT_PROPS,
  size: "lg" as const,
  fontSize: "0.9375rem",
  h: "52px",
  px: "18px",
  py: "14px",
}

export const FORM_TEXTAREA_PROPS = {
  ...FORM_INPUT_PROPS,
  minH: "120px",
  px: "16px",
  py: "14px",
  resize: "vertical" as const,
}

export const FORM_SELECT_ROOT_PROPS = {
  variant: "outline" as const,
  size: "md" as const,
}

export const FORM_SELECT_ROOT_PROPS_SM = {
  ...FORM_SELECT_ROOT_PROPS,
  size: "sm" as const,
}

export const FORM_SELECT_ROOT_PROPS_LG = {
  ...FORM_SELECT_ROOT_PROPS,
  size: "lg" as const,
}

export const FORM_SELECT_FIELD_PROPS = {
  ...APP_INPUT_STYLE,
  pe: "40px",
  _focusVisible: FOCUS_RING,
}

export const FORM_SELECT_FIELD_PROPS_LG = {
  ...FORM_SELECT_FIELD_PROPS,
  fontSize: "0.9375rem",
}

export function formInvalidBorder(invalid?: boolean) {
  return invalid ? { borderColor: "#DC2626" as const, boxShadow: "0 0 0 3px rgba(220,38,38,0.12)" } : {}
}

export const FormInput = React.forwardRef<HTMLInputElement, InputProps>(
  function FormInput(props, ref) {
    return <AppInput ref={ref} {...props} />
  },
)

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function FormTextarea(props, ref) {
    return <AppTextarea ref={ref} {...props} />
  },
)

type FormNativeSelectProps = Omit<NativeSelectFieldProps, "size"> & {
  rootProps?: NativeSelectRootProps
  selectSize?: "sm" | "md" | "lg"
  disabled?: boolean
}

export const FormNativeSelect = React.forwardRef<HTMLSelectElement, FormNativeSelectProps>(
  function FormNativeSelect(props, ref) {
    const { rootProps: _rootProps, selectSize = "md", disabled, children, ...fieldProps } = props
    return (
      <AppSelect ref={ref} controlSize={selectSize} disabled={disabled} {...fieldProps}>
        {children}
      </AppSelect>
    )
  },
)
