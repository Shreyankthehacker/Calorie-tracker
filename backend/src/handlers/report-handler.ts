import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ReportRangeQuery } from '../schemas/reports.js';
import type { ReportService } from '../services/report-service.js';

function clientUserIdFromQuery(request: FastifyRequest): string | undefined {
  const query = request.query as { userId?: string };
  return typeof query.userId === 'string' ? query.userId : undefined;
}

export class ReportHandler {
  constructor(private readonly reportService: ReportService) {}

  today = async (request: FastifyRequest, reply: FastifyReply) => {
    const report = await this.reportService.getToday(request.user.sub, clientUserIdFromQuery(request));
    return reply.status(200).send(report);
  };

  calories = async (query: ReportRangeQuery, request: FastifyRequest, reply: FastifyReply) => {
    const report = await this.reportService.getCalorieTrend(
      request.user.sub,
      query.startDate,
      query.endDate,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(report);
  };

  macros = async (query: ReportRangeQuery, request: FastifyRequest, reply: FastifyReply) => {
    const report = await this.reportService.getMacroTrend(
      request.user.sub,
      query.startDate,
      query.endDate,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(report);
  };

  micronutrients = async (
    query: ReportRangeQuery,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const report = await this.reportService.getMicronutrients(
      request.user.sub,
      query.startDate,
      query.endDate,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(report);
  };

  goalVsActual = async (query: ReportRangeQuery, request: FastifyRequest, reply: FastifyReply) => {
    const report = await this.reportService.getGoalVsActual(
      request.user.sub,
      query.startDate,
      query.endDate,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(report);
  };

  insights = async (query: ReportRangeQuery, request: FastifyRequest, reply: FastifyReply) => {
    const report = await this.reportService.getInsights(
      request.user.sub,
      query.startDate,
      query.endDate,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(report);
  };
}
