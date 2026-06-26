import { useState, useMemo, useCallback, useEffect } from 'react';
import { B2BService } from '../services/B2BService';
import type { B2BAccount, B2BContact } from '../types';

export function useB2BContacts() {
  const [contacts, setContacts] = useState<B2BContact[]>([]);
  const [accounts, setAccounts] = useState<B2BAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [conts, accs] = await Promise.all([
        B2BService.listContacts(accountFilter),
        B2BService.listAccounts(),
      ]);
      setContacts(conts);
      setAccounts(accs);
    } catch {
      setContacts([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [accountFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [accountFilter, load]);

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      result = result.filter(
        c =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, searchFilter]);

  return {
    contacts: filteredContacts,
    allContacts: contacts,
    accounts,
    loading,
    searchFilter,
    setSearchFilter,
    accountFilter,
    setAccountFilter,
    reload: load,
  };
}
