import { shortId } from '../purchase-utils';
import { CopyableValue } from './copyable-value';

// ----------------------------------------------------------------------

type Props = {
  id: string;
};

export function PurchaseId({ id }: Props) {
  return <CopyableValue value={id} label="Order id" display={shortId(id)} />;
}
