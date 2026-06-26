import { useState, useMemo, useCallback, useEffect } from 'react';
import { B2BService } from '../services/B2BService';
import type { B2BAccount } from '../types';

export function useB2BAccounts() {
  const [accounts, setAccounts] = useState<B2BAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await B2BService.listAccounts();
      setAccounts(data);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAccounts = useMemo(() => {
    if (!filter) return accounts;
    const q = filter.toLowerCase();
    return accounts.filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        (a.legal_name && a.legal_name.toLowerCase().includes(q)) ||
        (a.tax_id && a.tax_id.toLowerCase().includes(q))
    );
  }, [accounts, filter]);

  return { accounts: filteredAccounts, allAccounts: accounts, loading, filter, setFilter, reload: load };
}
