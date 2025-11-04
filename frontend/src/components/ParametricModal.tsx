// In frontend/src/components/ParametricModal.tsx
import { useState } from 'react';
import { Modal, Button, Slider, Stack, Text, Box } from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';

export const ParametricModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  gateType: string;
  onConfirm: (theta: number) => void;
}>) => {
  const [theta, setTheta] = useState(0);

  const handleConfirm = () => {
    innerProps.onConfirm(theta);
    context.closeModal(id);
  };

  return (
    <>
      <Stack>
        <Text>Set parameter (θ) for {innerProps.gateType} gate:</Text>
        <Box px="xl" pt="sm">
          <Slider
            value={theta}
            onChange={setTheta}
            min={-Math.PI}
            max={Math.PI}
            step={0.01}
            precision={2}
            label={value => `${value.toFixed(2)} rad`}
            marks={[
              { value: -Math.PI, label: '-π' },
              { value: 0, label: '0' },
              { value: Math.PI, label: 'π' },
            ]}
          />
        </Box>
      </Stack>
      <Button onClick={handleConfirm} mt="md">
        Confirm
      </Button>
    </>
  );
};
