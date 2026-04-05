export type ScrubModifierState = {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

export type ScrubbableOptions = {
  stepMultiplier?: number;
  edgeThreshold?: number;
  edgeAutoPixelsPerFrame?: number;
  pointerLock?: boolean;
  ariaLabel?: string;
  onDragStateChange?: (isDragging: boolean) => void;
};

const DEFAULT_OPTIONS: Required<
  Pick<
    ScrubbableOptions,
    | "stepMultiplier"
    | "edgeThreshold"
    | "edgeAutoPixelsPerFrame"
    | "pointerLock"
  >
> = {
  // Lower default drag sensitivity so values change more gradually.
  stepMultiplier: 0.12,
  edgeThreshold: 10,
  edgeAutoPixelsPerFrame: 0.25,
  pointerLock: false,
};

const clamp = (value: number, min?: number, max?: number) => {
  let next = value;
  if (Number.isFinite(min)) {
    next = Math.max(min as number, next);
  }
  if (Number.isFinite(max)) {
    next = Math.min(max as number, next);
  }
  return next;
};

const decimalsOf = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  const text = value.toString();
  if (text.includes("e-")) {
    const [, power] = text.split("e-");
    return Number(power) || 0;
  }
  const dot = text.indexOf(".");
  return dot >= 0 ? text.length - dot - 1 : 0;
};

const toFiniteNumber = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getInputStep = (input: HTMLInputElement) => {
  const stepAttr = toFiniteNumber(input.getAttribute("step"));
  if (stepAttr && stepAttr > 0) return stepAttr;
  return 1;
};

const getInputMin = (input: HTMLInputElement) =>
  toFiniteNumber(input.getAttribute("min"));
const getInputMax = (input: HTMLInputElement) =>
  toFiniteNumber(input.getAttribute("max"));

const getModifierMultiplier = (modifier: ScrubModifierState) => {
  if (modifier.altKey) return 0.01;
  if (modifier.shiftKey) return 0.1;
  if (modifier.ctrlKey || modifier.metaKey) return 10;
  return 1;
};

const snapToStep = (value: number, step: number, min?: number) => {
  if (!Number.isFinite(step) || step <= 0) return value;
  const anchor = Number.isFinite(min) ? (min as number) : 0;
  const snapped = Math.round((value - anchor) / step) * step + anchor;
  const precision = Math.min(
    8,
    Math.max(decimalsOf(step), decimalsOf(snapped)),
  );
  return Number(snapped.toFixed(precision));
};

const formatValue = (value: number, step: number) => {
  const precision = Math.min(8, Math.max(decimalsOf(step), decimalsOf(value)));
  return Number(value.toFixed(precision)).toString();
};

export const applyScrubDeltaToInput = (
  input: HTMLInputElement,
  deltaX: number,
  modifier: ScrubModifierState,
  options?: ScrubbableOptions,
) => {
  const merged = { ...DEFAULT_OPTIONS, ...(options || {}) };
  const step = getInputStep(input);
  const min = getInputMin(input);
  const max = getInputMax(input);
  const current = Number.isFinite(Number(input.value))
    ? Number(input.value)
    : 0;

  const modifierMultiplier = getModifierMultiplier(modifier);
  const rawNext =
    current + deltaX * step * merged.stepMultiplier * modifierMultiplier;

  const clamped = clamp(rawNext, min, max);
  const snapped = snapToStep(clamped, step, min);
  const formatted = formatValue(snapped, step);

  input.value = formatted;
  input.setAttribute("value", formatted);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  return snapped;
};

export const attachScrubInteraction = (
  knob: HTMLElement,
  input: HTMLInputElement,
  options?: ScrubbableOptions,
) => {
  const merged = { ...DEFAULT_OPTIONS, ...(options || {}) };

  let dragging = false;
  let lastX = 0;
  let edgeDirection: -1 | 0 | 1 = 0;
  let pendingDelta = 0;
  let rafId: number | null = null;
  let ghostKnob: HTMLDivElement | null = null;
  let modifierState: ScrubModifierState = {
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };

  const updateGhostPosition = (clientX: number, clientY: number) => {
    if (!ghostKnob) return;
    ghostKnob.style.left = `${clientX}px`;
    ghostKnob.style.top = `${clientY}px`;
  };

  const createGhostKnob = (clientX: number, clientY: number) => {
    if (ghostKnob) return;
    ghostKnob = document.createElement("div");
    ghostKnob.className = "scrub-knob-ghost";
    document.body.appendChild(ghostKnob);
    updateGhostPosition(clientX, clientY);
  };

  const removeGhostKnob = () => {
    if (!ghostKnob) return;
    ghostKnob.remove();
    ghostKnob = null;
  };

  const setDraggingState = (value: boolean) => {
    options?.onDragStateChange?.(value);
  };

  const processFrame = () => {
    rafId = null;
    if (!dragging) return;

    const totalDelta =
      pendingDelta + edgeDirection * merged.edgeAutoPixelsPerFrame;
    pendingDelta = 0;

    if (totalDelta !== 0) {
      applyScrubDeltaToInput(input, totalDelta, modifierState, merged);
    }

    if (dragging) {
      rafId = window.requestAnimationFrame(processFrame);
    }
  };

  const ensureFrame = () => {
    if (rafId == null) {
      rafId = window.requestAnimationFrame(processFrame);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragging) return;

    modifierState = {
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };

    const delta = event.clientX - lastX;
    lastX = event.clientX;
    pendingDelta += delta;

    if (event.clientX <= merged.edgeThreshold) {
      edgeDirection = -1;
    } else if (event.clientX >= window.innerWidth - merged.edgeThreshold) {
      edgeDirection = 1;
    } else {
      edgeDirection = 0;
    }

    updateGhostPosition(event.clientX, event.clientY);

    ensureFrame();
    event.preventDefault();
  };

  const stopDragging = () => {
    if (!dragging) return;

    dragging = false;
    setDraggingState(false);
    edgeDirection = 0;
    pendingDelta = 0;

    if (rafId != null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
    window.removeEventListener("blur", stopDragging);

    if (document.pointerLockElement === knob) {
      document.exitPointerLock();
    }

    removeGhostKnob();

    document.body.classList.remove("scrub-dragging");
    knob.classList.remove("scrub-knob-active");
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || input.disabled || input.readOnly) return;

    dragging = true;
    setDraggingState(true);
    lastX = event.clientX;
    edgeDirection = 0;
    pendingDelta = 0;
    modifierState = {
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    };

    document.body.classList.add("scrub-dragging");
    knob.classList.add("scrub-knob-active");
    createGhostKnob(event.clientX, event.clientY);

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    window.addEventListener("blur", stopDragging);

    if (
      merged.pointerLock &&
      event.pointerType !== "touch" &&
      typeof (knob as any).requestPointerLock === "function"
    ) {
      (knob as any).requestPointerLock();
    }

    ensureFrame();
    event.preventDefault();
  };

  knob.addEventListener("pointerdown", handlePointerDown);

  return () => {
    stopDragging();
    removeGhostKnob();
    knob.removeEventListener("pointerdown", handlePointerDown);
  };
};
