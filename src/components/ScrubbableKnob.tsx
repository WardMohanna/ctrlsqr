"use client";

import type { ButtonHTMLAttributes } from "react";

type ScrubbableKnobProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export default function ScrubbableKnob({
  active = false,
  className,
  ...props
}: ScrubbableKnobProps) {
  return (
    <button
      type="button"
      className={`scrub-knob${active ? " scrub-knob-active" : ""}${className ? ` ${className}` : ""}`}
      aria-label={props["aria-label"] || "Drag to adjust value"}
      title={props.title || "Drag to adjust value"}
      {...props}
    />
  );
}
