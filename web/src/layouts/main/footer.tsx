import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Logo } from 'src/components/logo';

// ----------------------------------------------------------------------

function FooterBar({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Box component="footer" sx={{ bgcolor: 'background.default', ...sx }}>
      <Divider />

      <Container>
        <Stack
          spacing={2}
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          sx={{ py: 4, textAlign: { xs: 'center', sm: 'left' } }}
        >
          <Logo />

          <Stack direction="row" spacing={3} alignItems="center">
            <Link component={RouterLink} href={paths.product.root} color="inherit" variant="body2">
              Shop
            </Link>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {CONFIG.site.name}
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

// ----------------------------------------------------------------------

export type FooterProps = {
  sx?: SxProps<Theme>;
};

export function Footer({ sx }: FooterProps) {
  return <FooterBar sx={sx} />;
}

export type HomeFooterProps = {
  sx?: SxProps<Theme>;
};

export function HomeFooter({ sx }: HomeFooterProps) {
  return <FooterBar sx={sx} />;
}
