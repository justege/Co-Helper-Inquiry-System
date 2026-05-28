"use client"

import {
  Input,
  NativeSelect,
  Textarea,
  type InputProps,
  type NativeSelectFieldProps,
  type NativeSelectRootProps,
  type TextareaProps,
} from "@chakra-ui/react"
import * as React from "react"
import {
  APP_ACCENT,
  APP_BORDER,
  APP_INK,
  APP_INPUT_STYLE,
  APP_LABEL,
  APP_SURFACE,
} from "./appUi"

const FOCUS_RING = {
  borderColor: APP_ACCENT,
  boxShadow: "0 0 0 3px rgba(15,110,86,0.12)",
}

/** Chakra v3 Input — use on `<Input>` and `<Textarea>` only (single element). */
export const FORM_INPUT_PROPS = {
  ...APP_INPUT_STYLE,
}

export const FORM_INPUT_PROPS_SM = {
  ...FORM_INPUT_PROPS,
  size: "sm" as const,
  fontSize: "0.8125rem",
}

export const FORM_INPUT_PROPS_LG = {
  ...FORM_INPUT_PROPS,
  size: "lg" as const,
  fontSize: "0.9375rem",
}

export const FORM_TEXTAREA_PROPS = {
  ...FORM_INPUT_PROPS,
  resize: "none" as const,
}

/** Layout/recipe props for NativeSelect.Root — no border or bg here. */
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

/** Visual props for NativeSelect.Field — border lives on the field, not the root. */
export const FORM_SELECT_FIELD_PROPS = {
  bg: APP_SURFACE,
  borderColor: APP_BORDER,
  borderRadius: "8px",
  fontSize: "0.875rem",
  color: APP_INK,
  _focusVisible: FOCUS_RING,
}

export const FORM_SELECT_FIELD_PROPS_LG = {
  ...FORM_SELECT_FIELD_PROPS,
  fontSize: "0.9375rem",
}

export function formInvalidBorder(invalid?: boolean) {
  return invalid ? { borderColor: "#FCA5A5" as const } : {}
}

export const FormInput = React.forwardRef<HTMLInputElement, InputProps>(
  function FormInput(props, ref) {
    return <Input ref={ref} {...FORM_INPUT_PROPS} {...props} />
  },
)

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function FormTextarea(props, ref) {
    return <Textarea ref={ref} {...FORM_TEXTAREA_PROPS} {...props} />
  },
)

type FormNativeSelectProps = Omit<NativeSelectFieldProps, "size"> & {
  rootProps?: NativeSelectRootProps
  selectSize?: "sm" | "md" | "lg"
  disabled?: boolean
}

export const FormNativeSelect = React.forwardRef<HTMLSelectElement, FormNativeSelectProps>(
  function FormNativeSelect(props, ref) {
    const { rootProps, selectSize = "md", disabled, children, ...fieldProps } = props

    const rootDefaults =
      selectSize === "sm"
        ? FORM_SELECT_ROOT_PROPS_SM
        : selectSize === "lg"
          ? FORM_SELECT_ROOT_PROPS_LG
          : FORM_SELECT_ROOT_PROPS

    const fieldDefaults =
      selectSize === "lg" ? FORM_SELECT_FIELD_PROPS_LG : FORM_SELECT_FIELD_PROPS

    return (
      <NativeSelect.Root {...rootDefaults} {...rootProps} disabled={disabled ?? rootProps?.disabled}>
        <NativeSelect.Field ref={ref} {...fieldDefaults} {...fieldProps} disabled={disabled}>
          {children}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    )
  },
)
