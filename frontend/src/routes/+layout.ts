import type { LayoutLoad } from './$types';
import { UserRole } from '$lib/types';

export const load: LayoutLoad = () => {
	return {
		routes: [
			{
				path: '/',
				label: 'Dashboard',
				icon: 'mdi:view-dashboard',
				roles: [] // Accessible to all
			},
			{
				path: '/devices',
				label: 'Devices',
				icon: 'mdi:devices',
				roles: []
			},
			{
				path: '/imagery',
				label: 'Crop Imagery',
				icon: 'mdi:image',
				roles: []
			},
			{
				path: '/analytics/anomalies',
				label: 'Anomaly Detection',
				icon: 'mdi:alert-circle',
				roles: []
			},
			{
				path: '/certificates',
				label: 'Certificates',
				icon: 'mdi:certificate',
				roles: []
			},
			{
				path: '/certifier/issue',
				label: 'Issue Certificate',
				icon: 'mdi:certificate-outline',
				roles: [UserRole.CERTIFIER, UserRole.ADMIN]
			},
			{
				path: '/certifier/verify',
				label: 'Verify Data',
				icon: 'mdi:check-decagram',
				roles: [UserRole.CERTIFIER, UserRole.ADMIN]
			},
			{
				path: '/admin/roles',
				label: 'Manage Roles',
				icon: 'mdi:account-key',
				roles: [UserRole.ADMIN]
			},
			{
				path: '/admin/batches',
				label: 'Manage Batches',
				icon: 'mdi:package-variant-closed',
				roles: [UserRole.ADMIN]
			}
		]
	};
};
