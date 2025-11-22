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
      padding: 'p-1.5',
      avatarSize: isHorizontal ? 'w-8 h-8' : 'w-9 h-9',
      avatarMargin: isHorizontal ? '' : 'mb-1',
      textSize: 'text-base',
      gap: 'gap-1.5',
    };
  }
  
  if (isHorizontal) {
    return {
      padding: 'px-2 py-1',
      avatarSize: 'w-11 h-11',
      textSize: 'text-lg',
      gap: 'gap-2',
    };
  }
  
  return {
    padding: 'p-2.5',
    avatarSize: 'w-14 h-14',
    avatarMargin: 'mb-1.5',
    textSize: 'text-lg',
    gap: 'gap-2',
  };
}

