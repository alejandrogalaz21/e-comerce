import type { BoxProps } from '@mui/material/Box';
import type { NavSectionProps } from 'src/components/nav-section';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog, { dialogClasses } from '@mui/material/Dialog';

import { useRouter } from 'src/routes/hooks';
import { isExternalLink } from 'src/routes/utils';

import { useBoolean } from 'src/hooks/use-boolean';

import { varAlpha } from 'src/theme/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { SearchNotFound } from 'src/components/search-not-found';

import { ResultItem } from './result-item';
import { groupItems, applyFilter, getAllItems, highlightMatches } from './utils';

// ----------------------------------------------------------------------

const isMacOs = () =>
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.userAgent);

export type SearchbarProps = BoxProps & {
  data?: NavSectionProps['data'];
};

export function Searchbar({ data: navItems = [], sx, ...other }: SearchbarProps) {
  const theme = useTheme();

  const router = useRouter();

  const search = useBoolean();

  const [searchQuery, setSearchQuery] = useState('');

  const shortcutLabel = isMacOs() ? '⌘K' : 'Ctrl K';

  const handleClose = useCallback(() => {
    search.onFalse();
    setSearchQuery('');
  }, [search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        search.onToggle();
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [search]);

  const handleClick = useCallback(
    (path: string) => {
      if (isExternalLink(path)) {
        window.open(path);
      } else {
        router.push(path);
      }
      handleClose();
    },
    [handleClose, router]
  );

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const dataFiltered = applyFilter({
    inputData: getAllItems({ data: navItems }),
    query: searchQuery,
  });

  const notFound = searchQuery && !dataFiltered.length;

  const renderItems = () => {
    const dataGroups = groupItems(dataFiltered);

    return Object.keys(dataGroups)
      .sort((a, b) => -b.localeCompare(a))
      .map((group, index) => (
        <Box component="ul" key={`${group}-${index}`}>
          {dataGroups[group].map((item) => {
            const { title, path } = item;

            const partsTitle = highlightMatches(title, searchQuery);

            const partsPath = highlightMatches(path, searchQuery);

            return (
              <Box component="li" key={`${title}${path}`} sx={{ display: 'flex' }}>
                <ResultItem
                  path={partsPath}
                  title={partsTitle}
                  groupLabel={searchQuery && group}
                  onClickItem={() => handleClick(path)}
                />
              </Box>
            );
          })}
        </Box>
      ));
  };

  const renderButton = (
    <Box
      component="button"
      type="button"
      aria-label={`Search pages, ${shortcutLabel}`}
      display="flex"
      alignItems="center"
      onClick={search.onTrue}
      sx={{
        p: 0,
        gap: 1,
        border: 'none',
        color: 'inherit',
        px: { sm: 1 },
        py: { sm: 0.75 },
        borderRadius: { sm: 1.5 },
        cursor: { sm: 'pointer' },
        bgcolor: { xs: 'transparent', sm: varAlpha(theme.vars.palette.grey['500Channel'], 0.08) },
        ...sx,
      }}
      {...other}
    >
      <SvgIcon sx={{ width: 20, height: 20 }}>
        <path
          fill="currentColor"
          d="m20.71 19.29l-3.4-3.39A7.92 7.92 0 0 0 19 11a8 8 0 1 0-8 8a7.92 7.92 0 0 0 4.9-1.69l3.39 3.4a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42M5 11a6 6 0 1 1 6 6a6 6 0 0 1-6-6"
        />
      </SvgIcon>

      <Label
        sx={{
          fontSize: 12,
          color: 'grey.800',
          bgcolor: 'common.white',
          boxShadow: theme.customShadows.z1,
          display: { xs: 'none', sm: 'inline-flex' },
        }}
      >
        {shortcutLabel}
      </Label>
    </Box>
  );

  return (
    <>
      {renderButton}

      <Dialog
        fullWidth
        disableRestoreFocus
        maxWidth="sm"
        open={search.value}
        onClose={handleClose}
        transitionDuration={{ enter: theme.transitions.duration.shortest, exit: 0 }}
        PaperProps={{ sx: { mt: 15, overflow: 'unset' } }}
        sx={{ [`& .${dialogClasses.container}`]: { alignItems: 'flex-start' } }}
      >
        <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.vars.palette.divider}` }}>
          <InputBase
            fullWidth
            autoFocus
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            startAdornment={
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={24} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
            endAdornment={<Label sx={{ letterSpacing: 1, color: 'text.secondary' }}>esc</Label>}
            inputProps={{ sx: { typography: 'h6' } }}
          />
        </Box>

        {notFound ? (
          <SearchNotFound query={searchQuery} sx={{ py: 15 }} />
        ) : (
          <Scrollbar sx={{ px: 3, pb: 3, pt: 2, height: 400 }}>{renderItems()}</Scrollbar>
        )}
      </Dialog>
    </>
  );
}
