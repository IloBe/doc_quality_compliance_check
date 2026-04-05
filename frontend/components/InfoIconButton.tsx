import React from 'react';
import { LuInfo } from 'react-icons/lu';

/**
 * InfoIconButton
 *
 * Single-Responsibility: renders a consistent, borderless info-tooltip trigger button.
 * Use this component whenever a small "ⓘ" button next to a heading or label is needed,
 * ensuring a uniform appearance across every page (no additional circle / ring).
 *
 * Sizing:
 *   'sm'  – 14 × 14 px icon  (p-1   button)  — tight inline contexts (cards, table rows)
 *   'md'  – 16 × 16 px icon  (p-1.5 button)  — standard section / page headings
 */

type InfoIconButtonSize = 'sm' | 'md';

type InfoIconButtonProps = {
  onClick: () => void;
  title?: string;
  'aria-label'?: string;
  size?: InfoIconButtonSize;
};

const SIZE_MAP: Record<InfoIconButtonSize, { button: string; icon: string }> = {
  sm: { button: 'p-1',   icon: 'w-3.5 h-3.5' },
  md: { button: 'p-1.5', icon: 'w-4 h-4'     },
};

const InfoIconButton = ({
  onClick,
  title,
  'aria-label': ariaLabel,
  size = 'md',
}: InfoIconButtonProps) => {
  const { button, icon } = SIZE_MAP[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${button} rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition`}
      title={title}
      aria-label={ariaLabel ?? title}
    >
      <LuInfo className={icon} />
    </button>
  );
};

export default InfoIconButton;
