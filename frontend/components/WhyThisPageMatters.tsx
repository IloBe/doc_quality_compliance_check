import React from 'react';

const WhyThisPageMatters = ({ title = 'Why this page matters', description }) => {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-blue-900 mb-2">{title}</h2>
      <p className="text-sm text-blue-800 leading-relaxed">{description}</p>
    </div>
  );
};

export default WhyThisPageMatters;
