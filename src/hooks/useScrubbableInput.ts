import type { ButtonHTMLAttributes, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  attachScrubInteraction,
  type ScrubbableOptions,
} from "@/lib/scrubbableNumber";

export type UseScrubbableInputResult = {
  knobRef: RefObject<HTMLButtonElement | null>;
  knobProps: ButtonHTMLAttributes<HTMLButtonElement>;
  isDragging: boolean;
};

export const useScrubbableInput = (
  inputRef: RefObject<HTMLInputElement | null>,
  options?: ScrubbableOptions,
): UseScrubbableInputResult => {
  const knobRef = useRef<HTMLButtonElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const input = inputRef.current;
    const knob = knobRef.current;
    if (!input || !knob) return;

    return attachScrubInteraction(knob, input, {
      ...options,
      onDragStateChange: setIsDragging,
    });
  }, [inputRef, options]);

  const knobProps = useMemo<ButtonHTMLAttributes<HTMLButtonElement>>(
    () => ({
      type: "button",
      className: `scrub-knob${isDragging ? " scrub-knob-active" : ""}`,
      "aria-label": options?.ariaLabel || "Drag to adjust value",
      title: options?.ariaLabel || "Drag to adjust value",
    }),
    [isDragging, options?.ariaLabel],
  );

  return { knobRef, knobProps, isDragging };
};
