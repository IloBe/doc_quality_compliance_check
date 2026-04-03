import React from 'react';
import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';
import { AdminNavigationCard, getAdminAccentClass } from '../../lib/adminCenterViewModel';

type AdminNavigationCardsProps = {
  cards: AdminNavigationCard[];
};

const AdminNavigationCards = ({ cards }: AdminNavigationCardsProps) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`w-11 h-11 rounded-xl mb-4 flex items-center justify-center ${getAdminAccentClass(item.accent)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-neutral-900">{item.title}</h2>
                <p className="text-sm text-neutral-600 mt-2 max-w-xl">{item.description}</p>
              </div>
              <LuArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-800 transition mt-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default AdminNavigationCards;
