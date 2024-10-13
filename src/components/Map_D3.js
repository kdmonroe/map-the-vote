'use client'
import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

const ElectoralMap = ({ selectedStates, setSelectedStates, electoralVotes, stateAbbreviations, setDemVotes, setRepVotes }) => {
  const mapContainer = useRef();
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  const getStateFill = (stateCode) => {
    const stateInfo = electoralVotes[stateCode] || {};
    const isSelected = selectedStates[stateCode];
    const party = isSelected || stateInfo.party;

    switch (party) {
      case 'Dem': return 'rgba(0, 0, 255, 0.6)';
      case 'Rep': return 'rgba(255, 0, 0, 0.6)';
      default: return 'rgba(128, 128, 128, 0.6)';
    }
  };

  const handleStateClick = (stateName) => {
    const stateInfo = electoralVotes[stateName];
    if (!stateInfo) return;

    setSelectedStates(prev => {
      const newState = { ...prev };
      const currentParty = newState[stateName] || stateInfo.party;
      const newParty = currentParty === 'Dem' ? 'Rep' : 'Dem';

      if (currentParty === 'Dem') {
        setDemVotes(current => current - stateInfo.votes);
        setRepVotes(current => current + stateInfo.votes);
      } else {
        setDemVotes(current => current + stateInfo.votes);
        setRepVotes(current => current - stateInfo.votes);
      }

      newState[stateName] = newParty;
      return newState;
    });

    d3.select(`#state-${stateName.replace(/\s/g, '-')}`)
      .transition()
      .duration(300)
      .attr('fill', getStateFill(stateName));
  };

  const createMap = useCallback(() => {
    const width = mapContainer.current.clientWidth;
    const height = mapContainer.current.clientHeight;

    d3.select(mapContainer.current).select('svg').remove();

    const svg = d3.select(mapContainer.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const projection = d3.geoAlbersUsa()
      .scale(width * 0.9)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    d3.json('/data/2010_us_states.geojson').then(data => {
      const states = data.features.filter(d => d.properties.NAME !== 'Puerto Rico');

      const stateGroups = g.selectAll('.state-group')
        .data(states)
        .enter().append('g')
        .attr('class', 'state-group');

      stateGroups.append('path')
        .attr('class', 'state')
        .attr('id', d => `state-${d.properties.NAME.replace(/\s/g, '-')}`)
        .attr('d', path)
        .attr('stroke', 'white')
        .attr('stroke-width', 0.5)
        .attr('fill-opacity', 0.8)
        .attr('fill', d => getStateFill(d.properties.NAME))
        .on('click', (event, d) => {
          const stateName = d.properties.NAME;
          handleStateClick(stateName);
        })
        .on('mouseover', (event, d) => {
          const stateName = d.properties.NAME;
          const stateInfo = electoralVotes[stateName] || {};
          const votes = stateInfo.votes || 'N/A';
          setTooltip({
            show: true,
            content: `${stateName}: ${votes} electoral votes`,
            x: event.pageX,
            y: event.pageY
          });
        })
        .on('mousemove', (event) => {
          setTooltip(prev => ({
            ...prev,
            x: event.pageX,
            y: event.pageY
          }));
        })
        .on('mouseout', () => {
          setTooltip({ show: false, content: '', x: 0, y: 0 });
        });

      stateGroups.each(function(d) {
        const stateGroup = d3.select(this);
        const stateName = d.properties.NAME;
        const stateInfo = electoralVotes[stateName] || {};
        const votes = stateInfo.votes || '';
        const abbr = stateAbbreviations[stateName] || '';

        // Offset configuration for small states
        const stateOffsets = {
          'Massachusetts': [10, -10],
          'Rhode Island': [15, -5],
          'Connecticut': [10, 5],
          'Delaware': [15, 10],
          'District of Columbia': [25, 25], // Specific offset for DC
        };

        const centroid = path.centroid(d);
        const offset = stateOffsets[stateName] || [0, 0];
        const labelPosition = [centroid[0] + offset[0], centroid[1] + offset[1]];

        const labelGroup = stateGroup.append('g')
          .attr('class', 'state-label')
          .attr('transform', `translate(${labelPosition})`)
          .attr('pointer-events', 'none');

        labelGroup.append('text')
          .attr('class', 'state-abbr')
          .attr('dy', '-0.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', '8px')
          .style('font-weight', 'bold')
          .style('fill', 'white')
          .style('text-shadow', '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000')
          .text(abbr);

        labelGroup.append('text')
          .attr('class', 'state-votes')
          .attr('dy', '0.9em')
          .attr('text-anchor', 'middle')
          .style('font-size', '7px')
          .style('fill', 'white')
          .style('text-shadow', '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000')
          .text(votes);

        // Handle at-large votes
        if (stateName === 'Maine' || stateName === 'Nebraska') {
          const atLargeVotes = stateInfo.votes - 2;
          const atLargePosition = [centroid[0] + 20, centroid[1] + 20];

          labelGroup.append('circle')
            .attr('cx', 20)
            .attr('cy', 20)
            .attr('r', 8)
            .attr('fill', getStateFill(stateName))
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

          labelGroup.append('text')
            .attr('x', 20)
            .attr('y', 20)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .style('font-size', '7px')
            .style('fill', 'white')
            .style('text-shadow', '1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000')
            .text(atLargeVotes);
        }
      });

      g.selectAll('.state')
        .on('mouseover', function(event, d) {
          const stateName = d.properties.NAME;
          console.log('Hovering over state:', stateName);
          
          d3.select(this.parentNode).select('.state-label')
            .selectAll('text')
            .transition()
            .duration(200)
            .style('font-size', function() {
              return parseFloat(d3.select(this).style('font-size')) * 1.5 + 'px';
            });
        })
        .on('mouseout', function(event, d) {
          d3.select(this.parentNode).select('.state-label')
            .selectAll('text')
            .transition()
            .duration(200)
            .style('font-size', function() {
              return this.classList.contains('state-abbr') ? '8px' : '7px';
            });
        });
    });
  }, [electoralVotes, selectedStates, stateAbbreviations, handleStateClick, getStateFill]);

  useEffect(() => {
    createMap();

    const handleResize = () => {
      createMap();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [createMap]);

  return (
    <div ref={mapContainer} className="absolute inset-0">
      {tooltip.show && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            pointerEvents: 'none',
            fontSize: '14px',
            whiteSpace: 'nowrap'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default ElectoralMap;