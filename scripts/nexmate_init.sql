-- Nexmate minimal seed (roles, permissions)
-- Users are created on first Microsoft Entra sign-in.

INSERT INTO `permissions` (id, perm_key, name, module, description, created_at) VALUES
  (1, 'settings.users.read', 'View users', 'settings', 'List and view user records', '2026-01-01 00:00:00.000'),
  (2, 'settings.users.write', 'Manage users', 'settings', 'Edit users and assign roles', '2026-01-01 00:00:00.000'),
  (3, 'settings.roles.read', 'View roles', 'settings', 'List roles and permissions', '2026-01-01 00:00:00.000'),
  (4, 'settings.roles.write', 'Manage roles', 'settings', 'Create and update roles and permissions', '2026-01-01 00:00:00.000'),
  (5, 'dashboard.read', 'View dashboard', 'dashboard', 'Access the main dashboard', '2026-01-01 00:00:00.000'),
  (6, 'settings.departments.read', 'View departments', 'settings', 'List and view organization departments', '2026-01-01 00:00:00.000'),
  (7, 'settings.departments.write', 'Manage departments', 'settings', 'Create, update, and delete departments', '2026-01-01 00:00:00.000');

INSERT INTO `roles` (id, name, slug, description, is_system, created_at, updated_at, deleted_at) VALUES
  (1, 'System Admin', 'system_admin', 'Full access to all modules', 1, '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000', NULL),
  (2, 'Manager', 'manager', 'Manage users and view roles', 1, '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000', NULL),
  (3, 'Viewer', 'viewer', 'Read-only access to settings', 1, '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000', NULL);

INSERT INTO `role_permissions` (role_id, permission_id, created_at) VALUES
  (1, 1, '2026-01-01 00:00:00.000'),
  (1, 2, '2026-01-01 00:00:00.000'),
  (1, 3, '2026-01-01 00:00:00.000'),
  (1, 4, '2026-01-01 00:00:00.000'),
  (1, 5, '2026-01-01 00:00:00.000'),
  (1, 6, '2026-01-01 00:00:00.000'),
  (1, 7, '2026-01-01 00:00:00.000'),
  (2, 1, '2026-01-01 00:00:00.000'),
  (2, 2, '2026-01-01 00:00:00.000'),
  (2, 3, '2026-01-01 00:00:00.000'),
  (2, 5, '2026-01-01 00:00:00.000'),
  (2, 6, '2026-01-01 00:00:00.000'),
  (2, 7, '2026-01-01 00:00:00.000'),
  (3, 1, '2026-01-01 00:00:00.000'),
  (3, 3, '2026-01-01 00:00:00.000'),
  (3, 5, '2026-01-01 00:00:00.000'),
  (3, 6, '2026-01-01 00:00:00.000');
