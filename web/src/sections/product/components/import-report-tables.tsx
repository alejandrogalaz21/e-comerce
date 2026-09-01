import type { IImportReport } from 'src/types/product';

import Stack from '@mui/material/Stack';

import { toImportIssueRows } from '../import-utils';
import { ImportIssuesTable } from './import-issues-table';
import { ImportCreatedTable } from './import-created-table';

type Props = {
  report: IImportReport;
};

export function ImportReportTables({ report }: Props) {
  const issues = toImportIssueRows(report);

  return (
    <Stack spacing={3}>
      {!!issues.length && <ImportIssuesTable rows={issues} />}

      {!!report.created.length && <ImportCreatedTable rows={report.created} />}
    </Stack>
  );
}
