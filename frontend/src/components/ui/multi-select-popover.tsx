"use client"

import { Badge, Box, Button, Flex, Stack, Text } from "@chakra-ui/react"
import { LuChevronDown, LuX } from "react-icons/lu"
import * as React from "react"
import { Checkbox } from "./checkbox"
import {
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "./popover"
import { APP_ACCENT, APP_BORDER, APP_INK, APP_LABEL, APP_SURFACE } from "./appUi"

export type MultiSelectOption = {
  value: string
  label: string
  description?: string | null
  disabled?: boolean
  badge?: React.ReactNode
}

type MultiSelectPopoverProps = {
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  invalid?: boolean
  maxHeight?: string
}

export function MultiSelectPopover({
  options,
  value,
  onChange,
  placeholder = "Select options…",
  emptyMessage = "No options available",
  disabled = false,
  invalid = false,
  maxHeight = "280px",
}: MultiSelectPopoverProps) {
  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label)

  function toggleOption(optionValue: string, checked: boolean) {
    if (checked) {
      onChange(Array.from(new Set([...value, optionValue])))
      return
    }
    onChange(value.filter((id) => id !== optionValue))
  }

  function removeChip(optionValue: string) {
    onChange(value.filter((id) => id !== optionValue))
  }

  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`

  return (
    <Box>
      <PopoverRoot positioning={{ placement: "bottom-start", gutter: 6 }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            w="full"
            h="46px"
            px={3.5}
            justifyContent="space-between"
            fontWeight="500"
            fontSize="0.9375rem"
            bg={APP_SURFACE}
            color={selectedLabels.length ? APP_INK : APP_LABEL}
            border="1px solid"
            borderColor={invalid ? "#FCA5A5" : APP_BORDER}
            borderRadius="8px"
            _hover={{ bg: "#FAFBFD", borderColor: invalid ? "#FCA5A5" : "#CBD5E1" }}
            _focusVisible={{
              borderColor: APP_ACCENT,
              boxShadow: "0 0 0 3px rgba(15,110,86,0.12)",
            }}
            disabled={disabled}
          >
            <Text truncate>{triggerLabel}</Text>
            <LuChevronDown size={16} color="#94A3B8" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          w="var(--reference-width)"
          minW="280px"
          p={0}
          borderRadius="10px"
          border={`1px solid ${APP_BORDER}`}
          boxShadow="0 16px 40px rgba(15,23,42,0.12)"
          overflow="hidden"
        >
          <PopoverBody p={0}>
            <Stack
              gap={0}
              maxH={maxHeight}
              overflowY="auto"
              py={1}
            >
              {options.length === 0 ? (
                <Box px={4} py={3}>
                  <Text fontSize="0.8125rem" color={APP_LABEL}>{emptyMessage}</Text>
                </Box>
              ) : (
                options.map((opt) => {
                  const checked = value.includes(opt.value)
                  return (
                    <Box
                      key={opt.value}
                      px={3}
                      py={2.5}
                      _hover={{ bg: "#F8FAFC" }}
                      opacity={opt.disabled ? 0.55 : 1}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={opt.disabled}
                        onCheckedChange={(e) => toggleOption(opt.value, Boolean(e.checked))}
                        alignItems="flex-start"
                      >
                        <Box>
                          <Flex align="center" gap={2}>
                            <Text fontSize="0.875rem" fontWeight="600" color={APP_INK}>
                              {opt.label}
                            </Text>
                            {opt.badge}
                          </Flex>
                          {opt.description && (
                            <Text fontSize="0.75rem" color="#64748B" mt={0.5} lineHeight="1.45">
                              {opt.description}
                            </Text>
                          )}
                        </Box>
                      </Checkbox>
                    </Box>
                  )
                })
              )}
            </Stack>
          </PopoverBody>
        </PopoverContent>
      </PopoverRoot>

      {selectedLabels.length > 0 && (
        <Flex gap={2} flexWrap="wrap" mt={2.5}>
          {options
            .filter((opt) => value.includes(opt.value))
            .map((opt) => (
              <Badge
                key={opt.value}
                display="inline-flex"
                alignItems="center"
                gap={1.5}
                px={2.5}
                py={1}
                bg="#F0FAF5"
                color="#0F6E56"
                border="1px solid #A7D7C5"
                rounded="full"
                fontSize="0.75rem"
                fontWeight="600"
              >
                {opt.label}
                <Box
                  as="button"
                  type="button"
                  display="inline-flex"
                  aria-label={`Remove ${opt.label}`}
                  onClick={() => removeChip(opt.value)}
                  color="#0F6E56"
                  _hover={{ color: "#0a5240" }}
                >
                  <LuX size={12} />
                </Box>
              </Badge>
            ))}
        </Flex>
      )}
    </Box>
  )
}
