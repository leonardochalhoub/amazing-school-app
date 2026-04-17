"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface GhostInputProps extends React.ComponentProps<typeof Input> {
  suggestion?: string;
  onValueChange?: (value: string) => void;
}

/**
 * Input that shows a placeholder suggestion and accepts it on Tab.
 * If the field is empty and the user presses Tab, the suggestion is
 * filled in as the real value instead of just advancing focus.
 */
export const GhostInput = React.forwardRef<HTMLInputElement, GhostInputProps>(
  ({ suggestion, value, onChange, onValueChange, onKeyDown, placeholder, ...rest }, ref) => {
    const effectivePlaceholder = placeholder ?? suggestion;
    const currentValue = typeof value === "string" ? value : "";

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (
        e.key === "Tab" &&
        !e.shiftKey &&
        currentValue.length === 0 &&
        suggestion &&
        suggestion.length > 0
      ) {
        e.preventDefault();
        const synthetic = {
          target: { value: suggestion },
          currentTarget: { value: suggestion },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange?.(synthetic);
        onValueChange?.(suggestion);
      }
      onKeyDown?.(e);
    }

    return (
      <Input
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={effectivePlaceholder}
        {...rest}
      />
    );
  }
);
GhostInput.displayName = "GhostInput";
