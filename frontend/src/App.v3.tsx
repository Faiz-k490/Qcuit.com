import { useEffect } from 'react';
import { Box, Button, Paper, Text, Group, ActionIcon, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { CircuitProvider, useCircuit } from './store/CircuitContext';
import { CircuitCanvas } from './components/CircuitCanvas';
import { OutputDisplay } from './components/OutputDisplay';
import { GatePaletteV3 } from './components/GatePaletteV3';

function CircuitEditor() {
  const {
    state,
    results,
    isSimulating,
    addQubit,
    removeQubit,
    runCircuit,
    loadCircuit,
  } = useCircuit();

  // Load circuit from URL on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('circuit');

      if (sharedState) {
        const stateString = atob(sharedState);
        const loadedState = JSON.parse(stateString);

        if (loadedState.numQubits && loadedState.gates) {
          loadCircuit(loadedState);
          notifications.show({
            title: 'Circuit Loaded',
            message: 'Successfully loaded shared circuit.',
            color: 'blue',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load shared circuit:', error);
      notifications.show({
        title: 'Load Error',
        message: 'Could not load shared circuit.',
        color: 'red',
      });
    }
  }, [loadCircuit]);

  // Share function
  const getShareableLink = () => {
    try {
      const stateString = JSON.stringify(state);
      const base64State = btoa(stateString);
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('circuit', base64State);
      window.history.pushState({}, '', url.toString());

      navigator.clipboard
        .writeText(url.toString())
        .then(() => {
          notifications.show({
            title: 'Link Copied!',
            message: 'Your circuit is copied to the clipboard.',
            color: 'blue',
          });
        })
        .catch((err) => {
          console.warn('Clipboard write failed.', err);
          notifications.show({
            title: 'URL Ready!',
            message: 'Link updated in your address bar.',
            color: 'yellow',
          });
        });
    } catch (error) {
      console.error('Failed to create shareable link:', error);
      notifications.show({
        title: 'Error',
        message: 'Could not create shareable link.',
        color: 'red',
      });
    }
  };

  // Simulate handler
  const handleSimulate = async () => {
    try {
      await runCircuit();
      notifications.show({
        title: 'Simulation Complete',
        message: 'Results updated successfully.',
        color: 'blue',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Simulation Failed',
        message: error.message || 'Check the console for details.',
        color: 'red',
      });
    }
  };

  return (
    <Box style={{ height: '100vh', width: '100vw' }}>
      <PanelGroup direction="horizontal">
        {/* Panel 1: Gate Palette */}
        <Panel defaultSize={20} minSize={15}>
          <GatePaletteV3 />
        </Panel>
        <PanelResizeHandle />

        {/* Panel 2: Main Content (Canvas + Outputs) */}
        <Panel defaultSize={55} minSize={40}>
          <PanelGroup direction="vertical">
            {/* Circuit Canvas */}
            <Panel defaultSize={65} minSize={40}>
              <Paper style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                {/* Top controls */}
                <Box style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                  <Group>
                    <Button onClick={getShareableLink} variant="default" size="sm">
                      Share
                    </Button>
                    <Button onClick={handleSimulate} loading={isSimulating} size="sm">
                      Simulate
                    </Button>
                  </Group>
                </Box>

                {/* Qubit controls */}
                <Box style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Qubits: {state.numQubits}
                    </Text>
                    <Tooltip label="Add qubit (max 20)">
                      <ActionIcon
                        variant="default"
                        size="sm"
                        onClick={addQubit}
                        disabled={state.numQubits >= 20}
                      >
                        <IconPlus size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Remove qubit">
                      <ActionIcon
                        variant="default"
                        size="sm"
                        onClick={removeQubit}
                        disabled={state.numQubits <= 1}
                      >
                        <IconMinus size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Box>

                {/* Circuit Canvas */}
                <CircuitCanvas />
              </Paper>
            </Panel>
            <PanelResizeHandle />

            {/* Histogram output */}
            <Panel defaultSize={35} minSize={20}>
              <OutputDisplay results={results} view="histogram" />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle />

        {/* Panel 3: Code Output */}
        <Panel defaultSize={25} minSize={20}>
          <OutputDisplay results={results} view="code" />
        </Panel>
      </PanelGroup>
    </Box>
  );
}

function App() {
  return (
    <CircuitProvider>
      <CircuitEditor />
    </CircuitProvider>
  );
}

export default App;
