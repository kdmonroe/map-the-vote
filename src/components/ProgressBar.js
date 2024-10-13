// ProgressBar.js
import React from 'react';

function ProgressBar({ demVotes, repVotes, totalVotes }) {
  const demPercentage = (demVotes / totalVotes) * 100;
  const repPercentage = (repVotes / totalVotes) * 100;
  const projectedWinner = demVotes >= 270 ? 'Democrat' : repVotes >= 270 ? 'Republican' : null;

  return (
    <div className="w-full p-4 bg-white sticky top-0 z-10 progress-bar">
      <div className="text-center mb-2 font-bold">Total Electoral Votes: {totalVotes}</div>
      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 h-full bg-blue-500"
          style={{ width: `${demPercentage}%` }}
        ></div>
        <div
          className="absolute right-0 h-full bg-red-500"
          style={{ width: `${repPercentage}%` }}
        ></div>
        <div className="absolute left-1/2 w-0.5 h-full bg-gray-400 transform -translate-x-1/2"></div>
      </div>
      <div className="flex justify-between mt-4 items-center">
        <div className="flex items-center">
          <div className={`rounded-full overflow-hidden ${projectedWinner === 'Democrat' ? 'ring-4 ring-yellow-400' : ''}`} style={{ width: '64px', height: '64px', flexShrink: 0 }}>
            <img src="/data/dem_candidate.jpg" alt="Democratic Candidate" width={64} height={64} />
          </div>
          <span className="font-bold text-blue-500 ml-2">Dem: {demVotes}</span>
        </div>
        <div className="text-center font-bold">270 to win</div>
        <div className="flex items-center">
          <span className="font-bold text-red-500 mr-2">Rep: {repVotes}</span>
          <div className={`rounded-full overflow-hidden ${projectedWinner === 'Republican' ? 'ring-4 ring-yellow-400' : ''}`} style={{ width: '64px', height: '64px', flexShrink: 0 }}>
            <img src="/data/rep_candidate.jpg" alt="Republican Candidate" width={64} height={64} />
          </div>
        </div>
      </div>
      <div className="text-center mt-2 font-bold">
        Projected Winner: {projectedWinner || 'No projection yet'}
      </div>
    </div>
  );
}

export default ProgressBar;
