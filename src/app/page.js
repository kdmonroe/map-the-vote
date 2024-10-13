// Page.js
'use client';
import React, { useState, useEffect, useReducer, useMemo } from 'react';
import ElectoralMap from '@/components/Map';
import ProgressBar from '@/components/ProgressBar'; // Make sure this import is present
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

// Define the initial state
const initialState = {
  selectedStates: {},
  demVotes: 0,
  repVotes: 0,
  // greenVotes: 0,
};

// Define the reducer function
function reducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        demVotes: action.payload.demVotes,
        repVotes: action.payload.repVotes,
      };
    case 'UPDATE_STATE':
      const { stateName, newParty, votes, originalParty } = action.payload;
      const updatedSelectedStates = { ...state.selectedStates };
      let newDemVotes = state.demVotes;
      let newRepVotes = state.repVotes;

      if (updatedSelectedStates[stateName]) {
        // State was previously changed, remove it from selected states
        const currentParty = updatedSelectedStates[stateName];
        delete updatedSelectedStates[stateName];
        
        // Remove votes from the current party
        if (currentParty === 'Dem') newDemVotes -= votes;
        else if (currentParty === 'Rep') newRepVotes -= votes;
        
        // Add votes back to the original party
        if (originalParty === 'Dem') newDemVotes += votes;
        else if (originalParty === 'Rep') newRepVotes += votes;
      } else {
        // State wasn't previously changed, add it to selected states
        updatedSelectedStates[stateName] = newParty;
        
        // Remove votes from the original party
        if (originalParty === 'Dem') newDemVotes -= votes;
        else if (originalParty === 'Rep') newRepVotes -= votes;
        
        // Add votes to the new party
        if (newParty === 'Dem') newDemVotes += votes;
        else if (newParty === 'Rep') newRepVotes += votes;
      }

      return {
        ...state,
        selectedStates: updatedSelectedStates,
        demVotes: newDemVotes,
        repVotes: newRepVotes,
      };

    case 'RESET':
      return action.payload;
    
    default:
      return state;
  }
}

function ElectionMap() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [electoralVotes, setElectoralVotes] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [stateAbbreviations, setStateAbbreviations] = useState({});

  useEffect(() => {
    Promise.all([
      fetch('/data/electoralVotes.json').then(response => response.json()),
      fetch('/data/stateAbbreviations.json').then(response => response.json())
    ]).then(([electoralVotesData, stateAbbreviationsData]) => {
      setElectoralVotes(electoralVotesData);
      setStateAbbreviations(stateAbbreviationsData);

      const total = Object.values(electoralVotesData).reduce((sum, state) => sum + state.votes, 0);
      setTotalVotes(total);

      const initialVotes = Object.values(electoralVotesData).reduce(
        (acc, state) => {
          if (state.party === 'Dem') acc.demVotes += state.votes;
          else if (state.party === 'Rep') acc.repVotes += state.votes;
          // else if (state.party === 'Green') acc.greenVotes += state.votes;
          return acc;
        },
        { demVotes: 0, repVotes: 0 /*, greenVotes: 0 */ }
      );

      dispatch({
        type: 'INITIALIZE',
        payload: initialVotes,
      });
    }).catch(error => {
      console.error('Error loading data:', error);
    });
  }, []);

  useEffect(() => {
    console.log('State updated:', state);
  }, [state]);

  useEffect(() => {
    console.log(`Total votes: ${totalVotes}`);
    console.log(`Dem votes: ${state.demVotes}, Rep votes: ${state.repVotes}`);
  }, [totalVotes, state.demVotes, state.repVotes]);

  const handleExport = () => {
    const exportContainer = document.getElementById('export-container');
    if (!exportContainer) return;

    html2canvas(exportContainer, {
      backgroundColor: 'white',
      width: exportContainer.offsetWidth,
      height: exportContainer.scrollHeight,
      scale: 2,
      useCORS: true,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.getElementById('export-container');
        clonedContainer.style.height = 'auto';
        clonedContainer.style.overflow = 'visible';
        
        // Remove the sticky positioning from the progress bar
        const progressBar = clonedContainer.querySelector('.progress-bar');
        if (progressBar) {
          progressBar.style.position = 'static';
          progressBar.style.top = 'auto';
        }

        // Ensure images are loaded before capturing
        const images = clonedContainer.getElementsByTagName('img');
        Array.from(images).forEach(img => {
          img.style.display = 'block';
          img.style.width = '64px';
          img.style.height = '64px';
        });
      }
    }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, 'electoral_map.png');
        } else {
          console.error('Failed to create blob from canvas');
        }
      }, 'image/png');
    }).catch((error) => {
      console.error('Error in html2canvas:', error);
    });
  };

  const handleReset = () => {
    // Calculate initial votes again
    const initialVotes = Object.values(electoralVotes).reduce(
      (acc, state) => {
        if (state.party === 'Dem') acc.demVotes += state.votes;
        else if (state.party === 'Rep') acc.repVotes += state.votes;
        // else if (state.party === 'Green') acc.greenVotes += state.votes;
        return acc;
      },
      { demVotes: 0, repVotes: 0 /*, greenVotes: 0 */ }
    );

    dispatch({
      type: 'RESET',
      payload: { ...initialState, ...initialVotes },
    });
  };

  const projectedWinner = useMemo(() => {
    const threshold = 270;
    if (state.demVotes >= threshold) return 'Dem';
    if (state.repVotes >= threshold) return 'Rep';
    return null;
  }, [state.demVotes, state.repVotes]);

  return (
    <div className="min-h-screen flex flex-col">
      <div id="export-container" className="flex flex-col flex-grow">
        <div className="p-4 bg-gray-100">
          <h1 className="text-2xl font-bold">2024 Electoral College Map</h1>
          <p className="text-sm mt-2">
            Click on states and districts to see different electoral outcomes. Toggle between Democratic and Republican party victories. Initial state colors represent the 2020 election results.
          </p>
        </div>
        
        <ProgressBar
          demVotes={state.demVotes}
          repVotes={state.repVotes}
          totalVotes={totalVotes}
        />

        <div id="map-container" className="flex-grow relative">
          <ElectoralMap
            selectedStates={state.selectedStates}
            electoralVotes={electoralVotes}
            stateAbbreviations={stateAbbreviations}
            dispatch={dispatch}
          />
        </div>
      </div>

      <div className="p-4 bg-gray-100">
        {/* Export and Reset Buttons */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleExport}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Export Map
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Reset Map
          </button>
        </div>
      </div>

      {/* New footer section */}
      <footer className="p-4 bg-gray-200 text-center text-sm">
        This map was built with <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">NextJS</a> and <a href="https://airbnb.io/visx/docs/geo" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">Visx Geo</a>.
      </footer>
    </div>
  );
}

export default ElectionMap;
