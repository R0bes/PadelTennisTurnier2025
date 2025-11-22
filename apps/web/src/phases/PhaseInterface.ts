import type { Phase, TournamentState } from '@tournament-app/shared-types';
import type { BaseButtonProps } from '../components/BaseButton';
import type { ReactNode } from 'react';

// Component prop types (without functions, as they are used directly by components)
type VerticalLineComponentProps = {
  height?: string;
  delay?: number;
  className?: string;
};

type HorizontalLineComponentProps = {
  width?: string;
  delay?: number;
  className?: string;
};

type TypingTextComponentProps = {
  text: string;
  secondaryText?: string;
  className?: string;
  faded?: boolean;
  showCursor?: boolean;
  typingSpeed?: number;
  onComplete?: () => void;
};

export interface PhaseTransitionHandler {
  (currentState: TournamentState): Promise<TournamentState | null>;
}

export interface PhaseConfig {
  id: Phase;
  title: string;
  description?: string;
  backgroundColor: string;
  nextPhase: Phase | null;
  requiresTeams?: boolean;
  requiresMatches?: boolean;
}

export interface PhaseDefinition {
  config: PhaseConfig;
  transitionHandler: PhaseTransitionHandler;
}

// Base interface for all view elements
export interface BasePhaseViewElement {
  id?: string;
  condition?: (state: TournamentState, props?: any) => boolean;
}

// Vertical line element
export interface VerticalLineElement extends BasePhaseViewElement {
  type: 'verticalLine';
  height?: VerticalLineComponentProps['height'];
  className?: VerticalLineComponentProps['className'];
}

// Horizontal line element
export interface HorizontalLineElement extends BasePhaseViewElement {
  type: 'horizontalLine';
  width?: HorizontalLineComponentProps['width'];
  className?: HorizontalLineComponentProps['className'];
}

// Simple text element
export interface TextElement extends BasePhaseViewElement {
  type: 'text';
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  faded?: boolean;
}

// Typing text element (with lines)
// Note: 'faded' and 'showCursor' can be functions for dynamic values
export interface TypingTextElement extends BasePhaseViewElement {
  type: 'typingText';
  text: TypingTextComponentProps['text'];
  secondaryText?: TypingTextComponentProps['secondaryText'];
  className?: TypingTextComponentProps['className'];
  faded?: TypingTextComponentProps['faded'] | ((state: TournamentState, props?: any) => boolean);
  showCursor?: TypingTextComponentProps['showCursor'] | ((state: TournamentState, props?: any) => boolean);
  typingSpeed?: TypingTextComponentProps['typingSpeed'];
}

// View container element (Player View, Team View, etc.)
export interface ViewElement extends BasePhaseViewElement {
  type: 'view';
  component: ReactNode | ((props: any) => ReactNode);
  className?: string;
}

// Button element
// Note: 'text', 'active', 'disabled', and 'title' can be functions for dynamic values
// 'onClick' signature differs from BaseButtonProps to accept state and props
export interface ButtonElement extends BasePhaseViewElement {
  type: 'button';
  text: BaseButtonProps['text'] | ((state: TournamentState, props?: any) => string);
  onClick: (state: TournamentState, props?: any) => void;
  color: BaseButtonProps['color'];
  active?: BaseButtonProps['active'] | ((state: TournamentState, props?: any) => boolean);
  disabled?: BaseButtonProps['disabled'] | ((state: TournamentState, props?: any) => boolean);
  icon?: BaseButtonProps['icon'];
  size?: BaseButtonProps['size'];
  className?: BaseButtonProps['className'];
  title?: BaseButtonProps['title'] | ((state: TournamentState, props?: any) => string);
}

// Union type for all view elements
export type PhaseViewElement =
  | VerticalLineElement
  | HorizontalLineElement
  | TextElement
  | TypingTextElement
  | ViewElement
  | ButtonElement;

