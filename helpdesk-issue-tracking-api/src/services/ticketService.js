const db = require('../db/pool');
const HttpError = require('../utils/httpError');
const { requireString, requireId, enumValue } = require('../utils/validators');

const priorities = ['low', 'medium', 'high', 'urgent'];
const statuses = ['open', 'in_progress', 'resolved', 'closed'];

function canAccessTicket(user, ticket) {
  return user.role === 'admin' ||
    user.role === 'agent' ||
    Number(ticket.created_by) === Number(user.id) ||
    Number(ticket.assigned_to) === Number(user.id);
}

async function getTicketOr404(id) {
  const result = await db.query(
    `SELECT t.*,
            creator.name AS creator_name, creator.email AS creator_email,
            assignee.name AS assignee_name, assignee.email AS assignee_email
     FROM tickets t
     JOIN users creator ON creator.id = t.created_by
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     WHERE t.id = $1`,
    [id]
  );
  if (!result.rowCount) throw new HttpError(404, 'Ticket not found.');
  return result.rows[0];
}

async function addHistory(client, ticketId, actorId, action, details = {}) {
  await client.query(
    `INSERT INTO ticket_history (ticket_id, actor_id, action, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [ticketId, actorId, action, JSON.stringify(details)]
  );
}

async function createTicket(user, body) {
  const title = requireString(body.title, 'title', { min: 3, max: 160 });
  const description = requireString(body.description, 'description', { min: 3, max: 10000 });
  const category = body.category === undefined
    ? 'general'
    : requireString(body.category, 'category', { min: 2, max: 60 });
  const priority = body.priority === undefined
    ? 'medium'
    : enumValue(body.priority, 'priority', priorities);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO tickets (title, description, category, priority, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description, category, priority, user.id]
    );
    const ticket = inserted.rows[0];
    await addHistory(client, ticket.id, user.id, 'ticket_created', { title, priority });
    await client.query('COMMIT');
    return ticket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listTickets(user, query) {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || '20', 10) || 20));
  const conditions = [];
  const params = [];

  if (user.role === 'customer') {
    params.push(user.id);
    conditions.push(`t.created_by = $${params.length}`);
  }

  if (query.status) {
    params.push(enumValue(query.status, 'status', statuses));
    conditions.push(`t.status = $${params.length}`);
  }
  if (query.priority) {
    params.push(enumValue(query.priority, 'priority', priorities));
    conditions.push(`t.priority = $${params.length}`);
  }
  if (query.assignedTo) {
    params.push(requireId(query.assignedTo, 'assignedTo'));
    conditions.push(`t.assigned_to = $${params.length}`);
  }
  if (query.search) {
    const search = requireString(query.search, 'search', { min: 1, max: 100 });
    params.push(`%${search}%`);
    conditions.push(`(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM tickets t ${where}`, params
  );
  params.push(limit, (page - 1) * limit);
  const result = await db.query(
    `SELECT t.*, creator.name AS creator_name, assignee.name AS assignee_name
     FROM tickets t
     JOIN users creator ON creator.id = t.created_by
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: result.rows,
    pagination: { page, limit, total: countResult.rows[0].total, pages: Math.ceil(countResult.rows[0].total / limit) }
  };
}

async function getTicket(user, rawId) {
  const ticket = await getTicketOr404(requireId(rawId, 'ticket id'));
  if (!canAccessTicket(user, ticket)) throw new HttpError(403, 'You cannot access this ticket.');
  return ticket;
}

async function updateTicket(user, rawId, body) {
  const id = requireId(rawId, 'ticket id');
  const existing = await getTicketOr404(id);
  if (!(user.role === 'admin' || user.role === 'agent' || Number(existing.created_by) === Number(user.id))) {
    throw new HttpError(403, 'You cannot update this ticket.');
  }

  const allowed = ['title', 'description', 'category', 'priority', 'status'];
  const keys = Object.keys(body);
  if (!keys.length) throw new HttpError(400, 'Provide at least one field to update.');
  const unknown = keys.filter((key) => !allowed.includes(key));
  if (unknown.length) throw new HttpError(400, `Fields cannot be updated here: ${unknown.join(', ')}.`);
  if (user.role === 'customer' && body.status !== undefined) {
    throw new HttpError(403, 'Only agents and admins can change ticket status.');
  }

  const updates = {};
  if (body.title !== undefined) updates.title = requireString(body.title, 'title', { min: 3, max: 160 });
  if (body.description !== undefined) updates.description = requireString(body.description, 'description', { min: 3, max: 10000 });
  if (body.category !== undefined) updates.category = requireString(body.category, 'category', { min: 2, max: 60 });
  if (body.priority !== undefined) updates.priority = enumValue(body.priority, 'priority', priorities);
  if (body.status !== undefined) updates.status = enumValue(body.status, 'status', statuses);
  if (!Object.keys(updates).length) throw new HttpError(400, 'No valid fields supplied.');

  const columns = Object.keys(updates);
  const values = Object.values(updates);
  const sets = columns.map((key, index) => `${key} = $${index + 1}`);
  sets.push('updated_at = NOW()');
  if (updates.status === 'resolved') sets.push('resolved_at = NOW()');
  else if (updates.status === 'open' || updates.status === 'in_progress') sets.push('resolved_at = NULL');
  values.push(id);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rowCount) throw new HttpError(404, 'Ticket not found.');
    await addHistory(client, id, user.id, 'ticket_updated', { changes: updates });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function assignTicket(user, rawId, body) {
  const id = requireId(rawId, 'ticket id');
  const assigneeId = requireId(body.assignedTo, 'assignedTo');
  const userResult = await db.query('SELECT id, role FROM users WHERE id = $1', [assigneeId]);
  if (!userResult.rowCount || !['agent', 'admin'].includes(userResult.rows[0].role)) {
    throw new HttpError(400, 'assignedTo must be the ID of an existing agent or admin.');
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const ticket = await client.query(
      'UPDATE tickets SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [assigneeId, id]
    );
    if (!ticket.rowCount) throw new HttpError(404, 'Ticket not found.');
    await addHistory(client, id, user.id, 'ticket_assigned', { assignedTo: assigneeId });
    await client.query('COMMIT');
    return ticket.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function resolveTicket(user, rawId) {
  const id = requireId(rawId, 'ticket id');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE tickets SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!result.rowCount) throw new HttpError(404, 'Ticket not found.');
    await addHistory(client, id, user.id, 'ticket_resolved');
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listComments(user, rawId) {
  const ticket = await getTicketOr404(requireId(rawId, 'ticket id'));
  if (!canAccessTicket(user, ticket)) throw new HttpError(403, 'You cannot access this ticket.');
  const result = await db.query(
    `SELECT c.id, c.ticket_id, c.body, c.created_at, u.id AS user_id, u.name AS user_name, u.role AS user_role
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.ticket_id = $1 ORDER BY c.created_at ASC`,
    [ticket.id]
  );
  return result.rows;
}

async function addComment(user, rawId, body) {
  const ticket = await getTicketOr404(requireId(rawId, 'ticket id'));
  if (!canAccessTicket(user, ticket)) throw new HttpError(403, 'You cannot comment on this ticket.');
  const commentBody = requireString(body.body, 'body', { min: 1, max: 5000 });
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO comments (ticket_id, user_id, body) VALUES ($1, $2, $3) RETURNING *',
      [ticket.id, user.id, commentBody]
    );
    await addHistory(client, ticket.id, user.id, 'comment_added', { commentId: result.rows[0].id });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listHistory(user, rawId) {
  const ticket = await getTicketOr404(requireId(rawId, 'ticket id'));
  if (!canAccessTicket(user, ticket)) throw new HttpError(403, 'You cannot access this ticket.');
  const result = await db.query(
    `SELECT h.id, h.action, h.details, h.created_at, u.id AS actor_id, u.name AS actor_name
     FROM ticket_history h LEFT JOIN users u ON u.id = h.actor_id
     WHERE h.ticket_id = $1 ORDER BY h.created_at ASC`,
    [ticket.id]
  );
  return result.rows;
}

module.exports = {
  createTicket, listTickets, getTicket, updateTicket, assignTicket,
  resolveTicket, listComments, addComment, listHistory
};
