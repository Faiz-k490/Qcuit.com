import { useState } from 'react';
import { Box, Button, Group, Paper, Text } from '@mantine/core';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';

function App() {
  const [results, setResults] = useState(null); // To store simulation results

  // This is the production-ready API call
  async function onSimulateClick() {
    // Use the environment variable, fall back to local proxy
    const API_URL = process.env.REACT_APP_API_URL || '/api/simulate';

    console.log(`Sending simulation request to: ${API_URL}`);

    // A minimal payload to test the backend
    const testPayload = {
      numQubits: 2,
      numClassical: 2,
      noiseLevel: 0.0,
      gates: {},
      multiQubitGates: [],
      measurements: [],
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      console.log('Simulation successful:', data);

    } catch (error) {
      console.error('Simulation failed:', error);
    }
  }

  return (
    <Box style={{ height: '100vh', width: '100vw' }}>
      <PanelGroup direction="horizontal">

        {/* Panel 1: Gate Palette */}
        <Panel defaultSize={20} minSize={15}>
          <Paper p="md" style={{ height: '100%' }}>
            <Text>Gate Palette (Panel 1)</Text>
          </Paper>
        </Panel>
        <PanelResizeHandle />

        {/* Panel 2: Main Content (Grid + Outputs) */}
        <Panel defaultSize={55} minSize={40}>
          <PanelGroup direction="vertical">

            {/* Panel 2a: Circuit Grid */}
            <Panel defaultSize={65} minSize={40}>
              <Paper p="md" style={{ height: '100%', position: 'relative' }}>
                <Text>Circuit Grid (Panel 2a)</Text>
                <Button 
                  onClick={onSimulateClick} 
                  style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}
                >
                  Simulate (Test)
                </Button>
              </Paper>
            </Panel>
            <PanelResizeHandle />

            {/* Panel 2b: Probabilities */}
            <Panel defaultSize={35} minSize={20}>
              <Paper p="md" style={{ height: '100%' }}>
                <Text>Probabilities (Panel 2b)</Text>
              </Paper>
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle />

        {/* Panel 3: Code Output */}
        <Panel defaultSize={25} minSize={20}>
          <Paper p="md" style={{ height: '100%' }}>
            <Text>Generated Code (Panel 3)</Text>
            {/* We can display results here for testing */}
            {results && (
              <pre style={{ overflow: 'auto' }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </Paper>
        </Panel>

      </PanelGroup>
    </Box>
  );
}

export default App;
