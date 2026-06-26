import { B2BAccountsPage } from '@kodan-apps/shared';

export function Accounts() {
  return (
    <B2BAccountsPage
      deleteWarningMessage="¿Está seguro de eliminar esta cuenta? Esto no eliminará las negociaciones asociadas, pero se desvincularán."
    />
  );
}
