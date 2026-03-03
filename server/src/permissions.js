export const PERMISSIONS = {
  VIEW_CHANNEL: 'view_channel',
  SEND_MESSAGES: 'send_messages',
  DELETE_MESSAGES: 'delete_messages',
  MANAGE_CHANNELS: 'manage_channels',
  KICK_MEMBERS: 'kick_members',
  BAN_MEMBERS: 'ban_members',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_SERVER: 'manage_server'
};

export async function hasPermission(client, serverId, userId, permission) {
  const roles = await client.query(
    `SELECT rp.permission_key FROM member_roles mr
     JOIN role_permissions rp ON mr.role_id = rp.role_id
     WHERE mr.server_id = $1 AND mr.user_id = $2`,
    [serverId, userId]
  );
  return roles.rows.some((r) => r.permission_key === permission);
}
