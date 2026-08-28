import { useState, useCallback } from 'react';

import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';

import { signOut } from 'src/auth/context/jwt';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function SessionMenu() {
  const router = useRouter();

  const { user, checkUserSession } = useAuthContext();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    setAnchorEl(null);

    await signOut();
    await checkUserSession?.();

    router.replace(paths.auth.jwt.signIn);
  }, [checkUserSession, router]);

  if (!user) {
    return null;
  }

  const email: string = user.email ?? '';

  const displayName: string = user.displayName || user.firstName || email;

  return (
    <>
      <IconButton aria-label="account" onClick={handleOpen} sx={{ width: 40, height: 40 }}>
        <Iconify icon="solar:user-circle-bold-duotone" width={24} />
      </IconButton>

      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 240 } } }}
      >
        <Stack sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {displayName}
          </Typography>

          {!!email && email !== displayName && (
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {email}
            </Typography>
          )}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuItem onClick={handleSignOut} sx={{ m: 1, color: 'error.main' }}>
          <Iconify icon="solar:logout-2-bold-duotone" width={20} sx={{ mr: 1.5 }} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}
