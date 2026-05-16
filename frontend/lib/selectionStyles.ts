// Selection Styles Utility - Provides consistent styling for selected/unselected states

export interface SelectionStylesConfig {
  isSelected: boolean;
  tone?: 'blue' | 'red' | 'amber' | 'green';
  defaultRowClass?: string;
  idleRowClass?: string;
  selectedRowClass?: string;
  defaultPrimaryTextClass?: string;
  selectedPrimaryTextClass?: string;
  defaultSecondaryTextClass?: string;
  selectedSecondaryTextClass?: string;
  defaultActionButtonClass?: string;
  selectedActionButtonClass?: string;
  defaultDetailRowClass?: string;
  selectedDetailRowClass?: string;
  defaultStickyCellClass?: string;
  selectedStickyCellClass?: string;
}

export interface SelectionStyles {
  rowClass: string;
  primaryTextClass: string;
  secondaryTextClass: string;
  actionButtonClass: string;
  detailRowClass: string;
  stickyCellClass: string;
}

export function getSelectionStyles(config: SelectionStylesConfig): SelectionStyles {
  const {
    isSelected,
    tone = 'blue',
    defaultRowClass = 'border-neutral-200 bg-white',
    idleRowClass = 'hover:bg-neutral-50',
    selectedRowClass,
    defaultPrimaryTextClass = 'text-neutral-800',
    selectedPrimaryTextClass,
    defaultSecondaryTextClass = 'text-neutral-500',
    selectedSecondaryTextClass,
    defaultActionButtonClass = 'border-neutral-200 hover:bg-neutral-50',
    selectedActionButtonClass = 'border-blue-200 bg-blue-50/40',
    defaultDetailRowClass = 'bg-white',
    selectedDetailRowClass = 'bg-blue-50/30',
    defaultStickyCellClass = 'bg-white',
    selectedStickyCellClass,
  } = config;

  const toneColorMap: Record<string, { selected: string; selectedText: string; selectedSecondary: string }> = {
    blue: {
      selected: 'border-blue-300 bg-blue-50',
      selectedText: 'text-blue-900',
      selectedSecondary: 'text-blue-600',
    },
    red: {
      selected: 'border-red-300 bg-red-50',
      selectedText: 'text-red-900',
      selectedSecondary: 'text-red-600',
    },
    amber: {
      selected: 'border-amber-300 bg-amber-50',
      selectedText: 'text-amber-900',
      selectedSecondary: 'text-amber-600',
    },
    green: {
      selected: 'border-green-300 bg-green-50',
      selectedText: 'text-green-900',
      selectedSecondary: 'text-green-600',
    },
  };

  const toneColors = toneColorMap[tone] || toneColorMap.blue;

  return {
    rowClass: isSelected
      ? selectedRowClass || toneColors.selected
      : `${defaultRowClass} ${idleRowClass}`,
    primaryTextClass: isSelected ? selectedPrimaryTextClass || toneColors.selectedText : defaultPrimaryTextClass,
    secondaryTextClass: isSelected ? selectedSecondaryTextClass || toneColors.selectedSecondary : defaultSecondaryTextClass,
    actionButtonClass: isSelected ? selectedActionButtonClass : defaultActionButtonClass,
    detailRowClass: isSelected ? selectedDetailRowClass : defaultDetailRowClass,
    stickyCellClass: isSelected ? selectedStickyCellClass || selectedDetailRowClass : defaultStickyCellClass,
  };
}

export function getSelectionButtonClass(
  config: {
    isSelected: boolean;
    tone?: string;
    selectedClass?: string;
    defaultClass?: string;
    idleClass?: string;
  } | boolean,
  tone: string = 'blue',
): string {
  // Handle both old function signature (isSelected: boolean, tone: string)
  // and new object-based call
  const isSelected = typeof config === 'boolean' ? config : config.isSelected;
  const toneProp = typeof config === 'boolean' ? tone : config.tone || tone;
  const selectedClass = typeof config === 'boolean' ? undefined : config.selectedClass;
  const defaultClass = typeof config === 'boolean' ? undefined : config.defaultClass;
  const idleClass = typeof config === 'boolean' ? undefined : config.idleClass;

  if (!isSelected) {
    return idleClass || defaultClass || 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50';
  }

  if (selectedClass) {
    return selectedClass;
  }

  const toneClasses: Record<string, string> = {
    blue: 'bg-blue-50 border border-blue-300 text-blue-900',
    red: 'bg-red-50 border border-red-300 text-red-900',
    amber: 'bg-amber-50 border border-amber-300 text-amber-900',
    green: 'bg-green-50 border border-green-300 text-green-900',
  };

  return toneClasses[toneProp] || toneClasses.blue;
}
