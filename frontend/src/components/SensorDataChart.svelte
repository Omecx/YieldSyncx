<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { FormattedSensorData } from '$lib/types';
  
  // Props with correct TypeScript types
  let { data = [], dataType = 'temperature' } = $props<{
  data: FormattedSensorData[];
  dataType: 'temperature' | 'humidity' | 'soil';
  }>();
  // Component state using Svelte 5 runes
  let svgContainer = $state<HTMLDivElement | null>(null);
  let width = $state(0);
  let height = $state(0);
  let processedData = $state<Array<{timestamp: Date, value: number}>>([]);
  
  // Process data when inputs change
  $effect(() => {
    if (data && data.length > 0) {
      processData();
    }
  });
  
  function processData() {
    // Filter valid data and convert to proper format
    processedData = data
    .filter(item => {
      // Either filter by dataType or check if the parsedData contains the field
      return item.dataType === dataType || 
             (item.parsedData && (item.parsedData[dataType] !== undefined || item.parsedData.value !== undefined));
    })
    .map(item => {
      // Extract value from the correct location in the data structure
      let value = 0;
      
      if (item.parsedData) {
        // Try specific dataType field first
        if (item.parsedData[dataType] !== undefined) {
          value = Number(item.parsedData[dataType]);
        } 
        // Then try general value field
        else if (item.parsedData.value !== undefined) {
          value = Number(item.parsedData.value);
        }
      } 
      // Fallback to trying to parse from sensorData string
      else if (item.sensorData) {
        try {
          const parsedJson = JSON.parse(item.sensorData);
          if (parsedJson[dataType] !== undefined) {
            value = Number(parsedJson[dataType]);
          } else if (parsedJson.value !== undefined) {
            value = Number(parsedJson.value);
          }
        } catch (e) {
          // If not JSON, try direct parsing
          const numValue = parseFloat(item.sensorData);
          if (!isNaN(numValue)) value = numValue;
        }
      }
      
      return {
        timestamp: new Date(item.timestamp),
        value: value
      };
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    if (processedData.length > 0 && svgContainer) {
      renderChart();
    }
  }
  
  onMount(() => {
    if (!svgContainer) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        width = newWidth;
        height = newHeight;
        if (processedData.length > 0) {
          renderChart();
        }
      }
    });
    
    resizeObserver.observe(svgContainer);
    
    return () => {
      resizeObserver.disconnect();
    };
  });
  
  function renderChart() {
    if (!svgContainer || width === 0 || height === 0 || processedData.length === 0) {
      return;
    }
    
    // Clear previous chart
    d3.select(svgContainer).selectAll('*').remove();
    
    // Set margins
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(svgContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Add chart group with margins
    const chart = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xDomain = d3.extent(processedData, d => d.timestamp) as [Date, Date];
    const xScale = d3.scaleTime()
      .domain(xDomain)
      .range([0, innerWidth]);
    
    const yMin = d3.min(processedData, d => d.value) as number;
    const yMax = d3.max(processedData, d => d.value) as number;
    const yPadding = Math.max(0.1, (yMax - yMin) * 0.1);
    
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .range([innerHeight, 0]);
    
    // Create line generator
    const line = d3.line<{timestamp: Date, value: number}>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    // Draw line
    chart.append('path')
      .datum(processedData)
      .attr('fill', 'none')
      .attr('stroke', getStrokeColor())
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Add data points
    chart.selectAll('.data-point')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', getStrokeColor())
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .append('title')
      .text(d => `${formatDate(d.timestamp)}: ${d.value.toFixed(1)} ${getUnit()}`);
    
    // Add axes
    chart.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));
    
    chart.append('g')
      .call(d3.axisLeft(yScale));
    
    // Add labels
    chart.append('text')
      .attr('class', 'x-label')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 5)
      .text('Timestamp');
    
    chart.append('text')
      .attr('class', 'y-label')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${-margin.left + 15},${innerHeight / 2}) rotate(-90)`)
      .text(getAxisLabel());
  }
  
  function getStrokeColor(): string {
    switch (dataType) {
      case 'temperature': return '#ff6b6b';
      case 'humidity': return '#4dabf7';
      case 'soil': return '#51cf66';
      default: return '#228be6';
    }
  }
  
  function getUnit(): string {
    switch (dataType) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'soil': return '%';
      default: return '';
    }
  }
  
  function getAxisLabel(): string {
    switch (dataType) {
      case 'temperature': return 'Temperature (°C)';
      case 'humidity': return 'Humidity (%)';
      case 'soil': return 'Soil Moisture (%)';
      default: return '';
    }
  }
  
  function formatDate(date: Date): string {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="w-full h-full" bind:this={svgContainer}></div>