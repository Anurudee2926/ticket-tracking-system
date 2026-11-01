const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/ticketService');

exports.create = asyncHandler(async (req, res) => {
  const ticket = await service.createTicket(req.user, req.body);
  res.status(201).json({ data: ticket });
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await service.listTickets(req.user, req.query));
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ data: await service.getTicket(req.user, req.params.id) });
});

exports.update = asyncHandler(async (req, res) => {
  res.json({ data: await service.updateTicket(req.user, req.params.id, req.body) });
});

exports.assign = asyncHandler(async (req, res) => {
  res.json({ data: await service.assignTicket(req.user, req.params.id, req.body) });
});

exports.resolve = asyncHandler(async (req, res) => {
  res.json({ data: await service.resolveTicket(req.user, req.params.id) });
});

exports.listComments = asyncHandler(async (req, res) => {
  res.json({ data: await service.listComments(req.user, req.params.id) });
});

exports.addComment = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.addComment(req.user, req.params.id, req.body) });
});

exports.history = asyncHandler(async (req, res) => {
  res.json({ data: await service.listHistory(req.user, req.params.id) });
});
