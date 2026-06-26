import { Building2, Users } from 'lucide-react';
import type { NavItem } from '@kodan-apps/ui-core';

export const B2BAccountNavItem: NavItem = {
  key: 'accounts',
  label: 'Cuentas B2B',
  icon: <Building2 size={18} />,
};

export const B2BContactNavItem: NavItem = {
  key: 'contacts',
  label: 'Contactos',
  icon: <Users size={18} />,
};
