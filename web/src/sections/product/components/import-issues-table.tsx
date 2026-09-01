import type { IImportIssueRow, IImportIssueSeverity } from 'src/types/product';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import CardHeader from '@mui/material/CardHeader';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { varAlpha } from 'src/theme/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { TableFilterBar } from './table-filter-bar';
import { IMPORT_STATUS_META, IMPORT_ISSUE_STATUSES } from '../import-utils';

const EMPTY = '—';

type StatusFilter = IImportIssueSeverity | 'all';

type Props = {
  rows: IImportIssueRow[];
};

function countBySeverity(rows: IImportIssueRow[], severity: IImportIssueSeverity): number {
  return rows.filter((row) => row.severity === severity).length;
}

export function ImportIssuesTable({ rows }: Props) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const rejectedCount = countBySeverity(rows, 'rejected');
  const updatedCount = countBySeverity(rows, 'updated');
  const skippedCount = countBySeverity(rows, 'skipped');

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (status !== 'all' && row.severity !== status) return false;
      if (!term) return true;

      return [String(row.line), row.sku, row.name, row.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [rows, status, search]);

  const summary = [
    `${rejectedCount} rejected and not saved`,
    `${updatedCount} overwrote an existing SKU`,
    `${skippedCount} blank and skipped`,
  ].join(' · ');

  return (
    <Card data-testid="import-issues">
      <CardHeader title={`Rows to review (${rows.length})`} subheader={summary} sx={{ mb: 2 }} />

      <TableFilterBar
        value={search}
        onChange={setSearch}
        placeholder="Filter by line, SKU, name or reason..."
        label="Filter rows to review"
        visibleCount={visibleRows.length}
        totalCount={rows.length}
      >
        <FormControl size="small" sx={{ width: { xs: 1, sm: 180 } }}>
          <InputLabel id="import-issue-status">Status</InputLabel>
          <Select
            labelId="import-issue-status"
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <MenuItem value="all">{`All (${rows.length})`}</MenuItem>
            <MenuItem value="rejected">{`Rejected (${rejectedCount})`}</MenuItem>
            <MenuItem value="updated">{`Updated (${updatedCount})`}</MenuItem>
            <MenuItem value="skipped">{`Skipped (${skippedCount})`}</MenuItem>
          </Select>
        </FormControl>
      </TableFilterBar>

      <Divider />

      <Scrollbar>
        <TableContainer sx={{ minWidth: 800 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 160 }}>Status</TableCell>
                <TableCell sx={{ width: 80 }}>Line</TableCell>
                <TableCell sx={{ width: 140 }}>SKU</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Name</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.map((row) => {
                const meta = IMPORT_STATUS_META[row.severity];

                return (
                  <TableRow
                    key={`${row.severity}-${row.line}`}
                    sx={(theme) => ({
                      bgcolor: varAlpha(theme.vars.palette[meta.color].mainChannel, 0.08),
                    })}
                  >
                    <TableCell>
                      <Label
                        variant="soft"
                        color={meta.color}
                        startIcon={<Iconify icon={meta.icon} />}
                      >
                        {meta.label}
                      </Label>
                    </TableCell>
                    <TableCell>{row.line}</TableCell>
                    <TableCell sx={{ color: row.sku ? 'text.primary' : 'text.disabled' }}>
                      {row.sku || EMPTY}
                    </TableCell>
                    <TableCell sx={{ color: row.name ? 'text.primary' : 'text.disabled' }}>
                      {row.name || EMPTY}
                    </TableCell>
                    <TableCell>{row.message}</TableCell>
                  </TableRow>
                );
              })}

              {!visibleRows.length && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 5, textAlign: 'center' }}>
                    <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
                      No rows match this filter
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <Box sx={{ p: 2, typography: 'caption', color: 'text.secondary' }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {IMPORT_ISSUE_STATUSES.map((severity) => {
            const meta = IMPORT_STATUS_META[severity];

            return (
              <Stack key={severity} direction="row" spacing={0.75} alignItems="center">
                <Iconify
                  icon={meta.icon}
                  width={16}
                  sx={{ color: `${meta.color}.main`, flexShrink: 0 }}
                />
                <span>{`${meta.label}: ${meta.hint.toLowerCase()}`}</span>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Card>
  );
}
