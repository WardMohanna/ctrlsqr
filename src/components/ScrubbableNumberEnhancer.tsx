"use client";

import { useEffect } from "react";
import {
  attachScrubInteraction,
  type ScrubbableOptions,
} from "@/lib/scrubbableNumber";

const KNOB_CLASS = "scrub-knob";

const knobOptions: ScrubbableOptions = {
  ariaLabel: "Drag to adjust value",
  pointerLock: false,
  edgeThreshold: 10,
  edgeAutoPixelsPerFrame: 0.25,
  stepMultiplier: 0.12,
};

export default function ScrubbableNumberEnhancer() {
  useEffect(() => {
    const cleanups = new Map<HTMLElement, () => void>();

    const attachKnob = (input: HTMLInputElement, host: HTMLElement) => {
      if (input.disabled || input.readOnly) return;
      if (host.querySelector(`.${KNOB_CLASS}`)) return;

      host.classList.add("scrubbable-number-host");

      const knob = document.createElement("button");
      knob.type = "button";
      knob.className = KNOB_CLASS;
      knob.setAttribute(
        "aria-label",
        knobOptions.ariaLabel || "Drag to adjust value",
      );
      knob.setAttribute(
        "title",
        knobOptions.ariaLabel || "Drag to adjust value",
      );

      host.appendChild(knob);

      const cleanup = attachScrubInteraction(knob, input, {
        ...knobOptions,
        onDragStateChange: (isDragging) => {
          knob.classList.toggle("scrub-knob-active", isDragging);
        },
      });

      cleanups.set(knob, () => {
        cleanup();
        knob.remove();
      });
    };

    const scan = (root: ParentNode) => {
      const antdHosts = root.querySelectorAll?.(".ant-input-number") || [];
      antdHosts.forEach((node) => {
        const host = node as HTMLElement;
        const input = host.querySelector("input") as HTMLInputElement | null;
        if (!input) return;
        attachKnob(input, host);
      });

      const nativeInputs =
        root.querySelectorAll?.('input[type="number"]') || [];
      nativeInputs.forEach((node) => {
        const input = node as HTMLInputElement;
        if (input.closest(".ant-input-number")) return;

        const parent = input.parentElement;
        if (!parent) return;

        parent.classList.add(
          "scrubbable-number-host",
          "scrubbable-native-number-host",
        );
        input.classList.add("scrubbable-native-number-input");

        attachKnob(input, parent);
      });
    };

    scan(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((added) => {
          if (!(added instanceof HTMLElement)) return;
          scan(added);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
    };
  }, []);

  return null;
}
