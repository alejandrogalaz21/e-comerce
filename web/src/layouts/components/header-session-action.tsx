import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks';

/**
 * The header used to advertise the dashboard to everyone, including visitors
 * with no session, whom the guard then bounced. Offering an action the system is
 * about to refuse is worse than not offering it.
 */
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
