import React from 'react';
import { BridgeOverviewStat, bridgeToneClasses } from '../../lib/bridgeOverview';

type BridgeOverviewStatCardProps = {
  stat: BridgeOverviewStat;
};

const BridgeOverviewStatCard = ({ stat }: BridgeOverviewStatCardProps) => {
  const tone = bridgeToneClasses[stat.tone];

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition duration-500">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${tone.icon}`}>
        <stat.icon className="w-7 h-7" />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-1">{stat.title}</h3>
          <p className="text-4xl font-black text-neutral-900 tracking-tighter">{stat.count}</p>
        </div>
        <div className={`px-2 py-1 text-[10px] font-black rounded-lg uppercase tracking-tighter ${tone.trend}`}>
          {stat.trendLabel}
        </div>
      </div>
    </div>
  );
};

export default BridgeOverviewStatCard;
