import type { Team } from '@tournament-app/shared-types';

interface TeamGhostCardProps {
  team: Team;
  size?: 'default' | 'compact';
}

export default function TeamGhostCard({
  team,
  size = 'default',
}: TeamGhostCardProps) {
  const isCompact = size === 'compact';

  return (
    <div className="relative">
      <div
        className={`bg-slate-50/60 rounded-lg border-2 border-dashed border-slate-300 transition-all ${
          isCompact ? 'p-3' : 'p-4'
        }`}
      >
        <h3 className={`font-semibold text-slate-400 ${isCompact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
          {team.name}
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-400 font-bold text-xs">T</span>
          </div>
          <span className={`text-slate-400 font-semibold truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {team.name}
          </span>
        </div>
      </div>
    </div>
  );
}

