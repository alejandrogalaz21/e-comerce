import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

export function HeaderSessionAction() {
  const { authenticated } = useAuthContext();

  return authenticated ? (
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      component={RouterLink}
      href={CONFIG.auth.redirectPath}
      startIcon={<Iconify width={18} icon="solar:widget-5-bold-duotone" />}
    >
      Dashboard
    </Button>
  ) : (
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      component={RouterLink}
      href={paths.auth.jwt.signIn}
    >
      Sign in
    </Button>
  );
}
