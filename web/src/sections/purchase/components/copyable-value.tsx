import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { useCopyToClipboard } from 'src/hooks/use-copy-to-clipboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

type Props = {
  value: string;
  label?: string;
  display?: string;
};

export function CopyableValue({ value, label, display }: Props) {
  const { copy } = useCopyToClipboard();

  const handleCopy = async () => {
    const copied = await copy(value);
    toast[copied ? 'success' : 'error'](
      copied ? `${label ?? 'Value'} copied` : 'Could not copy to the clipboard'
    );
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {display ?? value}
      </Typography>

      <Tooltip title={`Copy ${label ?? 'value'}`}>
        <IconButton size="small" onClick={handleCopy}>
          <Iconify icon="solar:copy-bold" width={16} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
