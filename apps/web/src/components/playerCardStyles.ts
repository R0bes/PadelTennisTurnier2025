// Shared styles and size calculations for PlayerCard and PlayerGhostCard
// This ensures they always have the same format

export interface PlayerCardSizeConfig {
  padding: string;
  avatarSize: string;
  avatarMargin?: string;
  textSize: string;
  gap: string;
}

export function getPlayerCardStyles(
  isCompact: boolean,
  isHorizontal: boolean
): PlayerCardSizeConfig {
  if (isCompact) {
    return {
      padding: 'p-2',
      avatarSize: isHorizontal ? 'w-7 h-7' : 'w-8 h-8',
      avatarMargin: isHorizontal ? '' : 'mb-1',
      textSize: 'text-xs',
      gap: 'gap-2',
    };
  }
  
  if (isHorizontal) {
    return {
      padding: 'px-2 py-1.5',
      avatarSize: 'w-10 h-10',
      textSize: 'text-sm',
      gap: 'gap-2',
    };
  }
  
  return {
    padding: 'p-3',
    avatarSize: 'w-12 h-12',
    avatarMargin: 'mb-2',
    textSize: 'text-sm',
    gap: 'gap-2',
  };
}

