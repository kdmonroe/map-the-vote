// Map.js
'use client';
import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { AlbersUsa } from '@visx/geo';
import * as d3Geo from 'd3-geo';

function ElectoralMap({
  selectedStates, electoralVotes, stateAbbreviations, dispatch,
}) {
  const [geoData, setGeoData] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const containerRef = useRef(null);
  const svgRef = useRef(null); // Reference to the SVG element
  const [labelOffsets, setLabelOffsets] = useState({});

  useEffect(() => {
    fetch('/data/2010_us_states.geojson')
      .then((response) => response.json())
      .then((data) => {
        setGeoData(data.features);
      })
      .catch((error) => console.error('Error loading geo data:', error));

    // Load label offsets
    fetch('/data/stateLabelOffsets.json')
      .then((response) => response.json())
      .then((data) => setLabelOffsets(data))
      .catch((error) => console.error('Error loading label offsets:', error));
  }, []);

  const getStateFill = useCallback(
    (stateName) => {
      const stateInfo = electoralVotes[stateName] || {};
      const isSelected = selectedStates[stateName];
      const party = isSelected || stateInfo.party;

      switch (party) {
        case 'Dem':
          return 'rgba(0, 0, 255, 0.6)'; // Blue for Democratic
        case 'Rep':
        default:
          return 'rgba(255, 0, 0, 0.6)'; // Red for Republican
      }
    },
    [selectedStates, electoralVotes]
  );

  const handleStateClick = useCallback(
    (event, stateName) => {
      const stateInfo = electoralVotes[stateName];
      if (!stateInfo) return;

      const votes = stateInfo.votes;
      const currentParty = selectedStates[stateName] || stateInfo.party;
      const newParty = currentParty === 'Dem' ? 'Rep' : 'Dem';

      console.log(`Clicking ${stateName}: ${votes} votes`);
      console.log(`Current party: ${currentParty}, New party: ${newParty}`);

      dispatch({
        type: 'UPDATE_STATE',
        payload: {
          stateName,
          newParty,
          votes,
          originalParty: stateInfo.party,
        },
      });
    },
    [electoralVotes, selectedStates, dispatch]
  );

  const handleMouseMove = useCallback(
    (event, stateName) => {
      if (!containerRef.current) return;

      const stateInfo = electoralVotes[stateName] || {};
      const votes = stateInfo.votes || 'N/A';
      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setTooltip({
        show: true,
        content: `${stateName}: ${votes} electoral votes`,
        x,
        y,
      });
    },
    [electoralVotes]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  }, []);

  if (!geoData) {
    return <div>Loading map...</div>;
  }

  // List of small states to include in the side component
  const smallStates = [
    'Rhode Island',
    'Delaware',
    'Connecticut',
    'Hawaii',
    'New Hampshire',
    'Vermont',
    'Massachusetts',
    'New Jersey',
    'Maryland',
    'District of Columbia',
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Map Container */}
        <div style={{ flex: 1 }}>
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 960 600"
            preserveAspectRatio="xMidYMid meet"
          >
            <AlbersUsa data={geoData}>
              {(projection) => (
                <g>
                  {geoData.map((feature) => {
                    const stateName = feature.properties.NAME;
                    if (stateName === 'Puerto Rico') return null;

                    const path = projection.path(feature);
                    const centroid = projection.projection(d3Geo.geoCentroid(feature));
                    const stateInfo = electoralVotes[stateName] || {};
                    const votes = stateInfo.votes || '';
                    const abbr = stateAbbreviations[stateName] ||
                      stateInfo.abbreviation ||
                      stateName.slice(0, 2).toUpperCase();

                    // Get label offset for the state
                    const offset = labelOffsets[stateName] || { x: 0, y: 0 };

                    // Handle at-large votes for Maine and Nebraska
                    const isAtLargeState = ['Maine', 'Nebraska'].includes(stateName);

                    // Handle districts for Maine and Nebraska
                    const districts = Object.entries(electoralVotes)
                      .filter(
                        ([key, value]) => value.parent === stateName && value.district === true
                      )
                      .map(([key, value]) => ({ name: key, ...value }));

                    return (
                      <g key={`state-${stateName}`} className="state-group">
                        {/* State Path */}
                        <path
                          d={path}
                          fill={getStateFill(stateName)}
                          stroke="#FFF"
                          strokeWidth={0.5}
                          onClick={(event) => handleStateClick(event, stateName)}
                          onMouseMove={(event) => handleMouseMove(event, stateName)}
                          onMouseLeave={handleMouseLeave}
                          style={{ cursor: 'pointer' }}
                        />
                        {/* State Labels */}
                        {centroid && !smallStates.includes(stateName) && (
                          <g
                            transform={`translate(${centroid[0] + offset.x}, ${centroid[1] + offset.y})`}
                            pointerEvents="none"
                          >
                            <text
                              x={0}
                              y={0}
                              textAnchor="middle"
                              className="state-abbr"
                              style={{
                                fontSize: '8px',
                                fontWeight: 'bold',
                                fill: 'white',
                                textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000',
                              }}
                            >
                              {abbr}
                            </text>
                            <text
                              x={0}
                              y={10}
                              textAnchor="middle"
                              className="state-votes"
                              style={{
                                fontSize: '7px',
                                fill: 'white',
                                textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000',
                              }}
                            >
                              {votes}
                            </text>
                          </g>
                        )}
                        {/* At-Large Circles */}
                        {isAtLargeState &&
                          districts.map((district, index) => {
                            // Position districts around the state centroid
                            const angle = (index / districts.length) * Math.PI * 2;
                            const radius = 20;
                            const dx = radius * Math.cos(angle);
                            const dy = radius * Math.sin(angle);
                            const districtPosition = [centroid[0] + dx, centroid[1] + dy];

                            return (
                              <g key={`district-${district.name}`} className="district-group">
                                <circle
                                  cx={districtPosition[0]}
                                  cy={districtPosition[1]}
                                  r={8}
                                  fill={getStateFill(district.name)}
                                  stroke="white"
                                  strokeWidth={1}
                                  onClick={(event) => handleStateClick(event, district.name)}
                                  onMouseMove={(event) => handleMouseMove(event, district.name)}
                                  onMouseLeave={handleMouseLeave}
                                  style={{ cursor: 'pointer' }} />
                                <text
                                  x={districtPosition[0]}
                                  y={districtPosition[1]}
                                  dy="0.35em"
                                  textAnchor="middle"
                                  className="district-votes"
                                  style={{
                                    fontSize: '7px',
                                    fill: 'white',
                                    textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000',
                                  }}
                                >
                                  {district.votes}
                                </text>
                              </g>
                            );
                          })}
                      </g>
                    );
                  })}
                </g>
              )}
            </AlbersUsa>
          </svg>
          {tooltip.show && (
            <div
              style={{
                position: 'absolute',
                left: `${tooltip.x + 10}px`,
                top: `${tooltip.y - 10}px`,
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '5px',
                pointerEvents: 'none',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              {tooltip.content}
            </div>
          )}
        </div>
        {/* Side Component */}
        <div
          className="side-component"
          style={{
            width: '150px',
            padding: '10px',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          {/* Small States */}
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Small States</h3>
          <div>
            {smallStates.map((stateName) => {
              const stateInfo = electoralVotes[stateName];
              if (!stateInfo) return null;

              const votes = stateInfo.votes;
              const abbr = stateAbbreviations[stateName] ||
                stateInfo.abbreviation ||
                stateName.slice(0, 2).toUpperCase();
              const fillColor = getStateFill(stateName);

              return (
                <div
                  key={`small-state-${stateName}`}
                  onClick={(event) => handleStateClick(event, stateName)}
                  onMouseMove={(event) => handleMouseMove(event, stateName)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: fillColor,
                    color: 'white',
                    padding: '5px',
                    marginBottom: '5px',
                    textAlign: 'center',
                    borderRadius: '5px',
                    textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{abbr}</div>
                  <div>{votes}</div>
                </div>
              );
            })}
          </div>
          {/* At-Large Districts */}
          <h3 style={{ textAlign: 'center', margin: '20px 0 10px' }}>At-Large Districts</h3>
          <div>
            {['Maine', 'Nebraska'].map((stateName) => {
              const districts = Object.entries(electoralVotes)
                .filter(
                  ([key, value]) => value.parent === stateName && value.district === true
                )
                .map(([key, value]) => ({ name: key, ...value }));

              return districts.map((district) => {
                const districtName = district.name;
                const votes = district.votes;
                const abbr = stateAbbreviations[stateName] ||
                  district.abbreviation ||
                  stateName.slice(0, 2).toUpperCase();
                const fillColor = getStateFill(districtName);

                return (
                  <div
                    key={`district-side-${districtName}`}
                    onClick={(event) => handleStateClick(event, districtName)}
                    onMouseMove={(event) => handleMouseMove(event, districtName)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: fillColor,
                      color: 'white',
                      padding: '5px',
                      marginBottom: '5px',
                      textAlign: 'center',
                      borderRadius: '5px',
                      textShadow: '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000',
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>
                      {abbr}-{districtName.split('-')[1]}
                    </div>
                    <div>{votes}</div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ElectoralMap);